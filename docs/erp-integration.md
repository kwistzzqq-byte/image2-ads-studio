# ERP Integration

This project can be used as an AI pre-briefing and prompt generation module for advertising ERP systems.

## Integration Value

Traditional advertising ERP systems usually start after an order exists. This agent can sit before the order:

- customer brief collection
- structured requirement parsing
- quick design direction generation
- prompt record storage
- case library creation
- future quotation and work-order field mapping

## Suggested Integration Shape

Use the agent as a sidecar module first:

```text
Customer request
-> Ad Image Agent
-> structured brief + optimized prompt
-> ERP customer/project record
-> quotation/work order/case library
```

## Suggested Fields

- `taskType`
- `inputMode`
- `industry`
- `userRequest`
- `copywriting`
- `aspectRatio`
- `styleDirection`
- `referenceImageRole`
- `hardConstraints`
- `matchedTemplateIds`
- `matchedRecipeIds`
- `rulePrompt`
- `llmOptimizedPrompt`
- `imageReferencePolicy`

## Commercial Edition Boundary

The Community Edition documents the integration shape. Production deployments usually need private connectors, tenant permissions, billing rules, image storage, audit records, and workflow-specific field mapping.
