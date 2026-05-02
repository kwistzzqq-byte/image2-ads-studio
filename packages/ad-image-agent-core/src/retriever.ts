import { promptTemplates } from "./templates.js";
import type { AdImageBrief, PromptTemplate, ScoredPromptTemplate } from "./types.js";

export function retrieveTemplates(brief: AdImageBrief, limit = 5): ScoredPromptTemplate[] {
  const stageOne = promptTemplates.filter((template) => template.taskType === brief.taskType && template.supportedInputModes.includes(brief.inputMode));
  const referenceMatched = stageOne.filter((template) => template.referenceImageRoles.includes(brief.referenceImageRole));
  const candidates = referenceMatched.length ? referenceMatched : stageOne.length ? stageOne : promptTemplates;
  return candidates
    .map((template) => scoreTemplate(template, brief))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.template.id.localeCompare(b.template.id))
    .slice(0, limit);
}

function scoreTemplate(template: PromptTemplate, brief: AdImageBrief): ScoredPromptTemplate {
  let score = 0;
  const reasons: string[] = [];
  const text = normalizeText(`${brief.userRequest} ${brief.copywriting} ${brief.styleDirection} ${brief.industry}`);
  const matchedIndustries = matchTerms(template.industries, text);
  const matchedUseCases = matchTerms(template.useCases ?? [], text);
  const matchedMaterialKeywords = matchTerms(template.materialKeywords ?? [], text);
  const matchedBusinessKeywords = matchTerms(template.businessKeywords ?? [], text);
  const matchedVisualKeywords = matchTerms(template.visualKeywords ?? [], text);
  const matchedKeywords = [
    ...matchedMaterialKeywords,
    ...matchedBusinessKeywords,
    ...matchedVisualKeywords
  ];
  if (template.taskType === brief.taskType) {
    score += 70;
    reasons.push("作图类型匹配");
  }
  if (template.supportedInputModes.includes(brief.inputMode)) {
    score += 25;
    reasons.push("输入方式匹配");
  }
  if (template.referenceImageRoles.includes(brief.referenceImageRole)) {
    score += 15;
    reasons.push("参考图用途匹配");
  }
  if (matchesIndustry(template, brief.industry)) {
    score += 12;
    reasons.push("行业相近");
  }
  if (matchedIndustries.length > 0) {
    score += Math.min(12, matchedIndustries.length * 4);
    reasons.push("行业关键词匹配");
  }
  if (matchedUseCases.length > 0) {
    score += Math.min(18, matchedUseCases.length * 6);
    reasons.push("使用场景匹配");
  }
  if (matchedMaterialKeywords.length > 0) {
    score += Math.min(10, matchedMaterialKeywords.length * 2);
    reasons.push("材质关键词匹配");
  }
  if (matchedBusinessKeywords.length > 0) {
    score += Math.min(16, matchedBusinessKeywords.length * 4);
    reasons.push("业务动作匹配");
  }
  if (matchedVisualKeywords.length > 0) {
    score += Math.min(12, matchedVisualKeywords.length * 3);
    reasons.push("视觉目标匹配");
  }
  const keywordHits = countKeywordHits(template, text);
  if (keywordHits > 0) {
    score += Math.min(18, keywordHits * 3);
    reasons.push("模板关键词命中");
  }
  const matchedTags = template.styleTags.filter((tag) => text.includes(tag.toLowerCase()));
  if (matchedTags.length > 0) {
    score += Math.min(8, matchedTags.length * 2);
    reasons.push("风格标签命中");
  }
  if (brief.inputMode === "image_edit" && template.supportedInputModes.length === 1) {
    score += 4;
    reasons.push("专用编辑模板");
  }
  return {
    template,
    score,
    reasons,
    matchedKeywords: [...new Set(matchedKeywords)],
    matchedIndustries: [...new Set(matchedIndustries)],
    matchedUseCases: [...new Set(matchedUseCases)]
  };
}

function matchesIndustry(template: PromptTemplate, industry: string): boolean {
  if (!industry) return false;
  return template.industries.some((item) => industry.includes(item) || item.includes(industry));
}

function countKeywordHits(template: PromptTemplate, text: string): number {
  const lowerText = normalizeText(text);
  const terms = [
    template.name,
    template.layoutPattern,
    template.promptSkeleton,
    ...template.industries,
    ...(template.useCases ?? []),
    ...(template.materialKeywords ?? []),
    ...(template.businessKeywords ?? []),
    ...(template.visualKeywords ?? []),
    ...template.variables.map((variable) => variable.label)
  ]
    .join(" ")
    .toLowerCase()
    .split(/[\s,，、。；;：:（）()/-]+/)
    .map((item) => item.trim())
    .filter((item) => item.length >= 2);
  return [...new Set(terms)].filter((term) => lowerText.includes(term)).length;
}

function matchTerms(terms: string[], text: string): string[] {
  return [...new Set(terms.filter((term) => term && text.includes(term.toLowerCase())))];
}

function normalizeText(text: string): string {
  return text.toLowerCase();
}
