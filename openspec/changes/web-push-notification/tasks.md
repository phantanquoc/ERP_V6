## 1. Backend Dependencies and Environment

- [ ] 1.1 Install `web-push` and `@types/web-push` in `backend/`
- [x] 1.2 Run `npx web-push generate-vapid-keys` and add `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` to `.env` and `.env.example`

## 2. Database — PushSubscription Model

- [x] 2.1 Add `PushSubscription` model to `backend/prisma/schema.prisma` in the `auth` schema with fields: `id`, `userId` (FK to User), `endpoint` (unique per user), `p256dh`, `auth`, `createdAt`, `updatedAt`; add `pushSubscriptions PushSubscription[]` relation on `User`
- [ ] 2.2 Run `npx prisma migrate dev --name add-push-subscription` and verify migration succeeds
- [ ] 2.3 Regenerate Prisma client (`npx prisma generate`) ← (verify: `PushSubscription` model is available in Prisma client typings)

## 3. Backend — pushNotificationService

- [x] 3.1 Create `backend/src/services/pushNotificationService.ts` with: VAPID initialization from env vars at module load (log warning if missing), `sendPushToEmployee(employeeId, title, message)` method that resolves employeeId → userId → subscriptions and calls `webpush.sendNotification()` for each using `Promise.allSettled`
- [x] 3.2 Implement expired subscription cleanup in `pushNotificationService.ts`: if `webpush.sendNotification()` throws with statusCode 404 or 410, delete the subscription record from the DB
- [x] 3.3 Implement `saveSubscription(userId, endpoint, p256dh, auth)` method using Prisma `upsert` on the endpoint field
- [x] 3.4 Implement `removeSubscription(userId, endpoint)` method that deletes the matching subscription (no-op if not found) ← (verify: all four methods are present and typed correctly; VAPID warning logs if env vars missing)

## 4. Backend — Notification Service Integration

- [x] 4.1 Import `pushNotificationService` in `backend/src/services/notificationService.ts`
- [x] 4.2 Add `pushNotificationService.sendPushToEmployee(employeeId, title, message)` call (fire-and-forget, wrapped in `.catch(() => {})`) at the end of: `createNotification()`, `createEvaluationNotification()`, `createTaskNotification()`
- [x] 4.3 Add `Promise.allSettled` push fan-out at the end of batch methods: `createTaskNotifications()`, `createLeaveRequestNotification()`, `createPayrollNotifications()`, `createLeaveRequestResponseNotification()`, `createAcceptanceHandoverNotification()`, `createSupplyRequestNotification()`, `createSupplyRequestNotifications()`, `createAdminTaskNotification()`, `createAdminFeedbackNotification()`, `createAdminDailyReportNotification()` ← (verify: all create methods trigger push; a DB notification write failure does not prevent push from being attempted and a push failure does not affect DB write)

## 5. Backend — Push API Endpoints

- [x] 5.1 Add `GET /api/notifications/push/vapid-public-key` route and controller method that returns `{ publicKey: process.env.VAPID_PUBLIC_KEY }` (no auth required)
- [x] 5.2 Add `POST /api/notifications/push/subscribe` route and controller method: validates body has `endpoint`, `keys.p256dh`, `keys.auth`; resolves userId from JWT; calls `pushNotificationService.saveSubscription()`; returns `400` if body invalid
- [x] 5.3 Add `DELETE /api/notifications/push/unsubscribe` route and controller method: validates body has `endpoint`; calls `pushNotificationService.removeSubscription()`; returns `200` even if not found
- [x] 5.4 Register all three routes in `backend/src/routes/notificationRoutes.ts` (subscribe/unsubscribe behind `authenticate` middleware; vapid-public-key open) ← (verify: all three endpoints return correct responses; subscribe endpoint returns 400 on missing body fields; unauthenticated subscribe returns 401)

## 6. Frontend — Service Worker

- [x] 6.1 Create `frontend/public/sw.js` with a `push` event listener that parses JSON payload and calls `self.registration.showNotification(title, { body })`, falling back to a generic title if payload is empty
- [x] 6.2 Add `notificationclick` event listener in `sw.js` that closes the notification, finds an existing client window matching the app URL, focuses it if found, or calls `clients.openWindow(url)` if not ← (verify: service worker installs in browser devtools; push event shows OS notification; clicking notification opens/focuses the app)

## 7. Frontend — pushNotificationService

- [x] 7.1 Create `frontend/src/services/pushNotificationService.ts` with:
  - `getVapidPublicKey()`: calls `GET /api/notifications/push/vapid-public-key`
  - `subscribeToPush()`: registers push subscription via `pushManager.subscribe()` using the fetched VAPID public key, then calls `POST /api/notifications/push/subscribe`
  - `unsubscribeFromPush()`: retrieves current subscription via `pushManager.getSubscription()`, calls `DELETE /api/notifications/push/unsubscribe`, then calls `subscription.unsubscribe()`
  - `isSubscribed()`: checks `Notification.permission === 'granted'` and `pushManager.getSubscription() !== null`
- [x] 7.2 Add `urlBase64ToUint8Array` utility function in the same file (required to convert VAPID public key for `pushManager.subscribe`) ← (verify: subscribeToPush completes end-to-end; subscription object is saved in DB; isSubscribed returns true after subscribe)

## 8. Frontend — Service Worker Registration

- [x] 8.1 In `frontend/src/main.tsx`, add service worker registration after `createRoot().render()`: check `'serviceWorker' in navigator`, then call `navigator.serviceWorker.register('/sw.js').catch(console.error)` ← (verify: service worker appears as registered in Chrome DevTools > Application > Service Workers)

## 9. Frontend — NotificationBell Permission Toggle

- [x] 9.1 Add a `pushEnabled` boolean state to `NotificationBell.tsx`, initialized by calling `pushNotificationService.isSubscribed()` on mount
- [x] 9.2 Add a push notification toggle button in the `NotificationBell` dropdown header area: shows "Bật thông báo đẩy" when disabled, "Tắt thông báo đẩy" when enabled
- [x] 9.3 Implement toggle handler: if disabling, call `pushNotificationService.unsubscribeFromPush()` and set `pushEnabled = false`; if enabling, call `Notification.requestPermission()`, on `"granted"` call `pushNotificationService.subscribeToPush()` and set `pushEnabled = true`, on `"denied"` show a message "Vui lòng cho phép thông báo trong cài đặt trình duyệt"
- [x] 9.4 Hide the toggle entirely if `'serviceWorker' in navigator === false` or `'PushManager' in window === false` (browser does not support push) ← (verify: toggle correctly reflects permission state on mount; enabling triggers permission prompt; disabling removes subscription from DB; toggle is hidden in unsupported browsers)
