import type { ReferenceImageRole, TaskType } from "./types.js";

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

export function taskTypeName(taskType: TaskType): string {
  return taskTypeLabels[taskType];
}

export function referenceRoleName(role: ReferenceImageRole): string {
  return referenceImageRoleLabels[role];
}
