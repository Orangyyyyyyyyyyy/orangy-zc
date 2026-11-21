#!/usr/bin/env node
/**
 * Agnes AI 图片生成模块（服务端专用，Key 不进浏览器）
 *
 * 端点：https://apihub.agnes-ai.com/v1/images/generations
 * 认证：Authorization: Bearer <API_KEY>
 * 文生图：model=agnes-image-2.1-flash，参数 prompt / size / n
 * 响应：{ data: [{ url | b64_json }] }
 *
 * 本模块把生成的图片下载/写出到本地 images/ 目录，并返回可经静态服务访问的相对路径，
 * 实现「上传到个人工作台用于展示」。同时做基础质量门禁，过滤无效/过小（疑似占位）图片。
 *
 * 网络兼容：优先用 Node fetch；若 fetch 因网络环境（如沙箱无直连出口）失败，自动用
 * curl 兜底（curl 可经系统代理出网）。
 *
 * 长度自适应：Agnes 对 prompt 长度敏感，超长会返回 400 input length too long。
 * generateImage 会从 PROMPT_MAX 起，遇到「过长」错误时逐级缩短 prompt 重试，
 * 直到成功或触底，从而兼容不同 Key / 账户等级的长度限制。
 */

const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');

/**
 * 异步 curl（Promise 版）。
 * 关键修复：原实现用 execFileSync 同步阻塞 Node 事件循环最长 120s，
 * 一次出图会卡死整个服务（并发请求读不到请求头 -> Node 内置超时回 408 /
 * 直接 RST 连接，前端表现为 HTTP 408 / ERR_CONNECTION_RESET）。
 * 改为异步 execFile 后事件循环保持畅通，服务端护栏定时器也能正常触发。
 */
function curlAsync(args, opts) {
  return new Promise((resolve) => {
    execFile('curl', args, Object.assign({ maxBuffer: 50 * 1024 * 1024, encoding: 'buffer' }, opts || {}),
      (err, stdout) => {
        if (err && (!stdout || !stdout.length)) resolve({ err, out: null });
        else resolve({ err: null, out: stdout });
      });
  });
}

const __dirname_local = __dirname;
const IMAGES_DIR = path.join(__dirname_local, 'images');
if (!fs.existsSync(IMAGES_DIR)) {
  try { fs.mkdirSync(IMAGES_DIR, { recursive: true }); } catch (e) { /* ignore */ }
}

const AGNES_ENDPOINT = 'https://apihub.agnes-ai.com/v1/images/generations';

// 安全上限起点：Agnes 对 prompt 长度敏感，超出会返回 400 input length too long。
// generateImage 会从该值开始，遇到「过长」错误时逐级缩短重试。
const PROMPT_MAX = 200;

// 基础图片校验：PNG / JPEG 魔数
function validImage(buf) {
  if (!buf || buf.length < 100) return false;
  const isPng = buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47;
  const isJpg = buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF;
  return isPng || isJpg;
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

/**
 * 将 prompt 截断到 maxChars，尽量在句号/逗号/空格处自然断句，避免生硬截断。
 */
function safePrompt(p, maxChars) {
  if (!p || typeof p !== 'string') return p || '';
  const m = Math.max(0, Math.floor(maxChars));
  if (p.length <= m) return p;
  let cut = p.slice(0, m);
  const lastBreak = Math.max(
    cut.lastIndexOf('。'), cut.lastIndexOf('，'),
    cut.lastIndexOf(','), cut.lastIndexOf(' '),
  );
  if (lastBreak > m * 0.5) cut = cut.slice(0, lastBreak + 1);
  return cut.trim();
}

/**
 * 识别「输入过长」类错误，便于 generateImage 缩短后重试。
 */
function isLengthError(data) {
  const msg = (data && data.error && (typeof data.error === 'string' ? data.error : data.error.message)) || '';
  return /input length|too long|prompt.*(too long|length)|length.*exceed|content.*too long/i.test(String(msg));
}

/**
 * fetch 单次调用 Agnes，成功返回 {ok:true, item}；业务/网络错误抛 typed error。
 */
async function postFetch(apiKey, endpoint, model, size, prompt) {
  const body = JSON.stringify({ model, prompt, n: 1, size });
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 60000); // 单次 60s，配合服务端 75s 护栏
  const resp = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + apiKey },
    body,
    signal: ctrl.signal,
  });
  clearTimeout(timer);
  const data = await resp.json().catch(() => ({}));
  if (resp.ok) {
    const item = data.data && data.data[0];
    if (!item) throw { code: 'EMPTY', message: '接口未返回图片', status: resp.status };
    return { ok: true, item };
  }
  const message = (data.error && (data.error.message || data.error)) || ('HTTP ' + resp.status);
  const err = { code: 'UP_' + resp.status, message, status: resp.status };
  if (resp.status === 429) err.rate = true;
  if (isLengthError(data)) err.length = true;
  throw err;
}

