## Context

The ERP system (Express + TypeScript + Prisma + React) already has an in-app notification system: `notificationService.ts` creates notification records in the database and the frontend polls for unread counts every 30 seconds. Notifications are only visible when the user has the browser open and is logged in.

The goal is to layer Web Push Notifications on top of the existing system so users receive OS-level alerts on any device (phone, desktop) even when the browser tab is closed. The integration point is the existing `notificationService.ts` — each `create*Notification` call will trigger push delivery after the DB write succeeds.

**Constraints:**
- No external push service (no Firebase, OneSignal, etc.) — self-managed VAPID via the `web-push` npm package
- Must not break or alter existing in-app notification behavior
- Push failures must never cause the DB notification to fail (fire-and-forget after DB write)
- PostgreSQL uses multiple schemas (`auth`, `business`, `common`) — the `PushSubscription` model goes in the `auth` schema alongside `User`

## Goals / Non-Goals

**Goals:**
- Users receive OS-level push notifications on desktop and mobile when a notification is created, even if the browser tab is closed
- Subscription management: users can enable/disable push notifications from the `NotificationBell` component
- A single `PushSubscription` table stores per-user, per-device subscriptions
- The service worker intercepts push events and shows the notification via the Notifications API
- Clicking the notification opens/focuses the ERP app
- Stale/expired subscriptions are silently cleaned up on delivery failure

**Non-Goals:**
- Push notifications to non-HTTPS environments (Web Push requires HTTPS; local dev via localhost is fine)
- Rich media attachments in push notifications (images, action buttons beyond the default click)
- Notification scheduling or delayed push delivery
- Analytics on push open rates
- Multiple topics/channels — every ERP notification type uses the same push channel

## Decisions

### Decision 1: Hook into `createNotification()` vs. each domain method

**Choice**: Hook into individual domain methods (`createNotification`, `createTaskNotification`, `createTaskNotifications`, etc.) by calling `pushNotificationService.sendPush(employeeId, title, message)` from each after the DB write.

**Rationale**: `createNotification()` only handles the generic case. The service has many specialized methods (`createTaskNotifications`, `createLeaveRequestNotification`, `createPayrollNotifications`, etc.) that call `prisma.notification.createMany()` directly without going through `createNotification()`. Hooking only `createNotification()` would miss most notification types.

**Alternative considered**: Create a private helper `_sendPushForEmployee(employeeId, title, message)` and call it at the end of every create method. This is more explicit and avoids an invisible hook. This is the chosen approach — each method explicitly fires push after its DB write.

### Decision 2: Subscription storage — per User vs. per Employee

**Choice**: Link `PushSubscription` to `User` (not `Employee`) via `userId`.

**Rationale**: Push subscriptions belong to a browser/device, tied to the authenticated user session. The `Employee` model is the business entity; `User` is the identity. Looking up subscriptions by `userId` at push time requires one extra lookup (userId → employeeId → userId), but keeps auth concerns in the `auth` schema. Because `notificationService` already does `userId → employeeId` lookups, we extend the same pattern in reverse (employeeId → userId → subscriptions).

**Alternative considered**: Link to `Employee` directly. Simpler DB join but mixes auth concerns into the business schema.

### Decision 3: VAPID key management

**Choice**: Generate once with `npx web-push generate-vapid-keys`, store `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` in `.env`. The public key is exposed via a dedicated endpoint `GET /api/notifications/push/vapid-public-key` so the frontend can subscribe without hardcoding.

**Rationale**: No external dependency, reproducible, standard practice for self-hosted Web Push.

### Decision 4: Service worker registration timing

**Choice**: Register the service worker in `main.tsx` unconditionally (not gated on login). Subscribe/request permission only after login, inside the `NotificationBell` component or a hook called from `App.tsx` when `user` is available.

**Rationale**: Service workers must be registered early. The subscription step (which requires user context) is separate from registration and happens after authentication.

### Decision 5: Multiple subscriptions per user

**Choice**: A user can have multiple active subscriptions (one per browser/device). The endpoint field is the unique key — if the same endpoint subscribes again, upsert rather than duplicate.

**Rationale**: Users may use the ERP from both a phone and a desktop. All active subscriptions for a user receive the push.

### Decision 6: Push failure handling

**Choice**: If `webpush.sendNotification()` throws with HTTP status 404 or 410 (subscription expired/invalid), silently delete the subscription from the DB. All other errors are logged but not re-thrown.

**Rationale**: Expired subscriptions are normal (browser revokes permissions, user clears site data). Keeping them causes wasted push attempts. No alerting needed — the user simply won't receive pushes until they re-subscribe.

## Risks / Trade-offs

- **Browser support**: Web Push is not supported in all browsers (notably iOS Safari before iOS 16.4, and some older Android browsers). Mitigation: the feature degrades gracefully — users without push support continue to use in-app notifications only. No error is shown.
- **HTTPS requirement**: Web Push only works on HTTPS (except localhost). Production must be served over HTTPS. Mitigation: document this in the deployment guide; the feature is simply unavailable on plain HTTP.
- **Fan-out latency**: For batch notifications (`createTaskNotifications` with many employeeIds), push is sent per-user serially. For large batches this adds latency to the method. Mitigation: run push sends with `Promise.allSettled()` in parallel rather than sequentially; errors are isolated per subscription.
- **VAPID key rotation**: If VAPID keys are rotated, all existing subscriptions become invalid and users must re-subscribe. Mitigation: document that VAPID keys should not be rotated unless a key is compromised.
- **Notification permission UX**: The browser's one-time permission prompt can be declined. Once denied, users cannot be re-prompted by the app. Mitigation: guide the user to re-enable from browser settings; the toggle in `NotificationBell` reflects the current permission state.

## Migration Plan

1. Install `web-push` and `@types/web-push` in `backend/`
2. Generate VAPID keys (`npx web-push generate-vapid-keys`) and add to `.env` and `.env.example`
3. Add `PushSubscription` model to `schema.prisma` and run `prisma migrate dev`
4. Create `backend/src/services/pushNotificationService.ts`
5. Modify `notificationService.ts` to call push after each DB write
6. Add push controller methods to `notificationController.ts` and register routes in `notificationRoutes.ts`
7. Create `frontend/public/sw.js` (service worker)
8. Register service worker in `frontend/src/main.tsx`
9. Create `frontend/src/services/pushNotificationService.ts`
10. Add permission/subscribe toggle to `NotificationBell.tsx`

**Rollback**: Remove the push call from `notificationService.ts`, unregister the service worker from the browser, and drop the `PushSubscription` table migration. The core notification system is unaffected.

## Open Questions

- None — all key decisions have been resolved in the context section above.
