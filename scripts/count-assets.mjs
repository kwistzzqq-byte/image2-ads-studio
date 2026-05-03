import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(process.argv[2] ?? ".");
const templates = readJson("packages/ad-image-agent-core/src/templates.json");
const recipes = readJson("packages/ad-image-agent-core/src/visual-recipes.json");
const gallery = readJson("examples/gallery/cases.json");

console.log(JSON.stringify({
  templates: {
    total: templates.length,
    byTaskType: countBy(templates, (item) => [item.taskType])
  },
  visualRecipes: {
    total: recipes.length,
    byTaskType: countBy(recipes, (item) => item.taskTypes)
  },
  galleryCases: {
    total: gallery.cases.length,
    byTaskType: countBy(gallery.cases, (item) => [item.taskType]),
    bySource: countBy(gallery.cases, (item) => [item.source.name])
  }
}, null, 2));

function readJson(path) {
  return JSON.parse(readFileSync(join(root, path), "utf8"));
}

function countBy(items, getKeys) {
  return items.reduce((counts, item) => {
    for (const key of getKeys(item)) counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});
}
