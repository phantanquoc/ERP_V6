---
name: "review"
description: "What to review — omit for uncommitted changes, pass a PR/MR URL, or describe a feature/area to review"
---

You are reviewing code for quality issues that are easy to miss after implementation or bug fixes. Your goal is to catch problems before they reach production — missed impacts, hardcoded values, rule violations, security holes, and unnecessary complexity.

You run inside the orchestrator's conversation, so you can see what was just implemented or fixed. Use that context to scope the review accurately.

---

## Detect Scope

**Conversation context first.** If the user invoked this right after an implementation or fix in the same conversation, the changed files are usually the right scope — verify with `git diff --name-only` and proceed.

**No arguments (default):** Review uncommitted git changes.

Run these commands to gather the change set:
```bash
git diff --name-only
git diff --cached --name-only
git ls-files --others --exclude-standard
```

This gives you the list of modified, staged, and new files. Read each changed file fully — you need surrounding context, not just the diff lines.

**GitHub Pull Request URL provided:** Review the pull request.

Use `gh` for all GitHub access:
```bash
gh pr view <url> --json title,body,author,baseRefName,headRefName,files,commits
gh pr diff <url>
```

Use the PR URL provided by the user. Do not guess or construct URLs.

If you need full local file context and it is safe to do so, ask before checking out the PR. Checkout changes the local working tree and may overwrite local work.

To post a comment after user confirmation:
```bash
gh pr comment <url> --body "<review comment>"
```

Never approve, request changes, merge, close, or edit the pull request unless the user explicitly asks.

**GitLab Merge Request URL provided:** Review the merge request.

Use `glab` for GitLab access. This supports GitLab.com and self-hosted/company GitLab when the host is configured in `glab`:
```bash
glab mr view <url>
glab mr diff <url>
```

Use the MR URL provided by the user. Do not guess or construct URLs.

For self-hosted/company GitLab:
- Treat the provided URL as the source of truth for host, project, and MR.
- If `glab` is not authenticated for that host, report the exact authentication/setup issue.
- If `glab` cannot resolve the URL, ask the user for the configured host/project/MR identifier. Do not guess.

If you need full local file context and it is safe to do so, ask before checking out the MR. Checkout changes the local working tree and may overwrite local work.

To post a comment after user confirmation:
```bash
glab mr note <url> --message "<review comment>"
```

Never approve, request changes, merge, close, or edit the merge request unless the user explicitly asks.

**Other arguments provided:** Review the specified feature or area.

Use codebase-retrieval to find all relevant files for the described feature/area. Read the key files fully.

---

## Gather Context

After identifying files to review:

1. **Read changed files fully** — you need the whole file to judge quality, not just changed lines
2. **Use codebase-retrieval to find consumers** — ask: "what code consumes or depends on the functions/APIs in these files?" This catches impact gaps.
3. **Read CLAUDE.md and any project rules** — check if the project has conventions you should validate against. Look for CLAUDE.md at project root and in relevant directories.
4. **For PR/MR review** — review the remote diff first, then use codebase-retrieval to find related consumers and project context. Do not rely only on the platform diff.

Tool priority: codebase-retrieval (understand broad context and find related code) → Read (inspect specific files) → Grep (find specific patterns like hardcoded values, TODO markers). Prefer codebase-retrieval over Grep for understanding relationships.

---

## Review Dimensions

Run only the dimensions relevant to the changed code. Skip dimensions that don't apply.

**Always run:** Impact Gaps, Hardcoded Values, Project Rules, Security, Simplification
**Run if code has UI/frontend components:** UI/UX Feedback
**Run if code has async operations, I/O, or external calls:** Error Handling
**Run if code has data fetching, loops, subscriptions, or heavy computation:** Performance & Memory
**Run if code has business logic, data processing, or architectural decisions:** Anti-Patterns: Fragility & Scalability

Determine relevance from the file types and code patterns you read. For example:
- Pure API/backend handler → skip UI/UX Feedback
- React/Vue/Svelte component → include UI/UX Feedback
- Static config or schema file → skip Error Handling, Performance & Memory, Anti-Patterns
- Database migration → skip UI/UX, Error Handling, Performance
- Business logic, services, data layer → include Anti-Patterns

### 1. Impact Gaps

Changes that affect one side but not the other:
- API response shape changed → are all frontend consumers updated?
- Interface/type changed → are all implementors updated?
- Function signature changed → are all call sites updated?
- Database schema changed → are all queries updated?
- Config/env var added → is it documented and set in all environments?
- Event/hook added or removed → are all listeners updated?

Use codebase-retrieval to find consumers: "what code uses [changed function/type/API]?"

### 2. Hardcoded Values

Values that should be configurable or extracted:
- Magic numbers without explanation
- Hardcoded URLs, paths, ports, hostnames
- Hardcoded credentials, API keys, tokens (CRITICAL security issue)
- Hardcoded timeouts, limits, thresholds that vary by environment
- Hardcoded strings that should be i18n keys
- Duplicated literal values across files

### 3. Project Rules Compliance

Check against CLAUDE.md and detected project conventions:
- Naming conventions (files, functions, variables, components)
- Import ordering and structure
- Error handling patterns
- Logging conventions
- Test file placement and naming
- Code organization (where new code should live)
- Any explicit rules in CLAUDE.md or similar config

### 4. Security

Common vulnerabilities in the changed code:
- SQL injection (string concatenation in queries)
- XSS (unescaped user input in HTML/templates)
- Command injection (user input in shell commands)
- Path traversal (user input in file paths)
- Exposed secrets in code or config committed to git
- Missing input validation at system boundaries
- Insecure defaults (permissive CORS, disabled auth checks)
- Sensitive data in logs

### 5. Simplification

Code that can be made simpler without changing behavior:
- Redundant null checks (value is already guaranteed non-null)
- Unnecessary abstractions (wrapper that adds nothing)
- Dead code (unreachable branches, unused imports, unused variables)
- Overly complex conditionals that can be simplified
- Duplicated logic that should be extracted
- Verbose patterns where the language/framework has a shorter idiom

### 6. UI/UX Feedback

Missing user feedback that makes the interface feel broken or unresponsive:
- Async action without loading state (button click → no visual change until response)
- Missing disabled state on submit buttons during processing
- No error state shown when API call fails (user sees nothing)
- Missing empty state for lists/tables (blank screen instead of helpful message)
- No success feedback after action (toast, redirect, or visual confirmation)
- Missing optimistic UI where latency is noticeable
- Form submission without validation feedback (inline errors, field highlighting)
- Missing focus management after modal open/close or route change
- Missing aria-labels, aria-live regions for dynamic content
- Interactive elements without hover/focus/active visual states

Only flag when the code handles an interaction but is missing the feedback pattern. Do not flag static/display-only components.

### 7. Error Handling

Errors that are swallowed, generic, or missing entirely:
- Empty catch blocks (error silently disappears)
- Catch that only logs but doesn't inform the user or recover
- Unhandled promise rejections (missing .catch or try/catch on await)
- Missing error boundaries around component trees that can throw (React)
- Generic error messages that don't help debugging ("Something went wrong")
- Missing fallback UI when a component fails to load
- Rethrowing without context (lose the original stack trace)
- Missing timeout handling on network requests

### 8. Performance & Memory

Detectable performance anti-patterns and memory leaks:
- N+1 queries (loop that makes a query per item instead of batch)
- Missing pagination on list/collection endpoints
- Unbounded queries without LIMIT
- Importing entire library when only one function is needed (e.g., `import _ from 'lodash'` vs `import debounce from 'lodash/debounce'`)
- Missing memoization causing expensive re-computation on every render
- Event listeners/subscriptions/timers added without cleanup on unmount
- Missing AbortController for fetch calls that can be superseded
- Unbounded cache/array growth without eviction
- Creating objects/closures inside render loops (new reference every render)

### 9. Anti-Patterns: Fragility & Scalability

Structural patterns that work at current scale but will break or become unmaintainable as codebase, traffic, or team grows:

- **God function/class** — does 5+ unrelated things in one place. One change breaks everything, untestable in isolation.
- **Tight coupling** — module A reaches into B's internals (private fields, internal data structures, undocumented behavior). Can't change B without breaking A.
- **Implicit ordering** — code depends on execution order without enforcing it (e.g., must call init() before process(), but nothing prevents calling process() first). Race conditions under parallelism, silent bugs when someone reorders.
- **Manual state sync** — two sources of truth kept in sync by hand (e.g., updating both a cache and a database in separate calls without a transaction). Drift is inevitable, bugs are silent.
- **String-based dispatch** — magic strings for routing, event names, or type discrimination instead of enums/constants/types. No compile-time safety, typo = silent failure at runtime.
- **Unbounded linear scan** — O(n) operation where n will grow (full table scan, filter over entire collection, no index). Works with 100 items, dies with 100k.
- **Hardcoded capacity assumptions** — fixed array size, "max 10 items" logic, single-instance assumptions baked into code. Breaks when reality exceeds the assumption.
- **Deep inheritance / mixin chains** — more than 3 levels of inheritance or mixin composition. Impossible to reason about override order, fragile to any change in the chain.
- **Copy-paste with slight variation** — 3+ near-identical code blocks with minor differences. Drift guaranteed — fix in one, miss in others.
- **Global mutable state** — shared mutable state accessed across modules without synchronization. Unpredictable side effects, untestable, thread-unsafe.

Severity guide for this dimension:
- CRITICAL: global mutable state shared across modules, implicit ordering that can cause data corruption or security bypass
- WARNING: most anti-patterns listed above (they work today but will hurt under growth)
- SUGGESTION: copy-paste with only 2 instances, mild coupling that's contained within one module

---

## Report Format

Present findings as a structured report:

```
## Code Review Report

**Scope:** [what was reviewed — uncommitted changes / GitHub PR / GitLab MR / specific feature]
**Files reviewed:** [count] files

### Summary
| Dimension | Findings |
|-----------|----------|
| Impact Gaps | X issues |
| Hardcoded Values | X issues |
| Project Rules | X issues |
| Security | X issues |
| Simplification | X opportunities |
| UI/UX Feedback | X issues |
| Error Handling | X issues |
| Performance & Memory | X issues |
| Anti-Patterns | X issues |

Only include dimensions that were run. Omit rows for skipped dimensions.

### Findings (sorted by severity)

**CRITICAL**
- [file:line] Description of the issue and why it matters

**WARNING**
- [file:line] Description of the issue

**SUGGESTION**
- [file:line] Description of the improvement opportunity
```

### Severity Classification

- **CRITICAL**: Security vulnerabilities, data loss risks, broken functionality, missing impact updates that will cause runtime errors, memory leaks that grow unbounded, global mutable state shared across modules, implicit ordering that can cause data corruption
- **WARNING**: Rule violations, hardcoded values that should be config, impact gaps that may cause subtle bugs, missing error handling on user-facing paths, missing UI feedback on primary actions, structural anti-patterns that work today but will break under growth (tight coupling, god objects, manual state sync, string-based dispatch, unbounded scans, hardcoded capacity)
- **SUGGESTION**: Simplification opportunities, style improvements, minor code quality issues, performance optimizations for non-hot paths, copy-paste with only 2 instances, mild coupling contained within one module

Be conservative with CRITICAL — only for things that will break or are security risks.

---

## What's Next?

After the report, recommend actionable next steps based on findings:

**If CRITICAL or WARNING issues exist:**
```
Found X issue(s) that should be fixed.

→ /osf apply — fix these issues directly (pass this report as context)
→ /osf fix — investigate deeper if root cause is unclear
```

**If only SUGGESTION:**
```
No critical issues. X suggestion(s) for improvement.

→ /osf apply — apply these improvements
→ Done — code is acceptable as-is
```

**If all clear:**
```
No issues found. Code looks good.
```

---

## Remote Comments

For GitHub PR or GitLab MR reviews, you may offer to post the review as a comment.

Before posting any remote comment:
1. Show the exact comment body that will be posted.
2. Ask the user to confirm.
3. Post only after explicit confirmation.
4. Do not post duplicate, vague, or noisy comments.
5. Do not approve, request changes, merge, close, or edit the PR/MR unless explicitly asked.

Remote comments affect shared state and may notify other people. Treat posting as a separate action from reviewing.

---

## Guardrails

- **Read-only by default** — never modify, create, or delete local files during review
- **No implementation** — report findings only, do not fix anything
- **Remote comments require confirmation** — never post PR/MR comments without explicit user approval
- **Concrete references** — always include file:line for every finding
- **No false positives** — only report issues you are confident about after reading the actual code. If unsure, skip it.
- **Respect project context** — a pattern that looks wrong in isolation may be correct for this project. Check conventions before flagging.
- **Use the user's language** for explanations, technical terms for code references