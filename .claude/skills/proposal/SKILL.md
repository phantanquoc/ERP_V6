---
name: "proposal"
description: "Create spec (proposal, design, tasks) for implementation. Explores and clarifies when needed before creating artifacts."
---

You are now in spec creation mode. Your job is to create OpenSpec artifacts (proposal, design, tasks) from the current conversation context.

> **CLI NOTE**: Run all `openspec` and `bash` commands directly from the workspace root. Do NOT `cd` into any directory before running them. The `openspec` CLI is designed to work from the project root.

> **SETUP**: If `openspec` is not installed, run `npm i -g @fission-ai/openspec@latest`. If you need to run `openspec init`, always use `openspec init --tools none`.

**INPUT**: You have full conversation history. Use it directly — every requirement, constraint, preference, edge case, and decision the user mentioned is available to you. Do NOT summarize or paraphrase — reference the actual discussion.

**OUTPUT**: Create an OpenSpec change with all required artifacts (proposal, design, tasks).

---

## Phase 0: Context Check

Before creating, check what already exists:

```bash
openspec list --json
```

If active changes exist, decide whether to:
- Create a brand new change — proceed normally
- Update an existing change's artifacts — skip `openspec new change`, go directly to artifact creation

If updating an existing change: Use the existing change name. Update only the artifacts that need changes.

---

## Phase 1: Understand

Evaluate the conversation context to decide the next phase.

**If context is clear** (scope, decisions, approach defined):
- Proceed to Phase 2 (Create)

**If context is vague** (missing key decisions, multiple possible approaches):
- Do focused exploration (2-3 rounds max)
- Ask clarifying questions
- Investigate codebase if relevant
- When sufficient clarity emerges, proceed to Phase 2

**Bias toward action.** If you can make reasonable assumptions, go to Phase 2. Only explore when the ambiguity would lead to fundamentally wrong artifacts.

---

## Phase 2: Create

Once the request is clear:

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

---

## Artifact Creation Guidelines

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

---

## Guardrails

- Create ALL artifacts needed for implementation (as defined by schema's `apply.requires`)
- Always read dependency artifacts before creating a new one
- Prefer making reasonable decisions to keep momentum — only ask when critically unclear
- If a change with that name already exists, suggest continuing that change instead
- Verify each artifact file exists after writing before proceeding to next

---

## After Completion

Output ONLY this marker line with the change name:

```
✅ Spec created: <change-name>
```

Then **stop your own execution immediately** and return control to the caller in the same turn.

**Non-stop contract with the caller:**
- You are running inside a caller (autopilot, explore, or direct user invocation). The caller already has its next step scheduled and will continue in the SAME turn as soon as you finish.
- Do NOT write "Ready for implementation" as a closing line — the caller decides what "ready" means.
- Do NOT suggest next commands (`/osf apply`, etc.) — the caller will route.
- Do NOT write a closing summary, farewell, or "let me know if you want to continue" — these look like turn boundaries and cause the caller to stop.
- Do NOT launch osf-apply or any other subagent yourself.

The caller reads the `✅ Spec created: <change-name>` marker, extracts the change name, and proceeds immediately. Your job is done the moment that marker is printed.