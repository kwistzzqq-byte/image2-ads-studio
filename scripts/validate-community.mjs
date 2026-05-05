import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(process.argv[2] ?? "community-export");
const templateTarget = 320;
const recipeTarget = 240;
const galleryTarget = 100;
const taskTypes = [
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

const forbiddenTerms = [
  ["s", "k", "-"].join(""),
  ["OPENAI_API_KEY", "=", "s", "k"].join(""),
  ["a", "i", ".", "g", "s", "8", "8", ".", "s", "h", "o", "p"].join(""),
  [".env", "llm", "local"].join("."),
  ["prompt", "sources"].join("_")
];

main();

function main() {
  assert(existsSync(root), `Community root not found: ${root}`);
  const templates = readJson("packages/ad-image-agent-core/src/templates.json");
  const recipes = readJson("packages/ad-image-agent-core/src/visual-recipes.json");
  const gallery = readJson("examples/gallery/cases.json");

  assert(templates.length === templateTarget, `Expected ${templateTarget} templates, got ${templates.length}`);
  assert(recipes.length === recipeTarget, `Expected ${recipeTarget} visual recipes, got ${recipes.length}`);
  assert(gallery.count === galleryTarget, `Expected gallery count ${galleryTarget}, got ${gallery.count}`);
  assert(Array.isArray(gallery.cases), "Gallery cases must be an array");
  assert(gallery.cases.length === galleryTarget, `Expected ${galleryTarget} gallery cases, got ${gallery.cases.length}`);
  assert(existsSync(join(root, "examples/gallery/cases.md")), "Missing English gallery markdown");
  assert(existsSync(join(root, "examples/gallery/cases.zh-CN.md")), "Missing Chinese gallery markdown");
  assertUnique(templates.map((item) => item.id), "template ids");
  assertUnique(recipes.map((item) => item.id), "recipe ids");
  assertUnique(gallery.cases.map((item) => item.id), "gallery case ids");

  for (const taskType of taskTypes) {
    assert(templates.some((template) => template.taskType === taskType), `Missing template coverage for ${taskType}`);
    assert(recipes.some((recipe) => recipe.taskTypes.includes(taskType)), `Missing visual recipe coverage for ${taskType}`);
  }

  for (const template of templates) {
    for (const field of ["useCases", "materialKeywords", "businessKeywords", "visualKeywords"]) {
      assert(Array.isArray(template[field]), `Template ${template.id} missing array field ${field}`);
    }
  }

  for (const recipe of recipes) {
    for (const field of ["useCases", "materialKeywords", "businessKeywords", "visualKeywords", "referenceImages"]) {
      assert(Array.isArray(recipe[field]), `Recipe ${recipe.id} missing array field ${field}`);
    }
    assert(recipe.referenceImages.every((image) => !image.path), `Recipe ${recipe.id} still contains redistributable image path`);
  }

  for (const galleryCase of gallery.cases) {
    assert(galleryCase.optimizedPrompt?.length > 0, `Gallery case ${galleryCase.id} missing optimized prompt`);
    assert(galleryCase.titleZh?.length > 0, `Gallery case ${galleryCase.id} missing Chinese title`);
    assert(galleryCase.briefZh?.length > 0, `Gallery case ${galleryCase.id} missing Chinese brief`);
    assert(galleryCase.optimizedPromptZh?.length > 0, `Gallery case ${galleryCase.id} missing Chinese optimized prompt`);
    assert(Array.isArray(galleryCase.promptHighlightsZh) && galleryCase.promptHighlightsZh.length > 0, `Gallery case ${galleryCase.id} missing Chinese prompt highlights`);
    assert(galleryCase.sourceUseZh?.length > 0, `Gallery case ${galleryCase.id} missing Chinese source use`);
    assert(galleryCase.riskNoteZh?.length > 0, `Gallery case ${galleryCase.id} missing Chinese risk note`);
    assert(galleryCase.image && existsSync(join(root, galleryCase.image)), `Gallery case ${galleryCase.id} missing image asset`);
    assert(Array.isArray(galleryCase.librarySource?.templateIds), `Gallery case ${galleryCase.id} missing template composite source`);
    assert(Array.isArray(galleryCase.librarySource?.recipeIds), `Gallery case ${galleryCase.id} missing recipe composite source`);
    assert(galleryCase.librarySource.templateIds.length > 0, `Gallery case ${galleryCase.id} has no template composite ids`);
    assert(galleryCase.librarySource.recipeIds.length > 0, `Gallery case ${galleryCase.id} has no recipe composite ids`);
  }

  scanForForbiddenTerms();
  console.log("Community validation passed.");
}

function readJson(path) {
  return JSON.parse(readFileSync(join(root, path), "utf8"));
}

function assertUnique(values, label) {
  const unique = new Set(values);
  assert(unique.size === values.length, `Duplicate ${label}`);
}

function scanForForbiddenTerms() {
  const hits = [];
  for (const file of walk(root)) {
    if (shouldSkip(file)) continue;
    const text = readFileSync(file, "utf8");
    for (const term of forbiddenTerms) {
      if (text.includes(term)) hits.push(`${relativeToRoot(file)} contains forbidden term`);
    }
  }
  assert(hits.length === 0, `Sensitive export validation failed:\n${hits.join("\n")}`);
}

function* walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (["node_modules", "dist", ".git"].includes(entry.name)) continue;
      yield* walk(path);
    } else {
      yield path;
    }
  }
}

function shouldSkip(file) {
  const stat = statSync(file);
  if (stat.size > 2_000_000) return true;
  return /\.(png|jpe?g|webp|gif|ico|zip|pdf)$/i.test(file);
}

function relativeToRoot(file) {
  return file.slice(root.length + 1);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
