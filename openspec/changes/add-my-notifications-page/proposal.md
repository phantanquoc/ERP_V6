## Why

Employees currently access their notifications only through the header bell dropdown (`NotificationBell.tsx`) or a fullscreen modal (`AllNotificationsModal.tsx`). Neither provides a permanent URL, filter controls, multi-criteria search, or aggregate statistics. With 30+ notification types spanning evaluations, tasks, leave, payroll, supply requests, reports, orders and more, users have no efficient way to triage, search, or audit their own activity history. This mirrors the gap that "Lịch sử của tôi" (`/my-history`) already solved for entity history — we now extend the same UX pattern to notifications.

## What Changes

- Add new page `/my-notifications` ("Thông báo của tôi") with rail timeline UX mirroring `/my-history`.
- Extend `GET /api/notifications` to accept filter parameters (`types[]`, `isRead`, `dateFrom`, `dateTo`, `search`, `page`, `limit`, `sort`) while preserving backward compatibility with existing `limit`/`since`/`cursor` modes.
- Add new endpoint `GET /api/notifications/stats` returning aggregate counts (total, unread, today, byType).
- Add filter UI: multi-select type chips grouped into 7 logical clusters, read-state radio, debounced search, date range with presets, sticky desktop / bottom-sheet mobile drawer.
- Add summary stats card (Tổng / Chưa đọc / Hôm nay), active filter chips bar, day-group collapse (> 5 items per day).
- Add notification detail modal with deep-link to source entity, optimistic mark-as-read on click, delete action, and mark-all-as-read button.
- Add sidebar entry adjacent to `/my-history` with unread badge.
- URL state sync via `react-router useSearchParams` (default state hidden from URL).

## Capabilities

### New Capabilities
- `my-notifications`: Personal notification page that lets an authenticated employee list, filter, search, paginate, mark-read, and delete their own notifications, with aggregate stats and deep-links to source entities.

### Modified Capabilities
<!-- None — existing notification infrastructure (registry, fan-out, websocket, web push, NotificationBell, AllNotificationsModal) is unchanged. The shared backend endpoints are extended additively without removing or altering the existing request modes. -->

## Impact

- **Backend code**:
  - `backend/src/services/notificationService.ts` — add `getFilteredNotificationsForEmployee` + `getNotificationStatsForEmployee` methods (existing methods unchanged).
  - `backend/src/controllers/notificationController.ts` — extend `getEmployeeNotifications` to detect filter mode; add `getMyNotificationsStats` handler.
  - `backend/src/routes/notificationRoutes.ts` — register `GET /stats` before any `/:notificationId` dynamic routes to avoid path collision.
- **Backend API**:
  - `GET /api/notifications` gains filter mode (activated when any filter param present); legacy modes (`limit`+`since`, `cursor`) preserved.
  - `GET /api/notifications/stats` (NEW).
- **Frontend code**:
  - `frontend/src/services/notificationService.ts` — add types + 2 methods.
  - New: `hooks/useMyNotifications.ts`, `pages/MyNotifications.tsx`, `components/MyNotificationsFilters.tsx`, `MyNotificationsTimeline.tsx`, `MyNotificationsItem.tsx`, `MyNotificationsDetailModal.tsx`, `myNotificationsUtils.ts`.
  - Modify: `components/Sidebar.tsx` (footer entry), `App.tsx` (lazy route).
- **Database / schema**: no Prisma schema changes (existing `Notification` model is sufficient).
- **Out of scope**: NotificationBell, AllNotificationsModal, NotificationRegistry, push subscription logic, export/PDF, animation libraries, AI service.
