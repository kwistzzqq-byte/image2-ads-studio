import type { AdImageBrief, ScoredPromptTemplate, ScoredVisualRecipe } from "./types.js";
import { rewriteAmbiguousStyleText } from "./deterministic-prompt.js";
import { taskTypeName } from "./taskMetadata.js";

export function buildDesignPlan(brief: AdImageBrief, templates: ScoredPromptTemplate[], recipes: ScoredVisualRecipe[] = []): string {
  const primary = templates[0]?.template;
  const primaryRecipe = recipes[0]?.recipe;
  const subject = taskSubject(brief.taskType);
  const referencePolicy = referenceImagePolicy(brief);
  const layout = primary?.layoutPattern ?? "构图清晰，主体明确，文案层级可读，整体适合广告制作落地。";
  const textPolicy = brief.copywriting
    ? `必须准确使用用户文案：“${brief.copywriting}”。`
    : "如用户未提供文案，仅预留清晰文字区域，不编造价格、日期或品牌承诺。";
  const visualDirection = rewriteAmbiguousStyleText(brief.styleDirection);
  const constraints = brief.hardConstraints.length
    ? brief.hardConstraints.map(rewriteAmbiguousStyleText).join("；")
    : "避免跑题、文字混乱、主体缺失和不可制作结构。";

  return [
    `作图目标：为${brief.industry}场景制作${taskTypeName(brief.taskType)}，画幅比例为${brief.aspectRatio}。`,
    `画面主体：${subject}。`,
    `构图方案：${layout}`,
    primaryRecipe ? `效果配方：采用“${primaryRecipe.name}”结构，${primaryRecipe.layoutFormula}${primaryRecipe.sceneFormula}` : "",
    `文案策略：${textPolicy}`,
    `视觉执行方向：${visualDirection}。`,
    `参考图策略：${referencePolicy}`,
    `硬性约束：${constraints}`
  ].filter(Boolean).join("\n");
}

function taskSubject(taskType: AdImageBrief["taskType"]): string {
  const subjects: Record<AdImageBrief["taskType"], string> = {
    storefront_signboard: "门头招牌与店铺立面",
    poster_design: "海报主视觉与中文信息层级",
    rollup_banner: "竖版展架画面、标题区、卖点区和底部联系区",
    event_backdrop: "活动主视觉、背景板画面和现场拍照展示区域",
    signage_wayfinding: "标识导视牌、箭头信息、空间安装关系",
    brand_wall: "品牌logo、墙面材质、空间透视和接待氛围",
    local_store_promotion: "门店促销主题、主推产品或服务、到店行动引导",
    ecommerce_main_image: "产品主体、背景场景、卖点信息和平台主图完成度",
    product_ad: "产品hero主体、品牌氛围、卖点表达和广告投放画面",
    commercial_photography: "商业摄影主体、真实光影、材质质感和场景氛围"
  };
  return subjects[taskType];
}

function referenceImagePolicy(brief: AdImageBrief): string {
  if (brief.inputMode === "text_to_image") return "无上传图，按文本需求直接生成。";
  const policies: Record<AdImageBrief["referenceImageRole"], string> = {
    preserve_structure: "保留上传图的空间结构、透视、门窗位置和现场关系，只改设计相关区域。",
    preserve_subject: "保留上传图主体身份、形状、比例和关键细节，只增强商业视觉表达。",
    style_reference_only: "只提炼上传图的色彩、构图、材质和光影，不强制保留具体对象。",
    background_replace: "保留主体，替换或重构背景以形成更完整的商业画面。",
    local_edit: "只修改用户描述的局部区域，其他区域尽量保持不变。",
    scene_mockup: "保留上传现场的空间结构和透视，把设计真实贴合到指定墙面、门头、展架或标识位置。",
    none: "上传图只作为弱参考，最终以用户文字需求为准。"
  };
  return policies[brief.referenceImageRole];
}
