export type InputMode = "text_to_image" | "image_edit";

export type TaskType =
  | "storefront_signboard"
  | "poster_design"
  | "rollup_banner"
  | "event_backdrop"
  | "signage_wayfinding"
  | "brand_wall"
  | "local_store_promotion"
  | "ecommerce_main_image"
  | "product_ad"
  | "commercial_photography";

export type ReferenceImageRole =
  | "preserve_structure"
  | "preserve_subject"
  | "style_reference_only"
  | "background_replace"
  | "local_edit"
  | "scene_mockup"
  | "none";

export type OutputLanguage = "zh-CN" | "en";

export interface AdImageBrief {
  taskType: TaskType;
  inputMode: InputMode;
  outputLanguage: OutputLanguage;
  industry: string;
  userRequest: string;
  copywriting: string;
  aspectRatio: string;
  styleDirection: string;
  referenceImageRole: ReferenceImageRole;
  hardConstraints: string[];
}

export interface CompiledPrompt {
  brief: AdImageBrief;
  designPlan: string;
  finalPrompt: string;
  templateIds: string[];
  negativeConstraints: string[];
  deterministicChecks: DeterministicChecks;
}

export interface LlmPromptBrainResult {
  mode: "llm_brain";
  model: string;
  provider?: string;
  referenceImageObservations: ReferenceImageObservations;
  deterministicChecks: DeterministicChecks;
  designPlan: string;
  finalPrompt: string;
  improvementNotes: string[];
  riskWarnings: string[];
}

export interface LlmPromptBrainInput {
  formInput: AdImageFormInput;
  userImages?: AdImageReferenceImage[];
  imageNames?: string[];
}

export interface AdImageFormInput {
  taskType?: TaskType | "auto";
  inputMode?: InputMode | "auto";
  industry?: string;
  userRequest: string;
  copywriting?: string;
  aspectRatio?: string;
  styleDirection?: string;
  referenceImageRole?: ReferenceImageRole | "auto";
  hardConstraints?: string[] | string;
  outputLanguage?: OutputLanguage;
}

export interface PromptVariable {
  name: string;
  label: string;
  required: boolean;
  defaultValue?: string;
}

export interface PromptTemplate {
  id: string;
  name: string;
  taskType: TaskType;
  supportedInputModes: InputMode[];
  referenceImageRoles: ReferenceImageRole[];
  outputType: "pure_image" | "poster" | "mockup" | "scene_render" | "product_visual";
  industries: string[];
  styleTags: string[];
  useCases: string[];
  materialKeywords: string[];
  businessKeywords: string[];
  visualKeywords: string[];
  layoutPattern: string;
  textPolicy: "exact_user_text_required" | "text_area_reserved" | "text_optional" | "avoid_unrequested_text" | "no_text";
  promptSkeleton: string;
  negativeConstraints: string[];
  variables: PromptVariable[];
}

export interface ScoredPromptTemplate {
  template: PromptTemplate;
  score: number;
  reasons: string[];
  matchedKeywords: string[];
  matchedIndustries: string[];
  matchedUseCases: string[];
}

export interface VisualRecipeSource {
  repo: string;
  path: string;
  caseId: string;
  license: string;
  transformation: "debranded_rewritten_recipe" | "structure_reference";
}

export interface VisualRecipe {
  id: string;
  name: string;
  source: VisualRecipeSource;
  referenceImages: VisualRecipeReferenceImage[];
  taskTypes: TaskType[];
  supportedInputModes: InputMode[];
  referenceImageRoles: ReferenceImageRole[];
  industries: string[];
  styleTags: string[];
  useCases: string[];
  materialKeywords: string[];
  businessKeywords: string[];
  visualKeywords: string[];
  layoutFormula: string;
  subjectFormula: string;
  sceneFormula: string;
  lightingFormula: string;
  typographyFormula: string;
  detailFormula: string;
  negativeConstraints: string[];
  variables: PromptVariable[];
}

export interface ScoredVisualRecipe {
  recipe: VisualRecipe;
  score: number;
  reasons: string[];
  matchedKeywords: string[];
  matchedIndustries: string[];
  matchedUseCases: string[];
}

export type AdImageReferenceImageOrigin = "user_upload" | "upstream_reference";

export interface VisualRecipeReferenceImage {
  path?: string;
  name: string;
  mimeType: "image/jpeg" | "image/png" | "image/webp";
  role: ReferenceImageRole;
}

export interface AdImageReferenceImage {
  id: string;
  origin: AdImageReferenceImageOrigin;
  role: ReferenceImageRole;
  name: string;
  mimeType: string;
  sendToLlm: boolean;
  sendToImage2: boolean;
  dataUrl?: string;
  path?: string;
  recipeId?: string;
}

export interface ReferenceImageObservations {
  userImages: string[];
  upstreamReferences: string[];
  doNotCopy: string[];
}

export interface DeterministicChecks {
  bannedPhrasesRemoved: boolean;
  compositionSpecified: boolean;
  lightingSpecified: boolean;
  typographySpecified: boolean;
  materialsSpecified: boolean;
  imageReferencePolicySpecified: boolean;
}

export interface DeterministicValidationResult {
  checks: DeterministicChecks;
  bannedPhrases: string[];
  missingRequirements: string[];
  passed: boolean;
}

export interface RedactedReferenceImage {
  id: string;
  origin: AdImageReferenceImageOrigin;
  role: ReferenceImageRole;
  name: string;
  mimeType: string;
  sendToLlm: boolean;
  sendToImage2: boolean;
  path?: string;
  recipeId?: string;
}

export interface ManualGenerationResult {
  mode: "manual_test";
  inputMode: InputMode;
  finalPrompt: string;
  instructions: string;
  compiledPrompt: CompiledPrompt;
}

export interface ImageGenerationAdapter {
  generateTextToImage(compiledPrompt: CompiledPrompt): Promise<ManualGenerationResult>;
  editImage(compiledPrompt: CompiledPrompt, inputImages: AdImageReferenceImage[]): Promise<ManualGenerationResult>;
}
