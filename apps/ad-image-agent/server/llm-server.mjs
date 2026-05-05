import { createReadStream, existsSync, readFileSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildDesignPlan,
  buildLlmReferenceImages,
  buildPlainPrompt,
  compilePrompt,
  findBannedPromptPhrases,
  formatDeterministicRequirements,
  getImage2ReferenceImages,
  normalizeUserImages,
  parseIntent,
  redactReferenceImageData,
  retrieveVisualRecipes,
  retrieveTemplates,
  rewriteAmbiguousStyleText,
  validateDeterministicPrompt
} from "../../../packages/ad-image-agent-core/dist/index.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const appRoot = resolve(__dirname, "..");
const distRoot = resolve(appRoot, "dist");

loadEnvFile(resolve(appRoot, [".env", "llm", "local"].join(".")));

const port = Number(process.env.AD_IMAGE_AGENT_PORT ?? 5174);
const host = process.env.AD_IMAGE_AGENT_HOST ?? "127.0.0.1";
const provider = process.env.AD_IMAGE_AGENT_LLM_PROVIDER ?? "OpenAI";
const wireApi = process.env.AD_IMAGE_AGENT_LLM_WIRE_API ?? "responses";
const model = process.env.AD_IMAGE_AGENT_LLM_MODEL ?? "gpt-5.4";
const reviewModel = process.env.AD_IMAGE_AGENT_LLM_REVIEW_MODEL ?? model;
const reasoningEffort = optionalString(process.env.AD_IMAGE_AGENT_LLM_REASONING_EFFORT ?? "medium");
const disableResponseStorage = parseBoolean(process.env.AD_IMAGE_AGENT_DISABLE_RESPONSE_STORAGE, false);
const tlsInsecure = parseBoolean(process.env.AD_IMAGE_AGENT_LLM_TLS_INSECURE, false);
const llmBaseUrl = process.env.AD_IMAGE_AGENT_LLM_BASE_URL ?? process.env.OPENAI_BASE_URL ?? "https://api.openai.com";
const responsesUrl = buildResponsesUrl(llmBaseUrl);

if (tlsInsecure) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

if (!existsSync(distRoot)) {
  console.error("Missing dist directory. Run `pnpm --filter ad-image-agent build` first.");
  process.exit(1);
}

const server = createServer(async (req, res) => {
  try {
    if (req.method === "POST" && req.url === "/api/llm-prompt") {
      await handleLlmPrompt(req, res);
      return;
    }
    if (req.method === "GET" || req.method === "HEAD") {
      await serveStatic(req, res);
      return;
    }
    sendJson(res, 405, { error: "Method not allowed" });
  } catch (error) {
    sendJson(res, typeof error?.status === "number" ? error.status : 500, {
      error: error instanceof Error ? error.message : String(error),
      detail: error?.detail
    });
  }
});

server.listen(port, host, () => {
  console.log(`Ad Image Agent with LLM brain: http://${host}:${port}/`);
  console.log(`LLM provider=${provider} model=${model} review_model=${reviewModel} wire_api=${wireApi} base_url=${llmBaseUrl}`);
  if (tlsInsecure) console.warn("LLM TLS verification is disabled for this local agent process.");
});

async function handleLlmPrompt(req, res) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    sendJson(res, 400, {
      error: "Missing OPENAI_API_KEY. Set it in your shell before starting the LLM server."
    });
    return;
  }

  const body = await readJsonBody(req);
  const formInput = body?.formInput;
  const userImages = normalizeUserImages(Array.isArray(body?.userImages) ? body.userImages : []);
  if (!formInput || typeof formInput.userRequest !== "string") {
    sendJson(res, 400, { error: "Invalid request body: formInput.userRequest is required." });
    return;
  }

  const brief = parseIntent(applyUserImageDefaults(formInput, userImages));
  const templates = retrieveTemplates(brief);
  const recipes = retrieveVisualRecipes(brief);
  const designPlan = buildDesignPlan(brief, templates, recipes);
  const compiled = compilePrompt(brief, designPlan, templates, recipes);
  const plainPrompt = buildPlainPrompt(brief);
  const llmReferenceImages = resolveReferenceImageDataUrls(buildLlmReferenceImages(userImages, recipes));
  const image2ReferenceImages = getImage2ReferenceImages(userImages);
  const payloadInput = {
    brief,
    templates,
    recipes,
    designPlan,
    compiled,
    plainPrompt,
    llmReferenceImages,
    image2ReferenceImages
  };
  const payload = buildResponsesPayload(payloadInput);

  let parsed = await requestPromptBrain(payload, apiKey);
  parsed = normalizeParsedPromptBrain(parsed, brief.outputLanguage);
  let deterministicValidation = validateDeterministicPrompt(parsed.finalPrompt);
  if (!deterministicValidation.passed) {
    const repairPayload = buildResponsesPayload({
      ...payloadInput,
      repairInstructions: {
        previousFinalPrompt: parsed.finalPrompt,
        bannedPhrases: deterministicValidation.bannedPhrases,
        missingRequirements: deterministicValidation.missingRequirements
      }
    });
    parsed = normalizeParsedPromptBrain(await requestPromptBrain(repairPayload, apiKey), brief.outputLanguage);
    deterministicValidation = validateDeterministicPrompt(parsed.finalPrompt);
  }
  if (!deterministicValidation.passed) {
    sendJson(res, 422, {
      error: "LLM prompt failed deterministic validation after one repair attempt.",
      deterministicValidation
    });
    return;
  }

  sendJson(res, 200, {
    mode: "llm_brain",
    model,
    provider,
    baseline: {
      brief,
      plainPrompt,
      rulePrompt: compiled.finalPrompt,
      templateIds: compiled.templateIds,
      recipeIds: recipes.map((item) => item.recipe.id),
      llmReferenceImages: redactReferenceImageData(llmReferenceImages),
      image2ReferenceImages: redactReferenceImageData(image2ReferenceImages)
    },
    result: {
      mode: "llm_brain",
      model,
      provider,
      referenceImageObservations: parsed.referenceImageObservations,
      deterministicChecks: deterministicValidation.checks,
      designPlan: parsed.designPlan,
      finalPrompt: parsed.finalPrompt,
      improvementNotes: parsed.improvementNotes,
      riskWarnings: parsed.riskWarnings
    }
  });
}

function applyUserImageDefaults(formInput, userImages) {
  if (!userImages.length) return formInput;
  return {
    ...formInput,
    inputMode: !formInput.inputMode || formInput.inputMode === "auto" ? "image_edit" : formInput.inputMode,
    referenceImageRole:
      !formInput.referenceImageRole || formInput.referenceImageRole === "auto" || formInput.referenceImageRole === "none"
        ? "preserve_subject"
        : formInput.referenceImageRole
  };
}

