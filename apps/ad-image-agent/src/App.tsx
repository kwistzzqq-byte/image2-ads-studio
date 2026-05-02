import { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  buildDesignPlan,
  buildPlainPrompt,
  compilePrompt,
  getImage2ReferenceImages,
  ManualTestAdapter,
  parseIntent,
  referenceImageRoleLabels,
  redactReferenceImageData,
  retrieveVisualRecipes,
  retrieveTemplates,
  taskTypeLabels,
  USER_UPLOAD_IMAGE_LIMIT,
  type AdImageReferenceImage,
  type AdImageFormInput,
  type InputMode,
  type LlmPromptBrainResult,
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

const initialForm: FormState = {
  taskType: "auto",
  inputMode: "auto",
  industry: "奶茶",
  userRequest: "帮我做一个奶茶店门头效果图",
  copywriting: "茶屿 TEE ISLAND",
  aspectRatio: "16:9",
  styleDirection: "商业可用、清晰、可制作",
  referenceImageRole: "auto",
  hardConstraints: ""
};

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

export default function App() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [userImages, setUserImages] = useState<AdImageReferenceImage[]>([]);
  const [copied, setCopied] = useState(false);
  const [llmCopied, setLlmCopied] = useState(false);
  const [adapterNote, setAdapterNote] = useState("");
  const [llmResult, setLlmResult] = useState<LlmPromptBrainResult | null>(null);
  const [llmLoading, setLlmLoading] = useState(false);
  const [llmError, setLlmError] = useState("");
  const [imageInputError, setImageInputError] = useState("");

  const result = useMemo(() => {
    const brief = parseIntent(toFormInput(form));
    const templates = retrieveTemplates(brief);
    const recipes = retrieveVisualRecipes(brief);
    const designPlan = buildDesignPlan(brief, templates, recipes);
    const compiled = compilePrompt(brief, designPlan, templates, recipes);
    const plainPrompt = buildPlainPrompt(brief);
    return { brief, templates, recipes, designPlan, compiled, plainPrompt };
  }, [form]);
  const activePrompt = llmResult?.finalPrompt ?? result.compiled.finalPrompt;
  const activePromptSource = llmResult ? "LLM Optimized Prompt" : "Rule Prompt";
  const activeChecks = llmResult?.deterministicChecks ?? result.compiled.deterministicChecks;

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
    const record = createRecord(form, userImages, result, llmResult);
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
      setImageInputError(`最多读取 ${USER_UPLOAD_IMAGE_LIMIT} 张用户图，已自动忽略多余图片。`);
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
          formInput: toFormInput(form),
          userImages
        })
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "LLM prompt optimization failed.");
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
          <h1>AI 广告创作工作台</h1>
        </div>
        <div className="topActions">
          <button className="darkButton" type="button" onClick={runLlmBrain} disabled={llmLoading}>
            {llmLoading ? "优化中..." : "生成提示词"}
          </button>
          <button className="primaryButton" type="button" onClick={runManualAdapter}>
            开始生成
          </button>
        </div>
      </header>

      <section className="studioCanvas">
        <form className="configPanel">
          <h2>需求配置</h2>

          <div className="controlGrid">
            <label>
              <span>创意类型</span>
              <select value={form.taskType} onChange={(event) => updateField("taskType", event.target.value as AutoTaskType)}>
                <option value="auto">自动判断</option>
                {taskTypeOptions.map((taskType) => (
                  <option value={taskType} key={taskType}>
                    {taskTypeLabels[taskType]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>所属行业</span>
              <input value={form.industry} onChange={(event) => updateField("industry", event.target.value)} />
            </label>
            <label>
              <span>输入方式</span>
              <select value={form.inputMode} onChange={(event) => updateField("inputMode", event.target.value as AutoInputMode)}>
                <option value="auto">自动判断</option>
                <option value="text_to_image">纯文本生成</option>
                <option value="image_edit">上传图修改</option>
              </select>
            </label>
            <label>
              <span>画面比例</span>
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
            <span>需求描述</span>
            <textarea
              value={form.userRequest}
              onChange={(event) => updateField("userRequest", event.target.value)}
              rows={5}
              placeholder="Demand Description"
            />
          </label>

          <label>
            <span>文案内容</span>
            <textarea
              value={form.copywriting}
              onChange={(event) => updateField("copywriting", event.target.value)}
              rows={5}
              placeholder="Copywriting here"
            />
          </label>

          <div className="controlGrid">
            <label>
              <span>风格方向</span>
              <input value={form.styleDirection} onChange={(event) => updateField("styleDirection", event.target.value)} />
            </label>
            <label>
              <span>参考图用途</span>
              <select
                value={form.referenceImageRole}
                onChange={(event) => updateField("referenceImageRole", event.target.value as AutoReferenceImageRole)}
              >
                <option value="auto">自动判断</option>
                {referenceRoleOptions.map((role) => (
                  <option value={role} key={role}>
                    {referenceImageRoleLabels[role]}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label>
            <span>参考图</span>
            <span className="uploadBox">
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                multiple
                onChange={(event) => void handleImageChange(event.target.files)}
              />
              <strong>上传图片</strong>
              <small>在此处上传参考图</small>
            </span>
          </label>

          {userImages.length ? (
            <div className="imageList" aria-label="用户参考图片清单">
              {userImages.map((image) => (
                <div className="imageItem" key={image.id}>
                  <strong>{image.name}</strong>
                  <span>{referenceImageRoleLabels[image.role]}</span>
                  <small>发送给 LLM · 参与 Image2</small>
                </div>
              ))}
            </div>
          ) : null}

          {imageInputError ? <div className="notice">{imageInputError}</div> : null}

          <label>
            <span>硬性约束</span>
            <textarea value={form.hardConstraints} onChange={(event) => updateField("hardConstraints", event.target.value)} rows={3} />
          </label>

          <div className="secondaryActions">
            <button type="button" onClick={copyPrompt}>
              {copied ? "已复制提示词" : "复制当前提示词"}
            </button>
            <button type="button" onClick={copyPlainPrompt}>
              复制白话 Prompt
            </button>
            <button type="button" onClick={copyLlmPrompt} disabled={!llmResult}>
              {llmCopied ? "已复制 LLM Prompt" : "复制 LLM Prompt"}
            </button>
            <button type="button" onClick={downloadRecord}>
              下载 JSON
            </button>
          </div>
        </form>

        <section className="previewPanel">
          <div className="promptCard">
            <div className="panelTitleBar">
              <span>优化后的提示词</span>
              <em>{activePromptSource}</em>
            </div>
            <div className="codeSurface" aria-label="优化后的提示词">
              {numberPromptLines(activePrompt).map((line) => (
                <div className="codeLine" key={`${line.number}-${line.text}`}>
                  <span>{line.number}</span>
                  <code>{line.text || " "}</code>
                </div>
              ))}
            </div>
          </div>

          <div className="resultCard">
            <h2>结果预览</h2>
            <div className="resultPreview">
              <div className="imageIcon">▧</div>
              <strong>生成的图像预览将显示在此处</strong>
              {adapterNote ? <p>{adapterNote}</p> : <p>{result.brief.inputMode === "image_edit" ? "用户图将参与 Image2 编辑链路" : "当前版本输出提示词，图片生成保留为手动测试"}</p>}
            </div>
          </div>

          {llmError ? <div className="errorBox">{llmError}</div> : null}

          <div className="signalGrid">
            <div className="signalCard">
              <span>Parsed Intent</span>
              <strong>{taskTypeLabels[result.brief.taskType]}</strong>
              <small>{result.brief.inputMode === "image_edit" ? "上传图修改" : "纯文本生成"} · {result.brief.aspectRatio}</small>
            </div>
            <div className="signalCard">
              <span>Templates</span>
              <strong>{result.templates.length} matched</strong>
              <small>{result.templates[0]?.template.name ?? "无命中模板"}</small>
            </div>
            <div className="signalCard">
              <span>Recipes</span>
              <strong>{result.recipes.length} matched</strong>
              <small>{result.recipes[0]?.recipe.name ?? "无命中配方"}</small>
            </div>
            <div className="signalCard">
              <span>Deterministic Checks</span>
              <strong>{Object.values(activeChecks).every(Boolean) ? "Passed" : "Review"}</strong>
              <small>{Object.entries(activeChecks).filter(([, passed]) => passed).length}/{Object.keys(activeChecks).length} checks</small>
            </div>
          </div>

          <details className="diagnosticPanel">
            <summary>检索与方案详情</summary>
            <div className="diagnosticGrid">
              <div>
                <h3>Matched Templates</h3>
                <div className="templateList">
                  {result.templates.map((item) => (
                    <div className="templateItem" key={item.template.id}>
                      <strong>{item.template.name}</strong>
                      <span>{item.template.id}</span>
                      <small>
                        {item.reasons.join("、")} / {item.score}
                        {formatRetrievalSignals(item.matchedIndustries, item.matchedKeywords, item.matchedUseCases)}
                      </small>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h3>Matched Recipes</h3>
                <div className="templateList">
                  {result.recipes.map((item) => (
                    <div className="templateItem" key={item.recipe.id}>
                      <strong>{item.recipe.name}</strong>
                      <span>{item.recipe.id}</span>
                      <small>
                        {item.reasons.join("、")} / {item.score}
                        {formatRetrievalSignals(item.matchedIndustries, item.matchedKeywords, item.matchedUseCases)}
                      </small>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h3>Design Plan</h3>
                <pre>{result.designPlan}</pre>
              </div>
              <div>
                <h3>Plain Prompt</h3>
                <pre>{result.plainPrompt}</pre>
              </div>
            </div>
          </details>
        </section>
      </section>
    </main>
  );
}

function toFormInput(form: FormState): AdImageFormInput {
  return {
    taskType: form.taskType,
    inputMode: form.inputMode,
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
  userImages: AdImageReferenceImage[],
  result: ReturnType<typeof useCompiledResultShape>,
  llmResult: LlmPromptBrainResult | null
) {
  const redactedUserImages = redactReferenceImageData(userImages);
  return {
    generatedAt: new Date().toISOString(),
    form,
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

function formatRetrievalSignals(industries: string[], keywords: string[], useCases: string[]): string {
  const signals = [
    industries.length ? `行业:${industries.slice(0, 3).join("/")}` : "",
    useCases.length ? `场景:${useCases.slice(0, 3).join("/")}` : "",
    keywords.length ? `关键词:${keywords.slice(0, 4).join("/")}` : ""
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

function useCompiledResultShape() {
  const brief = parseIntent(toFormInput(initialForm));
  const templates = retrieveTemplates(brief);
  const recipes = retrieveVisualRecipes(brief);
  const designPlan = buildDesignPlan(brief, templates, recipes);
  const compiled = compilePrompt(brief, designPlan, templates, recipes);
  const plainPrompt = buildPlainPrompt(brief);
  return { brief, templates, recipes, designPlan, compiled, plainPrompt };
}

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(<App />);
}
