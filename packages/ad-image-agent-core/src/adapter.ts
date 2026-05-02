import type { AdImageReferenceImage, CompiledPrompt, ImageGenerationAdapter, ManualGenerationResult } from "./types.js";
import { getImage2ReferenceImages } from "./reference-images.js";

export class ManualTestAdapter implements ImageGenerationAdapter {
  async generateTextToImage(compiledPrompt: CompiledPrompt): Promise<ManualGenerationResult> {
    return {
      mode: "manual_test",
      inputMode: "text_to_image",
      finalPrompt: compiledPrompt.finalPrompt,
      instructions: "复制 finalPrompt 到图像生成网页进行纯文本生图测试。",
      compiledPrompt
    };
  }

  async editImage(compiledPrompt: CompiledPrompt, inputImages: AdImageReferenceImage[]): Promise<ManualGenerationResult> {
    const image2Images = getImage2ReferenceImages(inputImages);
    const imageNote = image2Images.length
      ? `已记录 ${image2Images.length} 张用户上传图，真实接入 Image2 时默认需要一起上传参与生成/编辑。`
      : "当前未记录用户上传图，真实接入 Image2 时将只用 prompt 生成。";
    return {
      mode: "manual_test",
      inputMode: "image_edit",
      finalPrompt: compiledPrompt.finalPrompt,
      instructions: `${imageNote} 上游参考图只给 LLM 读，不默认发给 Image2。复制 finalPrompt 到图像生成网页，并同步上传用户图进行图片编辑测试。`,
      compiledPrompt
    };
  }
}
