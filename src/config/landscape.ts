/**
 * 烟岚山水 · 视差图层配置
 *
 * 坐标全部来自素材元数据 metadata/layers.json，并加上了 36px 的外扩出血
 * （bleed），所以坐标系是 1744 × 1013，而不是原画的 1672 × 941。
 * 每个图层只在这里记录一次；组件用百分比换算，任何尺寸下都不会错位。
 */

export const landscapeCanvas = {
  /** 含出血的完整画布 */
  width: 1744,
  height: 1013,
  /** 原始画作在画布中的区域 */
  artWidth: 1672,
  artHeight: 941,
  /** 四周外扩的出血，用于视差位移时不留空洞 */
  pad: 36,
} as const;

/** 背景（clean plate）与图层共用的指针位移换算基准 */
export const MAX_SHIFT_REFERENCE = 1744;

export type LayerAnimation = "sun-breathe" | "cranes-drift" | "pine-sway";

export interface LandscapeLayerConfig {
  id: string;
  /** 不带扩展名的资源路径：会同时加载 .webp 与 .png */
  file: string;
  x: number;
  y: number;
  width: number;
  height: number;
  z: number;
  /** 指针到边缘时该图层的位移，单位为画布像素 */
  shift: number;
  animation?: LayerAnimation;
  label: string;
}

export const backgroundLayer = {
  id: "background",
  file: "/images/landscape/background",
  shift: 2,
  label: "水墨山水长卷：远山、飞瀑、江上一叶扁舟与两只飞鹤",
} as const;

export const landscapeLayers: LandscapeLayerConfig[] = [
  {
    id: "sun",
    file: "/images/landscape/sun",
    x: 1177,
    y: 181,
    width: 185,
    height: 156,
    z: 2,
    shift: 4,
    animation: "sun-breathe",
    label: "落日",
  },
  {
    id: "cranes",
    file: "/images/landscape/cranes",
    x: 853,
    y: 249,
    width: 302,
    height: 148,
    z: 3,
    shift: 6,
    animation: "cranes-drift",
    label: "双鹤",
  },
  {
    id: "pavilion",
    file: "/images/landscape/pavilion",
    x: 1089,
    y: 491,
    width: 140,
    height: 105,
    z: 4,
    shift: 5,
    label: "山顶亭台",
  },
  {
    id: "boat",
    file: "/images/landscape/boat",
    x: 554,
    y: 809,
    width: 182,
    height: 102,
    z: 5,
    shift: 9,
    label: "江上小舟",
  },
  {
    id: "pine",
    file: "/images/landscape/pine",
    x: 1135,
    y: 606,
    width: 609,
    height: 407,
    z: 6,
    shift: 15,
    animation: "pine-sway",
    label: "前景松树",
  },
];

/** 山水画纸的极低分辨率占位图，避免首屏出现白闪 */
export const landscapeLqip =
  "data:image/webp;base64,UklGRqIAAABXRUJQVlA4IJYAAACQBACdASogABMAPtlWpEyoJKOiN/VYAQAbCWcAzjhcl/FiApXiq3a4yWM4XCAA/vFDX7/rWigKR07/erb6sXGWKPbU2NA773LRSKZLR6UQQK/KWNwu7CCp2q2KLtxUs38aSM5jo4er3j9+o2/RlIxUh8m9qu2f3GEVvmFicWAx5uZ5DIvgGgetxpqDr+Mo339JskEAAAA=";

/** 画布像素 -> 场景宽度比例（CSS 里乘以 --scene-w 使用） */
export const shiftRatio = (shift: number) => shift / MAX_SHIFT_REFERENCE;

/** 画布像素 -> 百分比字符串，用于 left / top / width / height */
export const pct = (value: number, total: number) => `${Number(((value / total) * 100).toFixed(4))}%`;
