import type { AdImageBrief, AdImageFormInput, InputMode, OutputLanguage, ReferenceImageRole, TaskType } from "./types.js";

const defaultStyle = "商业可用、清晰、可制作";
const defaultIndustry = "广告制作";
const defaultAspectRatio = "1:1";

export function parseIntent(formInput: AdImageFormInput): AdImageBrief {
  const request = normalizeText(formInput.userRequest);
  const copywriting = normalizeText(formInput.copywriting);
  const referenceImageRole = inferReferenceImageRole(formInput.referenceImageRole, request);
  const inputMode = inferInputMode(formInput.inputMode, request, referenceImageRole);
  const taskType = inferTaskType(formInput.taskType, request);
  return {
    taskType,
    inputMode,
    outputLanguage: normalizeOutputLanguage(formInput.outputLanguage),
    industry: normalizeText(formInput.industry) || inferIndustry(request) || defaultIndustry,
    userRequest: request,
    copywriting,
    aspectRatio: normalizeText(formInput.aspectRatio) || defaultAspectRatio,
    styleDirection: normalizeText(formInput.styleDirection) || defaultStyle,
    referenceImageRole,
    hardConstraints: normalizeConstraints(formInput.hardConstraints)
  };
}

function normalizeOutputLanguage(value: AdImageFormInput["outputLanguage"]): OutputLanguage {
  return value === "en" ? "en" : "zh-CN";
}

function inferTaskType(value: AdImageFormInput["taskType"], request: string): TaskType {
  if (value && value !== "auto") return value;
  if (containsAny(request, ["形象墙", "文化墙", "荣誉墙", "展厅墙", "展示墙", "logo墙", "logo上墙", "上墙", "品牌墙", "前台墙"])) return "brand_wall";
  if (containsAny(request, ["门头", "店招", "招牌", "发光字", "灯箱门头", "门店立面", "storefront"])) return "storefront_signboard";
  if (containsAny(request, ["易拉宝", "展架", "x展架", "门型展架", "拉网展架", "rollup", "roll up", "banner stand"])) return "rollup_banner";
  if (containsAny(request, ["背景板", "背板", "舞台背景", "会议背景", "活动背景", "签到墙", "发布会背景", "展位背景", "backdrop"])) return "event_backdrop";
  if (containsAny(request, ["导视", "导览", "导览牌", "标识", "标牌", "指示牌", "楼层牌", "科室牌", "路牌", "wayfinding", "signage"])) return "signage_wayfinding";
  if (containsAny(request, ["门店促销", "促销图", "会员卡促销", "体验卡促销", "体验课促销", "健康日促销", "到店", "团购", "水牌", "店内pop", "本地生活", "社区促销"])) return "local_store_promotion";
  if (containsAny(request, ["电商主图", "主图", "白底图", "商品主图", "详情页", "平台主图", "ecommerce"])) return "ecommerce_main_image";
  if (containsAny(request, ["产品广告", "新品上市", "卖点图", "包装展示", "产品视觉", "hero image", "product ad"])) return "product_ad";
  if (containsAny(request, ["商业摄影", "静物摄影", "产品摄影", "棚拍", "生活方式摄影", "photography"])) return "commercial_photography";
  if (containsAny(request, ["海报", "促销", "活动", "宣传", "poster"])) return "poster_design";
  return "storefront_signboard";
}

function inferInputMode(value: AdImageFormInput["inputMode"], request: string, referenceImageRole: ReferenceImageRole): InputMode {
  if (value && value !== "auto") return value;
  if (referenceImageRole !== "none") return "image_edit";
  if (containsAny(request, ["上传", "原图", "照片", "参考图", "现场图", "改成", "修改", "替换"])) return "image_edit";
  return "text_to_image";
}

function inferReferenceImageRole(value: AdImageFormInput["referenceImageRole"], request: string): ReferenceImageRole {
  if (value && value !== "auto") return value;
  if (containsAny(request, ["上传墙面", "墙面照片", "现场效果", "空间照片", "上墙效果", "mockup"])) return "scene_mockup";
  if (containsAny(request, ["局部", "只改", "改成", "修改", "改门头", "改招牌"])) return "local_edit";
  if (containsAny(request, ["保留结构", "现场图", "门店照片", "透视"])) return "preserve_structure";
  if (containsAny(request, ["保留主体", "产品不变", "logo不变", "原产品"])) return "preserve_subject";
  if (containsAny(request, ["参考风格", "风格参考"])) return "style_reference_only";
  if (containsAny(request, ["换背景", "背景替换"])) return "background_replace";
  if (containsAny(request, ["上传", "原图", "照片", "参考图"])) return "preserve_subject";
  return "none";
}

function inferIndustry(request: string): string {
  const pairs: Array<[string, string[]]> = [
    ["奶茶", ["奶茶", "茶饮", "饮品"]],
    ["餐饮", ["餐饮", "小吃", "火锅", "烧烤", "咖啡"]],
    ["零售", ["零售", "便利店", "超市", "服装", "美妆"]],
    ["活动", ["活动", "会议", "展会", "开业"]],
    ["教育", ["教育", "培训", "招生", "课程", "学校"]],
    ["企业", ["企业", "公司", "办公", "前台", "文化墙"]],
    ["医疗服务", ["医院", "科室", "医美", "口腔", "养生"]],
    ["电商", ["电商", "主图", "详情页", "产品", "包装"]]
  ];
  return pairs.find(([, keywords]) => containsAny(request, keywords))?.[0] ?? "";
}

function normalizeConstraints(value: AdImageFormInput["hardConstraints"]): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(normalizeText).filter(Boolean);
  return value
    .split(/\n|,|，|;|；/)
    .map(normalizeText)
    .filter(Boolean);
}

function containsAny(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase();
  return keywords.some((keyword) => lower.includes(keyword.toLowerCase()));
}

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}
