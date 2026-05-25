---
name: "setup"
description: "Set up a project from boilerplate, documentation, or tech stack. Researches latest docs and versions before scaffolding."
---

You are setting up a project. This command helps you understand what the user wants to build, research the latest documentation and versions, then scaffold the project with informed decisions.

BEFORE PROCEEDING: You MUST use the Skill tool to invoke "explore" unless the caller context explicitly says shared explore mode has already been loaded for this request. This loads the shared explore mode behavior (stance, verification, workflow, subagent protocols, OpenSpec awareness, guardrails) that this command depends on. Do not proceed until explore is loaded exactly once.

---

## How Setup Works

Setup has a mandatory research phase that other commands don't. Before planning, you MUST delegate to osf-researcher to fetch latest docs for every major technology in the stack. This ensures the project starts with current versions, correct APIs, and awareness of breaking changes.

### Input Types

The user may provide one or more of:

| Input | Example | How to Handle |
|-------|---------|---------------|
| Tech stack names | "Next.js + Prisma + tRPC" | Research each, find compatible versions |
| Boilerplate/template URL | "use create-t3-app" or a GitHub repo URL | Research the template's docs, understand what it scaffolds, identify what needs customization |
| Documentation URL | "follow this guide: [url]" | Fetch and read the guide, extract setup steps, cross-reference with latest official docs |
| Vague goal | "I want to build a SaaS" | Suggest tech stack options based on the goal (see Tech Stack Suggestions below) |

### Greenfield vs Brownfield

Detect early:
- **Greenfield** (empty or near-empty directory) → full scaffold
- **Brownfield** (existing project) → integrate new tech into existing structure, respect existing patterns

---

## What You Might Do

**Explore the problem space**
- Feynman Echo — restate what the user wants to build in the simplest possible language, then ask user to confirm or correct
- Ask clarifying questions: What's the end goal? Who are the users? What scale?
- Detect greenfield vs brownfield
- If vague goal → suggest tech stack options (see below)

**Research phase (MANDATORY)**

After understanding what the user wants, IMMEDIATELY delegate to osf-researcher. This is not optional.

Research instructions must cover:
1. Latest stable version of each technology in the stack
2. Official "getting started" or setup guide for each
3. Known breaking changes or migration notes in latest versions
4. Compatibility between technologies (e.g., does library X work with framework Y's latest version?)
5. If boilerplate URL provided: what the template includes, its default config, known issues

Run osf-researcher in parallel when researching multiple independent technologies.

After research returns, synthesize findings before proceeding to planning:
- Flag any version incompatibilities
- Note any deprecated APIs or patterns in the docs
- Highlight "gotchas" from the research

**Investigate the codebase (brownfield)**
- Map existing project structure, package manager, config files
- Find patterns already in use (linting, testing, CI)
- Identify conflicts with new tech being added

**Compare options**
- When multiple valid approaches exist, build comparison tables
- Sketch tradeoffs (quickwin vs prod-ready, simplicity vs scalability)
- Recommend a path with ★

**Visualize**
```
┌─────────────────────────────────────────┐
│     Use ASCII diagrams liberally        │
├─────────────────────────────────────────┤
│   Project structure trees,              │
│   dependency graphs, architecture       │
│   diagrams, data flow sketches          │
└─────────────────────────────────────────┘
```

**Surface risks and unknowns**
- Version conflicts between dependencies
- Missing pieces in the boilerplate
- Security considerations for the chosen stack
- Scalability concerns for the target use case

---

## Tech Stack Suggestions

When the user has a vague goal or asks for recommendations, suggest stacks based on their use case. Always ground recommendations in the project's actual needs — don't default to the most popular option.

Present as options with tradeoffs:

**Web App (fullstack)**
```
A. Quickwin — Next.js + SQLite (Drizzle/Prisma) + Tailwind
   Good: fast to ship, minimal infra, great DX
   Bad: SQLite limits concurrency, harder to scale horizontally

B. Balanced — Next.js + PostgreSQL (Drizzle/Prisma) + tRPC + Tailwind
   Good: type-safe end-to-end, scales well, strong ecosystem
   Bad: more setup, needs a database server

C. ★ Prod-ready — Next.js + PostgreSQL + tRPC + Redis + Tailwind + Auth.js
   Good: session management, caching, rate limiting, battle-tested auth
   Bad: more moving parts, higher ops complexity

D. Khác/Other: ___
```

**API / Backend**
```
A. Quickwin — Express/Fastify + SQLite + TypeScript
   Good: minimal, fast to prototype
   Bad: limited for high-traffic

B. Balanced — Fastify + PostgreSQL + Drizzle + TypeScript
   Good: fast runtime, type-safe ORM, good DX
   Bad: smaller ecosystem than Express

C. ★ Prod-ready — NestJS + PostgreSQL + Prisma + Redis + Bull (queues)
   Good: structured architecture, job queues, caching, scales well
   Bad: heavier framework, steeper learning curve

D. Khác/Other: ___
```

**Mobile App**
```
A. Quickwin — Expo (React Native) + Supabase
   Good: fast to ship, managed backend, cross-platform
   Bad: Supabase vendor lock-in, Expo limitations for native modules

B. ★ Balanced — Expo + tRPC + PostgreSQL (self-hosted or Supabase)
   Good: type-safe API, flexible backend, cross-platform
   Bad: more setup than pure Supabase

C. Native — Swift (iOS) + Kotlin (Android)
   Good: best performance, full platform access
   Bad: two codebases, slower development

D. Khác/Other: ___
```

These are starting points. Always research the latest state of each option before recommending. Adapt suggestions based on user's experience level, team size, and deployment target.

---

## Stress-test Questions

Resolve these before ending discovery. Self-answer by exploring the codebase (brownfield) or research results (greenfield). Only surface items to the user that are genuinely ambiguous or require a personal/team style choice:

1. Package manager:
   "Package manager:
    A. npm (default, widest compatibility)
    B. pnpm (fast, disk-efficient, strict)
    C. ★ Follow boilerplate default / detect from lockfile
    D. yarn
    E. bun
    F. Khác/Other: ___"

2. Language & type safety:
   "Language setup:
    A. JavaScript (no types)
    B. TypeScript — relaxed (no strict)
    C. ★ TypeScript — strict mode
    D. Khác/Other: ___"

3. Project structure:
   "Project structure:
    A. Single package (simple)
    B. Monorepo — Turborepo
    C. Monorepo — Nx
    D. ★ Follow boilerplate default / match project scale
    E. Khác/Other: ___"

4. Linting & formatting:
   "Code quality tooling:
    A. ESLint + Prettier (classic, wide plugin support)
    B. ★ Biome (fast, all-in-one, less config)
    C. oxlint + Prettier
    D. Follow boilerplate default
    E. Khác/Other: ___"

5. Testing framework:
   "Testing setup:
    A. None (add later)
    B. Jest
    C. ★ Vitest (fast, ESM-native, Vite-compatible)
    D. Framework-specific (e.g., Playwright for E2E)
    E. Khác/Other: ___"

6. Environment management:
   "Environment variables:
    A. .env file only (dotenv)
    B. ★ .env + validation (zod/t3-env)
    C. Platform-managed (Vercel/Railway env)
    D. Khác/Other: ___"

7. Authentication (if applicable):
   "Auth strategy:
    A. None (add later)
    B. Auth.js / NextAuth
    C. Clerk / Supabase Auth (managed)
    D. Custom JWT
    E. ★ Depends on stack — research best fit
    F. Khác/Other: ___"

8. Database (if applicable):
   "Database choice:
    A. SQLite (quickwin, no server needed)
    B. PostgreSQL (production standard)
    C. MySQL / MariaDB
    D. MongoDB (document store)
    E. ★ Depends on use case — research best fit
    F. Khác/Other: ___"

9. ORM / Query builder (if database chosen):
   "Data access layer:
    A. Raw SQL / query builder (knex, kysely)
    B. Prisma (great DX, schema-first)
    C. ★ Drizzle (type-safe, SQL-like, lightweight)
    D. Framework default
    E. Khác/Other: ___"

10. Deployment target:
    "Where will this run:
     A. Serverless (Vercel, Netlify, AWS Lambda)
     B. Container (Docker → any cloud)
     C. VPS / bare metal
     D. ★ Depends on scale — research best fit
     E. Khác/Other: ___"

11. CI/CD:
    "CI/CD setup:
     A. None (add later)
     B. ★ GitHub Actions (lint + test + build)
     C. GitLab CI
     D. Khác/Other: ___"

12. Caching & performance (prod-ready):
    "Caching strategy:
     A. None (add later)
     B. In-memory (node-cache)
     C. ★ Redis (distributed, scales horizontally)
     D. CDN-level only (static assets)
     E. Khác/Other: ___"

13. Error monitoring & observability (prod-ready):
    "Observability:
     A. None (add later)
     B. Console logging only
     C. Structured logging (pino/winston)
     D. ★ Structured logging + error tracking (Sentry)
     E. Khác/Other: ___"

14. API documentation (if API):
    "API docs:
     A. None
     B. Swagger/OpenAPI auto-generated
     C. ★ tRPC panel / auto-generated from types
     D. Khác/Other: ___"

15. Security baseline:
    "Security setup:
     A. Minimal (CORS, helmet)
     B. ★ Standard (CORS, helmet, rate limiting, input validation, CSRF)
     C. Hardened (+ WAF, CSP, dependency audit, OWASP checklist)
     D. Khác/Other: ___"

---

## Zero-Fog Checklist (additions)

- [ ] Every technology in the stack has been researched for latest version and compatibility
- [ ] Project structure is decided (monorepo vs single, directory layout)
- [ ] All config files are identified (tsconfig, eslint, prettier/biome, docker, CI, env)
- [ ] Dependencies list is concrete — no "we'll figure out which library later"
- [ ] Database schema approach is decided (if applicable)
- [ ] Auth strategy is decided (if applicable)
- [ ] Deployment target is decided — scaffolding matches it (e.g., Dockerfile if container, serverless config if serverless)
- [ ] Environment variables are listed with validation strategy
- [ ] Security baseline is defined
- [ ] Boilerplate customizations are explicit (what to keep, what to change, what to remove)

---

## Extra Subagents

| Subagent | When to Use |
|----------|-------------|
| osf-researcher | MANDATORY for setup — research latest docs, versions, compatibility for every technology in the stack. Also use for boilerplate/template documentation and known issues. |
| osf-uiux-designer | User wants UI scaffolding or design system setup as part of the project |

The following is the user's request: