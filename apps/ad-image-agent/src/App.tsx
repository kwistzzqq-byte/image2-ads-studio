import { useState } from "react";
import { createRoot } from "react-dom/client";
import {
  buildDesignPlan,
  buildPlainPrompt,
  compilePrompt,
  getImage2ReferenceImages,
  ManualTestAdapter,
  parseIntent,
  referenceImageRoleLabels,
  referenceImageRoleLabelsEn,
  redactReferenceImageData,
  retrieveVisualRecipes,
  retrieveTemplates,
  taskTypeLabels,
  taskTypeLabelsEn,
  USER_UPLOAD_IMAGE_LIMIT,
  type AdImageFormInput,
  type AdImageReferenceImage,
  type InputMode,
  type LlmPromptBrainResult,
  type OutputLanguage,
  type ReferenceImageRole,
  type TaskType
} from "ad-image-agent-core";
import "./styles.css";

type AutoTaskType = TaskType | "auto";
type AutoInputMode = InputMode | "auto";
type AutoReferenceImageRole = ReferenceImageRole | "auto";

interface FormState {
  taskType: AutoTaskType;
  inputMode: AutoInputMode;
  industry: string;
  userRequest: string;
  copywriting: string;
  aspectRatio: string;
  styleDirection: string;
  referenceImageRole: AutoReferenceImageRole;
  hardConstraints: string;
}

const languageStorageKey = "ad-image-agent-language";

const initialForms: Record<OutputLanguage, FormState> = {
  "zh-CN": {
    taskType: "auto",
    inputMode: "auto",
    industry: "奶茶",
    userRequest: "帮我做一个奶茶店门头效果图",
    copywriting: "茶屿 TEE ISLAND",
    aspectRatio: "16:9",
    styleDirection: "商业可用、清晰、可制作",
    referenceImageRole: "auto",
    hardConstraints: ""
  },
  en: {
    taskType: "auto",
    inputMode: "auto",
    industry: "milk tea",
    userRequest: "Create a realistic storefront signboard concept for a milk tea shop.",
    copywriting: "TEE ISLAND",
    aspectRatio: "16:9",
    styleDirection: "commercially usable, clear, manufacturable",
    referenceImageRole: "auto",
    hardConstraints: ""
  }
};

const uiText = {
  "zh-CN": {
    appTitle: "AI 广告创作工作台",
    optimize: "生成提示词",
    optimizing: "优化中...",
    startGenerate: "开始生成",
    config: "需求配置",
    creativeType: "创意类型",
    auto: "自动判断",
    industry: "所属行业",
    inputMode: "输入方式",
    textToImage: "纯文本生成",
    imageEdit: "上传图修改",
    aspectRatio: "画面比例",
    userRequest: "需求描述",
    userRequestPlaceholder: "例如：帮我做一个奶茶店门头效果图",
    copywriting: "文案内容",
    copywritingPlaceholder: "需要准确保留的标题、品牌名或活动文案",
    styleDirection: "风格方向",
    referenceRole: "参考图用途",
    referenceImage: "参考图",
    uploadStrong: "上传图片",
    uploadSmall: "在此处上传参考图",
    imageListLabel: "用户参考图片清单",
    imagePolicy: "发送给 LLM · 参与 Image2",
    uploadLimit: (count: number) => `最多读取 ${count} 张用户图，已自动忽略多余图片。`,
    hardConstraints: "硬性约束",
    copyCurrent: "复制当前提示词",
    copiedCurrent: "已复制提示词",
    copyPlain: "复制白话 Prompt",
    copyLlm: "复制 LLM Prompt",
    copiedLlm: "已复制 LLM Prompt",
    downloadJson: "下载 JSON",
    optimizedPrompt: "优化后的提示词",
    llmPrompt: "LLM 优化 Prompt",
    rulePrompt: "规则 Prompt",
    resultPreview: "结果预览",
    previewTitle: "生成的图像预览将显示在此处",
    imageEditPreview: "用户图将参与 Image2 编辑链路",
    textOnlyPreview: "当前版本输出提示词，图片生成保留为手动测试",
    parsedIntent: "需求解析",
    templates: "业务模板",
    recipes: "视觉配方",
    matched: "个命中",
    noTemplate: "无命中模板",
    noRecipe: "无命中配方",
    deterministicChecks: "确定性检查",
    passed: "通过",
    review: "需检查",
    checks: "项检查",
    diagnostics: "检索与方案详情",
    matchedTemplates: "命中模板",
    matchedRecipes: "命中视觉配方",
    designPlan: "设计方案",
    plainPrompt: "白话 Prompt",
    llmErrorFallback: "LLM prompt optimization failed.",
    languageToggleLabel: "界面语言",
    retrievalIndustry: "行业",
    retrievalUseCase: "场景",
    retrievalKeyword: "关键词"
  },
  en: {
    appTitle: "AI Advertising Studio",
    optimize: "Optimize Prompt",
    optimizing: "Optimizing...",
    startGenerate: "Manual Test",
    config: "Brief Configuration",
    creativeType: "Creative Type",
    auto: "Auto",
    industry: "Industry",
    inputMode: "Input Mode",
    textToImage: "Text to Image",
    imageEdit: "Image Edit",
    aspectRatio: "Aspect Ratio",
    userRequest: "Brief",
    userRequestPlaceholder: "Example: Create a storefront signboard concept for a milk tea shop.",
    copywriting: "Copywriting",
    copywritingPlaceholder: "Exact headline, brand name, or campaign copy to preserve",
    styleDirection: "Visual Direction",
    referenceRole: "Reference Image Role",
    referenceImage: "Reference Image",
    uploadStrong: "Upload Images",
    uploadSmall: "Upload reference images here",
    imageListLabel: "User reference image list",
    imagePolicy: "Sent to LLM · Used by Image2",
    uploadLimit: (count: number) => `Only ${count} user images are read; extra images were ignored.`,
    hardConstraints: "Hard Constraints",
    copyCurrent: "Copy Current Prompt",
    copiedCurrent: "Prompt Copied",
    copyPlain: "Copy Plain Prompt",
    copyLlm: "Copy LLM Prompt",
    copiedLlm: "LLM Prompt Copied",
    downloadJson: "Download JSON",
    optimizedPrompt: "Optimized Prompt",
    llmPrompt: "LLM Optimized Prompt",
    rulePrompt: "Rule Prompt",
    resultPreview: "Result Preview",
    previewTitle: "Generated image preview will appear here",
    imageEditPreview: "User images will participate in the Image2 edit workflow",
    textOnlyPreview: "This MVP outputs prompts; image generation remains a manual test",
    parsedIntent: "Parsed Intent",
    templates: "Templates",
    recipes: "Recipes",
    matched: "matched",
    noTemplate: "No matched template",
    noRecipe: "No matched recipe",
    deterministicChecks: "Deterministic Checks",
    passed: "Passed",
    review: "Review",
    checks: "checks",
    diagnostics: "Retrieval and Plan Details",
    matchedTemplates: "Matched Templates",
    matchedRecipes: "Matched Recipes",
    designPlan: "Design Plan",
    plainPrompt: "Plain Prompt",
    llmErrorFallback: "LLM prompt optimization failed.",
    languageToggleLabel: "Language",
    retrievalIndustry: "Industry",
    retrievalUseCase: "Use case",
    retrievalKeyword: "Keyword"
  }
} as const;

const manualAdapter = new ManualTestAdapter();

const taskTypeOptions: TaskType[] = [
  "storefront_signboard",
  "poster_design",
  "rollup_banner",
  "event_backdrop",
  "signage_wayfinding",
  "brand_wall",
  "local_store_promotion",
  "ecommerce_main_image",
  "product_ad",
  "commercial_photography"
];

const referenceRoleOptions: ReferenceImageRole[] = [
  "none",
  "preserve_structure",
  "preserve_subject",
  "style_reference_only",
  "background_replace",
  "local_edit",
  "scene_mockup"
];

const initialLanguage = detectInitialLanguage();

export default function App() {
  const [language, setLanguageState] = useState<OutputLanguage>(initialLanguage);
  const [form, setForm] = useState<FormState>(() => initialForms[initialLanguage]);
  const [userImages, setUserImages] = useState<AdImageReferenceImage[]>([]);
  const [copied, setCopied] = useState(false);
  const [llmCopied, setLlmCopied] = useState(false);
  const [adapterNote, setAdapterNote] = useState("");
  const [llmResult, setLlmResult] = useState<LlmPromptBrainResult | null>(null);
  const [llmLoading, setLlmLoading] = useState(false);
  const [llmError, setLlmError] = useState("");
  const [imageInputError, setImageInputError] = useState("");
  const t = uiText[language];
  const taskLabels = language === "en" ? taskTypeLabelsEn : taskTypeLabels;
  const referenceLabels = language === "en" ? referenceImageRoleLabelsEn : referenceImageRoleLabels;

  const result = useCompiledResult(form, language);
  const activePrompt = llmResult?.finalPrompt ?? result.compiled.finalPrompt;
  const activePromptSource = llmResult ? t.llmPrompt : t.rulePrompt;
  const activeChecks = llmResult?.deterministicChecks ?? result.compiled.deterministicChecks;

  function setLanguage(nextLanguage: OutputLanguage) {
    setLanguageState(nextLanguage);
    try {
      window.localStorage.setItem(languageStorageKey, nextLanguage);
    } catch {
      // Browser privacy settings may block localStorage; language still changes for this session.
    }
    setCopied(false);
    setLlmCopied(false);
    setAdapterNote("");
    setLlmResult(null);
    setLlmError("");
  }

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setCopied(false);
    setLlmCopied(false);
    setAdapterNote("");
    setLlmResult(null);
    setLlmError("");
    setImageInputError("");
  }

  async function copyPrompt() {
    await navigator.clipboard.writeText(activePrompt);
    setCopied(true);
  }

  async function copyPlainPrompt() {
    await navigator.clipboard.writeText(result.plainPrompt);
    setCopied(false);
  }

  async function copyLlmPrompt() {
    if (!llmResult) return;
    await navigator.clipboard.writeText(llmResult.finalPrompt);
    setLlmCopied(true);
  }

  function downloadRecord() {
    const record = createRecord(form, language, userImages, result, llmResult);
    const blob = new Blob([JSON.stringify(record, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `ad-image-agent-${Date.now()}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function runManualAdapter() {
    const response =
      result.brief.inputMode === "image_edit"
        ? await manualAdapter.editImage(result.compiled, userImages)
        : await manualAdapter.generateTextToImage(result.compiled);
    setAdapterNote(response.instructions);
  }

  async function handleImageChange(files: FileList | null) {
    setImageInputError("");
    setAdapterNote("");
    setLlmResult(null);
    setLlmError("");
    const selectedFiles = Array.from(files ?? []).slice(0, USER_UPLOAD_IMAGE_LIMIT);
    if (!selectedFiles.length) {
      setUserImages([]);
      return;
    }
    if ((files?.length ?? 0) > USER_UPLOAD_IMAGE_LIMIT) {
      setImageInputError(t.uploadLimit(USER_UPLOAD_IMAGE_LIMIT));
    }
    const role = result.brief.referenceImageRole === "none" ? "preserve_subject" : result.brief.referenceImageRole;
    const images = await Promise.all(selectedFiles.map((file, index) => createUserUploadImage(file, index, role)));
    setUserImages(images);
    setForm((current) => ({
      ...current,
      inputMode: current.inputMode === "auto" ? "image_edit" : current.inputMode,
      referenceImageRole: current.referenceImageRole === "auto" ? role : current.referenceImageRole
    }));
  }

  async function runLlmBrain() {
    setLlmLoading(true);
    setLlmError("");
    setLlmCopied(false);
    try {
      const response = await fetch("/api/llm-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          formInput: toFormInput(form, language),
          userImages
        })
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? t.llmErrorFallback);
      }
      setLlmResult(payload.result as LlmPromptBrainResult);
    } catch (error) {
      setLlmError(error instanceof Error ? error.message : String(error));
    } finally {
      setLlmLoading(false);
    }
  }

  return (
    <main className="studioShell">
      <header className="studioTopbar">
        <div className="brandCluster">
          <div className="brandMark">A</div>
          <div className="brandDivider" />
          <h1>{t.appTitle}</h1>
        </div>
        <div className="topActions">
          <div className="languageToggle" aria-label={t.languageToggleLabel}>
            <button type="button" className={language === "zh-CN" ? "isActive" : ""} onClick={() => setLanguage("zh-CN")}>
              中文
            </button>
            <button type="button" className={language === "en" ? "isActive" : ""} onClick={() => setLanguage("en")}>
              English
            </button>
          </div>
          <button className="darkButton" type="button" onClick={runLlmBrain} disabled={llmLoading}>
            {llmLoading ? t.optimizing : t.optimize}
          </button>
          <button className="primaryButton" type="button" onClick={runManualAdapter}>
            {t.startGenerate}
          </button>
        </div>
      </header>

      <section className="studioCanvas">
        <form className="configPanel">
          <h2>{t.config}</h2>

          <div className="controlGrid">
            <label>
              <span>{t.creativeType}</span>
              <select value={form.taskType} onChange={(event) => updateField("taskType", event.target.value as AutoTaskType)}>
                <option value="auto">{t.auto}</option>
                {taskTypeOptions.map((taskType) => (
                  <option value={taskType} key={taskType}>
                    {taskLabels[taskType]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>{t.industry}</span>
              <input value={form.industry} onChange={(event) => updateField("industry", event.target.value)} />
            </label>
            <label>
              <span>{t.inputMode}</span>
              <select value={form.inputMode} onChange={(event) => updateField("inputMode", event.target.value as AutoInputMode)}>
                <option value="auto">{t.auto}</option>
                <option value="text_to_image">{t.textToImage}</option>
                <option value="image_edit">{t.imageEdit}</option>
              </select>
            </label>
            <label>
              <span>{t.aspectRatio}</span>
              <select value={form.aspectRatio} onChange={(event) => updateField("aspectRatio", event.target.value)}>
                <option value="16:9">16:9 (Landscape)</option>
                <option value="4:3">4:3</option>
                <option value="3:4">3:4</option>
                <option value="1:1">1:1</option>
                <option value="9:16">9:16 (Portrait)</option>
              </select>
            </label>
          </div>

          <label>
            <span>{t.userRequest}</span>
            <textarea
              value={form.userRequest}
              onChange={(event) => updateField("userRequest", event.target.value)}
              rows={5}
              placeholder={t.userRequestPlaceholder}
            />
          </label>

          <label>
            <span>{t.copywriting}</span>
            <textarea
              value={form.copywriting}
              onChange={(event) => updateField("copywriting", event.target.value)}
              rows={5}
              placeholder={t.copywritingPlaceholder}
            />
          </label>

          <div className="controlGrid">
            <label>
              <span>{t.styleDirection}</span>
              <input value={form.styleDirection} onChange={(event) => updateField("styleDirection", event.target.value)} />
            </label>
            <label>
              <span>{t.referenceRole}</span>
              <select
                value={form.referenceImageRole}
                onChange={(event) => updateField("referenceImageRole", event.target.value as AutoReferenceImageRole)}
              >
                <option value="auto">{t.auto}</option>
                {referenceRoleOptions.map((role) => (
                  <option value={role} key={role}>
                    {referenceLabels[role]}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label>
            <span>{t.referenceImage}</span>
            <span className="uploadBox">
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                multiple
                onChange={(event) => void handleImageChange(event.target.files)}
              />
              <strong>{t.uploadStrong}</strong>
              <small>{t.uploadSmall}</small>
            </span>
          </label>

          {userImages.length ? (
            <div className="imageList" aria-label={t.imageListLabel}>
              {userImages.map((image) => (
                <div className="imageItem" key={image.id}>
                  <strong>{image.name}</strong>
                  <span>{referenceLabels[image.role]}</span>
                  <small>{t.imagePolicy}</small>
                </div>
              ))}
            </div>
          ) : null}

          {imageInputError ? <div className="notice">{imageInputError}</div> : null}

          <label>
            <span>{t.hardConstraints}</span>
            <textarea value={form.hardConstraints} onChange={(event) => updateField("hardConstraints", event.target.value)} rows={3} />
          </label>

          <div className="secondaryActions">
            <button type="button" onClick={copyPrompt}>
              {copied ? t.copiedCurrent : t.copyCurrent}
            </button>
            <button type="button" onClick={copyPlainPrompt}>
              {t.copyPlain}
            </button>
            <button type="button" onClick={copyLlmPrompt} disabled={!llmResult}>
              {llmCopied ? t.copiedLlm : t.copyLlm}
            </button>
            <button type="button" onClick={downloadRecord}>
              {t.downloadJson}
            </button>
          </div>
        </form>

        <section className="previewPanel">
          <div className="promptCard">
            <div className="panelTitleBar">
              <span>{t.optimizedPrompt}</span>
              <em>{activePromptSource}</em>
            </div>
            <div className="codeSurface" aria-label={t.optimizedPrompt}>
              {numberPromptLines(activePrompt).map((line) => (
                <div className="codeLine" key={`${line.number}-${line.text}`}>
                  <span>{line.number}</span>
                  <code>{line.text || " "}</code>
                </div>
              ))}
            </div>
          </div>

          <div className="resultCard">
            <h2>{t.resultPreview}</h2>
            <div className="resultPreview">
              <div className="imageIcon">▧</div>
              <strong>{t.previewTitle}</strong>
              {adapterNote ? <p>{adapterNote}</p> : <p>{result.brief.inputMode === "image_edit" ? t.imageEditPreview : t.textOnlyPreview}</p>}
            </div>
          </div>

          {llmError ? <div className="errorBox">{llmError}</div> : null}

          <div className="signalGrid">
            <div className="signalCard">
              <span>{t.parsedIntent}</span>
              <strong>{taskLabels[result.brief.taskType]}</strong>
              <small>{result.brief.inputMode === "image_edit" ? t.imageEdit : t.textToImage} · {result.brief.aspectRatio}</small>
            </div>
            <div className="signalCard">
              <span>{t.templates}</span>
              <strong>{result.templates.length} {t.matched}</strong>
              <small>{result.templates[0]?.template.name ?? t.noTemplate}</small>
            </div>
            <div className="signalCard">
              <span>{t.recipes}</span>
              <strong>{result.recipes.length} {t.matched}</strong>
              <small>{result.recipes[0]?.recipe.name ?? t.noRecipe}</small>
            </div>
            <div className="signalCard">
              <span>{t.deterministicChecks}</span>
              <strong>{Object.values(activeChecks).every(Boolean) ? t.passed : t.review}</strong>
              <small>{Object.entries(activeChecks).filter(([, passed]) => passed).length}/{Object.keys(activeChecks).length} {t.checks}</small>
            </div>
          </div>

          <details className="diagnosticPanel">
            <summary>{t.diagnostics}</summary>
            <div className="diagnosticGrid">
              <div>
                <h3>{t.matchedTemplates}</h3>
                <div className="templateList">
                  {result.templates.map((item) => (
                    <div className="templateItem" key={item.template.id}>
                      <strong>{item.template.name}</strong>
                      <span>{item.template.id}</span>
                      <small>
                        {item.reasons.join("、")} / {item.score}
                        {formatRetrievalSignals(item.matchedIndustries, item.matchedKeywords, item.matchedUseCases, language)}
                      </small>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h3>{t.matchedRecipes}</h3>
                <div className="templateList">
                  {result.recipes.map((item) => (
                    <div className="templateItem" key={item.recipe.id}>
                      <strong>{item.recipe.name}</strong>
                      <span>{item.recipe.id}</span>
                      <small>
                        {item.reasons.join("、")} / {item.score}
                        {formatRetrievalSignals(item.matchedIndustries, item.matchedKeywords, item.matchedUseCases, language)}
                      </small>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h3>{t.designPlan}</h3>
                <pre>{result.designPlan}</pre>
              </div>
              <div>
                <h3>{t.plainPrompt}</h3>
                <pre>{result.plainPrompt}</pre>
              </div>
            </div>
          </details>
        </section>
      </section>
    </main>
  );
}

function detectInitialLanguage(): OutputLanguage {
  try {
    const stored = window.localStorage.getItem(languageStorageKey);
    if (stored === "en" || stored === "zh-CN") return stored;
  } catch {
    // Fall back to browser language below.
  }
  return navigator.language.toLowerCase().startsWith("zh") ? "zh-CN" : "en";
}

function toFormInput(form: FormState, outputLanguage: OutputLanguage): AdImageFormInput {
  return {
    taskType: form.taskType,
    inputMode: form.inputMode,
    outputLanguage,
    industry: form.industry,
    userRequest: form.userRequest,
    copywriting: form.copywriting,
    aspectRatio: form.aspectRatio,
    styleDirection: form.styleDirection,
    referenceImageRole: form.referenceImageRole,
    hardConstraints: form.hardConstraints
  };
}

function createRecord(
  form: FormState,
  outputLanguage: OutputLanguage,
  userImages: AdImageReferenceImage[],
  result: ReturnType<typeof useCompiledResultShape>,
  llmResult: LlmPromptBrainResult | null
) {
  const redactedUserImages = redactReferenceImageData(userImages);
  return {
    generatedAt: new Date().toISOString(),
    outputLanguage,
    form: toFormInput(form, outputLanguage),
    userImages: redactedUserImages,
    image2ReferenceImages: redactReferenceImageData(getImage2ReferenceImages(userImages)),
    parsedIntent: result.brief,
    matchedTemplates: result.templates.map((item) => ({
      id: item.template.id,
      name: item.template.name,
      score: item.score,
      reasons: item.reasons,
      matchedKeywords: item.matchedKeywords,
      matchedIndustries: item.matchedIndustries,
      matchedUseCases: item.matchedUseCases
    })),
    matchedRecipes: result.recipes.map((item) => ({
      id: item.recipe.id,
      name: item.recipe.name,
      source: item.recipe.source,
      score: item.score,
      reasons: item.reasons,
      matchedKeywords: item.matchedKeywords,
      matchedIndustries: item.matchedIndustries,
      matchedUseCases: item.matchedUseCases
    })),
    designPlan: result.designPlan,
    plainPrompt: result.plainPrompt,
    llmPrompt: llmResult,
    compiledPrompt: result.compiled
  };
}

function formatRetrievalSignals(industries: string[], keywords: string[], useCases: string[], language: OutputLanguage): string {
  const t = uiText[language];
  const signals = [
    industries.length ? `${t.retrievalIndustry}:${industries.slice(0, 3).join("/")}` : "",
    useCases.length ? `${t.retrievalUseCase}:${useCases.slice(0, 3).join("/")}` : "",
    keywords.length ? `${t.retrievalKeyword}:${keywords.slice(0, 4).join("/")}` : ""
  ].filter(Boolean);
  return signals.length ? ` · ${signals.join(" · ")}` : "";
}

function numberPromptLines(prompt: string): Array<{ number: number; text: string }> {
  return prompt.split("\n").map((text, index) => ({ number: index + 1, text }));
}

async function createUserUploadImage(file: File, index: number, role: ReferenceImageRole): Promise<AdImageReferenceImage> {
  const { dataUrl, mimeType } = await compressImageFile(file);
  return {
    id: `user_upload_${Date.now()}_${index + 1}`,
    origin: "user_upload",
    role,
    name: file.name,
    mimeType,
    dataUrl,
    sendToLlm: true,
    sendToImage2: true
  };
}

async function compressImageFile(file: File): Promise<{ dataUrl: string; mimeType: string }> {
  const originalDataUrl = await readFileAsDataUrl(file);
  const image = await loadImage(originalDataUrl);
  const maxEdge = 1280;
  const ratio = Math.min(1, maxEdge / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * ratio));
  const height = Math.max(1, Math.round(image.height * ratio));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return { dataUrl: originalDataUrl, mimeType: file.type || "image/jpeg" };
  context.drawImage(image, 0, 0, width, height);
  const preservePng = file.type === "image/png" && hasTransparentPixels(context, width, height);
  const mimeType = preservePng ? "image/png" : file.type === "image/webp" ? "image/webp" : "image/jpeg";
  const dataUrl = canvas.toDataURL(mimeType, preservePng ? undefined : 0.85);
  return { dataUrl, mimeType };
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read image file."));
    reader.readAsDataURL(file);
  });
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Failed to load image file."));
    image.src = dataUrl;
  });
}

function hasTransparentPixels(context: CanvasRenderingContext2D, width: number, height: number): boolean {
  try {
    const data = context.getImageData(0, 0, width, height).data;
    for (let index = 3; index < data.length; index += 4) {
      if (data[index] < 255) return true;
    }
  } catch {
    return true;
  }
  return false;
}

function useCompiledResult(form: FormState, outputLanguage: OutputLanguage) {
  const brief = parseIntent(toFormInput(form, outputLanguage));
  const templates = retrieveTemplates(brief);
  const recipes = retrieveVisualRecipes(brief);
  const designPlan = buildDesignPlan(brief, templates, recipes);
  const compiled = compilePrompt(brief, designPlan, templates, recipes);
  const plainPrompt = buildPlainPrompt(brief);
  return { brief, templates, recipes, designPlan, compiled, plainPrompt };
}

function useCompiledResultShape() {
  return useCompiledResult(initialForms["zh-CN"], "zh-CN");
}

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(<App />);
}
