#!/usr/bin/env python3
"""Ink-wash parallax asset pipeline (v4, final).

Philosophy
----------
The reference painting is one flattened image.  To make real parallax layers the
base plate needs those elements *removed*; since a single image has no information
about what was behind them, the plate is inpainted with low-frequency mist only.
Nothing invented is ever allowed to look like ink detail — when a layer slides it
uncovers a narrow band of that mist, which reads as haze behind the object.

Each layer then carries:
  * solid alpha (rebuilt where the automatic extraction lost pale parts),
  * the painting's own RGB (so at rest the composite is the painting again),
  * a few px of plate-coloured margin that makes the silhouette edge calm.
"""
import json, os, base64, io, time
import numpy as np
from PIL import Image, ImageFilter

# ---------------------------------------------------------------------------
# Usage:
#   LANDSCAPE_SRC=~/Downloads/landscape-assets \
#   LANDSCAPE_OUT=public/images/landscape \
#   python3 tools/landscape-pipeline/build_assets.py
# ---------------------------------------------------------------------------
SRC = os.path.expanduser(os.environ.get("LANDSCAPE_SRC", "~/Downloads/landscape-assets"))
OUT = os.path.expanduser(os.environ.get("LANDSCAPE_OUT", "public/images/landscape"))
PREV = os.path.expanduser(os.environ.get("LANDSCAPE_PREVIEW", "/tmp/inkwash/preview"))
PAD = 36          # bleed around the picture so sliding layers never expose a hole
MARGIN = 12       # extra transparent room around each layer
os.makedirs(PREV, exist_ok=True)
os.makedirs(OUT, exist_ok=True)

# ---------------------------------------------------------------- basics
def np2im(a):
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))

def blur(a, r):
    return a.astype(np.float32) if r <= 0 else np.asarray(np2im(a).filter(ImageFilter.GaussianBlur(r))).astype(np.float32)

def fblur(a, r):
    if r <= 0:
        return a.astype(np.float32)
    im = Image.fromarray(np.clip(a * 255, 0, 255).astype(np.uint8))
    return np.asarray(im.filter(ImageFilter.GaussianBlur(r))).astype(np.float32) / 255.0

def dil(m, r=1):
    im = Image.fromarray((m * 255).astype(np.uint8))
    for _ in range(r):
        im = im.filter(ImageFilter.MaxFilter(3))
    return np.asarray(im) > 127

def ero(m, r=1):
    im = Image.fromarray((m * 255).astype(np.uint8))
    for _ in range(r):
        im = im.filter(ImageFilter.MinFilter(3))
    return np.asarray(im) > 127

def close(m, r):
    return ero(dil(m, r), r)

def region_from_border(passable):
    h, w = passable.shape
    cur = np.zeros_like(passable)
    cur[0, :] = passable[0, :]; cur[-1, :] = passable[-1, :]
    cur[:, 0] |= passable[:, 0]; cur[:, -1] |= passable[:, -1]
    for _ in range(h + w):
        nxt = cur.copy()
        nxt[1:, :] |= cur[:-1, :]; nxt[:-1, :] |= cur[1:, :]
        nxt[:, 1:] |= cur[:, :-1]; nxt[:, :-1] |= cur[:, 1:]
        nxt &= passable
        if np.array_equal(nxt, cur):
            break
        cur = nxt
    return cur

def fill_holes(m):
    if not m.any():
        return m
    return ~region_from_border(~m)

def ramp(x, lo=0.30, hi=0.70):
    return np.clip((x - lo) / (hi - lo), 0, 1)

