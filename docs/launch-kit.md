# Launch Kit

Use this page when introducing Image2 Ads Studio in open-source, developer, and AI-builder communities.

## Positioning

**One-liner**

Image2 Ads Studio is an advertising prompt agent for Image2 that turns business briefs, copywriting, industries, and reference images into debranded, production-ready image prompts.

**Short pitch**

Most Image2 prompt repositories are useful prompt galleries. Image2 Ads Studio is a runnable advertising workflow: it parses a customer brief, retrieves business templates and visual recipes, rewrites references with an LLM prompt brain, applies deterministic checks, and exports a reusable optimized prompt with attribution.

**What makes it different**

- Starts from a business brief instead of a copied prompt.
- Focuses on advertising production: storefronts, posters, ecommerce, product ads, signage, brand walls, local promotions, and commercial photography.
- Separates templates, visual recipes, LLM rewriting, deterministic validation, reference image policy, and generated records.
- Uses upstream prompt galleries as attributed structure references, then regenerates and debrands the public prompts.
- Leaves room for ERP fields, template governance, real image-generation adapters, and production case scoring.

## GitHub Release Copy

Title:

```text
Image2 Ads Studio Community Edition v0.1.0
```

Body:

```text
Image2 Ads Studio is an advertising prompt agent for Image2.

This first Community Edition focuses on the prompt-planning layer before image generation:

- Local Web workbench
- Core prompt agent framework
- 320 advertising business templates
- 240 visual recipes
- LLM prompt brain interface
- Deterministic prompt validation
- Reference image policy
- Manual Image2 testing workflow
- 100 public image-to-prompt gallery cases

The project is intentionally different from a prompt dump. Prompt galleries answer "what prompt can I copy?" Image2 Ads Studio answers "given this business brief, copywriting, industry, aspect ratio, and reference image, what optimized advertising prompt should the agent produce?"

Repo:
https://github.com/kwistzzqq-byte/image2-ads-studio

Gallery:
https://github.com/kwistzzqq-byte/image2-ads-studio/blob/main/examples/gallery/cases.md
```

## Hacker News

Title:

```text
Show HN: Image2 Ads Studio – an advertising prompt agent for Image2
```

URL:

```text
https://github.com/kwistzzqq-byte/image2-ads-studio
```

First comment:

```text
I built this as a focused prompt agent for advertising image generation, not as another prompt collection.

The current Community Edition takes a business brief and reference image policy, parses the intent, retrieves advertising templates and visual recipes, uses an LLM prompt brain to rewrite the output, and validates that the final prompt contains concrete composition, lighting, material, typography, and source-reference instructions.

It includes a local Web workbench, 320 business templates, 240 visual recipes, and 100 public gallery cases. It does not call an image generation API yet; the current workflow is to copy the optimized prompt into Image2 for manual testing.
```

## Reddit

### r/SideProject

Title:

```text
I built an open-source prompt agent for advertising images, not just a prompt gallery
```

Body:

```text
I open-sourced Image2 Ads Studio, a local prompt workbench for advertising image generation.

Instead of starting from "copy this cool prompt", it starts from a business brief: task type, industry, copywriting, aspect ratio, style direction, hard constraints, and reference-image policy.

It then runs:

Brief -> intent parser -> advertising templates -> visual recipes -> LLM prompt brain -> deterministic prompt checks -> optimized prompt.

The Community Edition includes:

- local Web UI
- 320 advertising templates
- 240 visual recipes
- LLM prompt brain interface
- 100 image-to-prompt gallery cases
- manual Image2 workflow

Repo: https://github.com/kwistzzqq-byte/image2-ads-studio

The project does not generate images directly yet. It focuses on the planning/prompt layer and keeps the real Image2 adapter as a future boundary.
```

### r/PromptEngineering

Title:

```text
Open-source advertising prompt agent with template retrieval, visual recipes, and deterministic checks
```

Body:

```text
I wanted a more structured workflow for commercial ad image prompts, so I built Image2 Ads Studio.

The useful part is not a single "magic prompt". The system separates:

- intent parsing from a business brief
- advertising-specific template retrieval
- visual recipe matching
- LLM prompt rewriting
- deterministic validation to avoid vague style words
- reference image policy
- exportable prompt records

The current open-source version includes 320 templates, 240 visual recipes, and 100 public gallery cases. The gallery uses public upstream examples as attributed structure references, but the prompts are regenerated and debranded through the agent flow.

Repo: https://github.com/kwistzzqq-byte/image2-ads-studio
```

## V2EX

节点建议：`分享创造` 或 `程序员`

标题：

```text
做了一个面向 Image2 广告作图的开源 Prompt Agent，不是提示词合集
```

正文：

```text
最近做了一个开源项目 Image2 Ads Studio，定位是广告作图 Prompt Agent。

它不是收集一堆 prompt 让人复制，而是把客户的业务需求整理成一条更稳定的广告作图提示词。

当前流程大概是：

用户 brief -> 意图解析 -> 广告模板检索 -> 视觉配方检索 -> LLM Prompt Brain -> 确定性校验 -> optimized prompt。

社区版目前包含：

- 本地 Web 工作台
- 320 条广告业务模板
- 240 条视觉配方
- 100 个一图一 prompt 的公开 gallery 案例
- 参考图策略
- 手动 Image2 测试流程

和普通提示词仓库的区别是：提示词仓库主要解决“有什么 prompt 可以复制”，这个项目解决“给定客户需求、文案、行业、画幅和参考图，Agent 应该如何生成一条可执行的广告作图 prompt”。

GitHub:
https://github.com/kwistzzqq-byte/image2-ads-studio

Gallery:
https://github.com/kwistzzqq-byte/image2-ads-studio/blob/main/examples/gallery/cases.md

现在还没有接真实生图 API，第一版只做 prompt planning layer。欢迎提建议，尤其是广告、电商、门店物料、ERP/生产系统集成这类场景。
```

## Juejin / OSChina

Title:

```text
我开源了一个广告作图 Prompt Agent：从业务需求生成 Image2 可用提示词
```

Outline:

```text
1. 为什么不是再做一个提示词合集
2. 广告作图和泛创意 prompt 的差异
3. 核心流程：Brief -> Parser -> Template Retriever -> Visual Recipe -> LLM Brain -> Prompt
4. 当前社区版：320 模板、240 配方、100 gallery 案例
5. 上游 prompt 库如何作为结构参考，而不是直接复制
6. 为什么需要确定性校验：构图、材质、灯光、文字层级、参考图策略
7. 后续路线：真实 Image2 Adapter、ERP 集成、案例评分、模板治理
```

## X / LinkedIn

Short post:

```text
I open-sourced Image2 Ads Studio: an advertising prompt agent for Image2.

It turns business briefs, copywriting, industries, and reference images into debranded, production-ready prompts.

Not a prompt dump:
Brief -> templates -> visual recipes -> LLM rewrite -> deterministic checks -> optimized prompt.

GitHub: https://github.com/kwistzzqq-byte/image2-ads-studio
```

Chinese short post:

```text
开源了 Image2 Ads Studio：一个面向广告作图的 Prompt Agent。

它不是提示词合集，而是把客户 brief、行业、文案、画幅和参考图，转成去品牌化、可执行、适合 Image2 测试的优化提示词。

流程：Brief -> 模板检索 -> 视觉配方 -> LLM 重构 -> 确定性校验 -> optimized prompt

GitHub: https://github.com/kwistzzqq-byte/image2-ads-studio
```

## Reply Templates

**Why not just use an existing prompt library?**

Existing prompt libraries are useful for inspiration. This project uses some public galleries as attributed structure references, but the core value is the workflow around a business brief: parsing, retrieval, visual recipe matching, LLM rewrite, deterministic checks, and exportable records.

**Does it generate images directly?**

Not in the Community Edition. It generates optimized prompts and keeps the real image-generation adapter as a clean future boundary.

**Can I use it without an API key?**

The rule-based prompt compiler works locally. The LLM prompt brain needs a Responses-compatible LLM endpoint.

**Is this only for Image2?**

The naming and manual workflow target Image2, but the prompt-planning layer can be adapted to other image-generation tools.
