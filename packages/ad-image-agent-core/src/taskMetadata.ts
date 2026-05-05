import type { OutputLanguage, ReferenceImageRole, TaskType } from "./types.js";

export const taskTypeLabels: Record<TaskType, string> = {
  storefront_signboard: "门头店招",
  poster_design: "海报设计",
  rollup_banner: "易拉宝 / 展架",
  event_backdrop: "活动背景板",
  signage_wayfinding: "标识导视",
  brand_wall: "形象墙 / 上墙",
  local_store_promotion: "本地门店促销",
  ecommerce_main_image: "电商产品主图",
  product_ad: "产品广告图",
  commercial_photography: "商业摄影"
};

export const referenceImageRoleLabels: Record<ReferenceImageRole, string> = {
  preserve_structure: "保留结构",
  preserve_subject: "保留主体",
  style_reference_only: "只参考风格",
  background_replace: "替换背景",
  local_edit: "局部修改",
  scene_mockup: "现场效果图 / 上墙 mockup",
  none: "无参考图"
};

export const taskTypeLabelsEn: Record<TaskType, string> = {
  storefront_signboard: "Storefront signboard",
  poster_design: "Poster design",
  rollup_banner: "Roll-up banner / display stand",
  event_backdrop: "Event backdrop",
  signage_wayfinding: "Signage and wayfinding",
  brand_wall: "Brand wall / wall mockup",
  local_store_promotion: "Local store promotion",
  ecommerce_main_image: "E-commerce main image",
  product_ad: "Product advertisement",
  commercial_photography: "Commercial photography"
};

export const referenceImageRoleLabelsEn: Record<ReferenceImageRole, string> = {
  preserve_structure: "Preserve structure",
  preserve_subject: "Preserve subject",
  style_reference_only: "Style reference only",
  background_replace: "Replace background",
  local_edit: "Local edit",
  scene_mockup: "Scene mockup",
  none: "No reference image"
};

export function taskTypeName(taskType: TaskType, language: OutputLanguage = "zh-CN"): string {
  return language === "en" ? taskTypeLabelsEn[taskType] : taskTypeLabels[taskType];
}

export function referenceRoleName(role: ReferenceImageRole, language: OutputLanguage = "zh-CN"): string {
  return language === "en" ? referenceImageRoleLabelsEn[role] : referenceImageRoleLabels[role];
}
