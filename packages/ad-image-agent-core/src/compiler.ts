import type { AdImageBrief, CompiledPrompt, ScoredPromptTemplate, ScoredVisualRecipe } from "./types.js";
import { buildDeterministicChecks, formatDeterministicRequirements, rewriteAmbiguousStyleText } from "./deterministic-prompt.js";
import { referenceRoleName, taskTypeName } from "./taskMetadata.js";

export function buildPlainPrompt(brief: AdImageBrief): string {
  const language = brief.outputLanguage;
  const deterministicDirection = rewriteAmbiguousStyleText(brief.styleDirection, language);
  const deterministicRequest = rewriteAmbiguousStyleText(brief.userRequest, language);
  if (language === "en") {
    return [
      deterministicRequest || "Generate one advertising image based on my requirements.",
      brief.copywriting ? `Required copy: ${brief.copywriting}` : "",
      `Industry: ${brief.industry}`,
      `Aspect ratio: ${brief.aspectRatio}`,
      `Visual execution: ${deterministicDirection}`,
      brief.inputMode === "image_edit" ? `Use my uploaded image. Reference image role: ${referenceRoleName(brief.referenceImageRole, language)}.` : ""
    ]
      .filter(Boolean)
      .join("\n");
  }
  return [
    deterministicRequest || "请按我的需求生成一张广告图片。",
    brief.copywriting ? `文案：${brief.copywriting}` : "",
    `行业：${brief.industry}`,
    `画幅比例：${brief.aspectRatio}`,
    `画面执行：${deterministicDirection}`,
    brief.inputMode === "image_edit" ? `请参考我上传的图片，参考图用途：${referenceRoleName(brief.referenceImageRole, language)}。` : ""
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
  const language = brief.outputLanguage;
  const deterministicRequest = rewriteAmbiguousStyleText(brief.userRequest, language);
  const deterministicDirection = rewriteAmbiguousStyleText(brief.styleDirection, language);
  const deterministicDesignPlan = rewriteAmbiguousStyleText(designPlan, language);
  const deterministicHardConstraints = brief.hardConstraints.map((item) => rewriteAmbiguousStyleText(item, language));
  const negativeConstraints = [
    ...new Set([
      ...selectedTemplates.flatMap((template) => template.negativeConstraints),
      ...selectedRecipes.flatMap((recipe) => recipe.negativeConstraints)
    ])
  ];
  const templateNotes = selectedTemplates.map((template) => formatTemplateNote(template, language)).join("\n");
  const recipeNotes = selectedRecipes.map((recipe) => formatRecipe(recipe, language)).join("\n\n");
  const finalPrompt = language === "en" ? [
    "Generate one commercially usable advertising image from the following production brief.",
    "",
    "User Brief",
    deterministicRequest || "Create an advertising image from the structured form fields.",
    "",
    "Structured Brief",
    `Task type: ${taskTypeName(brief.taskType, language)}`,
    `Input mode: ${brief.inputMode === "image_edit" ? "image edit with uploaded image" : "text-to-image"}`,
    `Industry: ${brief.industry}`,
    `Aspect ratio: ${brief.aspectRatio}`,
    `Visual execution direction: ${deterministicDirection}`,
    `Reference image policy: ${referenceRoleName(brief.referenceImageRole, language)}`,
    brief.copywriting ? `Required exact copy: ${brief.copywriting}` : "Copy requirement: if no exact copy is provided, reserve clean text areas and do not invent prices, dates, phone numbers, addresses, or brand promises.",
    "",
    "Design Plan",
    deterministicDesignPlan,
    "",
    "Matched Business Template Directions",
    templateNotes || "- Use a general advertising layout with a clear subject, readable information hierarchy, and production-ready delivery.",
    "",
    "Visual Recipes",
    recipeNotes || "- Use clear commercial photography or graphic-design logic. Specify subject placement, scene, lighting, text area, and detail constraints.",
    "",
    "Generation Requirements",
    generationRequirements(brief),
    "",
    "Deterministic Execution Requirements",
    formatDeterministicRequirements(language),
    "",
    "Avoid",
    [...negativeConstraints, ...deterministicHardConstraints].map((item) => `- ${item}`).join("\n")
  ].join("\n") : [
    "请根据以下广告制作需求生成一张商业可用的图片。",
    "",
    "【用户需求】",
    deterministicRequest || "按表单字段生成广告作图方案。",
    "",
    "【结构化需求】",
    `作图类型：${taskTypeName(brief.taskType, language)}`,
    `输入方式：${brief.inputMode === "image_edit" ? "上传图片修改" : "纯文本生成"}`,
    `行业：${brief.industry}`,
    `画幅比例：${brief.aspectRatio}`,
    `视觉执行方向：${deterministicDirection}`,
    `参考图保留策略：${referenceRoleName(brief.referenceImageRole, language)}`,
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
    formatDeterministicRequirements(language),
    "",
    "【避免】",
    [...negativeConstraints, ...deterministicHardConstraints].map((item) => `- ${item}`).join("\n")
  ].join("\n");
  const deterministicFinalPrompt = rewriteAmbiguousStyleText(finalPrompt, language);

  return {
    brief,
    designPlan: deterministicDesignPlan,
    finalPrompt: deterministicFinalPrompt,
    templateIds: [...selectedTemplates.map((template) => template.id), ...selectedRecipes.map((recipe) => recipe.id)],
    negativeConstraints,
    deterministicChecks: buildDeterministicChecks(deterministicFinalPrompt)
  };
}

function formatTemplateNote(template: ScoredPromptTemplate["template"], language: AdImageBrief["outputLanguage"]): string {
  if (language === "en") {
    return `- ${template.id} / ${template.name}: use this matched business scenario as internal guidance for deliverable type, copy policy, production constraints, and advertising hierarchy.`;
  }
  return `- ${template.name}：${template.promptSkeleton}`;
}

function formatRecipe(recipe: ScoredVisualRecipe["recipe"], language: AdImageBrief["outputLanguage"]): string {
  if (language === "en") {
    return [
      `- ${recipe.id} / ${recipe.name}`,
      `  Source structure: ${recipe.source.repo} ${recipe.source.caseId}; rewritten as a reusable debranded visual recipe.`,
      "  Apply its layout, subject, scene, lighting, typography, and detail formulas as internal visual guidance.",
      "  Do not copy any upstream brand, exact text, person identity, price, or distinctive protected detail."
    ].join("\n");
  }
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
  if (brief.outputLanguage === "en") {
    const shared = [
      "- The image must look like a real advertising production deliverable, not pure concept art.",
      "- Any visible text must be clear, accurate, and readable; do not invent prices, dates, phone numbers, addresses, or promises the user did not provide.",
      "- Structure, materials, lighting, and proportions must follow realistic production or commercial-placement logic."
    ];
    const taskSpecific: Record<AdImageBrief["taskType"], string[]> = {
      storefront_signboard: ["- Signboard, wall, doors, windows, lighting, and materials must fit a plausible storefront.", "- For image edits, preserve the uploaded structure, perspective, and subject placement."],
      poster_design: ["- Include a clear headline, key visual, selling-point area, and supporting-information area.", "- Typography must have a readable commercial hierarchy."],
      rollup_banner: ["- Use a vertical composition suitable for a display stand, with clear headline, selling points, and contact/action area.", "- Keep the bottom section readable and reserve space for a QR/action area when needed."],
      event_backdrop: ["- The backdrop must work for onsite photos, stage viewing, or booth viewing; keep the main title unobstructed.", "- Large background areas should stay clean and avoid tiny unprintable details."],
      signage_wayfinding: ["- Arrows, floor/area/function information must be directionally clear and easy to read.", "- Sign scale, mounting position, and spatial perspective must feel real."],
      brand_wall: ["- Logo, brand name, and wall material must fit the interior space.", "- Wall mockups must preserve wall boundaries, perspective, and installation logic."],
      local_store_promotion: ["- Promotion information must prioritize local-store conversion, with headline and benefit points first.", "- Store, product, or service subject must not be blocked by decoration."],
      ecommerce_main_image: ["- Product subject must be clear, large enough, and platform-ready.", "- Do not alter product appearance, package shape, label, or key identity."],
      product_ad: ["- Product hero, selling-point area, and brand atmosphere must form a complete ad image.", "- Do not invent product efficacy, qualifications, price, or certification."],
      commercial_photography: ["- Prioritize realistic photography quality, light, material, and credible scene staging.", "- Do not add text unless the user explicitly provides copy."]
    };
    return [...shared, ...taskSpecific[brief.taskType]].join("\n");
  }
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
