---
name: "ci"
description: "Plan and implement CI/CD pipeline changes. Explore scope, deployment strategy, and automation, then implement with optional spec creation."
---

You are planning CI/CD work. This command helps you explore the pipeline space, assess its size, and decide on the best implementation path.

BEFORE PROCEEDING: You MUST use the Skill tool to invoke "explore" unless the caller context explicitly says shared explore mode has already been loaded for this request. This loads the shared explore mode behavior (stance, verification, workflow, subagent protocols, OpenSpec awareness, guardrails) that this command depends on. Do not proceed until explore is loaded exactly once.

---

## What You Might Do

**Explore the CI/CD space**
- Feynman Echo — restate the user's pipeline need in the simplest possible language, then ask user to confirm or correct
- Ask clarifying questions about deployment strategy, automation scope, and environments
- Challenge assumptions about what needs automating
- Find analogies to existing pipeline patterns

**Investigate the codebase**
- Map existing CI/CD infrastructure and workflows
- Find integration points and dependencies
- Identify patterns already in use
- Surface hidden complexity in deployment

**Compare options**
- Brainstorm multiple pipeline approaches
- Build comparison tables (GitHub Actions vs other CI systems, deployment strategies, rollback approaches)
- Sketch tradeoffs (automation complexity vs manual control, speed vs safety)
- Recommend a path (if asked)

**Visualize**
```
┌─────────────────────────────────────────┐
│     Use ASCII diagrams liberally        │
├─────────────────────────────────────────┤
│   Pipeline flows, deployment stages,    │
│   environment matrices, rollback paths  │
└─────────────────────────────────────────┘
```

**Research external knowledge**
- When discussion involves CI/CD tools, deployment strategies, or best practices → delegate to osf-researcher

**Investigate pipeline gaps**
- Trace what's currently automated vs what's manual
- Find bottlenecks and failure points
- Identify reliability concerns
- Surface maintenance burden

**Surface risks and unknowns**
- Identify what could go wrong with deployments
- Find gaps in understanding
- Suggest spikes or investigations

---

## Stress-test Questions

Resolve these before ending discovery. Self-answer by exploring the codebase. Only surface items to the user that are genuinely ambiguous or require a personal/team style choice:

1. Pipeline scope:
   "What's being automated:
    A. Build + test only
    B. Build + test + deploy to staging
    C. ★ Full pipeline: build + test + deploy staging + deploy prod
    D. Khác/Other: ___"

2. Trigger conditions:
   "When does the pipeline run:
    A. On every commit
    B. On PR only
    C. ★ PR for test, merge to main for deploy
    D. Khác/Other: ___"

3. Failure handling:
   "When pipeline fails:
    A. Block and notify
    B. Auto-retry once then block
    C. ★ Block, notify, auto-rollback if in deploy stage
    D. Khác/Other: ___"

4. Rollback strategy:
   "How to undo a bad deployment:
    A. Manual rollback
    B. Auto-rollback on health check failure
    C. ★ Blue/green or canary with auto-rollback
    D. Khác/Other: ___"

---

## Zero-Fog Checklist (additions)

- [ ] Pipeline scope is specific (what's in, what's out)
- [ ] Deployment strategy is decided (environments, stages, approval gates)
- [ ] Trigger conditions are clear (on commit, on PR, on tag, manual, etc.)
- [ ] Failure handling is defined (what happens on failure, rollback strategy)
- [ ] Notifications/alerts are decided (who gets notified, when)
- [ ] Secrets/credentials management is addressed
- [ ] Monitoring/observability is planned (how to track deployments)
- [ ] Rollback strategy is explicit (how to undo a bad deployment)

The following is the user's request: