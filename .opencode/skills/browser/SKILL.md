---
name: "browser"
description: "Reproduce bugs, explore apps, or run QA test flows via dev-browser. Use when the user wants to reproduce a bug in the browser, gather visual evidence, proactively find UI/UX issues, or run a specific user flow as a tester (e2e/test mode)."
---

You are using the browser command for E2E testing and bug reproduction.

See it, prove it, trace it. Browser is your eyes. Codebase is your brain.

**MODE: E2E DIAGNOSTIC** — You drive the browser like a real user. You see what users see. You capture evidence that code reading alone cannot provide. Then you trace root cause in the codebase.

**Input**: Either a bug report (reproduce mode), a request to explore the app (explore mode), or a specific user flow to test as QA (e2e/test mode).

---

## SETUP (MANDATORY — DO THIS FIRST)

Before ANY browser interaction, ensure dev-browser is installed. Run this via Bash:

```bash
which dev-browser || (npm install -g dev-browser && dev-browser install)
```

If the install fails, ask the user to run `npm install -g dev-browser && dev-browser install` manually.

After install, ask user for the app URL if not obvious from context.

**Arguments**: Check if user passed flags:
- `e2e` or `test` (first argument) → activate **Mode C: QA TEST** — report-only mode, no code modification. Remaining arguments = flow name + app URL. Example: `/osf browser e2e login http://localhost:3000`
- `--headless` → run in headless mode (no visible browser window)
- `--connect` → connect to user's already-running Chrome (useful for logged-in sessions)
- Default: headed mode so user can watch what you're doing

---

## The Stance

- **User-first** — Interact with the app exactly like a human would. Click buttons, type in fields, scroll, hover. Never inject JavaScript to simulate interactions.
- **Evidence-based** — Every finding must have a screenshot, console error, or network failure attached. No "I think it's broken."
- **Thorough** — Screenshot before AND after every critical action. Check console messages after every interaction. Don't skip steps.
- **Codebase-aware** — Use `codebase-retrieval` to map relevant source code BEFORE touching the browser. Know what you're looking at.
- **Honest** — If you can't reproduce a bug, say so. If the evidence contradicts the report, say so.

---

## dev-browser Guide

dev-browser is a sandboxed browser automation tool. You write JavaScript scripts and pipe them to the `dev-browser` CLI via Bash heredoc. Scripts run in a QuickJS WASM sandbox (not Node.js) with full Playwright Page API.

**CRITICAL**: Always use quoted heredoc `<<'SCRIPT'` to prevent shell variable expansion.

### CLI Usage

```bash
# Basic usage — pipe script via heredoc
dev-browser <<'SCRIPT'
const page = await browser.getPage("main");
await page.goto("https://example.com", { waitUntil: "domcontentloaded" });
console.log(await page.title());
SCRIPT

# Headless mode
dev-browser --headless <<'SCRIPT'
...
SCRIPT

# Connect to user's running Chrome (must have remote debugging enabled)
dev-browser --connect <<'SCRIPT'
...
SCRIPT
```

### Core API

```javascript
// Browser control — available as global `browser`
const page = await browser.getPage("main");  // Get or create named page (PERSISTS across scripts)
const page = await browser.newPage();         // Anonymous page (cleaned up after script)
const tabs = await browser.listPages();       // List open tabs: [{id, url, title, name}]
await browser.closePage("main");              // Close a named page
```

Named pages persist across script invocations. Use `browser.getPage("main")` to continue working with the same tab across multiple dev-browser calls. This is a key advantage — you don't lose state between scripts.

### Page API (Playwright-based)

**Navigation:**
```javascript
await page.goto("http://localhost:3000", { waitUntil: "domcontentloaded" });
await page.goBack();
await page.goForward();
await page.reload();
const url = page.url();
const title = await page.title();
```

**Snapshots (AI-friendly page reading):**
```javascript
// snapshotForAI() returns a text representation of the page optimized for AI understanding
// This is your PRIMARY way to "see" the page structure and find elements
const snapshot = await page.snapshotForAI();
console.log(snapshot.full);  // Full page snapshot
```

Use `snapshotForAI()` instead of screenshots when you need to understand page structure, find elements, or check element presence. It's faster and more informative than screenshots for element discovery.

**Locators (finding elements):**
```javascript
// By CSS selector
const btn = page.locator("button.submit");

// By text content
const link = page.locator("text=Sign In");

// By role (accessibility)
const button = page.getByRole("button", { name: "Submit" });
const input = page.getByRole("textbox", { name: "Email" });

// By placeholder, label, test id
const field = page.getByPlaceholder("Enter email");
const field2 = page.getByLabel("Password");
const el = page.getByTestId("login-form");
```

**Actions (user-like interactions):**
```javascript
await page.locator("button.submit").click();
await page.locator("#email").fill("user@example.com");           // Set value instantly
await page.locator("#email").pressSequentially("user@example.com"); // Type character by character (more human-like)
await page.locator("select#country").selectOption("US");
await page.keyboard.press("Enter");
await page.locator(".menu-item").hover();
await page.locator("#agree").check();
await page.locator("#agree").uncheck();
```

Prefer `pressSequentially()` over `fill()` when testing input validation or when the app has key-by-key handlers. Use `fill()` for speed when exact typing behavior doesn't matter.

**Waiting:**
```javascript
await page.locator("text=Welcome").waitFor();                    // Wait for element to appear
await page.waitForURL("**/dashboard");                           // Wait for navigation
await page.waitForLoadState("networkidle");                      // Wait for network to settle
await page.waitForTimeout(1000);                                 // Explicit wait (use sparingly)
```

**Screenshots:**
```javascript
const buf = await page.screenshot();                             // Full viewport
const path = await saveScreenshot(buf, "before-click");          // Save to ~/.dev-browser/tmp/
const buf2 = await page.screenshot({ fullPage: true });          // Full scrollable page
const buf3 = await page.locator(".modal").screenshot();          // Specific element
```

Screenshots are saved to `~/.dev-browser/tmp/`. Use `saveScreenshot()` to persist them with meaningful names.

**Evaluate (run JS in page context):**
```javascript
const result = await page.evaluate(() => {
  return document.querySelectorAll(".error").length;
});
console.log(result);
```

Use `page.evaluate()` for monitoring and measurement only — NOT for triggering interactions. Rule: interact like a user, measure like an engineer.

**File I/O (restricted to ~/.dev-browser/tmp/):**
```javascript
await writeFile("results.json", JSON.stringify(data));
const content = await readFile("results.json");
```

### Workflow Loop

Every dev-browser script should follow this pattern:

```
GET PAGE → NAVIGATE → SNAPSHOT → PLAN → EXECUTE → VERIFY
```

1. `browser.getPage("main")` — get or create the page
2. `page.goto(url)` — navigate if needed
3. `page.snapshotForAI()` — understand current state
4. Plan your next action based on the snapshot
5. Execute the action (click, fill, etc.)
6. Verify with snapshot or screenshot

### Practical Examples

**Navigate and read a page:**
```bash
dev-browser <<'SCRIPT'
const page = await browser.getPage("main");
await page.goto("http://localhost:3000", { waitUntil: "domcontentloaded" });
const snapshot = await page.snapshotForAI();
console.log(snapshot.full);
SCRIPT
```

**Click a button and capture evidence:**
```bash
dev-browser <<'SCRIPT'
const page = await browser.getPage("main");
// Screenshot before
const before = await page.screenshot();
await saveScreenshot(before, "before-submit");
// Click
await page.getByRole("button", { name: "Submit" }).click();
// Wait for response
await page.waitForLoadState("networkidle");
// Screenshot after
const after = await page.screenshot();
await saveScreenshot(after, "after-submit");
// Check for errors
const snapshot = await page.snapshotForAI();
console.log(snapshot.full);
SCRIPT
```

**Fill a form:**
```bash
dev-browser <<'SCRIPT'
const page = await browser.getPage("main");
await page.goto("http://localhost:3000/login", { waitUntil: "domcontentloaded" });
await page.getByLabel("Email").fill("test@example.com");
await page.getByLabel("Password").fill("password123");
await page.getByRole("button", { name: "Sign In" }).click();
await page.waitForURL("**/dashboard");
const snapshot = await page.snapshotForAI();
console.log(snapshot.full);
SCRIPT
```

**Multi-step with console error capture:**
```bash
dev-browser <<'SCRIPT'
const page = await browser.getPage("main");
// Capture console errors
const errors = [];
page.on("console", msg => { if (msg.type() === "error") errors.push(msg.text()); });
page.on("pageerror", err => errors.push(err.message));

await page.goto("http://localhost:3000/dashboard", { waitUntil: "domcontentloaded" });
await page.getByRole("link", { name: "Settings" }).click();
await page.waitForLoadState("networkidle");

// Report
const snapshot = await page.snapshotForAI();
console.log(snapshot.full);
console.log("CONSOLE ERRORS:", JSON.stringify(errors));
SCRIPT
```

### Interaction Rules

MANDATORY — these rules govern ALL browser interactions:

1. **User-like actions only** — Use Playwright locator actions (click, fill, hover, press) inside dev-browser scripts. Never use `page.evaluate()` to trigger clicks, form submissions, or navigation.

2. **Finding elements** — Use `page.snapshotForAI()` to understand page structure and find elements. Prefer role-based and text-based locators over CSS selectors. If an element isn't findable via accessible locators, note this as an accessibility finding.

3. **Monitoring & evidence = JS allowed** — `page.evaluate()` IS allowed for: reading computed styles, DOM state, element geometry, setting up observers, reading `window.performance`, capturing network details. Rule: interact like a user, measure like an engineer.

4. **Realistic pacing** — Add `waitForLoadState("networkidle")` or `waitForTimeout(500)` between rapid actions. Humans don't click at machine speed.

5. **Evidence at every step** — Screenshot before and after each critical action. Capture console errors. Note any unexpected visual state.

6. **Never close the browser** — Do NOT call `browser.closePage()` on the main page. The user may want to inspect it manually. If you need to close, ASK first.

7. **One script per logical action** — Keep scripts focused. One navigation + action + verification per script. This makes it easy to see what happened at each step.

---

## Network & WebSocket Monitoring

Inject monitoring scripts via `page.evaluate()` inside a dev-browser script BEFORE performing user interactions. These listeners capture what happens under the hood.

**HTTP Request/Response monitoring** — inject early, capture everything:

```bash
dev-browser <<'SCRIPT'
const page = await browser.getPage("main");
await page.evaluate(() => {
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
});
console.log("Network monitoring injected");
SCRIPT
```

Read captured logs in a later script:

```bash
dev-browser <<'SCRIPT'
const page = await browser.getPage("main");
const logs = await page.evaluate(() => window.__NET_LOG);
console.log(JSON.stringify(logs, null, 2));
SCRIPT
```

**WebSocket monitoring** — inject in the same setup script or separately:

```bash
dev-browser <<'SCRIPT'
const page = await browser.getPage("main");
await page.evaluate(() => {
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
});
console.log("WebSocket monitoring injected");
SCRIPT
```

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
1. Run the monitoring injection script FIRST (via dev-browser)
2. Run user action scripts (click, type, navigate) — monitoring captures in background
3. Run a log-reading script to retrieve captured data
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

Drive the browser through the exact steps from the bug report. For each step, run a dev-browser script:

```bash
dev-browser <<'SCRIPT'
const page = await browser.getPage("main");
// 1. Screenshot before
const before = await page.screenshot();
await saveScreenshot(before, "step-N-before");
// 2. Perform action
await page.getByRole("button", { name: "Submit" }).click();
await page.waitForLoadState("networkidle");
// 3. Screenshot after
const after = await page.screenshot();
await saveScreenshot(after, "step-N-after");
// 4. Check for errors + page state
const snapshot = await page.snapshotForAI();
console.log(snapshot.full);
SCRIPT
```

**If bug reproduces**: proceed to CAPTURE.
**If bug doesn't reproduce**: try variations — different input data, different timing, different viewport size (`page.setViewportSize({width: 375, height: 812})`). Report if still can't reproduce after 3 attempts.

### 4. CAPTURE

Gather all evidence at the point of failure:

```
EVIDENCE BLOCK
──────────────
Step: [which step failed]
Expected: [what should happen]
Actual: [what happened]
Screenshot: [saved to ~/.dev-browser/tmp/ — describe what's visible]
Console errors: [exact error messages, if any]
Network: [failed requests, unexpected responses, if observable]
DOM state: [use snapshotForAI() to check element presence/state]
Viewport: [dimensions if relevant to the bug]
```

For UI bugs, also capture:
- `page.snapshotForAI()` to check if element exists and is accessible
- `page.setViewportSize({width: 375, height: 812})` to test responsive behavior
- `page.locator(".suspect").hover()` to check hover states

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

Tell the user (in their language) that the root cause is clear and the fix is simple. Suggest running `/osf apply` to fix.

Provide the diagnosis as context for `/osf apply` to pick up.

**COMPLEX** (multi-file, breaking change, needs design decisions, architectural impact):

Tell the user (in their language) that the bug is complex and needs planning before fixing. Suggest running `/osf feat` to explore the approach first, then `/osf apply`.

Provide the diagnosis as starting context for `/osf feat`.

**UNCERTAIN** (can't determine root cause, need more investigation):

Tell the user (in their language) that the root cause hasn't been identified yet and more evidence is needed.

Stay in e2e mode, run more scenarios.

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

For each flow, drive the browser through the happy path AND edge cases.

**At every page/step, check:**
- [ ] Page loads without console errors (capture via `page.on("console")` and `page.on("pageerror")`)
- [ ] All visible elements are findable via accessible locators (`snapshotForAI()`)
- [ ] Interactive elements respond to click/hover
- [ ] Forms accept input and validate correctly
- [ ] Navigation works (links, buttons, back/forward)
- [ ] No visual glitches (screenshot and inspect)
- [ ] Responsive: `page.setViewportSize({width: 375, height: 812})`, check layout doesn't break

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
Screenshot: [saved to ~/.dev-browser/tmp/]
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
- Critical bugs → trace root cause (switch to REPRODUCE mode for each), then route to `/osf apply` or `/osf feat`
- Warnings → batch into a single `/osf apply` session or `/osf feat` if architectural
- Info → note for later, no immediate action needed

---

## Mode C: QA TEST

**Activated when**: first argument is `e2e` or `test`. Example: `/osf browser e2e login http://localhost:3000`

**Purpose**: You are a QA tester. Walk through a specific user flow, document everything you find, and deliver a structured test report. You do NOT modify code — report only.

**REPORT-ONLY RULE (MANDATORY)**: In QA TEST mode, you NEVER modify code, NEVER route to `/osf apply`, NEVER route to `/osf feat` or `/osf fix`. Your only output is a test report. If you catch yourself about to edit a file or suggest running `/osf apply`, STOP.

### 1. PARSE

Extract from user arguments:
- **Flow name**: what flow to test (e.g., "login", "checkout", "registration")
- **App URL**: where the app is running (e.g., `http://localhost:3000`)

If either is missing, ask ONE question to clarify.

### 2. MAP

Use `codebase-retrieval` to understand the flow before opening the browser:
- Which routes/pages are involved in this flow?
- What components render each step?
- What API endpoints does this flow call?
- What state management drives the flow?

Build a mental model of the expected flow. This helps you recognize when something is wrong and identify root causes when errors happen.

### 3. EXECUTE

Walk through the flow step by step, exactly like a real user would. For each step:

a) **Screenshot before** the action
b) **Perform the action** (click, type, navigate)
c) **Screenshot after** the action
d) **Capture console errors** via `page.on("console")` and `page.on("pageerror")`
e) **Check page state** via `snapshotForAI()`
f) **Log findings** as you go — don't wait until the end

While executing, observe and note:

**Bugs/errors:**
- Console errors or warnings
- Network failures (inject monitoring if the flow involves API calls)
- Broken UI elements (missing, overlapping, wrong state)
- Incorrect data displayed
- Actions that don't respond or produce wrong results

**UX issues:**
- Confusing labels or unclear instructions
- Missing loading states (user clicks and nothing visible happens)
- Missing error messages (form fails silently)
- Missing success feedback (action completes but no confirmation)
- Inconsistent styling or layout breaks
- Poor responsive behavior
- Accessibility gaps (elements not reachable via keyboard, missing ARIA labels)
- Slow responses without feedback (no spinner, no skeleton)

**Automation difficulties:**
- Elements without accessible roles, labels, or test IDs — hard to target in automation
- Dynamic selectors that change on each render
- Actions that require complex timing (race conditions, animations that must complete)
- Flows that depend on external state (email verification, CAPTCHA, third-party OAuth)
- Elements hidden behind hover/scroll that are hard to reliably reach

### 4. INVESTIGATE

For each bug or error found during execution, use `codebase-retrieval` to trace the likely root cause:
- Console error → find the source file and line from stack trace
- Network error → find the API handler and check the logic
- Missing element → find the component and check conditional rendering
- Wrong data → trace the data pipeline from API to render

For stuck points (flow can't proceed), investigate:
- Is the required element rendered? Check component code.
- Is there a prerequisite state not met? Check state management.
- Is the API returning unexpected data? Check handler logic.

Record what you found — file paths, line numbers, the code pattern that causes the issue.

### 5. REPORT

Output a structured QA test report. This report must be clear enough that a developer who was not watching can reproduce every issue and understand where to fix it.

```
## QA Test Report

**Flow**: [flow name from user request]
**App URL**: [url]
**Date**: [current date]
**Status**: PASS / FAIL / PARTIAL

---

### Test Steps

| # | Action | Expected Result | Actual Result | Status |
|---|--------|-----------------|---------------|--------|
| 1 | [what was done] | [what should happen] | [what actually happened] | PASS/FAIL |
| 2 | ... | ... | ... | ... |

---

### Bugs Found

#### BUG-1: [short title]
- **Step**: #N
- **Severity**: CRITICAL / HIGH / MEDIUM / LOW
- **What happened**: [describe the symptom clearly]
- **Expected**: [what should have happened]
- **How to reproduce**: [exact steps from the start of the flow]
- **Evidence**: screenshot at [path], console error: [exact message]
- **Root cause (from codebase)**: [file:line — what the code does wrong and why]

#### BUG-2: ...

---

### UX Issues

#### UX-1: [short title]
- **Step**: #N
- **Severity**: HIGH / MEDIUM / LOW
- **What happened**: [describe what the user experiences]
- **Why it's bad**: [impact on user — confusion, delay, frustration]
- **Suggestion**: [brief improvement idea]
- **Related code**: [file:line if applicable]

#### UX-2: ...

---

### Automation Notes

#### AUTO-1: [short title]
- **Step**: #N
- **Element/Action**: [what was hard to automate]
- **Why it's hard**: [missing test-id, dynamic selector, timing issue, etc.]
- **Suggestion**: [add data-testid, stabilize selector, etc.]

#### AUTO-2: ...

---

### Summary

- **Total steps**: [N]
- **Passed**: [N]
- **Failed**: [N]
- **Bugs**: [count by severity]
- **UX issues**: [count]
- **Automation blockers**: [count]

### Screenshots
[List all saved screenshots with their step references]
```

After the report, do NOT suggest fixing anything. Just tell the user (in their language) that the QA test report is complete and developers can use it to reproduce and fix the issues.

---

## VERIFY (Post-Fix)

After a fix is applied via `/osf apply`, re-run the reproduction steps to confirm:

1. Navigate to the same page (use `browser.getPage("main")` — page persists)
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

---

## Cleanup

After your session ends (diagnosis routed, exploration reported, or verification done), clean up dev-browser artifacts:

1. Find generated files in `~/.dev-browser/tmp/`:
   - Screenshots saved via `saveScreenshot()`
   - Data files saved via `writeFile()`

2. Delete them via Bash if no longer needed:
   ```bash
   rm -rf ~/.dev-browser/tmp/*
   ```

3. If unsure which files were generated during this session, list them and ask the user before deleting:
   ```bash
   ls -la ~/.dev-browser/tmp/
   ```

Exception: If the user explicitly asks to keep evidence files (e.g., for a bug report), skip cleanup and tell them where the files are.

---

## Guardrails

- **NEVER modify code in QA TEST mode** — Mode C is report-only. No edits, no `/osf apply`, no `/osf feat`, no `/osf fix`. Your output is a test report, period.
- **NEVER skip codebase mapping** — Always use `codebase-retrieval` before and during browser interaction. Browser evidence without code context is just symptoms.
- **NEVER inject JavaScript for interactions** — Use Playwright locator actions (click, fill, hover) inside dev-browser scripts. The whole point is to reproduce what users experience.
- **NEVER diagnose without evidence** — Every claim needs a screenshot, console message, or code reference.
- **Screenshot liberally** — When in doubt, take a screenshot. Evidence you don't need is better than evidence you don't have.
- **Check console after EVERY action** — Use `page.on("console")` and `page.on("pageerror")` to capture errors. Silent JavaScript errors are the most common hidden bugs.
- **One bug at a time in REPRODUCE mode** — Don't mix multiple bug investigations. Each gets its own reproduce → trace → report cycle.
- **Respect the routing** — Don't fix bugs yourself. Diagnose and route to `/osf apply` or `/osf feat`. Your job is evidence and diagnosis, not implementation.
- **No fog in diagnosis** — If your reasoning contains "probably", "likely", "should work" — you need more evidence. Go back to the browser or the codebase.
- **Always use quoted heredoc** — `<<'SCRIPT'` not `<<SCRIPT`. Prevents shell variable expansion from breaking your scripts.

---

## Mode Transition Hints

After diagnosis (Mode A/B only — Mode C does NOT route):
- Simple fix → `/osf apply` (pass diagnosis as context)
- Complex fix → `/osf feat` then `/osf apply`
- More bugs to investigate → stay in `/osf browser`
- Want to verify full implementation → `/osf verify`
- Want QA test report for a specific flow → `/osf browser e2e [flow] [url]`