async function requestPromptBrain(payload, apiKey) {
  const response = await fetch(responsesUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
  const responseText = await response.text();
  let data;
  try {
    data = responseText ? JSON.parse(responseText) : {};
  } catch {
    const error = new Error(`OpenAI request returned non-JSON response (${response.status}).`);
    error.status = response.status >= 400 ? response.status : 502;
    error.detail = responseText.slice(0, 500);
    throw error;
  }
  if (!response.ok) {
    const error = new Error(data?.error?.message ?? "OpenAI request failed.");
    error.status = response.status;
    error.detail = data;
    throw error;
  }
  return parseResponseJson(data);
}

function normalizeParsedPromptBrain(parsed, outputLanguage = "zh-CN") {
  const finalPrompt = rewriteAmbiguousStyleText(parsed.finalPrompt, outputLanguage);
  return {
    ...parsed,
    designPlan: rewriteAmbiguousStyleText(parsed.designPlan, outputLanguage),
    finalPrompt,
    deterministicChecks: validateDeterministicPrompt(finalPrompt).checks
  };
}

function buildResponsesPayload({
  brief,
  templates,
  recipes,
  designPlan,
  compiled,
  plainPrompt,
  llmReferenceImages,
  image2ReferenceImages,
  repairInstructions
}) {
  const templateSummary = templates.map((item) => ({
    id: item.template.id,
    name: item.template.name,
    score: item.score,
    reasons: item.reasons,
    matchedKeywords: item.matchedKeywords,
    matchedIndustries: item.matchedIndustries,
    matchedUseCases: item.matchedUseCases,
    layoutPattern: item.template.layoutPattern,
    promptSkeleton: item.template.promptSkeleton,
    negativeConstraints: item.template.negativeConstraints
  }));
  const recipeSummary = recipes.map((item) => ({
    id: item.recipe.id,
    name: item.recipe.name,
    score: item.score,
    reasons: item.reasons,
    matchedKeywords: item.matchedKeywords,
    matchedIndustries: item.matchedIndustries,
    matchedUseCases: item.matchedUseCases,
    source: item.recipe.source,
    layoutFormula: item.recipe.layoutFormula,
    subjectFormula: item.recipe.subjectFormula,
    sceneFormula: item.recipe.sceneFormula,
    lightingFormula: item.recipe.lightingFormula,
    typographyFormula: item.recipe.typographyFormula,
    detailFormula: item.recipe.detailFormula,
    negativeConstraints: item.recipe.negativeConstraints,
    referenceImages: item.recipe.referenceImages
  }));
  const referenceImageMetadata = redactReferenceImageData(llmReferenceImages);
  const image2ReferenceImageMetadata = redactReferenceImageData(image2ReferenceImages);
  const outputLanguage = brief.outputLanguage === "en" ? "en" : "zh-CN";
  const languageName = outputLanguage === "en" ? "English" : "Chinese";
  const developerPrompt =
    outputLanguage === "en"
      ? [
          "You are the prompt brain for an advertising image-production agent.",
          "You only help generate the final prompt for Image2 or an image-generation web UI; you do not call image generation.",
          "Serve advertising production verticals: storefront signboards, posters, print materials, display stands, local-store promotion, and uploaded-image edits.",
          "Preserve the exact copy provided by the user. Do not invent prices, dates, brand promises, phone numbers, or addresses.",
          "For uploaded-image edits, clearly describe the preservation policy: structure, subject, perspective, doors/windows, product, or local edit area.",
          "finalPrompt must be written in English.",
          "finalPrompt must be deterministic and executable. Do not use vague analogy terms, brand-style labels, social-media labels, or cinematic catch-all labels.",
          "If user input contains vague wording, rewrite it into explicit composition, materials, lighting, color, typography hierarchy, and preserve/edit rules.",
          formatDeterministicRequirements(outputLanguage),
          "Output strict JSON only. Do not output Markdown."
        ].join("\n")
      : [
          "你是广告制作行业的作图 prompt agent 大脑。",
          "你只负责辅助生成用于 Image2/图像生成网页的最终 prompt，不调用图片生成。",
          "必须服务广告制作垂直场景，优先考虑门头店招、海报、喷绘、展架、本地门店和上传图修改。",
          "必须保留用户提供的精确文案，不要编造未提供的价格、日期、品牌承诺、电话号码或地址。",
          "如果是上传图修改，必须写清楚保留策略：结构、主体、透视、门窗、产品或局部区域。",
          "finalPrompt 必须使用中文。",
          "finalPrompt 必须是确定性执行描述，不得使用模糊类比、品牌取向、社媒取向或大片取向词。",
          "如果用户输入包含模糊表达，必须改写成明确的构图、材质、灯光、色彩、文字层级和保留/修改规则。",
          formatDeterministicRequirements(outputLanguage),
          "输出必须是严格 JSON，不要输出 Markdown。"
        ].join("\n");
  const taskPrompt =
    outputLanguage === "en"
      ? [
          "Read the following reference images, optimize currentDesignPlan, and produce a finalPrompt in English that is ready to paste into the Image2 web UI.",
          "user_upload images are customer-provided images. Use them to understand onsite structure, product subject, editable area, or style reference; these images are also sent to Image2 by default.",
          "upstream_reference images are mature upstream case references. Use them only to understand composition, lighting, materials, hierarchy, and finish. Do not copy specific brands, people, prices, text, or distinctive elements; these images are not sent to Image2 by default.",
          "finalPrompt must specify subject placement, image sections, light direction, main materials, text area, and reference-image handling.",
          repairInstructions
            ? "The previous output failed deterministic validation. Remove banned wording, fill missing requirements, and return only corrected strict JSON."
            : ""
        ].join("\n")
      : [
          "请先阅读随后的参考图片，再优化 currentDesignPlan，并生成一段更适合直接发给 Image2 网页的中文 finalPrompt。",
          "user_upload 图片是客户上传图，必须用于识别现场结构、产品主体、可编辑区域或风格参考；这些图片默认也会发给 Image2。",
          "upstream_reference 图片是上游成熟案例参考图，只用于理解构图、灯光、材质、层级和完成度，不要复制其中具体品牌、人物、价格、文字或独特元素；这些图片不默认发给 Image2。",
          "finalPrompt 必须写清楚主体位置、画面分区、光源方向、主要材质、文字区域和参考图处理方式。",
          repairInstructions
            ? "上一次输出没有通过确定性校验，请删除禁用表达并补齐缺失要求，只返回修正后的严格 JSON。"
            : ""
        ].join("\n");

  return {
    model,
    ...(reasoningEffort ? { reasoning: { effort: reasoningEffort } } : {}),
    ...(disableResponseStorage ? { store: false } : {}),
    input: [
      {
        role: "developer",
        content: [
          {
            type: "input_text",
            text: developerPrompt
          }
        ]
      },
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: JSON.stringify(
              {
                brief,
                outputLanguage,
                llmReferenceImages: referenceImageMetadata,
                image2ReferenceImages: image2ReferenceImageMetadata,
                matchedTemplates: templateSummary,
                matchedVisualRecipes: recipeSummary,
                currentDesignPlan: designPlan,
                currentRulePrompt: compiled.finalPrompt,
                currentRuleDeterministicChecks: compiled.deterministicChecks,
                plainPrompt,
                deterministicRequirements: formatDeterministicRequirements(outputLanguage),
                bannedPhrasesDetectedInInputs: findBannedPromptPhrases(
                  `${brief.userRequest}\n${brief.styleDirection}\n${brief.hardConstraints.join("\n")}`
                ),
                repairInstructions,
                task: taskPrompt
              },
              null,
              2
            )
          }
        ].concat(buildImageContentItems(llmReferenceImages))
      }
    ],
    text: {
      format: {
        type: "json_schema",
        name: "ad_image_prompt_brain_result",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          required: [
            "referenceImageObservations",
            "deterministicChecks",
            "designPlan",
            "finalPrompt",
            "improvementNotes",
            "riskWarnings"
          ],
          properties: {
            referenceImageObservations: {
              type: "object",
              additionalProperties: false,
              required: ["userImages", "upstreamReferences", "doNotCopy"],
              properties: {
                userImages: {
                  type: "array",
                  items: { type: "string" },
                  description: "对用户上传图的观察，例如结构、主体、透视、可改区域、需保留元素。"
                },
                upstreamReferences: {
                  type: "array",
                  items: { type: "string" },
                  description: "对上游参考图可借鉴的构图、灯光、材质、信息层级和完成度观察。"
                },
                doNotCopy: {
                  type: "array",
                  items: { type: "string" },
                  description: "不能照抄或必须去具体化的品牌、价格、人物、文字、独特元素。"
                }
              }
            },
            deterministicChecks: {
              type: "object",
              additionalProperties: false,
              required: [
                "bannedPhrasesRemoved",
                "compositionSpecified",
                "lightingSpecified",
                "typographySpecified",
                "materialsSpecified",
                "imageReferencePolicySpecified"
              ],
              properties: {
                bannedPhrasesRemoved: { type: "boolean" },
                compositionSpecified: { type: "boolean" },
                lightingSpecified: { type: "boolean" },
                typographySpecified: { type: "boolean" },
                materialsSpecified: { type: "boolean" },
                imageReferencePolicySpecified: { type: "boolean" }
              }
            },
            designPlan: {
              type: "string",
              description: `Optimized design plan in ${languageName} for advertising production execution.`
            },
            finalPrompt: {
              type: "string",
              description: `Final ${languageName} prompt ready to copy into the Image2 web UI.`
            },
            improvementNotes: {
              type: "array",
              items: { type: "string" },
              description: `Main improvement notes in ${languageName}.`
            },
            riskWarnings: {
              type: "array",
              items: { type: "string" },
              description: `Risk warnings in ${languageName}, such as text accuracy, uploaded-image preservation, and non-invention rules.`
            }
          }
        }
      }
    }
  };
}

function buildImageContentItems(images) {
  return images
    .filter((image) => image.dataUrl)
    .flatMap((image, index) => [
      {
        type: "input_text",
        text: [
          `参考图片 ${index + 1}`,
          `origin=${image.origin}`,
          `role=${image.role}`,
          `name=${image.name}`,
          image.recipeId ? `recipeId=${image.recipeId}` : "",
          image.origin === "upstream_reference"
            ? "用途：只提炼视觉结构，不照抄具体品牌、文字、人物或独特元素。"
            : "用途：识别用户上传图的主体、结构、透视、可编辑区域和需要保留的元素。"
        ].filter(Boolean).join("\n")
      },
      {
        type: "input_image",
        image_url: image.dataUrl,
        detail: "high"
      }
    ]);
}

function resolveReferenceImageDataUrls(images) {
  return images
    .map((image) => {
      if (image.dataUrl) return image;
      if (!image.path) return image;
      const filePath = resolve(appRoot, "..", "..", image.path);
      if (!filePath.startsWith(resolve(appRoot, "..", "..")) || !existsSync(filePath)) return image;
      const dataUrl = `data:${image.mimeType};base64,${readFileSync(filePath).toString("base64")}`;
      return { ...image, dataUrl };
    })
    .filter((image) => image.dataUrl);
}

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return;
  const lines = readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) continue;
    const key = trimmed.slice(0, separatorIndex).trim();
    const value = unquoteEnvValue(trimmed.slice(separatorIndex + 1).trim());
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}

function unquoteEnvValue(value) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

function optionalString(value) {
  return value && value.trim() ? value.trim() : "";
}

function parseBoolean(value, fallback) {
  if (value === undefined) return fallback;
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

function buildResponsesUrl(baseUrl) {
  const normalized = baseUrl.replace(/\/+$/, "");
  return normalized.endsWith("/v1") ? `${normalized}/responses` : `${normalized}/v1/responses`;
}

function parseResponseJson(data) {
  const outputText =
    typeof data.output_text === "string"
      ? data.output_text
      : data.output
          ?.flatMap((item) => item.content ?? [])
          ?.map((content) => content.text ?? "")
          ?.join("")
          ?.trim();
  if (!outputText) throw new Error("OpenAI response did not include output text.");
  const parsed = JSON.parse(outputText);
  return {
    referenceImageObservations: {
      userImages: Array.isArray(parsed.referenceImageObservations?.userImages)
        ? parsed.referenceImageObservations.userImages.map(String)
        : [],
      upstreamReferences: Array.isArray(parsed.referenceImageObservations?.upstreamReferences)
        ? parsed.referenceImageObservations.upstreamReferences.map(String)
        : [],
      doNotCopy: Array.isArray(parsed.referenceImageObservations?.doNotCopy)
        ? parsed.referenceImageObservations.doNotCopy.map(String)
        : []
    },
    deterministicChecks: {
      bannedPhrasesRemoved: Boolean(parsed.deterministicChecks?.bannedPhrasesRemoved),
      compositionSpecified: Boolean(parsed.deterministicChecks?.compositionSpecified),
      lightingSpecified: Boolean(parsed.deterministicChecks?.lightingSpecified),
      typographySpecified: Boolean(parsed.deterministicChecks?.typographySpecified),
      materialsSpecified: Boolean(parsed.deterministicChecks?.materialsSpecified),
      imageReferencePolicySpecified: Boolean(parsed.deterministicChecks?.imageReferencePolicySpecified)
    },
    designPlan: String(parsed.designPlan ?? ""),
    finalPrompt: String(parsed.finalPrompt ?? ""),
    improvementNotes: Array.isArray(parsed.improvementNotes) ? parsed.improvementNotes.map(String) : [],
    riskWarnings: Array.isArray(parsed.riskWarnings) ? parsed.riskWarnings.map(String) : []
  };
}

async function serveStatic(req, res) {
  const rawUrl = new URL(req.url ?? "/", `http://${host}:${port}`);
  const pathname = rawUrl.pathname === "/" ? "/index.html" : rawUrl.pathname;
  const normalizedPath = normalize(decodeURIComponent(pathname)).replace(/^(\.\.[/\\])+/, "");
  let filePath = resolve(join(distRoot, normalizedPath));
  if (!filePath.startsWith(distRoot)) {
    sendJson(res, 403, { error: "Forbidden" });
    return;
  }
  if (!existsSync(filePath) || statSync(filePath).isDirectory()) {
    filePath = join(distRoot, "index.html");
  }
  const headers = { "Content-Type": contentType(filePath) };
  res.writeHead(200, headers);
  if (req.method === "HEAD") {
    res.end();
    return;
  }
  createReadStream(filePath).pipe(res);
}

async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const text = Buffer.concat(chunks).toString("utf8");
  return text ? JSON.parse(text) : {};
}

function sendJson(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body, null, 2));
}

function contentType(filePath) {
  const types = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp"
  };
  return types[extname(filePath)] ?? "application/octet-stream";
}
