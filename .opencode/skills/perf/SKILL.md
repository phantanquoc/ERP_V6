---
name: "perf"
description: "Plan performance optimization. Explore bottlenecks, assess impact, then implement with optional spec creation."
---

You are planning performance optimization. This command helps you identify bottlenecks, assess optimization scope, and decide on the best implementation path.

BEFORE PROCEEDING: You MUST use the Skill tool to invoke "explore" unless the caller context explicitly says shared explore mode has already been loaded for this request. This loads the shared explore mode behavior (stance, verification, workflow, subagent protocols, OpenSpec awareness, guardrails) that this command depends on. Do not proceed until explore is loaded exactly once.

---

## What You Might Do

**Investigate performance bottlenecks**
- Trace, don't theorize — read actual code, follow execution flow step by step
- Form hypotheses then verify — "I think the issue is X" → read the code → confirm or reject
- Find root cause, not symptoms — when you find where it's slow, ask "why is it slow here?" and keep digging
- Profile data if available — use metrics to guide investigation
- Don't stop at the first plausible explanation — verify it in code before presenting it

**Explore the problem space**
- Feynman Echo — restate the performance goal in the simplest possible language, then ask user to confirm or correct
- Ask clarifying questions that emerge from what they said
- Challenge assumptions
- Reframe the problem
- Find analogies

**Investigate the codebase**
- Map existing architecture relevant to the optimization
- Find integration points
- Identify patterns already in use
- Surface hidden complexity

**Compare options**
- Brainstorm multiple optimization approaches
- Build comparison tables
- Sketch tradeoffs (speed vs memory, complexity vs maintainability)
- Recommend a path (if asked)

**Visualize**
```
┌─────────────────────────────────────────┐
│     Use ASCII diagrams liberally        │
├─────────────────────────────────────────┤
│   Hot paths, bottleneck diagrams,       │
│   before/after flow comparisons,        │
│   memory/CPU profiles                   │
└─────────────────────────────────────────┘
```

**Research external knowledge**
- When discussion involves technology choices, best practices, or security concerns → delegate to osf-researcher

**Look up API documentation**
- When discussion needs precise API usage → delegate to osf-researcher for web research

**Surface risks and unknowns**
- Identify what could go wrong with the optimization
- Find gaps in understanding
- Suggest spikes or investigations

---

## Stress-test Questions

Resolve these before ending discovery. Self-answer by exploring the codebase. Only surface items to the user that are genuinely ambiguous or require a personal/team style choice:

1. Performance metrics:
   "How will we measure success:
    A. Latency reduction (target: X ms)
    B. Throughput increase (target: X ops/sec)
    C. Memory reduction (target: X MB)
    D. ★ Multiple metrics: [specific targets]
    E. Khác/Other: ___"

2. Trade-offs:
   "Acceptable trade-offs:
    A. No trade-offs — must maintain current behavior
    B. Slight complexity increase for significant speed gain
    C. ★ Moderate complexity increase for significant speed gain
    D. Khác/Other: ___"

3. Scope clarity:
   "What's included in this optimization:
    A. Just this function
    B. This function + related dependencies
    C. ★ Full audit and optimize across codebase
    D. Khác/Other: ___"

4. Test strategy:
   "Test level needed:
    A. Manual verification only
    B. Unit tests for optimized code
    C. ★ Unit + integration + performance tests
    D. Khác/Other: ___"

---

## Zero-Fog Checklist (additions)

- [ ] Bottleneck is identified and verified in code (not just a guess)
- [ ] Performance metrics are specific and measurable (not "faster" — how much faster?)
- [ ] Optimization approach is specific enough for a verifier to objectively check
- [ ] All affected areas are explicitly named (not "optimize related code" — which files?)
- [ ] Trade-offs are explicitly defined (speed vs memory, complexity vs maintainability)
- [ ] Test strategy decided (unit? integration? performance? which functions need edge case tests?)

The following is the user's request: