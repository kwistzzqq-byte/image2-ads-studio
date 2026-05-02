import type { AdImageBrief, CompiledPrompt, ScoredPromptTemplate, ScoredVisualRecipe } from "./types.js";
import { buildDeterministicChecks, formatDeterministicRequirements, rewriteAmbiguousStyleText } from "./deterministic-prompt.js";
import { referenceRoleName, taskTypeName } from "./taskMetadata.js";

export function buildPlainPrompt(brief: AdImageBrief): string {
  const deterministicDirection = rewriteAmbiguousStyleText(brief.styleDirection);
  const deterministicRequest = rewriteAmbiguousStyleText(brief.userRequest);
  return [
    deterministicRequest || "请按我的需求生成一张广告图片。",
    brief.copywriting ? `文案：${brief.copywriting}` : "",
    `行业：${brief.industry}`,
    `画幅比例：${brief.aspectRatio}`,
    `画面执行：${deterministicDirection}`,
    brief.inputMode === "image_edit" ? `请参考我上传的图片，参考图用途：${referenceRoleName(brief.referenceImageRole)}。` : ""
  ]
    .filter(Boolean)
    .join("\n");
}

export function compilePrompt(
  brief: AdImageBrief,
  designPlan: string,
  templates: ScoredPromptTemplate[],
  recipes: ScoredVisualRecipe[] = []
): CompiledPrompt {
  const selectedTemplates = templates.map((item) => item.template);
  const selectedRecipes = recipes.map((item) => item.recipe);
  const deterministicRequest = rewriteAmbiguousStyleText(brief.userRequest);
  const deterministicDirection = rewriteAmbiguousStyleText(brief.styleDirection);
  const deterministicDesignPlan = rewriteAmbiguousStyleText(designPlan);
  const deterministicHardConstraints = brief.hardConstraints.map(rewriteAmbiguousStyleText);
  const negativeConstraints = [
    ...new Set([
      ...selectedTemplates.flatMap((template) => template.negativeConstraints),
      ...selectedRecipes.flatMap((recipe) => recipe.negativeConstraints)
    ])
  ];
  const templateNotes = selectedTemplates
    .map((template) => `- ${template.name}：${template.promptSkeleton}`)
    .join("\n");
  const recipeNotes = selectedRecipes.map(formatRecipe).join("\n\n");
  const finalPrompt = [
    "请根据以下广告制作需求生成一张商业可用的图片。",
    "",
    "【用户需求】",
    deterministicRequest || "按表单字段生成广告作图方案。",
    "",
    "【结构化需求】",
    `作图类型：${taskTypeName(brief.taskType)}`,
    `输入方式：${brief.inputMode === "image_edit" ? "上传图片修改" : "纯文本生成"}`,
    `行业：${brief.industry}`,
    `画幅比例：${brief.aspectRatio}`,
    `视觉执行方向：${deterministicDirection}`,
    `参考图保留策略：${referenceRoleName(brief.referenceImageRole)}`,
    brief.copywriting ? `必须使用的文案：${brief.copywriting}` : "文案要求：如未提供具体文案，只预留清晰文案区，不编造价格、日期或品牌承诺。",
    "",
    "【设计方案】",
    deterministicDesignPlan,
    "",
    "【可借鉴模板方向】",
    templateNotes || "- 使用通用广告制作构图，主体明确、信息清晰、可交付。",
    "",
    "【效果级视觉配方】",
    recipeNotes || "- 使用清晰商业摄影或平面设计逻辑，补充主体位置、场景、灯光、文字区域和细节约束。",
    "",
    "【生成要求】",
    generationRequirements(brief),
    "",
    "【确定性执行要求】",
    formatDeterministicRequirements(),
    "",
    "【避免】",
    [...negativeConstraints, ...deterministicHardConstraints].map((item) => `- ${item}`).join("\n")
  ].join("\n");
  const deterministicFinalPrompt = rewriteAmbiguousStyleText(finalPrompt);

  return {
    brief,
    designPlan: deterministicDesignPlan,
    finalPrompt: deterministicFinalPrompt,
    templateIds: [...selectedTemplates.map((template) => template.id), ...selectedRecipes.map((recipe) => recipe.id)],
    negativeConstraints,
    deterministicChecks: buildDeterministicChecks(deterministicFinalPrompt)
  };
}

function formatRecipe(recipe: ScoredVisualRecipe["recipe"]): string {
  return [
    `- ${recipe.name}`,
    `  来源结构：${recipe.source.repo} ${recipe.source.caseId}（已去具体化并改写为通用配方）`,
    `  构图：${recipe.layoutFormula}`,
    `  主体：${recipe.subjectFormula}`,
    `  场景：${recipe.sceneFormula}`,
    `  灯光：${recipe.lightingFormula}`,
    `  文字：${recipe.typographyFormula}`,
    `  细节：${recipe.detailFormula}`
  ].join("\n");
}

function generationRequirements(brief: AdImageBrief): string {
  const shared = [
    "- 画面要像真实广告制作交付稿，不要像纯概念艺术。",
    "- 中文文字必须清晰、准确、可读，不要编造用户未提供的价格、日期、电话或地址。",
    "- 结构、材质、灯光和比例要符合实际制作或商业投放逻辑。"
  ];
  const taskSpecific: Record<AdImageBrief["taskType"], string[]> = {
    storefront_signboard: ["- 招牌、墙面、门窗、灯光和材质关系要合理。", "- 如果是上传图修改，保持原图结构、透视和主体位置。"],
    poster_design: ["- 画面要有明确主标题、主视觉、卖点区和辅助信息区。", "- 中文排版要有商业设计层级，标题、价格、日期和说明不能混乱。"],
    rollup_banner: ["- 竖版构图要适合展架物料，标题、卖点和联系方式分区清晰。", "- 展架底部信息不要拥挤，预留二维码或行动引导区域。"],
    event_backdrop: ["- 背景板要适合现场拍照、舞台或展位观看，主标题不可被遮挡。", "- 大面积背景要干净，避免复杂小字和不可喷绘细节。"],
    signage_wayfinding: ["- 箭头、楼层、区域或功能信息必须方向清楚、易读。", "- 标识牌比例、安装位置和空间透视要真实。"],
    brand_wall: ["- logo、品牌名和墙面材质要贴合现场空间。", "- 上墙效果必须保留墙面边界、透视和安装逻辑。"],
    local_store_promotion: ["- 促销信息要突出到店转化，主标题和利益点优先。", "- 门店、产品或服务主体不能被装饰遮挡。"],
    ecommerce_main_image: ["- 产品主体必须清晰，占比足够，适合平台主图。", "- 不要改变产品外观、包装形状、标签和核心识别。"],
    product_ad: ["- 产品hero主体、卖点区和品牌氛围要形成完整广告图。", "- 不要编造产品功效、资质、价格或认证信息。"],
    commercial_photography: ["- 画面以真实摄影质感为主，强调光影、材质和场景可信度。", "- 默认不添加文字，除非用户明确提供文案。"]
  };
  return [...shared, ...taskSpecific[brief.taskType]].join("\n");
}
