## 1. Kiosk session helper

- [x] 1.1 Create `frontend/src/utils/kioskSession.ts` with `KIOSK_ACCESS_KEY`/`KIOSK_REFRESH_KEY`/`KIOSK_FLAG` constants
- [x] 1.2 `activate()` — copy current `accessToken`/`refreshToken` into `pdeAccessToken`/`pdeRefreshToken`
- [x] 1.3 `markTab()` — set `sessionStorage` `pdeKioskMode='1'`; `isKioskTab()` — read it
- [x] 1.4 `getKioskAccess()`/`getKioskRefresh()`/`setKioskAccess()`; `hasKioskSession()`; `deactivate()` ← (verify: helper isolates all pde* key access; no other file hardcodes the key strings)

## 2. apiClient token branching

- [x] 2.1 In `getAuthHeader()`, when `isKioskTab()` is true read `pdeAccessToken`; otherwise keep reading `accessToken`
- [x] 2.2 In the 401 refresh path, when in kiosk mode refresh via `pdeRefreshToken` and write back `pdeAccessToken`
- [x] 2.3 On kiosk refresh failure, do NOT `window.location.href='/login'` — signal kiosk-expired instead (e.g. set a flag the page reads / throw a typed error the page handles) ← (verify: ERP (non-kiosk) tabs keep exact current behavior incl. login redirect; kiosk tab never redirects to /login)

## 3. authService adjustments

- [x] 3.1 Add/So refresh can target the kiosk refresh token when in kiosk mode (reuse `/auth/refresh`)
- [x] 3.2 Ensure `logout()` clears only `accessToken`/`refreshToken`/`user` and never the `pde*` keys ← (verify: after admin logout, pde* keys still present)

## 4. Routing

- [x] 4.1 In `App.tsx`, make `/production/nhap-lieu` public (remove `ProtectedRoute` wrapper), keep it outside `ProtectedLayout`
- [x] 4.2 Remove the now-unused `ProtectedRoute` import if nothing else uses it (check first) ← (verify: tsc/lint clean; route still full-screen, no sidebar)

## 5. Activation from ERP

- [x] 5.1 In `ProductionData.tsx`, the "Mở trang nhập liệu (Tablet)" button calls `kioskSession.activate()` then `window.open('/production/nhap-lieu','_blank')` ← (verify: pde* tokens written before the tab opens)

## 6. Entry page — session guard + operator flow

- [x] 6.1 On mount, `markTab()`; if no kiosk session → show "session not activated — ask admin to reopen" screen
- [x] 6.2 Handle kiosk-expired signal → show "session expired — ask admin to reopen" screen (no login redirect)
- [x] 6.3 Operator-selection first screen using `useProductionEmployees` (filtered to Nhân viên sản xuất); block batch/fryer until a name is chosen
- [x] 6.4 Use the chosen name as `nguoiThucHien` in both PATCH payloads (not `useAuth`)
- [x] 6.5 Preview + confirm on Save for each tab: Save shows a Vietnamese preview; "Xác nhận" PATCHes; "Sửa lại" returns to form
- [x] 6.6 After a confirmed save, reset name + batch + fryer + tab back to the operator-selection screen ← (verify: end-to-end — activate, pick name, enter, preview, confirm → PATCH persists with chosen name → returns to name selection)

## 7. Verification

- [x] 7.1 `cd frontend && npx tsc --noEmit` — must pass
- [x] 7.2 `cd frontend && npm run lint`
- [ ] 7.3 Manual: activate from ERP → tablet works; admin logs out → tablet still saves; direct visit without activation → not-activated screen ← (verify: admin-logout survival + no cross-tab token leak)
