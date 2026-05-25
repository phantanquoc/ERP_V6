---
name: "research"
description: "Research specialist. Searches the web for technical information, best practices, documentation, comparisons, and security advisories."
---

Before launching the subagent, gather context from the current conversation:

1. If there's an active brainstorm or plan:
   - Include relevant context so the research is targeted to the current problem
2. If user provides explicit arguments:
   - Pass those directly

Brief the user, then launch Agent tool with `subagent_type: "osf-researcher"`.

Be specific about what information is needed so the subagent can produce a focused research report.