/**
 * curl 单次调用 Agnes（沙箱 fetch 无直连出口时的兜底，curl 可经代理出网）。
 * 异步执行，不阻塞事件循环。返回 {ok:true, item} 或 typed error 对象。
 */
async function postCurl(apiKey, endpoint, model, size, prompt, proxy) {
  const body = JSON.stringify({ model, prompt, n: 1, size });
  const args = [
    '-sS', '-m', '60', '-X', 'POST', endpoint,
    '-H', 'Content-Type: application/json',
    '-H', 'Authorization: Bearer ' + apiKey,
    '-w', '\n__HTTP__%{http_code}',
    '-d', body,
  ];
  if (proxy) args.unshift('-x', proxy);
  const r = await curlAsync(args, { timeout: 65000 });
  if (!r.out || !r.out.length) {
    return { ok: false, code: 'CURL_FAIL', message: 'curl 调用失败：' + ((r.err && r.err.message) || '') };
  }
  const s = r.out.toString();
  const m = s.match(/__HTTP__(\d+)\s*$/);
  const status = m ? parseInt(m[1], 10) : 0;
  const jsonStr = s.replace(/__HTTP__\d+\s*$/, '').trim();
  let data;
  try { data = JSON.parse(jsonStr); } catch (e) {
    // 无 __HTTP__ 结尾说明 curl 被 -m 超时中断（上游 60s 未回完），按超时归类
    if (!m) return { ok: false, code: 'CURL_TIMEOUT', message: '上游响应超时（60s），可能限流或网络缓慢' };
    return { ok: false, code: 'CURL_PARSE', message: 'curl 返回无法解析', status };
  }
  if (status !== 200) {
    const message = (data && data.error && (data.error.message || data.error)) || ('HTTP ' + status);
    const r = { ok: false, code: 'UP_' + status, message, status };
    if (status === 429) r.rate = true;
    if (isLengthError(data)) r.length = true;
    return r;
  }
  const item = data.data && data.data[0];
  if (!item) return { ok: false, code: 'EMPTY', message: '接口未返回图片', status };
  return { ok: true, item };
}

/**
 * 单次尝试：fetch 优先，网络层失败用 curl 兜底。
 * 返回 {ok:true, item} 或 typed error 对象（含 rate / length 标记）。
 */
/**
 * 直连尝试：fetch 优先，网络层失败用「无代理」curl 兜底一次。
 * 供「配置了代理但代理不可用」时的降级路径复用，也用于未配置代理的常规路径。
 * 返回 {ok:true, item} 或 typed error 对象。
 */
async function directAttempt(apiKey, endpoint, model, size, prompt) {
  try {
    const r = await postFetch(apiKey, endpoint, model, size, prompt);
    if (r.ok) return { ok: true, item: r.item };
  } catch (err) {
    if (err && err.code && (err.code.indexOf('UP_') === 0 || err.code === 'EMPTY' || err.rate)) {
      // 业务级错误（含限流/过长），不再走 curl 兜底，直接返回以便上层决策
      return { ok: false, code: err.code, message: err.message, status: err.status, rate: err.rate, length: err.length };
    }
    // 网络层失败（如沙箱无直连出口，但 curl 可出网）：用「无代理」curl 兜底一次
    const c = await postCurl(apiKey, endpoint, model, size, prompt);
    if (c.ok) return { ok: true, item: c.item };
    return c;
  }
  return { ok: false, code: 'UNKNOWN', message: '未知错误' };
}

async function attemptOnce(apiKey, endpoint, model, size, prompt, proxy) {
  // 配置了代理时，优先走 curl -x 代理（Node fetch 难以直接走任意 HTTP 代理）
  if (proxy) {
    const c = await postCurl(apiKey, endpoint, model, size, prompt, proxy);
    if (c.ok) return { ok: true, item: c.item };
    // 代理连接失败（如本地代理未启动 / 端口不通：curl (7) Couldn't connect）
    // 时，降级为直连重试，避免「配置过代理但代理挂了」导致全部请求失败
    if (c.code === 'CURL_FAIL') {
      const direct = await directAttempt(apiKey, endpoint, model, size, prompt);
      if (direct.ok) return direct;
    }
    return c;
  }
  return directAttempt(apiKey, endpoint, model, size, prompt);
}

/**
 * 下载/写出图片，并做质量门禁（下载走异步 curl，不阻塞事件循环）。成功返回 {ok:true, image, bytes}。
 */
async function saveImage(item, dir, relDir) {
  let buf;
  if (item.b64_json) {
    buf = Buffer.from(item.b64_json, 'base64');
  } else if (item.url) {
    const r = await curlAsync(['-sS', '-f', '-m', '60', item.url], { timeout: 65000 });
    if (r.err || !r.out) return { ok: false, code: 'DL_FAIL', message: '图片下载失败' };
    buf = r.out;
  } else {
    return { ok: false, code: 'NO_IMG', message: '返回结果缺少图片字段' };
  }
  if (!validImage(buf)) return { ok: false, code: 'BAD_IMG', message: '返回内容不是有效的 PNG/JPG' };
  if (buf.length < 2048) return { ok: false, code: 'LOW_QUALITY', message: '图片体积过小，疑似低质/占位图，已弃用' };
  // 文件名前缀跟随目标目录，与目录中既有文件保持一致：images/ → img_、wishes/ → wish_。
  // 原先无论存到哪个目录都写死 wish_ 前缀，导致目录里混进一堆 wish_*.png，难以辨识与清理。
  const prefix = relDir === '/wishes' ? 'wish_' : (relDir.replace(/^\//, '') || 'img') + '_';
  const fname = prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 7) + '.png';
  fs.writeFileSync(path.join(dir, fname), buf);
  return { ok: true, image: relDir + '/' + fname, bytes: buf.length };
}

/**
 * 生成一张图片并落盘（带 prompt 长度自适应）。
 * @param {object} opts { prompt, size?, model?, apiKey, endpoint? }
 * @returns {Promise<{ok:boolean, image?:string, bytes?:number, error?:string, message?:string, truncated?:boolean}>}
 */
async function generateImage(opts) {
  const o = opts || {};
  const prompt = o.prompt;
  const size = o.size || '1024x1024';
  const model = o.model || 'agnes-image-2.1-flash';
  const apiKey = o.apiKey;
  const endpoint = o.endpoint || AGNES_ENDPOINT;
  const proxy = o.proxy || '';
  // 支持将图片写入指定子目录（如 'wishes'），默认写入 images/
  const dir = o.dir ? path.join(__dirname_local, o.dir) : IMAGES_DIR;
  const relDir = o.dir ? ('/' + o.dir) : '/images';
  if (!fs.existsSync(dir)) { try { fs.mkdirSync(dir, { recursive: true }); } catch (e) { /* ignore */ } }

  if (!apiKey) return { ok: false, error: 'NO_KEY', message: '未配置 Agnes API Key' };
  if (!prompt) return { ok: false, error: 'BAD_REQUEST', message: 'prompt 不能为空' };

  // 逐级缩短：遇到「输入过长」就缩短重试，直到成功、触底或到达截止时间。
  // deadline：调用方可传总耗时上限（ms），避免多轮重试超出服务端护栏（默认 70s）。
  const deadline = Date.now() + (typeof o.deadlineMs === 'number' ? o.deadlineMs : 70000);
  const lengths = [PROMPT_MAX, 150, 110, 80, 55, 40];
  let last = null;
  let truncated = false;
  for (const maxc of lengths) {
    if (Date.now() >= deadline) {
      return { ok: false, error: 'DEADLINE', message: '图片生成耗时超出上限（上游缓慢或限流），请稍后重试', truncated };
    }
    const p = safePrompt(prompt, maxc);
    if (p.length < prompt.length) truncated = true;
    const r = await attemptOnce(apiKey, endpoint, model, size, p, proxy);
    if (r.ok) {
      const saved = await saveImage(r.item, dir, relDir);
      if (saved.ok) return { ok: true, image: saved.image, bytes: saved.bytes, truncated };
      // 图片校验失败 -> 当作本次失败，尝试下一档更短 prompt（有时更短描述反而更稳定）
      last = { ok: false, error: saved.code, message: saved.message };
      continue;
    }
    if (r.rate) { await sleep(Math.min(15000, Math.max(0, deadline - Date.now()))); last = r; continue; } // 限流退避重试
    if (r.length) { last = r; continue; }                   // 输入过长 -> 缩短重试
    return { ok: false, error: r.code || 'UPSTREAM', message: r.message }; // 其他硬错误，停止
  }
  return { ok: false, error: (last && last.error) || (last && last.code) || 'RETRY', message: (last && last.message) || '多次缩短 prompt 仍失败（可能为限流或额度）', truncated };
}

module.exports = { generateImage, IMAGES_DIR, AGNES_ENDPOINT, validImage, safePrompt, PROMPT_MAX };
