---
name: "uiux-design"
description: "UI/UX design specialist. Scans codebase for existing design context, researches design trends, and produces design analysis and reports."
---

Before launching the subagent, gather context from the current conversation:

1. If there's an active brainstorm or plan:
   - Include relevant context (feature being planned, target users, constraints)
2. If user provides explicit arguments:
   - Pass those directly

Brief the user, then launch Agent tool with `subagent_type: "osf-uiux-designer"`.

Include any relevant context about the project, target audience, or design constraints.