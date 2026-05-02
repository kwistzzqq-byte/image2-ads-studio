import type { DeterministicChecks, DeterministicValidationResult } from "./types.js";

const STYLE_REWRITE_RULES: Array<[RegExp, string]> = [
  [/类似(?:苹果|Apple)\s*风[^，。；;\n]{0,8}|像(?:苹果|Apple)\s*风[^，。；;\n]{0,8}/gi, "浅灰或纯白背景、产品居中、柔和阴影、少文字、边缘清晰、材质真实"],
  [/高级感风格|高级感/g, "低饱和主色、留白25%、细线分隔、主体边缘轮廓光、表面材质清楚、无杂乱装饰"],
  [/网红风/g, "高明度背景、自然光、可拍照打卡点、主体居中、少量生活化道具、文字区简洁"],
  [/ins风/gi, "自然光、浅色背景、主体居中、柔和阴影、少量生活化道具"],
  [/大牌感/g, "极简背景、主体占比大、单一主色、精确留白、细节高光、无多余装饰"],
  [/电影感/g, "冷暖对比光、前中后景纵深、低照度层次、空气透视、主体轮廓光"],
  [/苹果风|Apple\s*风/gi, "浅灰或纯白背景、产品居中、柔和阴影、少文字、边缘清晰、材质真实"],
  [/商业棚拍风格|棚拍风格/g, "中性背景、柔和主光、真实阴影、产品材质清楚、边缘轮廓清晰"],
  [/类似[^，。；;\n]{0,18}/g, "按明确构图、材质、灯光、色彩和文字层级执行"],
  [/像[^，。；;\n]{0,18}/g, "按明确构图、材质、灯光、色彩和文字层级执行"],
  [/参考[^，。；;\n]{0,18}风格/g, "提炼参考图的构图、材质、灯光、色彩和文字层级"],
  [/[A-Za-z0-9\u4e00-\u9fa5]{1,12}风格/g, "明确的构图、材质、灯光、色彩和文字层级"]
];

const BANNED_PATTERNS: RegExp[] = [
  /类似[^，。；;\n]{0,18}/g,
  /像[^，。；;\n]{0,18}/g,
  /参考[^，。；;\n]{0,18}风格/g,
  /高级感风格/g,
  /[A-Za-z0-9\u4e00-\u9fa5]{1,12}风格/g,
  /网红风/g,
  /ins风/gi,
  /大牌感/g,
  /电影感/g,
  /苹果风|Apple\s*风/gi
];

const CHECK_PATTERNS: Record<keyof Omit<DeterministicChecks, "bannedPhrasesRemoved">, RegExp> = {
  compositionSpecified: /构图|主体|居中|偏左|偏右|上方|下方|前景|中景|背景|占比|留白|分区|主视觉|文字区|卖点区/,
  lightingSpecified: /灯光|自然光|柔光|主光|辅光|轮廓光|高光|阴影|反射|背光|冷暖对比|光源/,
  typographySpecified: /文字|文案|标题|字体|字号|行距|字距|层级|可读|信息区|卖点/,
  materialsSpecified: /材质|亚克力|金属|木纹|玻璃|石材|水泥|喷绘|灯箱|LED|布纹|纸张|塑料|反光|表面|纹理/,
  imageReferencePolicySpecified: /参考图|上传图|保留|不改变|结构|主体|透视|门窗|边界|上游|不照抄|无参考图/
};

export function rewriteAmbiguousStyleText(text: string): string {
  return STYLE_REWRITE_RULES.reduce((current, [pattern, replacement]) => current.replace(pattern, replacement), text);
}

export function findBannedPromptPhrases(text: string): string[] {
  const matches = BANNED_PATTERNS.flatMap((pattern) => Array.from(text.matchAll(pattern), (match) => match[0].trim()));
  return [...new Set(matches)].filter(Boolean);
}

export function buildDeterministicChecks(text: string): DeterministicChecks {
  const bannedPhrases = findBannedPromptPhrases(text);
  return {
    bannedPhrasesRemoved: bannedPhrases.length === 0,
    compositionSpecified: CHECK_PATTERNS.compositionSpecified.test(text),
    lightingSpecified: CHECK_PATTERNS.lightingSpecified.test(text),
    typographySpecified: CHECK_PATTERNS.typographySpecified.test(text),
    materialsSpecified: CHECK_PATTERNS.materialsSpecified.test(text),
    imageReferencePolicySpecified: CHECK_PATTERNS.imageReferencePolicySpecified.test(text)
  };
}

export function validateDeterministicPrompt(text: string): DeterministicValidationResult {
  const checks = buildDeterministicChecks(text);
  const missingRequirements = Object.entries(checks)
    .filter(([, passed]) => !passed)
    .map(([name]) => name);
  return {
    checks,
    bannedPhrases: findBannedPromptPhrases(text),
    missingRequirements,
    passed: missingRequirements.length === 0
  };
}

export function formatDeterministicRequirements(): string {
  return [
    "- 不使用模糊类比词、社媒取向词、品牌取向词或大片取向词。",
    "- 如果用户输入包含模糊表达，必须改写为明确的构图、材质、灯光、色彩、文字层级和保留/修改规则。",
    "- 必须写清楚主体位置、画面分区、光源方向、主要材质、文字区域和参考图处理方式。",
    "- 上传图修改必须明确保留结构、主体、透视、门窗/墙面边界或产品核心识别；无参考图时写明无参考图。"
  ].join("\n");
}
