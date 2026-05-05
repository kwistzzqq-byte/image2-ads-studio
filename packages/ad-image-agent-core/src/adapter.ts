import type { AdImageReferenceImage, CompiledPrompt, ImageGenerationAdapter, ManualGenerationResult } from "./types.js";
import { getImage2ReferenceImages } from "./reference-images.js";

export class ManualTestAdapter implements ImageGenerationAdapter {
  async generateTextToImage(compiledPrompt: CompiledPrompt): Promise<ManualGenerationResult> {
    const isEnglish = compiledPrompt.brief.outputLanguage === "en";
    return {
      mode: "manual_test",
      inputMode: "text_to_image",
      finalPrompt: compiledPrompt.finalPrompt,
      instructions: isEnglish
        ? "Copy finalPrompt into the image-generation web UI for a text-to-image manual test."
        : "复制 finalPrompt 到图像生成网页进行纯文本生图测试。",
      compiledPrompt
    };
  }

  async editImage(compiledPrompt: CompiledPrompt, inputImages: AdImageReferenceImage[]): Promise<ManualGenerationResult> {
    const image2Images = getImage2ReferenceImages(inputImages);
    const isEnglish = compiledPrompt.brief.outputLanguage === "en";
    const imageNote = image2Images.length
      ? isEnglish
        ? `${image2Images.length} user-uploaded image(s) are recorded. A real Image2 adapter should upload them with the prompt for generation/editing.`
        : `已记录 ${image2Images.length} 张用户上传图，真实接入 Image2 时默认需要一起上传参与生成/编辑。`
      : isEnglish
        ? "No user-uploaded image is recorded. A real Image2 adapter would generate from prompt only."
        : "当前未记录用户上传图，真实接入 Image2 时将只用 prompt 生成。";
    return {
      mode: "manual_test",
      inputMode: "image_edit",
      finalPrompt: compiledPrompt.finalPrompt,
      instructions: isEnglish
        ? `${imageNote} Upstream reference images are only read by the LLM and are not sent to Image2 by default. Copy finalPrompt into the image-generation web UI and upload the user images for an image-editing manual test.`
        : `${imageNote} 上游参考图只给 LLM 读，不默认发给 Image2。复制 finalPrompt 到图像生成网页，并同步上传用户图进行图片编辑测试。`,
      compiledPrompt
    };
  }
}
