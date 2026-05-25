---
name: spx-ff
description: Create a new change with all artifacts needed for implementation. Automatically explores and clarifies when the request is vague before creating artifacts.
---

You are using the spx-ff skill, which is described as follows:

Create a new change — explore if needed, then generate all artifacts for implementation.

> **CLI NOTE**: Run all `openspec` and `bash` commands directly from the workspace root. Do NOT `cd` into any directory before running them. The `openspec` CLI is designed to work from the project root.

> **SETUP**: If `openspec` is not installed, run `npm i -g @fission-ai/openspec@latest`. If you need to run `openspec init`, always use `openspec init --tools none`.

**⚠️ MODE BOUNDARY RESET:** When this command is invoked, **stop any prior activity** — whether you were implementing code (`/spx-apply`), exploring (`/spx-plan`), or anything else. You are now in **change creation mode**. No code writing. No continuing prior tasks. Fresh start.

**🚫 SUBAGENT BLACKLIST:** NEVER use the `explore` or `plan` subagents. These are generic subagents from other kits and are NOT part of this workflow. Only use subagents explicitly listed in this kit (e.g., `spx-uiux-designer`). Do your own exploration and planning directly.

**Input**: A description of what to build, optionally with a kebab-case name. Can range from vague ("login page") to specific ("add JWT auth with refresh tokens using Redis session store").

---

## Phase 0: Context Check

Before evaluating the user's request, check what already exists:

```bash
openspec list --json
```

**If active changes exist**, the user might want to:
- **Create a brand new change** — proceed normally to Phase 1
- **Update an existing change's artifacts** — e.g., "I forgot to add email validation to the auth change"

**How to tell the difference:**
- User's input clearly relates to an active change → ask: "You have an active change `<name>`. Want to update its artifacts, or create a separate change?"
- User's input is unrelated to any active change → proceed to Phase 1 (new change)
- User explicitly says "new" or provides a new name → proceed to Phase 1

**If updating an existing change**: Skip `openspec new change`, go directly to Phase 2 step 3 (get status) using the existing change name. Update only the artifacts that need changes.

---

## Phase 1: Understand

Evaluate the user's input to decide the next phase.

**If no input provided**, ask what they want to build (open-ended, no preset options). Do NOT proceed without a request.

**If input provided**, assess clarity:

| Signal | Means | Next Phase |
|--------|-------|------------|
| Clear scope, known tech, specific enough to write a proposal | **Ready** | → Phase 2 (Create) |
| Vague idea, missing key decisions, multiple possible approaches, unknown constraints | **Needs exploration** | → Explore (below) |

**Bias toward action.** If you can make reasonable assumptions, go to Phase 2. Only explore when the ambiguity would lead to fundamentally wrong artifacts.

---

## Explore (when needed)

**Goal**: Get enough clarity to create good artifacts. This is NOT open-ended brainstorming — it's focused exploration with a destination.

**Subagent rule**: If you use subagents during exploration (e.g., for codebase analysis, planning), instruct them to **report findings only — no file creation**.

**Subagent Briefing Protocol (mandatory before every spawn):**

Before launching ANY subagent, output a brief to the user in the user's language:

```
📋 **[subagent-name]**
- Why: [why this subagent is needed — 1 line]
- Expect: [what you expect to receive back]
- Handle output:
  - Scenario A → [specific action]
  - Scenario B → [specific action]
```

The template above is in English for prompt readability. When outputting the actual brief, use the same language the user has been using in conversation.

This gives the user full visibility into what's about to happen and why. Brief BEFORE spawning, not after.

**No background mode — ever.** NEVER use `run_in_background` for any subagent. All subagents must run in foreground (parallel foreground is OK) so their execution is visible and controllable by the user. Background execution is uncontrollable behavior.

**Stance**: Curious, visual, grounded. Ask questions that emerge naturally. Use ASCII diagrams when they help. Investigate the codebase for context.

**What you might do:**
- Ask 2-3 clarifying questions (not an interrogation)
- Sketch the problem space with ASCII diagrams
- Investigate the codebase to surface relevant patterns, integration points, or constraints
- Compare approaches briefly if there's a real fork in the road
- Look up API docs via `spx-doc-lookup` if the approach depends on a specific library's behavior or version

**Keep it focused.** You're exploring to CREATE, not exploring to explore. When you have enough to write a solid proposal, move on.

**When sufficient clarity emerges**, present a brief summary and ask for confirmation:

```
## Ready to create

**What**: [1-2 sentence summary of the change]
**Approach**: [key technical decisions]
**Scope**: [what's in, what's out]

Create this change? (yes / discuss more)
```

- User confirms → Phase 2
- User wants to discuss more → continue exploring
- If exploration reveals this is too vague or the user just wants to think → suggest `/spx-plan` for open-ended exploration

---

## Phase 2: Create

Once the request is clear (either from input or after exploration):

1. **Derive a kebab-case name** from the description (e.g., "add user authentication" → `add-user-auth`).

2. **Create the change directory**
   ```bash
   openspec new change "<name>"
   ```

3. **Get the artifact build order**
   ```bash
   openspec status --change "<name>" --json
   ```
   Parse: `applyRequires` (artifact IDs needed before implementation) and `artifacts` (list with status and dependencies).

4. **Create artifacts in dependency order**

   Use the **TodoWrite tool** to track progress.

   For each artifact that is `ready` (dependencies satisfied):
   - Get instructions: `openspec instructions <artifact-id> --change "<name>" --json`
   - The instructions JSON includes:
     - `context`: Project background (constraints for you — do NOT include in output)
     - `rules`: Artifact-specific rules (constraints for you — do NOT include in output)
     - `template`: The structure to use for your output file
     - `instruction`: Schema-specific guidance for this artifact type
     - `outputPath`: Where to write the artifact
     - `dependencies`: Completed artifacts to read for context
   - Read any completed dependency files for context
   - Create the artifact file using `template` as structure
   - Apply `context` and `rules` as constraints — do NOT copy them into the file
   - Show brief progress: "✓ Created <artifact-id>"

   Continue until all `applyRequires` artifacts have `status: "done"`. Re-check with `openspec status` after each artifact.

   If an artifact requires user input (unclear context), ask and continue.

5. **Show final status**
   ```bash
   openspec status --change "<name>"
   ```

**Output**: Change name/location, artifacts created, and: "Run `/spx-apply` to start implementation."

---

**Artifact Creation Guidelines**

- Follow the `instruction` field from `openspec instructions` for each artifact type
- Read dependency artifacts for context before creating new ones
- Use `template` as structure — fill in its sections
- **`context` and `rules` are constraints for YOU, not content for the file** — never copy them into output
- **Always write artifact files in English** — regardless of conversation language
- **Annotate verify points in tasks.md** — For the last task of each major group or any high-risk task, append a verify annotation: `← (verify: what to check)`. This tells the verifier WHERE to deep-check and WHAT to look for. Place annotations on tasks that are end-of-flow (everything before must work for this to work) or high-risk (complex logic, integration points, security). Example:
  ```
  1. Setup database
    1.1 Create users table
    1.2 Create sessions table
    1.3 Add migration script ← (verify: schema matches design.md, migrations run without errors)
  2. Auth endpoints
    2.1 POST /login
    2.2 POST /register
    2.3 POST /refresh-token ← (verify: all endpoints match spec scenarios, token refresh flow works end-to-end)
  ```

**Guardrails**
- Create ALL artifacts needed for implementation (as defined by schema's `apply.requires`)
- Always read dependency artifacts before creating a new one
- Prefer making reasonable decisions to keep momentum — only ask when critically unclear
- If a change with that name already exists, suggest continuing that change instead
- Verify each artifact file exists after writing before proceeding to next
- **Don't over-explore** — 2-3 rounds of questions max before creating. If still unclear, create with best understanding and note assumptions in the proposal

The following is the user's request: