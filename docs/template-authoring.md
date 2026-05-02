# Template Authoring

Templates describe business scenarios. Visual recipes describe image construction.

## Prompt Template Fields

Every business template should include:

- `id`
- `name`
- `taskType`
- `supportedInputModes`
- `referenceImageRoles`
- `industries`
- `styleTags`
- `useCases`
- `materialKeywords`
- `businessKeywords`
- `visualKeywords`
- `layoutPattern`
- `promptSkeleton`
- `negativeConstraints`
- `variables`

## Visual Recipe Fields

Every visual recipe should include:

- `id`
- `name`
- `source`
- `taskTypes`
- `supportedInputModes`
- `referenceImageRoles`
- `industries`
- `layoutFormula`
- `subjectFormula`
- `sceneFormula`
- `lightingFormula`
- `typographyFormula`
- `detailFormula`
- `negativeConstraints`
- `referenceImages`
- `useCases`
- `materialKeywords`
- `businessKeywords`
- `visualKeywords`

## Writing Rules

- Do not copy upstream prompts verbatim.
- Remove concrete brands, prices, people, dates, and unique slogans.
- Prefer executable descriptions: composition, material, lighting, color, typography, and preservation policy.
- Keep Chinese copywriting conservative: if the user did not provide prices, dates, phone numbers, or addresses, do not invent them.
- For storefront, signage, and brand-wall tasks, emphasize manufacturable structure and realistic installation.
- For poster, ecommerce, and product tasks, emphasize main visual, title hierarchy, selling-point area, and readable copy.
