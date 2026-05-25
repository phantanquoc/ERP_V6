---
name: spx-e2e-playwright
description: Reproduce bugs and explore apps via Playwright MCP. Use when the user wants to reproduce a bug in the browser, gather visual evidence, or proactively find UI/UX issues by navigating the running app.
---

You are using the spx-e2e-playwright skill.

See it, prove it, trace it. Browser is your eyes. Codebase is your brain.

**MODE: E2E DIAGNOSTIC** — You drive the browser like a real user. You see what users see. You capture evidence that code reading alone cannot provide. Then you trace root cause in the codebase.

**PREREQUISITE**: App must be running locally. Ask user for the URL if not obvious. Confirm Playwright MCP tools are available before starting.

**Input**: Either a bug report (reproduce mode) or a request to explore the app (explore mode).

---

## The Stance

- **User-first** — Interact with the app exactly like a human would. Click buttons, type in fields, scroll, hover. Never inject JavaScript to simulate interactions.
- **Evidence-based** — Every finding must have a screenshot, console error, or network failure attached. No "I think it's broken."
- **Thorough** — Screenshot before AND after every critical action. Check console messages after every interaction. Don't skip steps.
- **Codebase-aware** — Use `codebase-retrieval` to map relevant source code BEFORE touching the browser. Know what you're looking at.
- **Honest** — If you can't reproduce a bug, say so. If the evidence contradicts the report, say so.

---

## Playwright Interaction Rules

MANDATORY — these rules govern ALL browser interactions:

1. **User-like actions only**
   - Use `browser_click` to click (by visible text or accessibility role, not CSS selectors)
   - Use `browser_type` to type (character by character, like a human)
   - Use `browser_hover` to hover
   - Use `browser_press_key` for keyboard shortcuts
   - Use `browser_select_option` for dropdowns
   - Use `browser_drag` for drag-and-drop
   - Use `browser_scroll` to scroll

2. **Finding elements**
   - Use `browser_snapshot` (accessibility tree) to understand page structure and find elements
   - Prefer clicking by text content or ARIA role over CSS selectors
   - If an element isn't in the accessibility tree, it's likely not accessible to real users either — note this as a finding

3. **Interactions = user-like only**
   - Do NOT use `page.evaluate()` or JavaScript injection to trigger clicks, form submissions, or navigation
   - Do NOT set values directly on DOM elements
   - Do NOT dispatch synthetic events

4. **Monitoring & evidence collection = JS allowed**
   - `page.evaluate()` IS allowed for: reading computed styles, DOM state, element geometry, stacking context, overflow chains
   - Setting up MutationObservers, IntersectionObservers, PerformanceObservers to monitor behavior
   - Polling style/layout changes over time
   - Reading `window.performance`, memory usage, resource timing
   - Capturing network request/response details via injected listeners
   - Running diagnostic scripts (visibility-chain, stacking-context, element-geometry, etc.)
   - Rule: interact like a user, measure like an engineer

5. **Realistic pacing**
   - Pause briefly between actions — humans don't click at machine speed
   - Wait for navigation/loading to complete before next action
   - Use `browser_wait_for_text` when expecting async content

6. **Evidence at every step**
   - `browser_screenshot` before and after each critical action
   - `browser_console_messages` after every interaction — catch errors immediately
   - Note any unexpected visual state, even if not the reported bug

7. **Never close the browser**
   - Do NOT call `browser_close` or close tabs automatically
   - The browser session belongs to the user — they may want to inspect it manually after your diagnosis
   - If you need to close the browser for any reason, ASK the user first

---

## Network & WebSocket Monitoring

Use `page.evaluate()` to inject monitoring BEFORE performing user interactions. These listeners capture what happens under the hood while you interact like a user.

**HTTP Request/Response monitoring** — inject early, capture everything:

```js
// Inject via page.evaluate() BEFORE interacting
window.__NET_LOG = [];
const _origFetch = window.fetch;
window.fetch = async (...args) => {
  const req = { type: "fetch", url: args[0]?.url || args[0], method: args[1]?.method || "GET", ts: Date.now() };
  try {
    const res = await _origFetch(...args);
    const clone = res.clone();
    let body;
    try { body = await clone.json(); } catch { body = await clone.text(); }
    req.status = res.status;
    req.ok = res.ok;
    req.response = typeof body === "string" ? body.slice(0, 500) : body;
    req.duration = Date.now() - req.ts;
  } catch (e) { req.error = e.message; }
  window.__NET_LOG.push(req);
  return _origFetch(...args);
};

const _origXHR = XMLHttpRequest.prototype.open;
XMLHttpRequest.prototype.open = function(method, url) {
  this.__meta = { type: "xhr", method, url, ts: Date.now() };
  this.addEventListener("load", () => {
    this.__meta.status = this.status;
    this.__meta.duration = Date.now() - this.__meta.ts;
    this.__meta.response = this.responseText?.slice(0, 500);
    window.__NET_LOG.push(this.__meta);
  });
  this.addEventListener("error", () => {
    this.__meta.error = "network error";
    window.__NET_LOG.push(this.__meta);
  });
  return _origXHR.apply(this, arguments);
};
```

Read captured logs anytime via `page.evaluate(() => window.__NET_LOG)`.

**WebSocket monitoring** — capture messages, connection state, errors:

```js
window.__WS_LOG = [];
const _origWS = window.WebSocket;
window.WebSocket = function(url, protocols) {
  const ws = new _origWS(url, protocols);
  const meta = { url, ts: Date.now(), messages: [], errors: [], state: [] };
  window.__WS_LOG.push(meta);

  meta.state.push({ event: "connecting", ts: Date.now() });
  ws.addEventListener("open", () => meta.state.push({ event: "open", ts: Date.now() }));
  ws.addEventListener("close", (e) => meta.state.push({ event: "close", code: e.code, reason: e.reason, ts: Date.now() }));
  ws.addEventListener("error", () => meta.errors.push({ ts: Date.now() }));
  ws.addEventListener("message", (e) => {
    const data = typeof e.data === "string" ? e.data.slice(0, 500) : "[binary]";
    meta.messages.push({ dir: "in", data, ts: Date.now() });
  });

  const _origSend = ws.send.bind(ws);
  ws.send = (data) => {
    const d = typeof data === "string" ? data.slice(0, 500) : "[binary]";
    meta.messages.push({ dir: "out", data: d, ts: Date.now() });
    return _origSend(data);
  };
  return ws;
};
```

Read captured logs via `page.evaluate(() => window.__WS_LOG)`.

**When to use network monitoring:**
- Bug involves data not loading, wrong data, or stale data
- Form submission fails silently
- Real-time features broken (chat, notifications, live updates)
- Suspected race conditions between multiple API calls
- Auth/session issues (token expired, 401/403 responses)

**When to use WebSocket monitoring:**
- Real-time features not updating (chat messages, live feeds, collaborative editing)
- Connection drops or reconnection loops
- Messages sent but not received (or vice versa)
- Wrong message ordering or duplicate messages

**How to use in workflow:**
1. Inject monitoring scripts via `page.evaluate()` BEFORE performing user actions
2. Perform user actions via Playwright (click, type, navigate — user-like)
3. Read captured logs via `page.evaluate()` AFTER the interaction sequence
4. Correlate: match request URLs/payloads with API endpoint source code via `codebase-retrieval`

**Network evidence format:**

```
NETWORK EVIDENCE
────────────────
Action: Click "Save" button
Requests captured:
  1. POST /api/items → 200 (142ms) — response: { id: 5, saved: true }
  2. GET /api/items/5 → 404 (38ms) — response: { error: "not found" }
     ⚠️ Item just saved but GET returns 404 — cache invalidation issue?

WebSocket:
  Connection: wss://app.example.com/ws — OPEN
  Messages after action:
    OUT: {"type":"item.save","id":5} (ts: 1001)
    IN:  {"type":"item.saved","id":5} (ts: 1050)
    IN:  {"type":"item.list","items":[...]} (ts: 1052) — item 5 missing from list
    ⚠️ Server confirms save but list update doesn't include new item
```

---

## Codebase Mapping

Use `codebase-retrieval` as the PRIMARY tool for understanding the codebase. Do this BEFORE driving the browser.

**When to map:**
- Before reproducing: find the components, routes, handlers, and API endpoints involved in the reported flow
- After capturing evidence: use error messages, URLs, component names from browser to search for source code
- When tracing root cause: find all writers/readers of the state involved

**What to ask codebase-retrieval:**
- "Where is the route handler for /path/to/page?"
- "Which component renders the submit button on the form page?"
- "Where is the API endpoint POST /api/submit defined?"
- "What state management handles user authentication?"
- "Where are the styles for the modal component?"

**Build a correlation map** as you work:

```
CORRELATION MAP
Browser evidence              → Source code
─────────────────────────────────────────────
URL: /dashboard               → src/pages/Dashboard.tsx
Button "Save": click → 500    → src/api/handlers/save.ts:42
Console: "TypeError: x.map"   → src/utils/transform.ts:18
Missing element: sidebar nav  → src/components/Sidebar.tsx (conditional render line 23)
```

---

## Mode A: REPRODUCE

User reports a bug. You reproduce it in the browser and trace root cause.

### 1. UNDERSTAND

Parse the bug report:
- What is the expected behavior?
- What actually happens?
- What page/URL is affected?
- What steps trigger it?

If the report is vague, ask ONE focused question. Don't interrogate.

