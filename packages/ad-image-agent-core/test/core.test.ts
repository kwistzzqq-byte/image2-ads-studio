import { describe, expect, it } from "vitest";
import {
  buildDesignPlan,
  buildLlmReferenceImages,
  buildPlainPrompt,
  buildUpstreamReferenceImages,
  compilePrompt,
  findBannedPromptPhrases,
  getImage2ReferenceImages,
  ManualTestAdapter,
  normalizeUserImages,
  parseIntent,
  promptTemplates,
  redactReferenceImageData,
  retrieveVisualRecipes,
  retrieveTemplates,
  rewriteAmbiguousStyleText,
  taskTypeLabels,
  validateDeterministicPrompt,
  visualRecipes,
  type AdImageReferenceImage,
  type TaskType
} from "../src/index.js";

const retrievalEvaluationCases: Array<{
  userRequest: string;
  industry: string;
  expectedTaskType: TaskType;
  expectedTemplateNames: string[];
  forbiddenTemplateNames: string[];
  copywriting?: string;
}> = [
  { userRequest: "做一个眼镜店门头效果图", industry: "眼镜", expectedTaskType: "storefront_signboard", expectedTemplateNames: ["眼镜店门头"], forbiddenTemplateNames: ["招聘"] },
  { userRequest: "烤肉店门头招牌，黑底发光字", industry: "烤肉", expectedTaskType: "storefront_signboard", expectedTemplateNames: ["烤肉店门头"], forbiddenTemplateNames: ["牙科"] },
  { userRequest: "花店门头设计，橱窗要有花束陈列", industry: "花店", expectedTaskType: "storefront_signboard", expectedTemplateNames: ["花店门头"], forbiddenTemplateNames: ["手机数码"] },
  { userRequest: "手机维修门头，突出维修服务", industry: "手机维修", expectedTaskType: "storefront_signboard", expectedTemplateNames: ["手机维修门头"], forbiddenTemplateNames: ["软件产品"] },
  { userRequest: "洗车美容店门头效果图", industry: "洗车", expectedTaskType: "storefront_signboard", expectedTemplateNames: ["洗车美容门头"], forbiddenTemplateNames: ["课程"] },
  { userRequest: "社区生鲜超市门头，入口促销区清楚", industry: "生鲜", expectedTaskType: "storefront_signboard", expectedTemplateNames: ["社区生鲜门头", "生鲜超市门头"], forbiddenTemplateNames: ["珠宝"] },
  { userRequest: "做一张牙科洁牙海报，突出预约入口", industry: "牙科", expectedTaskType: "poster_design", expectedTemplateNames: ["牙科洁牙海报"], forbiddenTemplateNames: ["停车场"] },
  { userRequest: "健身私教海报，主标题体验课招生", industry: "健身", expectedTaskType: "poster_design", expectedTemplateNames: ["健身私教海报"], forbiddenTemplateNames: ["导视"] },
  { userRequest: "家政服务海报，突出保洁和预约", industry: "家政", expectedTaskType: "poster_design", expectedTemplateNames: ["家政服务海报"], forbiddenTemplateNames: ["形象墙"] },
  { userRequest: "宠物洗护海报，主标题洗护套餐", industry: "宠物", expectedTaskType: "poster_design", expectedTemplateNames: ["宠物洗护海报"], forbiddenTemplateNames: ["楼盘展架"] },
  { userRequest: "商场活动海报，主标题周末会员日", industry: "商场", expectedTaskType: "poster_design", expectedTemplateNames: ["商场活动海报"], forbiddenTemplateNames: ["工业设备"] },
  { userRequest: "茶饮第二杯半价海报", industry: "茶饮", expectedTaskType: "poster_design", expectedTemplateNames: ["茶饮第二杯海报"], forbiddenTemplateNames: ["园区"] },
  { userRequest: "口腔门诊展架，介绍洁牙项目", industry: "口腔", expectedTaskType: "rollup_banner", expectedTemplateNames: ["口腔门诊展架"], forbiddenTemplateNames: ["门头"] },
  { userRequest: "软件产品易拉宝，突出功能模块", industry: "软件", expectedTaskType: "rollup_banner", expectedTemplateNames: ["软件产品展架"], forbiddenTemplateNames: ["菜品"] },
  { userRequest: "新能源产品展架，放设备参数", industry: "新能源", expectedTaskType: "rollup_banner", expectedTemplateNames: ["新能源产品展架"], forbiddenTemplateNames: ["宠物洗护"] },
  { userRequest: "餐饮菜单展架，展示套餐价格", industry: "餐饮", expectedTaskType: "rollup_banner", expectedTemplateNames: ["餐饮菜单展架"], forbiddenTemplateNames: ["医院"] },
  { userRequest: "楼盘展架，突出预约到访", industry: "房产", expectedTaskType: "rollup_banner", expectedTemplateNames: ["楼盘展架"], forbiddenTemplateNames: ["牙科洁牙"] },
  { userRequest: "招聘会展架，列出岗位和福利", industry: "招聘", expectedTaskType: "rollup_banner", expectedTemplateNames: ["招聘会展架"], forbiddenTemplateNames: ["香氛"] },
  { userRequest: "培训结业背景板，主题圆满结业", industry: "培训", expectedTaskType: "event_backdrop", expectedTemplateNames: ["培训结业背景板"], forbiddenTemplateNames: ["主图"] },
  { userRequest: "招商会背景板，突出合作共赢", industry: "招商", expectedTaskType: "event_backdrop", expectedTemplateNames: ["招商会背景板"], forbiddenTemplateNames: ["水牌"] },
  { userRequest: "新品品鉴会背景板，适合现场拍照", industry: "食品", expectedTaskType: "event_backdrop", expectedTemplateNames: ["新品品鉴会背景板"], forbiddenTemplateNames: ["车载"] },
  { userRequest: "公益活动背景板，社区志愿服务", industry: "公益", expectedTaskType: "event_backdrop", expectedTemplateNames: ["公益活动背景板"], forbiddenTemplateNames: ["眼镜"] },
  { userRequest: "直播间品牌背景板，突出主推产品", industry: "直播", expectedTaskType: "event_backdrop", expectedTemplateNames: ["直播间品牌背景板"], forbiddenTemplateNames: ["停车"] },
  { userRequest: "门店小型活动背板，店内拍照用", industry: "门店", expectedTaskType: "event_backdrop", expectedTemplateNames: ["门店小型活动背板"], forbiddenTemplateNames: ["珠宝"] },
  { userRequest: "园区总平导览牌，标出当前位置", industry: "园区", expectedTaskType: "signage_wayfinding", expectedTemplateNames: ["园区总平导览牌"], forbiddenTemplateNames: ["会员卡"] },
  { userRequest: "写字楼电梯厅导视，显示公司列表", industry: "写字楼", expectedTaskType: "signage_wayfinding", expectedTemplateNames: ["写字楼电梯厅导视"], forbiddenTemplateNames: ["烤肉"] },
  { userRequest: "景区游览导视牌，标出景点距离", industry: "景区", expectedTaskType: "signage_wayfinding", expectedTemplateNames: ["景区游览导视"], forbiddenTemplateNames: ["外卖"] },
  { userRequest: "校园楼宇导视，包含食堂和图书馆方向", industry: "校园", expectedTaskType: "signage_wayfinding", expectedTemplateNames: ["校园楼宇导视"], forbiddenTemplateNames: ["礼盒"] },
  { userRequest: "商业街店铺导视，列出商铺方向", industry: "商业街", expectedTaskType: "signage_wayfinding", expectedTemplateNames: ["商业街店铺导视"], forbiddenTemplateNames: ["保健食品"] },
  { userRequest: "展馆展区导视，突出A区B区入口", industry: "展馆", expectedTaskType: "signage_wayfinding", expectedTemplateNames: ["展馆展区导视"], forbiddenTemplateNames: ["奶茶"] },
  { userRequest: "美业接待形象墙，品牌名是清禾美肌", industry: "美业", expectedTaskType: "brand_wall", expectedTemplateNames: ["美业接待形象墙"], forbiddenTemplateNames: ["团购"] },
  { userRequest: "教育荣誉墙，上墙展示证书和品牌", industry: "教育", expectedTaskType: "brand_wall", expectedTemplateNames: ["教育荣誉墙"], forbiddenTemplateNames: ["车展"] },
  { userRequest: "工厂企业展厅墙，展示制造能力", industry: "制造", expectedTaskType: "brand_wall", expectedTemplateNames: ["工厂企业展厅墙"], forbiddenTemplateNames: ["水牌"] },
  { userRequest: "餐饮菜单文化墙，展示招牌菜和品牌故事", industry: "餐饮", expectedTaskType: "brand_wall", expectedTemplateNames: ["餐饮菜单文化墙"], forbiddenTemplateNames: ["停车场"] },
  { userRequest: "党建文化墙，红色主题图文模块", industry: "党建", expectedTaskType: "brand_wall", expectedTemplateNames: ["党建文化墙"], forbiddenTemplateNames: ["湿巾"] },
  { userRequest: "园区数据展示墙，包含地图和数据模块", industry: "园区", expectedTaskType: "brand_wall", expectedTemplateNames: ["园区数据展示墙"], forbiddenTemplateNames: ["烘焙"] },
  { userRequest: "早餐档口促销图，主标题早餐套餐", industry: "早餐", expectedTaskType: "local_store_promotion", expectedTemplateNames: ["早餐档口促销图"], forbiddenTemplateNames: ["形象墙"] },
  { userRequest: "洗车会员卡促销，突出权益", industry: "洗车", expectedTaskType: "local_store_promotion", expectedTemplateNames: ["洗车会员卡促销"], forbiddenTemplateNames: ["课程招生"] },
  { userRequest: "药房健康日促销，突出咨询入口", industry: "药房", expectedTaskType: "local_store_promotion", expectedTemplateNames: ["药房健康日促销"], forbiddenTemplateNames: ["珠宝"] },
  { userRequest: "母婴门店促销，产品和权益清楚", industry: "母婴", expectedTaskType: "local_store_promotion", expectedTemplateNames: ["母婴门店促销"], forbiddenTemplateNames: ["导视"] },
  { userRequest: "健身体验课促销，主标题免费体验", industry: "健身", expectedTaskType: "local_store_promotion", expectedTemplateNames: ["健身体验课促销"], forbiddenTemplateNames: ["门头"] },
  { userRequest: "美容体验卡促销，突出预约入口", industry: "美容", expectedTaskType: "local_store_promotion", expectedTemplateNames: ["美容体验卡促销"], forbiddenTemplateNames: ["电梯厅"] },
  { userRequest: "保健食品电商主图，突出包装和原料", industry: "保健", expectedTaskType: "ecommerce_main_image", expectedTemplateNames: ["保健食品主图"], forbiddenTemplateNames: ["背景板"] },
  { userRequest: "宠物食品电商主图，包装要清楚", industry: "宠物食品", expectedTaskType: "ecommerce_main_image", expectedTemplateNames: ["宠物食品主图"], forbiddenTemplateNames: ["医院"] },
  { userRequest: "运动户外电商主图，展示使用场景", industry: "运动户外", expectedTaskType: "ecommerce_main_image", expectedTemplateNames: ["运动户外主图"], forbiddenTemplateNames: ["形象墙"] },
  { userRequest: "办公用品电商主图，套装摆放清楚", industry: "办公用品", expectedTaskType: "ecommerce_main_image", expectedTemplateNames: ["办公用品主图"], forbiddenTemplateNames: ["门头"] },
  { userRequest: "车载用品电商主图，展示安装位置", industry: "车载用品", expectedTaskType: "ecommerce_main_image", expectedTemplateNames: ["车载用品主图"], forbiddenTemplateNames: ["牙科"] },
  { userRequest: "清洁用品电商主图，突出包装和清洁感", industry: "清洁用品", expectedTaskType: "ecommerce_main_image", expectedTemplateNames: ["清洁用品主图"], forbiddenTemplateNames: ["园区"] },
  { userRequest: "香氛产品广告，突出瓶体和家居氛围", industry: "香氛", expectedTaskType: "product_ad", expectedTemplateNames: ["香氛产品广告"], forbiddenTemplateNames: ["写字楼"] },
  { userRequest: "茶叶礼盒产品广告，突出礼赠质感", industry: "茶叶", expectedTaskType: "product_ad", expectedTemplateNames: ["茶叶礼盒广告"], forbiddenTemplateNames: ["健身"] },
  { userRequest: "工具设备产品广告，突出金属质感", industry: "工具设备", expectedTaskType: "product_ad", expectedTemplateNames: ["工具设备广告"], forbiddenTemplateNames: ["花店"] },
  { userRequest: "儿童用品产品广告，安全感和家庭场景", industry: "儿童用品", expectedTaskType: "product_ad", expectedTemplateNames: ["儿童用品广告"], forbiddenTemplateNames: ["党建"] },
  { userRequest: "户外露营产品广告，突出营地使用场景", industry: "露营", expectedTaskType: "product_ad", expectedTemplateNames: ["户外露营产品广告"], forbiddenTemplateNames: ["药房"] },
  { userRequest: "办公科技产品广告，突出功能和办公场景", industry: "办公科技", expectedTaskType: "product_ad", expectedTemplateNames: ["办公科技产品广告"], forbiddenTemplateNames: ["文化墙"] },
  { userRequest: "珠宝饰品商业摄影，突出金属和宝石高光", industry: "珠宝", expectedTaskType: "commercial_photography", expectedTemplateNames: ["珠宝饰品摄影"], forbiddenTemplateNames: ["导视"] },
  { userRequest: "酒水瓶身商业摄影，标签清楚", industry: "酒水", expectedTaskType: "commercial_photography", expectedTemplateNames: ["酒水瓶身摄影"], forbiddenTemplateNames: ["展架"] },
  { userRequest: "家具空间商业摄影，突出客厅比例", industry: "家具", expectedTaskType: "commercial_photography", expectedTemplateNames: ["家具空间摄影"], forbiddenTemplateNames: ["招聘"] },
  { userRequest: "烘焙产品商业摄影，突出表皮纹理", industry: "烘焙", expectedTaskType: "commercial_photography", expectedTemplateNames: ["烘焙产品摄影"], forbiddenTemplateNames: ["导览"] },
  { userRequest: "工业设备商业摄影，车间场景真实", industry: "工业设备", expectedTaskType: "commercial_photography", expectedTemplateNames: ["工业设备摄影"], forbiddenTemplateNames: ["奶茶"] },
  { userRequest: "护肤品棚拍商业摄影，标签和水滴清楚", industry: "护肤", expectedTaskType: "commercial_photography", expectedTemplateNames: ["护肤品棚拍摄影"], forbiddenTemplateNames: ["停车场"] }
];

