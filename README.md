# Image2 Ads Studio

An open-source prompt studio for generating high-quality advertising visuals with Image2.

This repository is the **Community Edition** of an advertising vertical prompt studio. It focuses on the prompt planning layer before image generation: intent parsing, advertising templates, visual recipes, deterministic prompt checks, reference image policy, and a local Web workbench.

![Workflow](docs/assets/github-workflow.svg)

## Prompt Gallery

The public gallery contains 50 image-to-prompt cases: 2 project-generated concepts, 28 advertising references from the first upstream set, and 20 additional multi-source references across brand systems, wayfinding, commercial photography, ecommerce layouts, product posters, and lightbox mockups. Each case includes one preview image, one Image2-ready optimized prompt, and source attribution.

View the full gallery: [examples/gallery/cases.md](examples/gallery/cases.md)

| Preview | Optimized Prompt Excerpt |
| --- | --- |
| <img src="docs/assets/gallery/cases/owner-beverage-ad-concept.jpg" alt="Beverage product ad concept" width="260"> | **Beverage Product Ad Concept**<br><br>`Create a commercially usable 16:9 beverage advertising hero image for a new debranded sparkling drink. Composition: place a tall matte-gloss red can slightly right of center...` |
| <img src="docs/assets/gallery/cases/owner-product-ad-concept.jpg" alt="Premium appliance product ad concept" width="260"> | **Premium Appliance Product Ad Concept**<br><br>`Create a 16:9 premium consumer-electronics product advertising hero image for a debranded high-end airflow appliance. Use a black-and-champagne-gold cylindrical device...` |
| <img src="docs/assets/gallery/cases/gallery-03-e-commerce-main-image-luxury-amber-perfume-ad.jpg" alt="Luxury amber perfume ad prompt case" width="260"> | **Luxury Amber Perfume Ad**<br><br>`Create a square 1:1 luxury beauty product advertisement for a debranded amber perfume bottle. Show one classic rectangular glass bottle as the hero object...` |
| <img src="docs/assets/gallery/cases/gallery-05-e-commerce-main-image-tropical-citrus-soda-ad-poster.jpg" alt="Tropical citrus soda ad prompt case" width="260"> | **Tropical Citrus Soda Ad Poster**<br><br>`Create a 9:16 vertical commercial beverage poster for a tropical citrus soda campaign. Show one large transparent plastic bottle as the hero object...` |
| <img src="docs/assets/gallery/cases/gallery-32-moss-radio-brand-identity-showcase-board.jpg" alt="Brand identity showcase prompt case" width="260"> | **Moss Radio Brand Identity Showcase Board**<br><br>`Create a square 1:1 brand-identity showcase board for a fictional audio, retail, or culture-focused business. Build a dense editorial presentation...` |
| <img src="docs/assets/gallery/cases/gallery-36-zoo-visitor-wayfinding-map.jpg" alt="Wayfinding map prompt case" width="260"> | **Zoo Visitor Wayfinding Map**<br><br>`Create a polished 16:9 advertising-style wayfinding map board for a fictional wildlife park campaign, designed as a commercially usable tourism graphic...` |
| <img src="docs/assets/gallery/cases/gallery-47-e-commerce-product-detail-page-layout.jpg" alt="Ecommerce product detail prompt case" width="260"> | **E-Commerce Product Detail Page Layout**<br><br>`Create a 9:16 vertical e-commerce product detail poster for a futuristic consumer electronics hero product. Use a dense marketplace layout...` |

Source and license notes are tracked in [gallery attribution](examples/gallery/ATTRIBUTION.md). Upstream prompts/images are used as structure references; public prompts are regenerated, debranded, and reusable.

## Why It Exists

General image-generation prompts are unstable for advertising production. A local shop owner may say "make a milk tea storefront signboard", but production-ready output needs structure: task type, industry, copywriting, aspect ratio, material constraints, reference image policy, and clear composition.

Image2 Ads Studio turns that loose brief into an optimized prompt that can be manually tested in Image2 or another image-generation tool.

## Core Features

- Advertising vertical coverage: storefront signboards, posters, roll-up banners, event backdrops, wayfinding signage, brand walls, local promotions, ecommerce main images, product ads, and commercial photography.
- Community template library: 120 business templates and 75 visual recipes.
- LLM prompt brain: uses a Responses-compatible LLM endpoint to refine the rule prompt.
- Reference image policy: user uploads can be read by the LLM and marked for later Image2 editing; upstream references are only used for visual understanding.
- Deterministic prompt validation: removes vague expressions and requires composition, lighting, typography, material, and image-reference policy.
- Local Web UI: prompt workbench with brief input, optimized prompt output, preview placeholder, and retrieval signals.

## Quick Start

```bash
pnpm install
pnpm --filter ad-image-agent-core test
pnpm --filter ad-image-agent build
export OPENAI_API_KEY="your_api_key"
pnpm --filter ad-image-agent serve:llm
```

Open:

```text
http://127.0.0.1:5174
```

The app does not call an image-generation API in this edition. Copy the optimized prompt into your image-generation tool and upload user reference images when the app marks them for Image2 participation.

## Architecture

```mermaid
flowchart LR
  A[User Brief] --> B[Intent Parser]
  B --> C[Template Retriever]
  C --> D[Visual Recipe Retriever]
  D --> E[LLM Prompt Brain]
  E --> F[Optimized Prompt]
  F --> G[Image2 Manual Test]
  G --> H[Case Library]
  H -. Template / Recipe Update .-> C
  H -. Template / Recipe Update .-> D
```

## Community vs Commercial

| Capability | Community Edition | Commercial Edition |
| --- | --- | --- |
| Local Web UI | Included | Included |
| Core prompt agent framework | Included | Included |
| Business templates | 120 | Full private library |
| Visual recipes | 75 | Full private library |
| LLM prompt brain | Interface + local server | Production setup |
| Image generation | Manual adapter | Real adapters and storage |
| ERP integration | Overview docs | Connectors, field mapping, deployment |
| Case gallery | Public samples | Private scored case library |

Commercial work can add ERP connectors, real image-generation adapters, deployment support, private template libraries, and production case evaluation.

## Repository Layout

```text
apps/ad-image-agent              Local Web workbench
packages/ad-image-agent-core     Parser, retrievers, compiler, adapters, tests
examples                         Sample briefs and generated records
docs                             Architecture, adapter, ERP, authoring, roadmap
scripts                          Community validation and asset counting
```

## Development

```bash
pnpm --filter ad-image-agent-core test
pnpm --filter ad-image-agent-core build
pnpm --filter ad-image-agent typecheck
pnpm --filter ad-image-agent build
```

## License

Apache-2.0. See [LICENSE](LICENSE).
