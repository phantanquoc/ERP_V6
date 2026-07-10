## Context

The data-entry page (`ProductionDataEntry.tsx`) currently runs behind `ProtectedRoute` and depends on the shared `accessToken` in localStorage, read by the singleton `apiClient.getAuthHeader()`. localStorage is shared across same-origin tabs, so admin logout (which clears `accessToken`/`refreshToken`/`user`) breaks the tablet. The attendance kiosk solves the same "runs unattended" problem with a backend device-key, but that is heavier than needed here and out of scope. `useProductionEmployees()` already returns operators filtered to the "Nhân viên sản xuất" position.

## Goals / Non-Goals

**Goals:**
- Tablet keeps entering data after admin logout / ERP tab close, without touching the backend.
- Correct operator attribution: `nguoiThucHien` = the worker who selects their name, not the admin.
- Safer save: preview + confirm; auto-return to operator selection for the next shift.
- Zero impact on normal ERP tabs.

**Non-Goals:**
- No backend, schema, permission, or attendance-device-key changes.
- No changes to manager screens or to the existing numeric/percentage/validation behavior of the entry form.

## Decisions

**1. Per-tab kiosk flag in `sessionStorage`, dedicated tokens in `localStorage`.**
`sessionStorage` is per-tab, so `pdeKioskMode` marks only the tablet tab; the singleton `apiClient` decides which token set to use by reading this flag at call time. Tokens themselves live in `localStorage` (`pdeAccessToken`/`pdeRefreshToken`) because they must survive tab reloads. This cleanly separates kiosk auth from ERP auth without a second apiClient instance. Alternative (separate axios/client instance) rejected — larger refactor, and the singleton already centralizes auth.

**2. Activation copies existing tokens rather than minting new ones.**
No backend endpoint for kiosk tokens exists and we will not add one. The admin is already authenticated, so copying the current access/refresh tokens into `pde*` at button-click is the minimal path. The kiosk then refreshes independently via the existing `/auth/refresh` endpoint. Trade-off: the kiosk acts under the admin's account/permissions — acceptable under the physical-trust model (tablet fixed at the line), same as the attendance kiosk.

**3. Kiosk refresh failure shows an in-page screen, never redirects.**
The current `apiClient` does `window.location.href='/login'` on refresh failure. For a kiosk that must not bounce to a login form, the kiosk branch instead surfaces a "session expired — ask admin to reopen" state. This keeps the tablet on a clear, recoverable screen.

**4. Public route, self-guarded.**
Removing `ProtectedRoute` avoids the login redirect; the page guards itself on the kiosk session (not-activated / expired screens). It stays outside `ProtectedLayout` (full-screen, no sidebar).

**5. Operator selection is UI state, gating the rest of the flow.**
The chosen name is form state used as `nguoiThucHien`; no persistence of "current operator" is needed. Reset-after-save enforces per-entry operator accuracy for multi-worker shifts.

**6. Centralize kiosk logic in `utils/kioskSession.ts`.**
`activate()`, `isActive()`, `isExpired()`, `deactivate()`, and token read/write live in one module so `apiClient`, `authService`, `ProductionData`, and `ProductionDataEntry` share one source of truth and the branching stays testable/reviewable.

## Risks / Trade-offs

- [Kiosk token accessible on the tablet] → Mitigation: physical-trust model, tablet stays at the line; documented and accepted, mirrors the attendance kiosk.
- [apiClient branch leaks into ERP tabs] → Mitigation: decision is keyed off per-tab `sessionStorage`, which cannot be set by other tabs; ERP tabs never see `pdeKioskMode`. Verify explicitly.
- [Admin logout accidentally clears kiosk tokens] → Mitigation: logout only removes `accessToken`/`refreshToken`/`user`; `pde*` untouched. Verify the logout path.
- [Stale operator name across shifts] → Mitigation: reset name + batch + fryer + tab after every confirmed save.
- [Refresh race in the singleton] → Both token sets use the same refresh endpoint but distinct keys; the kiosk branch writes only `pdeAccessToken`. No cross-write.

## Migration Plan

Pure additive frontend change. No data migration. Rollback = revert the frontend files; leftover `pde*` keys are inert. Deploy with the standard frontend build.

## Open Questions

None — all behavior locked during exploration.
