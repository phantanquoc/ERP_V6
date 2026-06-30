## 1. Backend filter + stats API

- [x] 1.1 Add `getFilteredNotificationsForEmployee(employeeId, filters)` to `backend/src/services/notificationService.ts` — builds Prisma `where` with `employeeId`, optional `type: { in: types }`, optional `isRead`, optional `createdAt: { gte: dateFrom, lte: dateTo }` (default last 30 days when both absent), optional `OR` on `title`/`message` `contains` (case-insensitive); sort `[{ createdAt }, { id }]` with direction from `sort`; pagination `skip = (page-1)*limit`, `take = clamp(limit, 1, 100)`. Returns `{ items, total, page, totalPages }` using `prisma.notification.findMany` + `prisma.notification.count` in `Promise.all`.
- [x] 1.2 Add `getNotificationStatsForEmployee(employeeId, { types, dateFrom, dateTo })` to `backend/src/services/notificationService.ts` — defaults date range to last 30 days; runs four queries in `Promise.all` (total count, unread count where `isRead=false`, today count where `createdAt >= start-of-today server-local`, `groupBy({ by: ['type'] })` for `byType`); strips zero counts from `byType` before returning `{ total, unread, today, byType }`.
- [x] 1.3 Extend `getEmployeeNotifications` handler in `backend/src/controllers/notificationController.ts` to detect filter mode (presence of any of `types`, `isRead`, `dateFrom`, `dateTo`, `search`, `page`, `sort`); parse and coerce params (multi-value `types[]`, `isRead` as `true`/`false`/undefined, ISO date strings, integer `page`/`limit` with clamp, `sort` as `newest`|`oldest`); call the filter service and return `{ success: true, data: { items, total, page, totalPages } }`. Preserve cursor mode when `cursor` is set and legacy mode (`limit`/`since`) when no filter params are present.
- [x] 1.4 Add `getMyNotificationsStats` handler to `backend/src/controllers/notificationController.ts` that parses `types[]`, `dateFrom`, `dateTo`, calls the new stats service, and returns `{ success: true, data: { total, unread, today, byType } }`.
- [x] 1.5 Register `GET /stats` in `backend/src/routes/notificationRoutes.ts` BEFORE any `/:notificationId` dynamic route ← (verify: route appears in server logs at startup; calling `/api/notifications/stats` returns the four-field envelope; calling `/api/notifications` with no filter params still returns legacy shape; with filter params returns `{ items, total, page, totalPages }`; with `cursor` returns cursor shape; `tsc --noEmit` and `npm run lint` pass for backend.)

## 2. Frontend service + hook

- [x] 2.1 Extend `frontend/src/services/notificationService.ts` with TypeScript types `MyNotificationsParams` (types?, isRead?, dateFrom?, dateTo?, search?, page?, limit?, sort?), `MyNotificationsResponse` (`{ items: AppNotification[], total, page, totalPages }`), `MyNotificationsStatsParams` (types?, dateFrom?, dateTo?), `MyNotificationsStats` (`{ total, unread, today, byType }`). Add `getMyNotifications(params)` serializing `types[]` as repeated query params, and `getMyNotificationsStats(params)`.
- [x] 2.2 Create `frontend/src/hooks/useMyNotifications.ts`

## 3. Frontend components

- [x] 3.1 Create `frontend/src/components/myNotificationsUtils.ts`
- [x] 3.2 Create `frontend/src/components/MyNotificationsItem.tsx`
- [x] 3.3 Create `frontend/src/components/MyNotificationsTimeline.tsx`
- [x] 3.4 Create `frontend/src/components/MyNotificationsFilters.tsx`
- [x] 3.5 Create `frontend/src/components/MyNotificationsDetailModal.tsx`

## 4. Page, sidebar, and route

- [x] 4.1 Create `frontend/src/pages/MyNotifications.tsx`
- [x] 4.2 Register the route in `frontend/src/App.tsx`
- [x] 4.3 Add a sidebar entry in `frontend/src/components/Sidebar.tsx` footer adjacent to `/my-history` using the lucide `Bell` icon and label "Thông báo của tôi"; show the unread badge via the existing unread-count hook; active-state visual matches the `/my-history` pattern. ← (verify: link visible and clickable, active state highlights on `/my-notifications`, badge updates from existing `useUnreadCount` hook, mobile drawer opens/closes correctly when filter button tapped.)

## 5. Verification

- [x] 5.1 Run `cd backend && npx tsc --noEmit` — must pass with zero errors.
- [x] 5.2 Run `cd backend && npm run lint` — must finish without new errors or warnings introduced by this change.
- [x] 5.3 Run `cd frontend && npx tsc --noEmit` — must pass with zero errors.
- [x] 5.4 Run `cd frontend && npm run lint` — must finish without new errors or warnings introduced by this change.
- [ ] 5.5 Manual smoke test in browser: open `/my-notifications`, toggle group chips, switch read-state radio, set date presets, type into search (300 ms debounce), paginate, click an item to open the modal, click "Mở chi tiết" to deep-link, click "Đánh dấu tất cả đã đọc", delete a row; verify the sidebar entry and unread badge update accordingly; resize to mobile and confirm bottom-sheet drawer opens/traps focus/closes on Esc. ← (verify: every scenario in `specs/my-notifications/spec.md` is exercised; no console errors; backward compatibility — open another tab to confirm `NotificationBell` and `AllNotificationsModal` still render correctly using legacy and cursor modes.)
