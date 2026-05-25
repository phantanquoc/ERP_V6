---
name: "docker"
description: "Plan and implement Docker/containerization work. Explore container strategy, image optimization, and deployment, then implement with optional spec creation."
---

You are planning Docker/containerization work. This command helps you explore the container space, assess its size, and decide on the best implementation path.

BEFORE PROCEEDING: You MUST use the Skill tool to invoke "explore" unless the caller context explicitly says shared explore mode has already been loaded for this request. This loads the shared explore mode behavior (stance, verification, workflow, subagent protocols, OpenSpec awareness, guardrails) that this command depends on. Do not proceed until explore is loaded exactly once.

---

## What You Might Do

**Explore the containerization space**
- Feynman Echo — restate the user's Docker need in the simplest possible language, then ask user to confirm or correct
- Ask clarifying questions about container strategy, image optimization, and deployment
- Challenge assumptions about what needs containerizing
- Find analogies to existing container patterns

**Investigate the codebase**
- Map existing Docker infrastructure and configurations
- Find integration points and dependencies
- Identify patterns already in use
- Surface hidden complexity in containerization

**Compare options**
- Brainstorm multiple containerization approaches
- Build comparison tables (single vs multi-stage builds, base images, orchestration strategies)
- Sketch tradeoffs (image size vs build time, security vs convenience, complexity vs flexibility)
- Recommend a path (if asked)

**Visualize**
```
┌─────────────────────────────────────────┐
│     Use ASCII diagrams liberally        │
├─────────────────────────────────────────┤
│   Multi-stage builds, image layers,     │
│   registry strategies, orchestration    │
└─────────────────────────────────────────┘
```

**Research external knowledge**
- When discussion involves Docker tools, best practices, or orchestration → delegate to osf-researcher

**Investigate containerization gaps**
- Trace what's currently containerized vs what's not
- Find optimization opportunities
- Identify security concerns
- Surface maintenance burden

**Surface risks and unknowns**
- Identify what could go wrong with containerization
- Find gaps in understanding
- Suggest spikes or investigations

---

## Stress-test Questions

Resolve these before ending discovery. Self-answer by exploring the codebase. Only surface items to the user that are genuinely ambiguous or require a personal/team style choice:

1. Base image:
   "Base image choice:
    A. Official language image (e.g., node:20)
    B. Alpine variant (smaller, fewer packages)
    C. ★ Distroless / minimal (smallest, most secure)
    D. Khác/Other: ___"

2. Build strategy:
   "Build approach:
    A. Single-stage (simple)
    B. ★ Multi-stage (optimized image size)
    C. Khác/Other: ___"

3. Security:
   "Security requirements:
    A. Default (root user, standard packages)
    B. Non-root user only
    C. ★ Non-root + minimal layers + vulnerability scanning
    D. Khác/Other: ___"

4. Orchestration:
   "Orchestration approach:
    A. Standalone Docker
    B. Docker Compose (multi-container)
    C. ★ Docker Compose for dev, Kubernetes for prod
    D. Khác/Other: ___"

---

## Zero-Fog Checklist (additions)

- [ ] Containerization scope is specific (what's in, what's out)
- [ ] Base image is decided (which image, why)
- [ ] Build strategy is decided (single-stage vs multi-stage, optimization approach)
- [ ] Runtime requirements are clear (ports, volumes, environment variables, secrets)
- [ ] Image size/optimization targets are defined
- [ ] Security considerations are addressed (non-root user, minimal layers, vulnerability scanning)
- [ ] Registry/deployment strategy is decided (where images are stored, how they're deployed)
- [ ] Orchestration approach is decided (Docker Compose, Kubernetes, or standalone)

The following is the user's request: