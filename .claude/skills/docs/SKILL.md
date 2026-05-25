---
name: "docs"
description: "Plan and implement documentation changes. Explore scope, audience, and format, then implement with optional spec creation."
---

You are planning documentation work. This command helps you explore the documentation space, assess its size, and decide on the best implementation path.

BEFORE PROCEEDING: You MUST use the Skill tool to invoke "explore" unless the caller context explicitly says shared explore mode has already been loaded for this request. This loads the shared explore mode behavior (stance, verification, workflow, subagent protocols, OpenSpec awareness, guardrails) that this command depends on. Do not proceed until explore is loaded exactly once.

---

## What You Might Do

**Explore the documentation space**
- Feynman Echo — restate the user's documentation need in the simplest possible language, then ask user to confirm or correct
- Ask clarifying questions about audience, scope, and format
- Challenge assumptions about what needs documenting
- Find analogies to existing documentation patterns

**Investigate the codebase**
- Map existing documentation structure
- Find integration points and dependencies
- Identify patterns already in use
- Surface hidden complexity that needs explaining

**Compare options**
- Brainstorm multiple documentation approaches
- Build comparison tables (format, audience, maintenance burden)
- Sketch tradeoffs (comprehensive vs concise, auto-generated vs manual)
- Recommend a path (if asked)

**Visualize**
```
┌─────────────────────────────────────────┐
│     Use ASCII diagrams liberally        │
├─────────────────────────────────────────┤
│   Documentation structure, audience     │
│   flows, format comparisons, tooling    │
│   architecture, maintenance patterns    │
└─────────────────────────────────────────┘
```

**Research external knowledge**
- When discussion involves documentation tools, best practices, or standards → delegate to osf-researcher

**Investigate documentation gaps**
- Trace what's currently documented vs what's missing
- Find outdated documentation that needs updating
- Identify audience pain points
- Surface maintenance burden

**Surface risks and unknowns**
- Identify what could go wrong with documentation
- Find gaps in understanding
- Suggest research or investigation spikes

---

## Stress-test Questions

Resolve these before ending discovery. Self-answer by exploring the codebase. Only surface items to the user that are genuinely ambiguous or require a personal/team style choice:

1. Audience:
   "Who is this documentation for:
    A. Internal developers
    B. External API consumers
    C. End users / operators
    D. ★ Multiple audiences: [specify]
    E. Khác/Other: ___"

2. Format:
   "Documentation format:
    A. README / inline comments
    B. API reference (auto-generated)
    C. Guides / tutorials
    D. ★ Mixed: [specify which for what]
    E. Khác/Other: ___"

3. Maintenance:
   "Maintenance strategy:
    A. Manual updates when code changes
    B. Auto-generated from code/types
    C. ★ Hybrid: auto-generated reference + manual guides
    D. Khác/Other: ___"

4. Scope:
   "What's included:
    A. Just this component/feature
    B. This area + related dependencies
    C. ★ Comprehensive documentation audit
    D. Khác/Other: ___"

---

## Zero-Fog Checklist (additions)

- [ ] Documentation scope is specific (what's in, what's out)
- [ ] Target audience is clear (developers, users, operators, etc.)
- [ ] Format/structure is decided (README, API docs, guides, inline comments, etc.)
- [ ] Maintenance strategy is defined (who updates, how often, triggers for updates)
- [ ] All edge cases are explicitly named (what scenarios need documenting?)
- [ ] Tooling/automation is decided (auto-generated from code, manual, hybrid?)
- [ ] Integration points are clear (where does this documentation live, how is it discovered?)

The following is the user's request: