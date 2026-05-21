---
name: spx-git
description: Comprehensive git operations — pull, push, commit, merge, rebase, log, changelog, status with smart conflict resolution and conventional commits.
---

You are using the spx-git command for git operations.

ACTION DETECTION

Analyze user input to determine the requested action. Route to the matching workflow.

Actions: status, commit, pull, push, merge, rebase, log, changelog

If unclear from context, show available actions and ask user to choose.

---

ACTION: STATUS

1. Run `git status`, `git branch -vv`, `git stash list`
2. Present:

```
STATUS
═══════════════════════════════════════
Branch          : feature/xyz
Tracking        : origin/feature/xyz
Ahead/Behind    : 3 ahead, 2 behind

Staged          : 4 files
Unstaged        : 2 files modified
Untracked       : 1 file

Stashes         : 2 entries
═══════════════════════════════════════
```

---

ACTION: COMMIT

Phase 1 — STAGE

1. Check `git status` for staged files
   - NO staged files → run `git add -A` (stage everything)
   - Staged files exist → keep as-is, do NOT stage additional files
2. Nothing to commit (clean tree) → report and stop

Phase 2 — ANALYZE

1. Run `git diff --cached --stat` and `git diff --cached`
2. Classify changes by type:
   - `feat`: new functionality, new feature files
   - `fix`: bug fixes, error corrections
   - `refactor`: restructuring without behavior change
   - `chore`: config, deps, build, tooling, CI
   - `docs`: documentation
   - `style`: formatting, whitespace, naming (no logic change)
   - `test`: tests
   - `perf`: performance improvements
3. Determine scope from primary area of change (e.g., `auth`, `api`, `ui`)

Phase 3 — COMMIT

Generate message following conventional commits: `type(scope): concise description`

- Multiple types → use dominant type, mention others in body
- Body: brief what/why if not obvious from subject
- Subject under 72 characters

Present commit plan:

```
COMMIT PLAN
═══════════════════════════════════════
Staged: 5 files (3 modified, 2 new)

Message:
  feat(auth): add token refresh logic

  - New refresh endpoint in auth service
  - Updated middleware to check token expiry

═══════════════════════════════════════
Confirm? [yes / edit / abort]
```

If staged changes cover multiple distinct concerns, suggest splitting:

```
SPLIT SUGGESTION
═══════════════════════════════════════
These changes cover 2 distinct concerns:
1. feat(auth): token refresh logic (3 files)
2. fix(api): rate limit header typo (1 file)

Split into 2 commits? [yes/no]
═══════════════════════════════════════
```

If user agrees: unstage second group, commit first, stage and commit second.

---

ACTION: PULL

Phase 1 — PRE-FLIGHT

1. Check for uncommitted changes via `git status`
   - Dirty working tree → ask user to stash or commit first
   - Offer `git stash` if user agrees
2. Identify current branch and upstream remote/branch
   - No upstream → ask user which remote/branch to pull from
3. `git fetch` to get latest remote state
4. Preview:

```
PULL PREVIEW
═══════════════════════════════════════
Current branch     : feature/xyz
Remote             : origin/feature/xyz
Local is behind by : 14 commits

Incoming changes   : 23 files modified, 4 added, 2 deleted
Local unpushed     : 3 commits, 8 files modified
Potential conflicts: ~5 files
═══════════════════════════════════════
```

5. No incoming changes → "Already up to date", stop
6. Incoming changes → ask user to confirm
7. Save backup: `git tag backup/pull-{YYYYMMDD-HHmmss}`

Phase 2 — MERGE

Run `git merge` with fetched remote branch.

- Clean → skip to Phase 3
- Conflicts → go to CONFLICT RESOLUTION

Phase 3 — VERIFICATION

1. Run build/lint if project has them
2. If stash was created, remind user to `git stash pop`
3. Present summary:

```
PULL COMPLETE
═══════════════════════════════════════
Commits merged  : 14
Conflicts       : 0
Backup ref      : backup/pull-20260209-160530
═══════════════════════════════════════
```

4. Ask user: confirm result or rollback via `git reset --hard backup/pull-{timestamp}`

---

ACTION: PUSH

Phase 1 — PRE-FLIGHT

1. Check current branch and upstream tracking
   - No upstream → suggest `git push --set-upstream origin {branch}`
2. `git fetch` to check remote state
3. If local diverged from remote → warn, suggest pull first
4. Preview:

```
PUSH PREVIEW
═══════════════════════════════════════
Branch          : feature/xyz
Remote          : origin/feature/xyz
Commits to push : 3
Files changed   : 12
Force push      : no
═══════════════════════════════════════
```

5. Force push needed (rewritten history) → explicit warning, require double confirmation
6. Confirm before pushing

Phase 2 — PUSH

1. Run `git push`
2. Report result

---

ACTION: MERGE

Merge a source branch into current branch.

Phase 1 — PRE-FLIGHT

1. Confirm source branch from user input (or ask)
2. Check uncommitted changes — stash if needed
3. `git fetch` to ensure branches are current
4. Preview:

```
MERGE PREVIEW
═══════════════════════════════════════
Current branch    : main
Merging from      : feature/auth
Commits incoming  : 8
Files changed     : 15
Potential conflicts: ~3 files
═══════════════════════════════════════
```

5. Save backup: `git tag backup/merge-{YYYYMMDD-HHmmss}`
6. Confirm before merging

Phase 2 — MERGE

Run `git merge {source-branch}`.

- Clean → skip to Phase 3
- Conflicts → go to CONFLICT RESOLUTION

Phase 3 — VERIFICATION

Same as pull verification. Report results, offer rollback.

---

ACTION: REBASE

Phase 1 — PRE-FLIGHT

1. Confirm target branch from user input (or ask)
2. Check uncommitted changes — stash if needed
3. WARN if rebasing published commits:

```
WARNING: This branch has 5 commits already pushed to origin.
Rebasing rewrites history — force push required afterward.
Continue? [yes/no]
```

4. Save backup: `git tag backup/rebase-{YYYYMMDD-HHmmss}`
5. Preview commits to be replayed

Phase 2 — REBASE

Run `git rebase {target}`.

- Clean → skip to Phase 3
- Conflicts → CONFLICT RESOLUTION (per-commit: resolve → `git rebase --continue` → repeat)

Phase 3 — VERIFICATION

Report result. Remind about force push if history was rewritten.

---

ACTION: LOG

Parse user request for filters, then present formatted log.

Options:
- Compact view (default, last 20 commits)
- Detailed view with diffs
- Graph view (branch topology)
- Filter: `--author`, `--since`, `--until`, `--path`, `--n=count`

```
GIT LOG (last 20 commits)
═══════════════════════════════════════
abc1234  2h ago   feat(auth): add token refresh    @alice
def5678  5h ago   fix(api): rate limit header       @bob
ghi9012  1d ago   chore: update dependencies        @alice
═══════════════════════════════════════
```

---

ACTION: CHANGELOG

Generate changelog from git history, written in the language the user used to ask.

Phase 1 — DETERMINE RANGE

From user input, determine the range:
- Date range: `--since=YYYY-MM-DD --until=YYYY-MM-DD`
- Between tags: `v1.0.0..v1.1.0`
- Between commits: `abc1234..def5678`
- Since last tag: auto-detect latest tag to HEAD
- Unclear → ask user

Phase 2 — COLLECT & GROUP

1. Run `git log` for the range with full messages, branch info, author, date
2. Group commits by branch name
3. Within each branch: group related commits (same feature or bugfix) into a single brief line
   - Multiple commits for the same feature/fix → merge into 1 line with brief description
   - Each line: `- description (username) (YYYY-MM-DD)`

Phase 3 — OUTPUT

Format:

```
### branch-name-1
- Thêm tính năng refresh token (alice) (2026-03-15)
- Sửa lỗi rate limit header (bob) (2026-03-14)

### branch-name-2
- Cập nhật payment discount logic (charlie) (2026-03-13)
- Refactor auth service (alice) (2026-03-12)
```

Rules:
- Language matches user's language (Vietnamese → Vietnamese, English → English, etc.)
- Brief descriptions — no commit hashes, no verbose details
- Related commits (same feature/fix across multiple commits) → collapse into 1 line
- Date = date of the latest commit in the group
- Username = primary author

Ask user: copy to clipboard, save to file, or adjust.

---

CONFLICT RESOLUTION (shared by pull, merge, rebase)

Used whenever conflicts arise during pull, merge, or rebase.

Step 1 — ANALYZE & GROUP

Read ALL conflicted files. Understand semantic meaning, not just diffs. Group by logical theme.

Auto-resolve trivial conflicts immediately (do NOT ask user):
- Import/require additions or removals
- Formatting, whitespace, line endings
- File renames/moves with unchanged content
- Non-overlapping additions (different regions)
- Comment-only changes
- Auto-generated files (lock files, build outputs)
- Identical changes on both sides

Present conflict map:

```
CONFLICT MAP
═══════════════════════════════════════
Total: 8 conflicts in 8 files

Group A — Auth token lifecycle (3 files)
  src/services/auth.ts
  src/middleware/verify.ts
  src/config/auth.ts
  LOCAL: token 48h + refresh logic
  REMOTE: token 1h + rotation logic

Group B — Payment discount rules (2 files)
  src/services/payment.ts
  src/utils/pricing.ts
  LOCAL: cap 30%, applied after tax
  REMOTE: cap 50%, applied before tax

Standalone — src/api/routes.ts
  LOCAL: added /v2/users endpoint
  REMOTE: removed /v1/users endpoint

Auto-resolved (2 files)
  src/utils/helpers.ts — both sides added imports
  package-lock.json — regenerated
═══════════════════════════════════════
```

Grouping rules:
- Same feature/concern → group together
- Shared logical dependency → group together
- Unrelated → Standalone
- Never force-group unrelated conflicts

Step 2 — ASK BUSINESS DECISIONS

No non-trivial conflicts remain → skip to verification.

Ask ONE decision per group. Standalone → ask individually.

```
═══════════════════════════════════════
DECISION #1/3 — Auth token lifecycle
Affects: 3 files
═══════════════════════════════════════

LOCAL approach:
  Token lives 48h, refresh when expired
  → Better UX, fewer logouts
  → Higher risk if token leaked

REMOTE approach:
  Token lives 1h, continuous rotation
  → Stronger security
  → More complex client-side handling

INCOMPATIBLE — must choose one direction.

1. Keep LOCAL
2. Keep REMOTE
3. Custom (describe your intent)

Recommendation: REMOTE (option 2)
  Branch is feature/security-hardening — rotation aligns.

Choose [1/2/3]:
═══════════════════════════════════════
```

Question rules:
- Explain WHAT and WHY, not raw diffs
- Surface trade-offs
- State compatible vs incompatible
- Ask in dependency order if groups depend on each other

Recommendation rules:
- Every decision gets a recommendation
- Based on branch purpose (name, recent commits, PR description)
- Equally valid → least runtime risk > most recent > simpler
- One sentence WHY, tied to branch context
- Clear it's a suggestion

Step 3 — ROUTE TO OPENSPEC

After collecting ALL decisions:

1. Decision summary for confirmation:

```
DECISION SUMMARY
═══════════════════════════════════════
Group A — Auth token lifecycle → REMOTE
Group B — Payment discount → LOCAL
Standalone — routes.ts → Custom: keep /v2, remove /v1
Auto-resolved: 2 files
═══════════════════════════════════════
Confirm? [yes/no]
```

2. After confirmation, output conflict resolution description for `/spx-ff`:
   - Change name: `resolve-{action}-conflicts-{YYYYMMDD}`
   - Each group with confirmed decision
   - Each conflicted file with LOCAL vs REMOTE analysis
   - Branch context — self-contained so spx-ff doesn't re-read files

3. Suggest next steps:

```
1. Create the plan → /spx-ff resolve-{action}-conflicts-{YYYYMMDD}
2. Already have a plan? → /spx-apply
3. After resolution → /spx-git {action} again to finalize
```

---

ABORT HANDLING

If user says "abort", "stop", "rollback", or "cancel":
1. Abort in-progress operation (`git merge --abort`, `git rebase --abort`)
2. Pop stash if created
3. Confirm working tree is back to pre-operation state
4. Report what happened

PRINCIPLES

- Never auto-resolve a conflict you're not confident about — when in doubt, non-trivial
- Trivial = mechanical, no business logic. Non-trivial = requires judgment
- Group related conflicts, one decision per group
- Trade-offs in human terms, not raw diffs
- User MUST confirm decisions before routing to spx-ff
- spx-ff description must be self-contained
- Do NOT auto-invoke `/spx-ff` or `/spx-apply` — suggest and let user decide
- Every decision (auto or confirmed) appears in final summary
- If stash was used, always remind at the end
- Force push requires double confirmation
- Commit messages follow conventional commits
- When in doubt about destructive operations, ask first

The following is the user's request: