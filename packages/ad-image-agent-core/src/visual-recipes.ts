import visualRecipesData from "./visual-recipes.json" with { type: "json" };
import type { VisualRecipe } from "./types.js";

export const visualRecipes = visualRecipesData as VisualRecipe[];
