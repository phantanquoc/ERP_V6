---
name: "osf"
description: "Launch any kit skill by name. Usage: /osf [skill] [args]"
---

Available skills: feat, fix, chore, refactor, perf, docs, test, ci, docker, git, autopilot, research, browser, explain, analyze, review, apply, archive, proposal, verify, uiux-design, setup

RUNTIME GUARD:
This prompt is already the `osf` dispatcher. Do NOT use the Skill tool to invoke `osf` again. Resolve the target skill from ARGUMENTS and dispatch directly. Only invoke the resolved target skill, and invoke `explore` too when the resolved target is a planning skill.

Supporting subagents (used internally by skills):
- osf-analyze — Structural codebase analysis (dependencies, blast radius, call chains) via GitNexus + codebase-retrieval
- osf-apply — Implement tasks from spec or conversation plan
- osf-archive — Archive completed change to openspec/changes/archive/
- osf-researcher — Web research (technical docs, best practices, comparisons, security advisories)
- osf-uiux-designer — UI/UX design analysis and reports
- osf-verify — Verify implementation matches spec

Aliases:
- auto → autopilot

Dispatch rules:

1. Resolve the target skill:
   - If "$0" is present and matches a supported skill or alias, resolve the alias first.
   - If "$0" is empty or not in the supported skill list, infer the best matching skill from the user's request.
2. Use the most specific match:
   - bug fix, broken behavior, error, regression, "sửa lỗi" → `fix`
   - new feature, enhancement, "thêm tính năng" → `feat`
   - refactor, cleanup without behavior change → `refactor`
   - performance, speed, latency, optimization → `perf`
   - docs, README, guide, comments → `docs`
   - tests, coverage, unit/integration/e2e tests → `test`
   - CI/CD, workflow automation, pipelines → `ci`
   - Docker, containers, images, compose → `docker`
   - git status/commit/pull/push/merge/rebase/log/changelog → `git`
   - browser reproduction, visual bug investigation, navigation → `browser`
   - explain how code works, teach-back, understanding flow → `explain`
   - impact analysis, dependency tracing, feasibility, blast radius → `analyze`
   - review code, code quality, missed impacts, hardcoded values → `review`
   - research docs, best practices, comparisons, advisories → `research`
   - project scaffolding, boilerplate, initial setup → `setup`
   - proposal/spec creation → `proposal`
   - implementation from plan/spec → `apply`
   - verification/review against spec → `verify`
   - archive completed change → `archive`
   - UI/UX review or design direction → `uiux-design`
   - fully autonomous end-to-end workflow → `autopilot`
3. If the request could reasonably map to multiple skills and no best match is clear, ask the user which skill to run. Do not guess when intent is ambiguous.
4. Planning skills are: feat, fix, chore, refactor, perf, docs, test, ci, docker, setup.
5. If the resolved target is a planning skill, use the Skill tool to invoke the resolved skill and `explore` in parallel:
   - Invoke the resolved skill with the user's remaining arguments plus this context: `CALLER_CONTEXT: shared explore mode has already been loaded for this request. Do not invoke the explore skill again.`
   - Invoke `explore` with the same user request as context.
6. If the resolved target is not a planning skill, use the Skill tool to invoke only the resolved skill.

If the user provided additional arguments beyond the skill name, include them as context for the invoked skill.

ARGUMENTS: $ARGUMENTS