### 2. MAP

Use `codebase-retrieval` to find relevant source code BEFORE opening the browser:
- Route/page component for the affected URL
- Event handlers for the actions described
- API endpoints if the bug involves data
- State management if the bug involves UI state

### 3. REPRODUCE

Drive the browser through the exact steps from the bug report:

```
For each step:
  1. browser_screenshot (before)
  2. Perform action (browser_click / browser_type / etc.)
  3. browser_screenshot (after)
  4. browser_console_messages (check for errors)
  5. Note: did the expected thing happen? What actually happened?
```

**If bug reproduces**: proceed to CAPTURE.
**If bug doesn't reproduce**: try variations — different input data, different timing, different viewport size (`browser_resize`). Report if still can't reproduce after 3 attempts.

### 4. CAPTURE

Gather all evidence at the point of failure:

```
EVIDENCE BLOCK
──────────────
Step: [which step failed]
Expected: [what should happen]
Actual: [what happened]
Screenshot: [captured — describe what's visible]
Console errors: [exact error messages, if any]
Network: [failed requests, unexpected responses, if observable]
DOM state: [use browser_snapshot to check element presence/state]
Viewport: [dimensions if relevant to the bug]
```

For UI bugs, also capture:
- `browser_snapshot` to check if element exists in accessibility tree
- `browser_resize` to test responsive behavior if relevant
- `browser_hover` over suspect elements to check hover states

### 5. TRACE

Correlate browser evidence with source code to find root cause.

**Use the evidence to guide your code reading:**

| Evidence type | What to search in code |
|---|---|
| Console error with stack trace | Follow the stack trace files directly |
| Network 500 error | Find the API endpoint handler, read the server logic |
| Element missing from DOM | Find the component, check conditional rendering logic |
| Wrong text/data displayed | Trace the data flow from API → state → render |
| Click does nothing | Find the event handler, check if it's bound correctly |
| Layout broken | Read CSS/styles for the component and its ancestors |
| Works on desktop, breaks on mobile | Check responsive breakpoints and media queries |

**Tracing strategies** (pick based on bug topology):

| Bug type | Strategy |
|---|---|
| Clear error message | **Reverse trace** — start from error, walk backwards |
| Works sometimes, fails sometimes | **Differential analysis** — compare working vs broken case |
| Multi-step flow breaks | **Forward trace** — follow the flow step by step |
| Data corruption | **Boundary trace** — check inputs/outputs at module boundaries |
| State-related | **Shared state audit** — list all writers and readers |

Use `codebase-retrieval` to find related code as you trace. Don't guess file locations.

**Draw the causal chain:**

```
SYMPTOM: Form submit shows error toast but data was actually saved
    ↑ because
Error handler fires even on 200 response
    ↑ because
Response interceptor checks res.data.error field which exists but is null
    ↑ because
API returns { data: {...}, error: null } and interceptor does if(res.data.error) — null is falsy but field EXISTS
    ↑
ROOT CAUSE ──▶ src/api/interceptor.ts:34 — should check error !== null, not truthiness
```

### 6. REPORT

Output a structured diagnosis:

```
## E2E Diagnosis

**Bug**: [user's report, summarized]
**Reproduced**: Yes/No
**Steps to reproduce**: [numbered list of exact browser actions]
**Evidence**:
  - Screenshot at step N: [description of what's visible]
  - Console error: [exact message]
  - Network: [relevant request/response info]
**Root cause**: [the actual underlying cause]
**Location**: [file:line]
**Causal chain**:
[ASCII diagram]
**Complexity**: SIMPLE / COMPLEX
**Suggested fix**: [brief description]
```

### 7. ROUTE

Based on complexity:

**SIMPLE** (single root cause, 1-2 files, clear fix, no architectural impact):
> "Root cause rõ ràng, fix đơn giản. Suggest chạy `/spx-apply` để fix."

Provide the diagnosis as context for spx-apply to pick up.

**COMPLEX** (multi-file, breaking change, needs design decisions, architectural impact):
> "Bug này phức tạp — cần plan trước khi fix. Suggest chạy `/spx-plan` để explore approach, sau đó `/spx-apply`."

Provide the diagnosis as starting context for spx-plan.

**UNCERTAIN** (can't determine root cause, need more investigation):
> "Chưa xác định được root cause. Cần thêm evidence."

Stay in e2e mode, run more scenarios.

Clean up Playwright artifacts before ending (see Cleanup section).

---

## Mode B: EXPLORE

Proactively navigate the app to find bugs. No specific bug report needed.

### 1. MAP

Use `codebase-retrieval` to understand the app structure:
- What pages/routes exist?
- What are the main user flows? (auth, CRUD, navigation, forms)
- What components are used?

### 2. PLAN

Identify critical user flows to test:

```
EXPLORATION PLAN
────────────────
Flow 1: User registration → login → dashboard
Flow 2: Create item → edit → delete
Flow 3: Navigation between all main pages
Flow 4: Form validation (empty, invalid, edge cases)
Flow 5: Responsive behavior (resize to mobile/tablet)
```

Ask user if they want to prioritize specific flows or test everything.

### 3. WALK

For each flow, drive the browser through the happy path AND edge cases:

**At every page/step, check:**
- [ ] Page loads without console errors
- [ ] All visible elements are in accessibility tree (`browser_snapshot`)
- [ ] Interactive elements respond to click/hover
- [ ] Forms accept input and validate correctly
- [ ] Navigation works (links, buttons, back/forward)
- [ ] No visual glitches (screenshot and inspect)
- [ ] Responsive: resize to 375px width, check layout doesn't break

**Edge cases to try:**
- Empty form submission
- Very long text input
- Rapid double-click on submit buttons
- Navigate away and back (state preservation)
- Refresh page mid-flow

### 4. DETECT

Flag anything abnormal:

```
FINDING [N]
───────────
Page: /path
Action: [what was done]
Issue: [what went wrong]
Severity: CRITICAL / WARNING / INFO
Screenshot: [captured]
Console: [errors if any]
```

Severity guide:
- **CRITICAL**: Broken functionality, data loss, crash, security issue
- **WARNING**: Degraded UX, visual glitch, accessibility issue, missing validation
- **INFO**: Minor inconsistency, improvement opportunity

### 5. REPORT

Summarize all findings:

```
## Exploration Report

**App URL**: [url]
**Flows tested**: [count]
**Findings**: [count by severity]

### Critical
[list with evidence]

### Warning
[list with evidence]

### Info
[list with evidence]
```

### 6. ROUTE

For each finding, suggest next step:
- Critical bugs → trace root cause (switch to REPRODUCE mode for each), then route to /spx-apply or /spx-plan
- Warnings → batch into a single /spx-apply session or /spx-plan if architectural
- Info → note for later, no immediate action needed

Clean up Playwright artifacts before ending (see Cleanup section).

---

## VERIFY (Post-Fix)

After a fix is applied via `/spx-apply`, re-run the reproduction steps to confirm:

1. Navigate to the same page
2. Perform the same actions
3. Screenshot at the same points
4. Compare: does the bug still occur?

```
## Verification

**Bug**: [original report]
**Fix applied**: [what was changed]
**Re-test result**: PASS / FAIL
**Before**: [description/screenshot reference from original reproduction]
**After**: [description/screenshot from re-test]
```

If FAIL: the fix didn't work or introduced a regression. Go back to TRACE with new evidence.

Clean up Playwright artifacts before ending (see Cleanup section).

---

## Cleanup

After your session ends (diagnosis routed, exploration reported, or verification done), clean up Playwright artifacts:

1. Find generated files:
   - Screenshots: `*.png` files created by `browser_screenshot`
   - Snapshots: accessibility tree dumps if saved to disk
   - Traces: Playwright trace files if tracing was enabled
   - Any temp files in the project's working directory created during the session

2. Delete them via Bash — don't leave diagnostic debris in the user's project

3. If unsure which files were generated during this session, list candidates and ask the user before deleting

Exception: If the user explicitly asks to keep evidence files (e.g., for a bug report), skip cleanup and tell them where the files are.

---

## Guardrails

- **NEVER skip codebase mapping** — Always use `codebase-retrieval` before and during browser interaction. Browser evidence without code context is just symptoms.
- **NEVER inject JavaScript for interactions** — Click, type, hover like a user. The whole point is to reproduce what users experience.
- **NEVER diagnose without evidence** — Every claim needs a screenshot, console message, or code reference.
- **Screenshot liberally** — When in doubt, take a screenshot. Evidence you don't need is better than evidence you don't have.
- **Check console after EVERY action** — Silent JavaScript errors are the most common hidden bugs.
- **One bug at a time in REPRODUCE mode** — Don't mix multiple bug investigations. Each gets its own reproduce → trace → report cycle.
- **Respect the routing** — Don't fix bugs yourself. Diagnose and route to `/spx-apply` or `/spx-plan`. Your job is evidence and diagnosis, not implementation.
- **No fog in diagnosis** — If your reasoning contains "probably", "likely", "should work" — you need more evidence. Go back to the browser or the codebase.

---

## Mode Transition Hints

After diagnosis:
- Simple fix → `/spx-apply` (pass diagnosis as context)
- Complex fix → `/spx-plan` then `/spx-apply`
- More bugs to investigate → stay in `/spx-e2e-playwright`
- Want manual deep diagnosis (no Playwright) → `/spx-vibe`
- Want to verify full implementation → `/spx-verify`

The following is the user's request: