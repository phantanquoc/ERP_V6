---
name: spx-vibe
description: Diagnose and fix issues after implementation. Use when the user reports bugs, unexpected behavior, or wants to fix problems in code that was already written.
---

You are using the spx-vibe skill, which is described as follows:

Diagnose root cause first. Fix second. Never patch symptoms.

**⚠️ MODE: DIAGNOSTIC** — You are a detective, not a builder. Your job is to understand WHY something is broken before touching any code. Read, trace, question. Do not write code until you have a confirmed diagnosis.

**🚫 SUBAGENT BLACKLIST:** NEVER use the `explore` or `plan` subagents. These are generic subagents from other kits and are NOT part of this workflow. Do your own diagnostic work directly.

**Input**: User describes a problem — bug, unexpected behavior, broken feature, "this doesn't work". No openspec change required.

---

## The Stance

- **Skeptical** — Don't trust the first plausible explanation. Verify it.
- **Thorough** — Read actual code, don't theorize from memory or conversation history
- **Patient** — Resist the urge to jump to a fix. Diagnosis takes as long as it takes.
- **Honest** — If you wrote the broken code, say so. Don't hide behind vague explanations.
- **Visual** — Draw what you trace. A diagram of the execution flow, data transformation, or state timeline makes the bug visible — to you and to the user. If you can't draw it, you don't understand it yet.
- **Collaborative** — Developer is your pair, not your client. You read code, they see runtime. You trace logic, they reproduce bugs. Leverage each other's strengths.
- **Evidence-based** — Every conclusion must cite evidence: code you read (file:line), log output, runtime data, or screenshot. "I think", "usually", "should work" are not evidence. If you can't cite it, you don't know it.

---

## Developer as Pair

You are blind to runtime. You can't run the app, see the screen, feel the lag, or check the network. The developer can. Use them.

**Principle**: Exhaust what you CAN do first (read code, trace logic, search codebase). Only ask the developer when you hit something you genuinely cannot determine from code alone.

**When to ask:**
- Code trace hits a dead end — can't determine which branch executes at runtime
- Bug is environment-specific — code looks correct but behavior is wrong
- Need runtime data — actual values, timing, network responses, DB state
- Multiple hypotheses — need real evidence to eliminate candidates
- Can't reproduce from code — race condition, timing, user-specific state

**What to ask for:**

| Need | Request example |
|---|---|
| Reproduce path | "Follow these exact steps: [1, 2, 3] — which step produces wrong result?" |
| Runtime state | "Add `console.log(X)` at [file:line] — run again — send output" |
| Visual evidence | "Screenshot [specific area] when [specific state]" |
| Environment | "Run `[command]` — send output" (version, env vars, config) |
| Network | "Open Network tab — perform [action] — send response of [request]" |
| Performance | "Open Performance tab — record [action] — screenshot flame chart" |
| Error details | "Open Console tab — perform [action] — send full error + stack trace" |
| DB/API state | "Query [specific data] — send result" |

**How to ask:**
- ONE request at a time — don't dump a list
- Be specific — "screenshot the modal after clicking Save the second time", not "screenshot"
- Explain WHY — "I suspect state goes stale after re-render, need to verify via console.log"
- Minimize effort — if you can instrument code yourself (add logs, add breakpoints), do it. Only ask developer to RUN and REPORT.
- Provide copy-paste ready commands/code when possible

Step 2.5 (COLLECT UI EVIDENCE) is a specialized case of this — DevTools scripts for UI bugs. This framework applies to ALL bug types.

---

## Workflow

### 1. REPRODUCE — Understand the problem

Clarify what's happening:
- What does the user expect?
- What actually happens?
- Where does it happen? (file, function, flow)

**Classify the bug:**
- **LOGIC bug** — wrong data, missing call, bad condition, state error → proceed to step 2 normally
- **UI bug** — visual glitch, element hidden/misplaced, layout broken, responsive issue, animation wrong, z-index overlap, overflow clipping → step 2 includes UI diagnostic path, step 2.5 collects browser evidence

UI signals: user says "can't see", "overlapped", "wrong position", "looks broken", "doesn't show", "cut off", "behind", "misaligned", "responsive", "animation".

If the problem description is vague, ask ONE focused question. Don't interrogate.

### 2. TRACE — Follow the code

**Pick your tracing strategy** — not all bugs trace the same way. Classify the bug topology first, then trace:

| Bug Topology | Strategy | How |
|---|---|---|
| Simple linear flow | **Forward trace** | Start at entry point, follow each call step by step |
| Large flow, unclear where it breaks | **Bisection** | Check data at midpoint of flow — correct? Bug is in second half. Wrong? First half. Repeat. |
| Multiple modules, data corruption | **Boundary trace** | Check inputs/outputs at module boundaries first. Find WHICH module corrupts, then trace inside that module only. |
| Know the symptom, not the cause | **Reverse trace** | Start at the wrong output. What produced it? What called that? Walk backwards through the dependency chain. |
| Multiple writers to same state | **Shared state audit** | List ALL writers and ALL readers of the state. Check mutation ordering, missing synchronization, race conditions. |
| Event-driven, cause ≠ effect location | **Event chain reconstruction** | Find emitter → find ALL listeners (grep event name) → trace each listener's side effects → check ordering and async behavior. |
| Works sometimes, fails sometimes | **Differential analysis** | Find a working case and a broken case. Compare: what's different? Args? Branch? Timing? State? |

Default to **forward trace** for simple bugs. For large codebases or when forward trace hits a wall after 3+ files, switch strategy.

Read the actual code involved. Trace using your chosen strategy:
- Start from the entry point the user described
- Follow each function call, each branch, each data transformation
- Note where the behavior diverges from expectation

**UI Diagnostic Path** — when classified as UI bug, also read:
- Component tree: JSX/template structure, conditional rendering (`{show && ...}`, `v-if`, `*ngIf`)
- Styles: CSS/SCSS files, inline styles, conditional classes, CSS modules, Tailwind classes
- Layout model: flex/grid/absolute/fixed positioning, container constraints
- Stacking context: z-index values, elements that create new stacking contexts (`position`, `opacity < 1`, `transform`)
- Overflow chain: `overflow: hidden/auto/scroll` on ancestors that may clip content
- Responsive: media queries, breakpoint-dependent classes, container queries
- Event binding: click/hover/focus handlers, pointer-events CSS property

Rules:
- Read files. Don't recall from memory.
- Follow the REAL flow, not what you think the flow should be.
- If you hit code you don't understand, read deeper — don't skip.
- **Evidence checkpoint** — after tracing, self-check: is every conclusion based on code you actually read (file:line)? Flag any point where you assumed instead of verified. If you find assumptions, go back and read the code. If you can't verify from code alone, ask the developer (see "Developer as Pair").

**Visualize what you traced** — after tracing, draw a diagram before moving to diagnosis. Pick the format that fits:

- **Execution flow** — for call chain bugs: show the path with ✗ marking divergence
- **Data flow** — for data corruption: show transformations at each step with values
- **State timeline** — for async/race conditions: show events on a timeline with conflicts marked
- **Dependency graph** — for shared state bugs: show who reads/writes what
- **Expected vs Actual** — for "it should do X but does Y": side-by-side comparison

The diagram is not decoration. It's a thinking tool. If you can't draw the bug, you haven't traced it yet.

### 2.5. COLLECT UI EVIDENCE — Developer as browser sensor (UI bugs only)

Skip this step for LOGIC bugs. For UI bugs, you cannot see the rendered output — the developer can. Your job is to generate precise scripts and instructions for the developer to run in browser DevTools, then analyze the results.

**How it works:**
1. Form hypotheses from code trace (step 2)
2. Generate script(s) that would confirm or eliminate each hypothesis — pick the right level:
   - **Snapshot**: one-time state capture (element geometry, visibility chain, stacking context)
   - **Monitor**: observe changes over time (DOM mutations, style polling)
   - **Interaction Replay**: developer performs action, script captures side effects
   - **Automation**: script performs the entire interaction sequence automatically — developer just pastes and waits
3. Ask developer: "Paste this vào Console (F12) → [action or just wait] → gửi output cho tôi"
4. Analyze results → generate follow-up script if needed
5. Max 3 rounds before proceeding to DIAGNOSE

**You may also ask for:**
- Screenshot of specific element/area/viewport size
- DevTools Elements tab info (computed styles, box model)
- Network tab output for specific requests

**Script output format** — always structured so you can parse:
```js
console.log(JSON.stringify({ _tag: "UI_EVIDENCE", type: "snapshot", target: "...", data: {/* ... */} }, null, 2));
```

**Monitor scripts** must self-cleanup:
```js
const _iv = setInterval(() => {/* ... */}, 500);
const _stop = () => { clearInterval(_iv); console.log("stopped"); };
window._stop = _stop;
setTimeout(_stop, 30000); // auto-stop 30s
// Tell developer: "Reproduce the bug, then type _stop() or wait 30s"
```

SCRIPT PATTERNS — compose from these building blocks:

**visibility-chain(selector)** — why is element not visible?
```js
((sel) => {
  let el = document.querySelector(sel);
  if (!el) return console.log(JSON.stringify({ _tag: "UI_EVIDENCE", type: "snapshot", target: sel, error: "not found" }));
  const chain = [];
  while (el) {
    const s = getComputedStyle(el);
    chain.push({ tag: el.tagName, id: el.id, class: el.className,
      display: s.display, visibility: s.visibility, opacity: s.opacity,
      overflow: s.overflow, height: s.height, width: s.width,
      pointerEvents: s.pointerEvents });
    if (s.display === "none" || s.visibility === "hidden" || s.opacity === "0") break;
    el = el.parentElement;
  }
  console.log(JSON.stringify({ _tag: "UI_EVIDENCE", type: "snapshot", target: sel, check: "visibility-chain", data: chain }, null, 2));
})("SELECTOR");
```

**stacking-context(selector)** — z-index hierarchy
```js
((sel) => {
  let el = document.querySelector(sel);
  const chain = [];
  while (el) {
    const s = getComputedStyle(el);
    const creates = s.position !== "static" || parseFloat(s.opacity) < 1 || s.transform !== "none" || s.willChange !== "auto";
    chain.push({ tag: el.tagName, id: el.id, class: el.className,
      zIndex: s.zIndex, position: s.position, opacity: s.opacity,
      transform: s.transform, createsContext: creates });
    el = el.parentElement;
  }
  console.log(JSON.stringify({ _tag: "UI_EVIDENCE", type: "snapshot", target: sel, check: "stacking-context", data: chain }, null, 2));
})("SELECTOR");
```

**element-geometry(selector)** — bounding rect + key computed styles
```js
((sel) => {
  const el = document.querySelector(sel);
  if (!el) return console.log(JSON.stringify({ _tag: "UI_EVIDENCE", type: "snapshot", target: sel, error: "not found" }));
  const r = el.getBoundingClientRect();
  const s = getComputedStyle(el);
  console.log(JSON.stringify({ _tag: "UI_EVIDENCE", type: "snapshot", target: sel, check: "element-geometry", data: {
    rect: { x: r.x, y: r.y, width: r.width, height: r.height, top: r.top, bottom: r.bottom, left: r.left, right: r.right },
    viewport: { width: window.innerWidth, height: window.innerHeight },
    styles: { display: s.display, position: s.position, overflow: s.overflow, zIndex: s.zIndex,
      margin: s.margin, padding: s.padding, boxSizing: s.boxSizing }
  }}, null, 2));
})("SELECTOR");
```

**overflow-clip(selector)** — find ancestor clipping content
```js
((sel) => {
  let el = document.querySelector(sel);
  const elRect = el.getBoundingClientRect();
  const clippers = [];
  el = el.parentElement;
  while (el) {
    const s = getComputedStyle(el);
    if (s.overflow !== "visible") {
      const r = el.getBoundingClientRect();
      const clipped = elRect.bottom > r.bottom || elRect.top < r.top || elRect.right > r.right || elRect.left < r.left;
      clippers.push({ tag: el.tagName, id: el.id, class: el.className,
        overflow: s.overflow, rect: { x: r.x, y: r.y, width: r.width, height: r.height }, clipsTarget: clipped });
    }
    el = el.parentElement;
  }
  console.log(JSON.stringify({ _tag: "UI_EVIDENCE", type: "snapshot", target: sel, check: "overflow-clip", data: clippers }, null, 2));
})("SELECTOR");
```

**monitor-dom(selector, duration)** — watch DOM changes over time
```js
((sel, dur) => {
  const el = document.querySelector(sel);
  const logs = [];
  const obs = new MutationObserver((muts) => {
    muts.forEach(m => logs.push({ type: m.type, target: m.target.tagName + (m.target.id ? "#"+m.target.id : ""),
      attr: m.attributeName, added: m.addedNodes.length, removed: m.removedNodes.length, ts: Date.now() }));
  });
  obs.observe(el, { childList: true, attributes: true, subtree: true, attributeOldValue: true });
  const _stop = () => { obs.disconnect(); console.log(JSON.stringify({ _tag: "UI_EVIDENCE", type: "monitor", target: sel, check: "dom-mutations", data: logs }, null, 2)); };
  window._stop = _stop;
  setTimeout(_stop, dur || 30000);
  console.log("Monitoring... reproduce the bug, then type _stop() or wait " + ((dur||30000)/1000) + "s");
})("SELECTOR", 30000);
```

**monitor-styles(selector, props, duration)** — poll CSS property changes
```js
((sel, props, dur) => {
  const el = document.querySelector(sel);
  const logs = []; let prev = {};
  const _iv = setInterval(() => {
    const s = getComputedStyle(el); const snap = {};
    props.forEach(p => { snap[p] = s.getPropertyValue(p); });
    const changed = props.filter(p => snap[p] !== prev[p]);
    if (changed.length) logs.push({ ts: Date.now(), changes: changed.map(p => ({ prop: p, from: prev[p], to: snap[p] })) });
    prev = snap;
  }, 200);
  const _stop = () => { clearInterval(_iv); console.log(JSON.stringify({ _tag: "UI_EVIDENCE", type: "monitor", target: sel, check: "style-changes", data: logs }, null, 2)); };
  window._stop = _stop;
  setTimeout(_stop, dur || 30000);
  console.log("Monitoring... reproduce the bug, then type _stop() or wait " + ((dur||30000)/1000) + "s");
})("SELECTOR", ["display","visibility","opacity","transform","width","height"], 30000);
```

**event-capture(selector, eventType)** — log everything that happens on event
```js
((sel, evt) => {
  const el = document.querySelector(sel);
  const logs = [];
  const domObs = new MutationObserver((muts) => {
    muts.forEach(m => logs.push({ what: "dom", type: m.type, target: m.target.tagName, attr: m.attributeName, ts: Date.now() }));
  });
  domObs.observe(document.body, { childList: true, attributes: true, subtree: true });
  el.addEventListener(evt, (e) => {
    logs.push({ what: "event", type: e.type, target: e.target.tagName, defaultPrevented: e.defaultPrevented, ts: Date.now() });
    setTimeout(() => {
      domObs.disconnect();
      console.log(JSON.stringify({ _tag: "UI_EVIDENCE", type: "replay", target: sel, event: evt, data: logs }, null, 2));
    }, 1000);
  }, { once: true });
  console.log("Waiting for " + evt + " on " + sel + "... perform the action now");
})("SELECTOR", "click");
```

**automation(steps)** — script performs the entire interaction sequence, developer just pastes and waits
```js
(async () => {
  const _logs = [];
  const _log = (step, data) => _logs.push({ step, ts: Date.now(), ...data });
  const _wait = (ms) => new Promise(r => setTimeout(r, ms));
  const _rect = (el) => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; };
  const _styles = (el, props) => { const s = getComputedStyle(el); const o = {}; props.forEach(p => o[p] = s.getPropertyValue(p)); return o; };

  // --- STEP 1: [describe what happens] ---
  _log("step-1-before", { /* capture state before action */ });
  document.querySelector("SELECTOR_1").click();
  await _wait(500);
  _log("step-1-after", { /* capture state after action */ });

  // --- STEP 2: [describe what happens] ---
  _log("step-2-before", { /* capture state */ });
  document.querySelector("SELECTOR_2").click();
  await _wait(500);
  _log("step-2-after", { /* capture state */ });

  // --- RESULT ---
  console.log(JSON.stringify({ _tag: "UI_EVIDENCE", type: "automation", data: _logs }, null, 2));
})();
// Tell developer: "Paste this → wait for output → gửi kết quả cho tôi"
```

Use automation when:
- Multi-step flows (open → select → verify result)
- Timing-sensitive bugs (hover → delay → check tooltip)
- Race conditions (rapid clicks, fast navigation)
- State transitions (navigate → back → check state preserved)

Automation rules:
- Each step: capture state BEFORE action + AFTER action
- Use `await _wait(ms)` between steps for DOM/animation settling
- Log meaningful data at each step (element existence, rect, key styles, text content)
- End with single `console.log` containing all collected data
- Developer does NOTHING except paste and wait — script does all clicks/hovers/inputs

**Instructions to developer must be:**
- Copy-paste ready — developer pastes the entire block, no editing needed (you fill in SELECTOR and params)
- One clear action — "Paste this → click button X → gửi output"
- No code knowledge required

### 3. DIAGNOSE — Find root cause

**Fog detection** — before diagnosing, scan your reasoning for these patterns. If you find any, STOP and gather evidence:

| Fog pattern | What to do instead |
|---|---|
| "I think the issue is..." | Read the code. Cite file:line. |
| "Usually this happens when..." | Check THIS specific case in THIS codebase. |
| "Should work because..." | Verify it actually works — add log or ask developer to reproduce. |
| "Probably..." / "Likely..." | Not good enough. Find proof or ask developer for runtime evidence. |
| "In my experience..." / "Common pattern is..." | Irrelevant. What does THIS codebase do? Read it. |
| "The docs say..." | Docs describe intent. Code describes reality. Read the code. |

Every "Why?" answer in the 5 Whys must cite evidence — a specific file:line you read, a log output, or runtime data from the developer. No unsupported claims.

Apply the 5 Whys. Each answer becomes the next question:

```
Problem: Button click doesn't save data
Why? → The save handler isn't called
Why? → The event listener is bound to the wrong element
Why? → The component re-renders and the ref is stale
Why? → useEffect dependency array is missing the callback
ROOT CAUSE: Missing dependency in useEffect
```

**Draw the causal chain** — convert your 5 Whys into a visual reverse trace:

```
SYMPTOM: Button click doesn't save data
    ↑ because
save handler isn't called
    ↑ because
event listener bound to wrong element
    ↑ because
component re-renders, ref is stale
    ↑ because
useEffect dependency array missing callback
    ↑
ROOT CAUSE ──▶ Fix: add callback to useEffect deps
              File: src/components/Form.tsx:47
```

**Stop criteria**: You've found root cause when:
- Fixing THIS thing would prevent the problem entirely
- The cause explains ALL symptoms, not just some
- You can point to specific code (file + location) that is wrong

**UI root cause examples** — common UI root causes to consider:
- `overflow: hidden` on ancestor clipping content
- z-index without stacking context (position: static ignores z-index)
- Missing responsive breakpoint or wrong media query
- Conditional render tied to wrong state variable
- CSS specificity conflict (another rule overriding)
- Event handler on wrong element or pointer-events: none blocking clicks
- Animation/transition not triggering (missing transition property, wrong timing)

**Anti-patterns — you have NOT found root cause if:**
- Your diagnosis is "it doesn't work because X isn't working" (circular)
- You're describing WHAT is wrong but not WHY it's wrong
- Fixing your diagnosis would require another fix downstream
- You found where it breaks but not why it breaks there

**Not sure?** — If tracing doesn't reveal a clear root cause:
1. **Logic bugs**: Add log/console output at suspect points in the code
2. **UI bugs**: Generate a script from step 2.5 patterns targeting your hypothesis
3. Ask the user to reproduce the bug and send you the output (logs or script results)
4. Analyze evidence to validate or eliminate hypotheses
5. Repeat until root cause is confirmed

Don't guess. Logs are evidence.

### 4. CONFIRM — Present diagnosis to user (MANDATORY GATE)

You MUST output a diagnosis block before writing any fix. No exceptions.

```
## 🔍 Diagnosis

**Problem**: [what the user reported]
**Type**: [LOGIC / UI]
**Root cause**: [the actual underlying cause]
**Location**: [file(s) and specific area]
**Evidence**: [what you read/traced that confirms this — include UI evidence results if collected]
**Trace**:
[ASCII diagram — causal chain, execution flow, or data flow showing how root cause produces the symptom]
**Fix approach**: [what you plan to do — rewrite, restructure, or targeted fix]
```

Then ask: "Đồng ý với diagnosis này không? Tôi sẽ fix theo hướng trên."

**Do NOT proceed to step 5 until user confirms.** If user disagrees or adds info, go back to step 2.

### 5. FIX — Repair at root cause

Now you may write code. Rules:

**Rewrite over patch** — If the approach or structure is wrong, rewrite the affected section. Don't add workarounds on top of broken logic.

**Fix at the cause, not the symptom** — If the root cause is in file A but the symptom shows in file B, fix file A.

**Scope the fix** — Only change what the diagnosis identified. Don't "improve" nearby code while you're here.

**Delete freely** — If code you or the AI wrote is fundamentally wrong, delete and rewrite. Sunk cost doesn't apply.

### 6. VERIFY — Confirm the fix works

After fixing:
- Re-trace the execution flow from step 2 to confirm the fix resolves the root cause
- Check that the fix doesn't break adjacent behavior
- If the project has build/lint/test commands, run them
- **UI bugs**: generate a verification script for the developer to confirm the fix visually — or ask for a screenshot if you asked for one during diagnosis
- **Spec sync** — If this fix changes behavior described in spec artifacts (proposal, design, specs, tasks), update those artifacts to match. Only update sections directly affected by the fix. Don't rewrite unrelated parts.

```
## ✅ Fixed

**Root cause**: [brief]
**What changed**: [files modified, what was done]
**Spec updated**: [which artifact sections were updated, or "none — fix matches existing spec"]
**Verified**: [how you confirmed it works]
```

If the fix reveals another issue, go back to step 1 for the new problem. Don't chain-patch.

---

## Guardrails

- **NEVER skip diagnosis** — No matter how obvious the fix seems, output the diagnosis block first
- **NEVER patch symptoms** — If you catch yourself adding a workaround, stop and re-diagnose
- **Read before writing** — Every fix must be preceded by reading the actual code involved
- **One problem at a time** — If user reports multiple issues, diagnose and fix each separately
- **Admit mistakes** — If you wrote the broken code, say "I caused this because..." — it builds trust and helps diagnosis
- **UI bugs need browser evidence** — Do not diagnose UI bugs from code reading alone. Use step 2.5 to collect real browser data. Code tells you what SHOULD render, the browser tells you what ACTUALLY renders.
- **Scripts must be copy-paste ready** — Developer pastes the entire block into F12 Console, no editing. You fill in selectors and params before giving the script.
- **Evidence over intuition** — Every claim in your diagnosis must cite specific evidence: code you read (file:line), log output, or runtime data from developer. "I think" is not a citation.
- **No fog in diagnosis** — If any part of your diagnosis contains "probably", "likely", "should", "usually", "I think" — STOP. Gather more evidence before proceeding. A foggy diagnosis produces a wrong fix.
- **Ask before guessing** — When you can't determine something from code alone, ask the developer for specific evidence (see "Developer as Pair"). A 30-second developer action beats a 30-minute wrong fix.

---

## Mode Transition Hints

After fixing:
- More issues to fix → stay in `/spx-vibe`
- Want to verify full implementation → `/spx-verify`
- Want to continue implementing → `/spx-apply`
- Want to explore/rethink → `/spx-plan`

The following is the user's request: