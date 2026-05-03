import type {
  AdImageReferenceImage,
  RedactedReferenceImage,
  ScoredVisualRecipe
} from "./types.js";

export const USER_UPLOAD_IMAGE_LIMIT = 3;
export const UPSTREAM_REFERENCE_IMAGE_LIMIT = 2;

export function normalizeUserImages(images: AdImageReferenceImage[] = [], limit = USER_UPLOAD_IMAGE_LIMIT): AdImageReferenceImage[] {
  return images
    .filter((image) => image.origin === "user_upload" && Boolean(image.dataUrl))
    .slice(0, limit)
    .map((image, index) => ({
      ...image,
      id: image.id || `user_upload_${index + 1}`,
      origin: "user_upload",
      sendToLlm: true,
      sendToImage2: true
    }));
}

export function buildUpstreamReferenceImages(
  recipes: ScoredVisualRecipe[] = [],
  limit = UPSTREAM_REFERENCE_IMAGE_LIMIT
): AdImageReferenceImage[] {
  const images: AdImageReferenceImage[] = [];
  for (const item of recipes) {
    const referenceImage = item.recipe.referenceImages[0];
    if (!referenceImage?.path) continue;
    images.push({
      id: `upstream_${item.recipe.id}_${images.length + 1}`,
      origin: "upstream_reference",
      role: referenceImage.role,
      name: referenceImage.name,
      mimeType: referenceImage.mimeType,
      path: referenceImage.path,
      recipeId: item.recipe.id,
      sendToLlm: true,
      sendToImage2: false
    });
    if (images.length >= limit) break;
  }
  return images;
}

export function buildLlmReferenceImages(
  userImages: AdImageReferenceImage[] = [],
  recipes: ScoredVisualRecipe[] = [],
  userLimit = USER_UPLOAD_IMAGE_LIMIT,
  upstreamLimit = UPSTREAM_REFERENCE_IMAGE_LIMIT
): AdImageReferenceImage[] {
  return [
    ...normalizeUserImages(userImages, userLimit),
    ...buildUpstreamReferenceImages(recipes, upstreamLimit)
  ].filter((image) => image.sendToLlm);
}

export function getImage2ReferenceImages(images: AdImageReferenceImage[] = []): AdImageReferenceImage[] {
  return images.filter((image) => image.origin === "user_upload" && image.sendToImage2);
}

export function redactReferenceImageData(images: AdImageReferenceImage[] = []): RedactedReferenceImage[] {
  return images.map(({ dataUrl: _dataUrl, ...metadata }) => metadata);
}
