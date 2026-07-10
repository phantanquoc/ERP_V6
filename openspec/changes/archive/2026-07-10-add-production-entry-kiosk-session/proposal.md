## Why

The production data-entry page (`/production/nhap-lieu`) is meant to run unattended on a tablet by the fryer, like the face-attendance kiosk. But today it is wrapped in `ProtectedRoute` and relies on the shared `accessToken`: the moment the admin logs out (or the shared token is cleared in any tab), the tablet is kicked to the login screen and workers can no longer enter data. It also stamps `nguoiThucHien` from the logged-in admin account, so entries are attributed to the wrong person. Workers need the page to keep working across admin logout and to record the actual operator per entry.

## What Changes

- Turn `/production/nhap-lieu` into a **self-sufficient kiosk session** (frontend-only): the admin activates it from ERP, and it keeps working even after the admin logs out or closes the ERP tab.
  - Activation copies the current access/refresh tokens into dedicated keys (`pdeAccessToken`/`pdeRefreshToken`) before opening the tablet tab.
  - The kiosk tab marks itself via `sessionStorage` (`pdeKioskMode`), which is per-tab and never leaks to ERP tabs.
  - `apiClient` reads the kiosk token set only when the current tab is in kiosk mode; ERP tabs are unaffected.
  - Kiosk token refresh uses the dedicated refresh token; on failure it shows a "session expired — ask admin to reopen" screen instead of redirecting to `/login`.
  - Admin logout clears only the main tokens, never the `pde*` keys.
  - The route becomes **public** (no `ProtectedRoute`), self-checking the kiosk session, still full-screen (outside the sidebar layout).
- Add an **operator-selection first step**: on entry, the worker picks their name from a list filtered to the "Nhân viên sản xuất" position (via the existing `useProductionEmployees`). No batch/fryer selection until a name is chosen. The chosen name is saved as `nguoiThucHien` (not the admin account).
- Add **preview + confirm** on save: tapping Save on either tab shows a readable preview of the just-entered values (Vietnamese); only "Xác nhận" performs the PATCH, with a "Sửa lại" option to return to the form. Each tab confirms independently.
- After a confirmed save, **return to the name-selection screen** (reset name + batch + fryer + tab) so the next shift's operator can start fresh.

## Capabilities

### New Capabilities
- `production-entry-kiosk-session`: A per-tab kiosk session for the production data-entry page that survives admin logout via dedicated tokens, plus an operator-selection-first entry flow with preview/confirm on save and auto-return to operator selection.

### Modified Capabilities
<!-- None — the base data-entry capability (production-data-tablet-entry) is extended additively; no prior requirement is invalidated. -->

## Impact

- **Frontend only** — no backend, schema, permission, or attendance-device-key changes.
- `frontend/src/services/apiClient.ts` — token branch keyed off the per-tab kiosk flag; kiosk refresh failure does not redirect to login.
- `frontend/src/services/authService.ts` — refresh helper for the `pde*` keys; ensure logout does not clear `pde*`.
- New `frontend/src/utils/kioskSession.ts` — activate / isActive / isExpired / deactivate + read/write of `pde*` tokens.
- `frontend/src/App.tsx` — `/production/nhap-lieu` becomes public; remove now-unused `ProtectedRoute` import if applicable.
- `frontend/src/pages/production/ProductionData.tsx` — the existing "Mở trang nhập liệu (Tablet)" button activates the kiosk session before `window.open`.
- `frontend/src/pages/production/ProductionDataEntry.tsx` — operator-selection first step, preview/confirm on save, reset-to-selection after save, not-activated / expired screens, mark kiosk flag on mount, `nguoiThucHien` from the chosen name.
- **Trade-off accepted**: the kiosk token lives in the tablet's localStorage, so anyone at that tablet can enter data under the activating admin account — same physical-trust model as the attendance kiosk.
