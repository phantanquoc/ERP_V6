## Why

Users currently only see notifications when they have the ERP web app open and are logged in, meaning urgent alerts (task assignments, approvals, feedback) are missed when the browser tab is closed or the device is idle. Adding Web Push Notifications ensures users receive real-time alerts on their phone or desktop regardless of whether the app is open.

## What Changes

- Install `web-push` npm package on the backend
- Generate and store VAPID keys in `.env` for self-managed push authentication
- Add a `PushSubscription` Prisma model to persist per-user push subscriptions
- Add subscribe and unsubscribe API endpoints (`POST /api/notifications/push/subscribe`, `DELETE /api/notifications/push/unsubscribe`)
- Create `pushNotificationService.ts` on the backend to encapsulate VAPID/web-push logic
- Modify `notificationService.createNotification()` to trigger push delivery after DB save
- Create a service worker (`public/sw.js`) on the frontend to receive and display push events
- Register the service worker on app initialization
- Create `pushNotificationService.ts` on the frontend to manage permission requests and subscription lifecycle
- Add a notification permission toggle in `NotificationBell` or a settings panel

## Capabilities

### New Capabilities

- `web-push-subscription`: Manage per-user push subscriptions — subscribe, unsubscribe, and store subscription objects in the database
- `web-push-delivery`: Deliver web push notifications to subscribed users when a notification is created in the system
- `push-permission-ui`: Frontend flow for requesting notification permission and registering the push subscription with the backend

### Modified Capabilities

<!-- No existing spec-level requirements are changing; the notification creation contract is unchanged — push delivery is an additive side-effect -->

## Impact

- **Backend dependencies**: `web-push` package added to `backend/package.json`
- **Database**: New `PushSubscription` table via Prisma migration
- **Backend files modified**: `notificationService.ts` (add push step), `notificationController.ts` (new routes), `notificationRoutes.ts` (new routes)
- **Backend files added**: `pushNotificationService.ts`, Prisma migration file
- **Frontend files added**: `public/sw.js`, `frontend/src/services/pushNotificationService.ts`
- **Frontend files modified**: `NotificationBell.tsx` (toggle UI), app initialization entry point (service worker registration)
- **Environment**: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` added to `.env`
- **No breaking changes** — existing in-app notification behavior is preserved
