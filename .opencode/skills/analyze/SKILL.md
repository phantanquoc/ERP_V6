---
name: "analyze"
description: "Analyze codebase using GitNexus knowledge graph + codebase-retrieval. Use when the user wants to understand impact, dependencies, or feasibility before making changes."
---

Before launching the subagent, gather context from the current conversation:

1. If user provides a specific analysis question:
   - Pass the question directly
2. If user references a feature, file, or symbol:
   - Include the specific names/paths mentioned
3. If conversation has prior brainstorm context:
   - Summarize relevant decisions and areas of interest

Brief the user, then launch Agent tool with `subagent_type: "osf-analyze"`.

Pass context using this format:

```
Analysis request: [what the user wants to understand]
Focus areas: [specific files, symbols, or features mentioned]
Context: [any relevant decisions or background from conversation]
```