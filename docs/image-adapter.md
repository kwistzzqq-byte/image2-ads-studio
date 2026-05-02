# Image Adapter

The Community Edition does not call a real image-generation API. It exposes an adapter boundary and ships a manual adapter.

## Current Interface

```ts
interface ImageGenerationAdapter {
  generateTextToImage(compiledPrompt: CompiledPrompt): Promise<ManualGenerationResult>;
  editImage(compiledPrompt: CompiledPrompt, inputImages: AdImageReferenceImage[]): Promise<ManualGenerationResult>;
}
```

## Manual Flow

- Text-to-image: copy the optimized prompt into your image-generation tool.
- Image edit: copy the optimized prompt and upload user reference images marked with `sendToImage2=true`.
- Upstream reference images are used for LLM understanding only and are not sent to image generation by default.

## Production Adapter Notes

A production adapter should:

- preserve the same prompt and reference image policy
- avoid sending upstream reference images by default
- store generated images outside the browser session
- return image paths or asset ids instead of only instructions
- track model, prompt, cost, and generation metadata for repeatability
