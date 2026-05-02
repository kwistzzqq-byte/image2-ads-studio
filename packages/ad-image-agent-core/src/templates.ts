import promptTemplatesData from "./templates.json" with { type: "json" };
import type { PromptTemplate } from "./types.js";

export const promptTemplates = promptTemplatesData as PromptTemplate[];