# ---------------------------------------------------------------- diffusion fill
def downsample_stack(img, known):
    stack = [(img.copy(), known.copy())]
    ci, ck = img, known
    while min(ck.shape) > 6:
        H, W = ck.shape
        H2, W2 = H // 2 * 2, W // 2 * 2
        i2, k2 = ci[:H2, :W2], ck[:H2, :W2].astype(np.float32)
        acc = np.zeros((H2 // 2, W2 // 2, 3), np.float32)
        cnt = np.zeros((H2 // 2, W2 // 2), np.float32)
        for dy in (0, 1):
            for dx in (0, 1):
                acc += i2[dy::2, dx::2].reshape(H2 // 2, W2 // 2, 3) * k2[dy::2, dx::2][..., None]
                cnt += k2[dy::2, dx::2]
        ci = np.where(cnt[..., None] > 0, acc / np.maximum(cnt, 1)[..., None], 0)
        ck = cnt > 0
        stack.append((ci.copy(), ck.copy()))
    return stack

def propagate_fill(img, known):
    filled = img.astype(np.float32).copy()
    k = known.copy()
    if not k.any():
        return np.zeros_like(filled) + np.array([242, 226, 203], np.float32)
    for _ in range(max(filled.shape) * 2):
        if k.all():
            break
        acc = np.zeros_like(filled); cnt = np.zeros(k.shape, np.float32)
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            s_i = np.roll(np.roll(filled, dy, 0), dx, 1)
            s_k = np.roll(np.roll(k, dy, 0), dx, 1)
            acc += s_i * s_k[..., None]; cnt += s_k
        take = (~k) & (cnt > 0)
        filled[take] = acc[take] / cnt[take][:, None]
        k |= take
    return filled

def pyramid_fill(img, mask):
    stack = downsample_stack(img, ~mask)
    filled = propagate_fill(*stack[-1])
    for li, lk in reversed(stack[:-1]):
        H, W = lk.shape
        up = np.asarray(Image.fromarray(np.clip(filled, 0, 255).astype(np.uint8)).resize((W, H), Image.BILINEAR)).astype(np.float32)
        filled = np.where(lk[..., None], li, up)
    return filled

def subbox(mask, pad):
    ys, xs = np.nonzero(mask)
    return (max(ys.min() - pad, 0), min(ys.max() + pad + 1, mask.shape[0]),
            max(xs.min() - pad, 0), min(xs.max() + pad + 1, mask.shape[1]))

def inpaint_mist(img, mask, sigma=3.0, grain=0.30, pad=10):
    y0, y1, x0, x1 = subbox(mask, pad)
    sub = img[y0:y1, x0:x1].astype(np.float32)
    m = mask[y0:y1, x0:x1]
    filled = blur(pyramid_fill(sub, m), sigma)
    # borrow paper grain from the nearest clean band above
    hf = sub - blur(sub, 2.4)
    yy, xx = np.nonzero(m)
    sy = np.clip(yy - (int((yy.max() - yy.min()) * 0.5) + 6), 0, sub.shape[0] - 1)
    g = hf[sy, xx].copy()
    g[~(~m[sy, xx])] = 0
    filled[yy, xx] += g * grain
    out = img.astype(np.float32).copy()
    sub_out = sub.copy()
    sub_out[m] = np.clip(filled, 0, 255)[m]
    out[y0:y1, x0:x1] = sub_out
    return out

def inpaint_water(img, mask, pad=12):
    y0, y1, x0, x1 = subbox(mask, pad)
    sub = img[y0:y1, x0:x1].astype(np.float32)
    m = mask[y0:y1, x0:x1]
    fill = blur(pyramid_fill(sub, m), 1.6)
    h = m.shape[0]
    rows_known = (~m).any(axis=1)
    src_row = np.arange(h)
    for y in range(h):
        above = np.where(rows_known[:y])[0]
        below = np.where(rows_known[y + 1:])[0]
        a = above[-1] if len(above) else None
        b = y + 1 + below[0] if len(below) else None
        pick = a if (a is not None and (b is None or (y - a) <= (b - y))) else b
        if pick is None:
            continue
        src_row[y] = pick + (pick - y)
    src_row = np.clip(src_row, 0, h - 1)
    mirrored = sub[src_row, :]
    res = np.where(m[..., None], 0.5 * mirrored + 0.5 * fill, sub)
    ker = np.hanning(17); ker /= ker.sum()
    padw = 8
    for c in range(3):
        arr = np.pad(res[..., c], ((0, 0), (padw, padw)), mode="reflect")
        conv = np.apply_along_axis(lambda r: np.convolve(r, ker, mode="same"), 1, arr)[:, padw:-padw]
        res[..., c] = conv
    out = img.astype(np.float32).copy()
    out[y0:y1, x0:x1] = np.clip(res, 0, 255)
    return out

# ---------------------------------------------------------------- load
orig = Image.open(f"{SRC}/original/original.png").convert("RGB")
W, H = orig.size
src = np.asarray(orig).astype(np.float32)
meta = json.load(open(f"{SRC}/metadata/layers.json"))
L = {l["file"].replace(".png", ""): l for l in meta["layers"]}

# ---------------------------------------------------------------- visible masks
vis = {}

# sun: supplied sun.png is clipped on its right edge, so rebuild from red dominance
SX0, SY0, SX1, SY1 = 1156, 158, 1316, 328
reg = src[SY0:SY1, SX0:SX1]
red = reg[..., 0] - reg[..., 1]
m = close(red > 26, 5)
m = dil(fill_holes(m), 5)
vis["sun"] = (SX0, SY0, m)
print("sun      vis=%.3f" % m.mean())

R_CLOSE = {"cranes": 8, "boat": 4, "pavilion": 5, "pine": 4}
R_DIL = {"cranes": 5, "boat": 5, "pavilion": 5, "pine": 6}
for name in R_CLOSE:
    l = L[name]
    x, y, w, h = l["x"], l["y"], l["width"], l["height"]
    a0 = np.asarray(Image.open(f"{SRC}/layers/{name}.png").convert("RGBA"))[..., 3] / 255.0
    # the automatic extraction has hard-clipped borders (alpha 255 / specks on the bbox rim)
    a0[:2, :] = 0; a0[-2:, :] = 0; a0[:, :2] = 0; a0[:, -2:] = 0
    a0[a0 < 0.10] = 0
    m = close(a0 > 0.10, R_CLOSE[name])
    m = dil(fill_holes(m), R_DIL[name])
    if name == "pine":
        m = m.copy()
        m[:, -14:] |= np.repeat(m[:, -24:-14].any(axis=1)[:, None], 14, axis=1)
        m[-10:, :] |= np.repeat(m[-22:-10, :].any(axis=0)[None, :], 10, axis=0)
    vis[name] = (x, y, m)
    print(f"{name:9s} vis={m.mean():.3f}")

# ---------------------------------------------------------------- plate
t0 = time.time()
plate = src.copy()
hole = np.zeros((H, W), bool)
for name, (x, y, m) in vis.items():
    g = np.zeros((H, W), bool)
    g[y:y + m.shape[0], x:x + m.shape[1]] = m
    hole |= g
hole = dil(hole, 3)
for name in sorted(vis, key=lambda n: -vis[n][2].sum()):
    x, y, m = vis[name]
    g = np.zeros((H, W), bool)
    g[y:y + m.shape[0], x:x + m.shape[1]] = m
    g = dil(g, 3)
    if name == "boat":
        plate = inpaint_water(plate, g)
    else:
        plate = inpaint_mist(plate, g, sigma={"pine": 4.2, "pavilion": 2.8, "cranes": 2.4, "sun": 2.2}[name])
    print("inpaint", name, "%.1fs" % (time.time() - t0))
np2im(plate).save(f"{PREV}/plate_raw.png")

# ---------------------------------------------------------------- bleed
pad = PAD
o_pad = np.pad(src, ((pad, pad), (pad, pad), (0, 0)), mode="reflect")
p_pad = np.pad(plate, ((pad, pad), (pad, pad), (0, 0)), mode="reflect")
yy, xx = np.mgrid[0:o_pad.shape[0], 0:o_pad.shape[1]]
d_out = np.maximum.reduce([np.maximum(pad - yy, yy - (pad + H - 1)),
                           np.maximum(pad - xx, xx - (pad + W - 1)),
                           np.zeros_like(xx)]).astype(np.float32)
ring = fblur(np.clip(d_out / pad, 0, 1), 1.2)
PAPER = np.array([245, 240, 230], np.float32)  # site --paper
# the bleed is only ever a soft haze: heavy blur kills the mirrored structure
# and the paper fade makes the scroll edge dissolve instead of ending.
soft_o = blur(o_pad, 12.0)
t = (np.clip(ring * 1.2, 0, 1) ** 0.9)[..., None]
bleed_col = soft_o * (1 - t) + PAPER * t
blended = p_pad * (1 - ring[..., None]) + bleed_col * ring[..., None]
np2im(blended).save(f"{PREV}/plate_padded.png")

# ---------------------------------------------------------------- layers
PH, PW = H + 2 * pad, W + 2 * pad
# painting canvas: real pixels inside the picture, soft bleed outside
paint_pad = np.pad(src, ((pad, pad), (pad, pad), (0, 0)), mode="reflect")
paint_pad = np.where(ring[..., None] > 0, blended, paint_pad)
yy2, xx2 = np.mgrid[0:PH, 0:PW]
fade_in_bleed = np.clip(1.0 - d_out / (pad * 0.95), 0, 1) ** 0.9

out_layers, layout = {}, {}

for name, (ax, ay, m) in vis.items():
    hole = dil(m, 3)                      # exactly what the plate had to invent
    # full-canvas alpha, extended into the bleed with a soft fade
    A_art = np.zeros((H, W), np.float32)
    A_art[ay:ay + m.shape[0], ax:ax + m.shape[1]] = hole.astype(np.float32)
    A_pad = np.pad(A_art, ((pad, pad), (pad, pad)), mode="reflect") * np.where(d_out > 0, fade_in_bleed, 1.0)
    A_pad = fblur(A_pad, 1.0)

    l = L[name]
    bx, by, bw, bh = l["x"], l["y"], l["width"], l["height"]
    # crop rect: hole bbox + a transparent margin (and the bleed for the pine)
    ys, xs = np.nonzero(A_pad > 0.002)
    x0 = int(max(0, xs.min() - MARGIN))
    y0 = int(max(0, ys.min() - MARGIN))
    x1 = int(min(PW, xs.max() + 1 + MARGIN))
    y1 = int(min(PH, ys.max() + 1 + MARGIN))

    sub_a = A_pad[y0:y1, x0:x1]
    sub_c = paint_pad[y0:y1, x0:x1]
    rgba = np.dstack([np.clip(sub_c, 0, 255), np.clip(sub_a * 255, 0, 255)]).astype(np.uint8)
    img = Image.fromarray(rgba, "RGBA")
    out_layers[name] = img
    layout[name] = dict(x=x0, y=y0, w=x1 - x0, h=y1 - y0)
    img.save(f"{PREV}/layer_{name}.png")
    print(name, "layer", img.size, layout[name], "opaque=%.3f" % (sub_a > .5).mean())

# ---------------------------------------------------------------- checks
def composite(amp=0):
    base = Image.fromarray(np.clip(blended, 0, 255).astype(np.uint8), "RGB").convert("RGBA")
    for l in sorted(L.values(), key=lambda l: l["zIndex"]):
        n = l["file"].replace(".png", "")
        g = layout[n]
        d = int(round(l["depth"] * amp))
        base.alpha_composite(out_layers[n], (g["x"] + d, g["y"] + d))
    return base

rest = composite(0).convert("RGB")
rest.save(f"{PREV}/composite_at_rest.png")
d_art = np.abs(np.asarray(rest).astype(np.float32) - o_pad)[pad:pad + H, pad:pad + W]
print("ART   mean %.3f  p99 %.0f  max %.0f  PSNR %.1f dB" % (d_art.mean(), np.percentile(d_art, 99), d_art.max(),
                                                             10 * np.log10(255 ** 2 / max((d_art ** 2).mean(), 1e-9))))
d = np.abs(np.asarray(rest).astype(np.float32) - o_pad)
print("REST  mean %.3f  p99 %.0f  max %.0f  PSNR %.1f dB" % (d.mean(), np.percentile(d, 99), d.max(),
                                                            10 * np.log10(255 ** 2 / max((d ** 2).mean(), 1e-9))))
np2im(np.clip(d * 6, 0, 255)).save(f"{PREV}/diff_x6.png")
for amp, tag in ((28, "full"), (14, "half"), (6, "near")):
    composite(amp).convert("RGB").save(f"{PREV}/composite_shift_{tag}.png")

# ---------------------------------------------------------------- export
bg = np2im(blended).convert("RGB")
bg.save(f"{OUT}/background.webp", "WEBP", quality=82, method=6)
bg.save(f"{OUT}/background.jpg", quality=90, optimize=True)
for n, im in out_layers.items():
    im.save(f"{OUT}/{n}.webp", "WEBP", quality=92, method=6)
lq = bg.resize((32, round(32 * bg.height / bg.width)), Image.LANCZOS)
b = io.BytesIO(); lq.save(b, "WEBP", quality=45)
lqip = base64.b64encode(b.getvalue()).decode()

report = dict(canvas=dict(width=W + 2 * pad, height=H + 2 * pad, pad=pad, artW=W, artH=H),
              layers=[dict(name=n, **layout[n], z=L[n]["zIndex"], depth=L[n]["depth"]) for n in layout],
              lqip=lqip)
json.dump(report, open(os.path.join(os.path.dirname(__file__), "last-run-report.json"), "w"), indent=1)
print(json.dumps({k: v for k, v in report.items() if k != "lqip"}, indent=1))
for f in sorted(os.listdir(OUT)):
    print(f"{f:20s} {os.path.getsize(os.path.join(OUT, f)) / 1024:7.1f} KB")