const expectedTemplateCounts = {
  brand_wall: 30,
  commercial_photography: 24,
  ecommerce_main_image: 32,
  event_backdrop: 30,
  local_store_promotion: 28,
  poster_design: 44,
  product_ad: 32,
  rollup_banner: 30,
  signage_wayfinding: 30,
  storefront_signboard: 40
};
const activeRetrievalEvaluationCases = retrievalEvaluationCases.filter((testCase) =>
  testCase.expectedTemplateNames.some((name) => promptTemplates.some((template) => template.name.includes(name)))
);

describe("ad-image-agent-core", () => {
  it("parses text storefront requests", () => {
    const brief = parseIntent({ userRequest: "帮我做一个奶茶店门头效果图" });
    expect(brief.taskType).toBe("storefront_signboard");
    expect(brief.inputMode).toBe("text_to_image");
    expect(brief.industry).toBe("奶茶");
    expect(brief.outputLanguage).toBe("zh-CN");
  });

  it("parses uploaded storefront edit requests", () => {
    const brief = parseIntent({ userRequest: "上传门店照片，把门头改成红色发光字" });
    expect(brief.taskType).toBe("storefront_signboard");
    expect(brief.inputMode).toBe("image_edit");
    expect(brief.referenceImageRole).toBe("local_edit");
  });

  it("parses promotion poster requests", () => {
    const brief = parseIntent({ userRequest: "五一促销海报，主标题半价开业" });
    expect(brief.taskType).toBe("poster_design");
  });

  it.each<[string, TaskType]>([
    ["做一个易拉宝展架，介绍企业服务", "rollup_banner"],
    ["设计一个会议活动背景板", "event_backdrop"],
    ["商场导视牌效果图", "signage_wayfinding"],
    ["上传墙面照片做公司形象墙", "brand_wall"],
    ["门店促销水牌，主标题今日特惠", "local_store_promotion"],
    ["电商主图，突出产品质感", "ecommerce_main_image"],
    ["新品上市产品广告图", "product_ad"],
    ["做一张产品棚拍商业摄影图", "commercial_photography"]
  ])("parses %s as %s", (userRequest, taskType) => {
    expect(parseIntent({ userRequest }).taskType).toBe(taskType);
  });

  it("uses default style when style is missing", () => {
    const brief = parseIntent({ userRequest: "做一个餐饮门头" });
    expect(brief.styleDirection).toBe("商业可用、清晰、可制作");
  });

  it("compiles prompt with copy, industry, aspect ratio, and reference policy", () => {
    const brief = parseIntent({
      userRequest: "上传门店照片，把门头改成红色发光字",
      industry: "餐饮",
      copywriting: "半价开业",
      aspectRatio: "16:9",
      referenceImageRole: "preserve_structure"
    });
    const templates = retrieveTemplates(brief);
    const designPlan = buildDesignPlan(brief, templates);
    const compiled = compilePrompt(brief, designPlan, templates);
    expect(compiled.finalPrompt).toContain("半价开业");
    expect(compiled.finalPrompt).toContain("餐饮");
    expect(compiled.finalPrompt).toContain("16:9");
    expect(compiled.finalPrompt).toContain("保留结构");
    expect(compiled.templateIds.length).toBeGreaterThan(0);
  });

  it("compiles English prompts when outputLanguage is en", () => {
    const brief = parseIntent({
      outputLanguage: "en",
      userRequest: "Create a storefront signboard for a milk tea shop.",
      industry: "milk tea",
      copywriting: "TEE ISLAND",
      aspectRatio: "16:9",
      styleDirection: "commercially usable, clear, manufacturable",
      referenceImageRole: "none"
    });
    const templates = retrieveTemplates(brief);
    const designPlan = buildDesignPlan(brief, templates);
    const compiled = compilePrompt(brief, designPlan, templates);
    const plainPrompt = buildPlainPrompt(brief);
    expect(brief.outputLanguage).toBe("en");
    expect(compiled.finalPrompt).toContain("User Brief");
    expect(compiled.finalPrompt).toContain("Task type: Storefront signboard");
    expect(compiled.finalPrompt).toContain("Reference image policy: No reference image");
    expect(compiled.finalPrompt).not.toContain("【用户需求】");
    expect(plainPrompt).toContain("Required copy: TEE ISLAND");
    expect(compiled.deterministicChecks.bannedPhrasesRemoved).toBe(true);
  });

  it("localizes manual adapter instructions", async () => {
    const brief = parseIntent({
      outputLanguage: "en",
      userRequest: "Create a product ad.",
      taskType: "product_ad"
    });
    const templates = retrieveTemplates(brief);
    const compiled = compilePrompt(brief, buildDesignPlan(brief, templates), templates);
    const response = await new ManualTestAdapter().generateTextToImage(compiled);
    expect(response.instructions).toContain("Copy finalPrompt");
  });

  it("supports scene mockup reference policy in compiled prompts", () => {
    const brief = parseIntent({
      userRequest: "上传墙面照片做公司形象墙",
      copywriting: "星河科技",
      referenceImageRole: "scene_mockup"
    });
    const templates = retrieveTemplates(brief);
    const designPlan = buildDesignPlan(brief, templates);
    const compiled = compilePrompt(brief, designPlan, templates);
    expect(brief.taskType).toBe("brand_wall");
    expect(brief.inputMode).toBe("image_edit");
    expect(compiled.finalPrompt).toContain("现场效果图");
    expect(compiled.finalPrompt).toContain("星河科技");
  });

  it.each(Object.keys(taskTypeLabels) as TaskType[])("retrieves templates for %s", (taskType) => {
    const templates = retrieveTemplates(
      parseIntent({
        taskType,
        userRequest: `${taskTypeLabels[taskType]} 测试需求`,
        inputMode: taskType === "brand_wall" ? "image_edit" : "text_to_image"
      })
    );
    expect(templates.length).toBeGreaterThan(0);
    expect(templates.some((item) => item.template.taskType === taskType)).toBe(true);
  });

  it("keeps the quality expansion template library at the target size and unique ids", () => {
    expect(promptTemplates.length).toBe(320);
    expect(new Set(promptTemplates.map((template) => template.id)).size).toBe(promptTemplates.length);
    expect(countBy(promptTemplates, (template) => template.taskType)).toEqual(expectedTemplateCounts);
  });

  it("keeps required template retrieval fields populated", () => {
    for (const template of promptTemplates) {
      expect(template.supportedInputModes.length).toBeGreaterThan(0);
      expect(template.referenceImageRoles.length).toBeGreaterThan(0);
      expect(template.negativeConstraints.length).toBeGreaterThan(0);
      expect(Array.isArray(template.useCases)).toBe(true);
      expect(Array.isArray(template.materialKeywords)).toBe(true);
      expect(Array.isArray(template.businessKeywords)).toBe(true);
      expect(Array.isArray(template.visualKeywords)).toBe(true);
      expect(template.layoutPattern.length).toBeGreaterThan(0);
      expect(template.promptSkeleton.length).toBeGreaterThan(0);
    }
  });

  it("loads rewritten upstream visual recipes at the target size", () => {
    expect(visualRecipes.length).toBe(240);
    expect(new Set(visualRecipes.map((recipe) => recipe.id)).size).toBe(visualRecipes.length);
    expect(visualRecipes.every((recipe) => recipe.source.transformation === "debranded_rewritten_recipe")).toBe(true);
    expect(visualRecipes.every((recipe) => Array.isArray(recipe.referenceImages))).toBe(true);
    for (const recipe of visualRecipes) {
      expect(recipe.layoutFormula.length).toBeGreaterThan(0);
      expect(recipe.subjectFormula.length).toBeGreaterThan(0);
      expect(recipe.sceneFormula.length).toBeGreaterThan(0);
      expect(recipe.lightingFormula.length).toBeGreaterThan(0);
      expect(recipe.typographyFormula.length).toBeGreaterThan(0);
      expect(recipe.detailFormula.length).toBeGreaterThan(0);
      expect(Array.isArray(recipe.useCases)).toBe(true);
      expect(Array.isArray(recipe.materialKeywords)).toBe(true);
      expect(Array.isArray(recipe.businessKeywords)).toBe(true);
      expect(Array.isArray(recipe.visualKeywords)).toBe(true);
    }
  });

  it.each(activeRetrievalEvaluationCases)("retrieves expected template direction for $userRequest", (testCase) => {
    const brief = parseIntent({
      userRequest: testCase.userRequest,
      industry: testCase.industry,
      copywriting: testCase.copywriting ?? "测试文案"
    });
    expect(brief.taskType).toBe(testCase.expectedTaskType);
    const templates = retrieveTemplates(brief);
    expect(templates).toHaveLength(5);
    expect(templates.some((item) => testCase.expectedTemplateNames.some((name) => item.template.name.includes(name)))).toBe(true);
    expect(templates.some((item) => testCase.forbiddenTemplateNames.some((name) => item.template.name.includes(name)))).toBe(false);
    expect(templates[0].matchedKeywords.length + templates[0].matchedIndustries.length + templates[0].matchedUseCases.length).toBeGreaterThan(0);
  });

  it("retrieves visual recipes for ecommerce and compiles them into the final prompt", () => {
    const brief = parseIntent({
      userRequest: "电商主图，热带饮品广告，突出水花和产品质感",
      industry: "饮品",
      copywriting: "冰爽上新"
    });
    const templates = retrieveTemplates(brief);
    const recipes = retrieveVisualRecipes(brief);
    const compiled = compilePrompt(brief, buildDesignPlan(brief, templates, recipes), templates, recipes);
    expect(recipes.length).toBeGreaterThan(0);
    expect(recipes.some((item) => item.recipe.name.includes("饮品"))).toBe(true);
    expect(compiled.finalPrompt).toContain("【效果级视觉配方】");
    expect(compiled.finalPrompt).toContain("已去具体化并改写为通用配方");
    expect(compiled.finalPrompt).toContain("【确定性执行要求】");
    expect(compiled.deterministicChecks.bannedPhrasesRemoved).toBe(true);
  });

  it("detects and rewrites ambiguous style phrases into deterministic instructions", () => {
    const ambiguous = "做一个类似苹果风的产品广告，要高级感风格和电影感";
    expect(findBannedPromptPhrases(ambiguous).join(" ")).toContain("类似苹果风");
    expect(findBannedPromptPhrases(ambiguous)).toEqual(expect.arrayContaining(["高级感风格", "电影感"]));
    expect(findBannedPromptPhrases("生成纯商业棚拍风格饮品主图").join(" ")).toContain("商业棚拍风格");
    const rewritten = rewriteAmbiguousStyleText(ambiguous);
    expect(findBannedPromptPhrases(rewritten)).toHaveLength(0);
    expect(rewritten).toContain("浅灰或纯白背景");
    expect(rewritten).toContain("低饱和主色");
    expect(rewritten).toContain("冷暖对比光");
    expect(rewriteAmbiguousStyleText("生成纯商业棚拍风格饮品主图")).not.toContain("风格");
  });

  it("validates deterministic final prompt requirements", () => {
    const validation = validateDeterministicPrompt(
      "主体居中，占比65%，左侧文字区放标题。左上自然光照明，底部有柔和阴影。材质为玻璃和金属，表面反光清楚。参考图只保留产品主体和透视，不照抄上游文字。"
    );
    expect(validation.passed).toBe(true);
  });

  it("retrieves upstream recipe reference images for LLM vision input", () => {
    const brief = parseIntent({
      userRequest: "电商主图，热带饮品广告，突出水花和产品质感",
      industry: "饮品"
    });
    const recipes = retrieveVisualRecipes(brief);
    const upstreamImages = buildUpstreamReferenceImages(recipes);
    const hasReadableRecipeReference = recipes.some((item) =>
      item.recipe.referenceImages.some((image) => Boolean(image.path))
    );
    if (hasReadableRecipeReference) {
      expect(upstreamImages.length).toBeGreaterThan(0);
      expect(upstreamImages.length).toBeLessThanOrEqual(2);
      expect(upstreamImages[0]).toMatchObject({
        origin: "upstream_reference",
        sendToLlm: true,
        sendToImage2: false
      });
      expect(upstreamImages[0].path).toContain(`${["prompt", "sources"].join("_")}/`);
    } else {
      expect(upstreamImages).toHaveLength(0);
    }
  });

  it("marks user uploads for both LLM reading and Image2 generation", () => {
    const images: AdImageReferenceImage[] = [
      {
        id: "raw_user_1",
        origin: "user_upload",
        role: "preserve_subject",
        name: "storefront.jpg",
        mimeType: "image/jpeg",
        dataUrl: "data:image/jpeg;base64,abc",
        sendToLlm: false,
        sendToImage2: false
      }
    ];
    const normalized = normalizeUserImages(images);
    expect(normalized[0].sendToLlm).toBe(true);
    expect(normalized[0].sendToImage2).toBe(true);
    expect(getImage2ReferenceImages(normalized)).toHaveLength(1);
  });

  it("builds limited multimodal LLM image inputs and redacts data URLs for records", () => {
    const userImages: AdImageReferenceImage[] = Array.from({ length: 4 }, (_, index) => ({
      id: `user_${index}`,
      origin: "user_upload",
      role: "preserve_subject",
      name: `image-${index}.jpg`,
      mimeType: "image/jpeg",
      dataUrl: `data:image/jpeg;base64,${index}`,
      sendToLlm: true,
      sendToImage2: true
    }));
    const recipes = retrieveVisualRecipes(parseIntent({ userRequest: "热带饮品电商主图", industry: "饮品" }));
    const images = buildLlmReferenceImages(userImages, recipes);
    const hasReadableRecipeReference = recipes.some((item) =>
      item.recipe.referenceImages.some((image) => Boolean(image.path))
    );
    expect(images.filter((image) => image.origin === "user_upload")).toHaveLength(3);
    expect(images.filter((image) => image.origin === "upstream_reference").length).toBeLessThanOrEqual(2);
    expect(images.some((image) => image.origin === "upstream_reference")).toBe(hasReadableRecipeReference);
    expect(redactReferenceImageData(images).some((image) => "dataUrl" in image)).toBe(false);
  });

  it.each(Object.keys(taskTypeLabels) as TaskType[])("compiles the Chinese task label for %s", (taskType) => {
    const brief = parseIntent({
      taskType,
      userRequest: `${taskTypeLabels[taskType]} 测试需求`,
      copywriting: "测试文案"
    });
    const templates = retrieveTemplates(brief);
    const compiled = compilePrompt(brief, buildDesignPlan(brief, templates), templates);
    expect(compiled.finalPrompt).toContain(`作图类型：${taskTypeLabels[taskType]}`);
  });

  it("builds a plain prompt baseline for comparison", () => {
    const brief = parseIntent({
      userRequest: "五一促销海报，主标题半价开业",
      copywriting: "半价开业",
      aspectRatio: "3:4"
    });
    const plainPrompt = buildPlainPrompt(brief);
    expect(plainPrompt).toContain("五一促销海报");
    expect(plainPrompt).toContain("半价开业");
    expect(plainPrompt).toContain("3:4");
  });
});

function countBy<T>(items: T[], keyFn: (item: T) => string): Record<string, number> {
  return items.reduce<Record<string, number>>((counts, item) => {
    const key = keyFn(item);
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});
}
