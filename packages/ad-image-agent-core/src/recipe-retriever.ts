import type { AdImageBrief, ScoredVisualRecipe, VisualRecipe } from "./types.js";
import { visualRecipes } from "./visual-recipes.js";

export function retrieveVisualRecipes(brief: AdImageBrief, limit = 3): ScoredVisualRecipe[] {
  const stageOne = visualRecipes.filter((recipe) => recipe.taskTypes.includes(brief.taskType) && recipe.supportedInputModes.includes(brief.inputMode));
  const referenceMatched = stageOne.filter((recipe) => recipe.referenceImageRoles.includes(brief.referenceImageRole));
  const candidates = referenceMatched.length ? referenceMatched : stageOne.length ? stageOne : visualRecipes;
  return candidates
    .map((recipe) => scoreRecipe(recipe, brief))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.recipe.id.localeCompare(b.recipe.id))
    .slice(0, limit);
}

function scoreRecipe(recipe: VisualRecipe, brief: AdImageBrief): ScoredVisualRecipe {
  let score = 0;
  const reasons: string[] = [];
  const text = normalizeText(`${brief.userRequest} ${brief.copywriting} ${brief.styleDirection} ${brief.industry}`);
  const matchedIndustries = matchTerms(recipe.industries, text);
  const matchedUseCases = matchTerms(recipe.useCases ?? [], text);
  const matchedMaterialKeywords = matchTerms(recipe.materialKeywords ?? [], text);
  const matchedBusinessKeywords = matchTerms(recipe.businessKeywords ?? [], text);
  const matchedVisualKeywords = matchTerms(recipe.visualKeywords ?? [], text);
  const matchedKeywords = [
    ...matchedMaterialKeywords,
    ...matchedBusinessKeywords,
    ...matchedVisualKeywords
  ];
  if (recipe.taskTypes.includes(brief.taskType)) {
    score += 70;
    reasons.push("作图类型匹配");
  }
  if (recipe.supportedInputModes.includes(brief.inputMode)) {
    score += 18;
    reasons.push("输入方式匹配");
  }
  if (recipe.referenceImageRoles.includes(brief.referenceImageRole)) {
    score += 12;
    reasons.push("参考图用途匹配");
  }
  if (matchesIndustry(recipe, brief.industry)) {
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
  const tagHits = recipe.styleTags.filter((tag) => text.includes(tag.toLowerCase())).length;
  if (tagHits > 0) {
    score += Math.min(12, tagHits * 3);
    reasons.push("风格标签命中");
  }
  const keywordHits = countKeywordHits(recipe, text);
  if (keywordHits > 0) {
    score += Math.min(24, keywordHits * 4);
    reasons.push("视觉配方关键词命中");
  }
  return {
    recipe,
    score,
    reasons,
    matchedKeywords: [...new Set(matchedKeywords)],
    matchedIndustries: [...new Set(matchedIndustries)],
    matchedUseCases: [...new Set(matchedUseCases)]
  };
}

function matchesIndustry(recipe: VisualRecipe, industry: string): boolean {
  if (!industry) return false;
  return recipe.industries.some((item) => industry.includes(item) || item.includes(industry));
}

function countKeywordHits(recipe: VisualRecipe, text: string): number {
  const terms = [
    recipe.name,
    recipe.layoutFormula,
    recipe.subjectFormula,
    recipe.sceneFormula,
    recipe.typographyFormula,
    recipe.detailFormula,
    ...recipe.industries,
    ...(recipe.useCases ?? []),
    ...(recipe.materialKeywords ?? []),
    ...(recipe.businessKeywords ?? []),
    ...(recipe.visualKeywords ?? []),
    ...recipe.variables.map((variable) => variable.label)
  ]
    .join(" ")
    .toLowerCase()
    .split(/[\s,，、。；;：:（）()/-]+/)
    .map((item) => item.trim())
    .filter((item) => item.length >= 2);
  return [...new Set(terms)].filter((term) => text.includes(term)).length;
}

function matchTerms(terms: string[], text: string): string[] {
  return [...new Set(terms.filter((term) => term && text.includes(term.toLowerCase())))];
}

function normalizeText(text: string): string {
  return text.toLowerCase();
}
