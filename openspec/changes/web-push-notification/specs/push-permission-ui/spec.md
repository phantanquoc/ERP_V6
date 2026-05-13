## ADDED Requirements

### Requirement: Service worker is registered on app initialization
The frontend SHALL register a service worker (`/sw.js`) when the application loads in `main.tsx`. Registration SHALL use the Service Worker API if supported by the browser. Registration errors SHALL be caught and logged without crashing the app.

#### Scenario: Successful service worker registration
- **WHEN** the browser supports service workers and the app loads
- **THEN** `navigator.serviceWorker.register('/sw.js')` SHALL be called and the service worker SHALL be installed

#### Scenario: Browser does not support service workers
- **WHEN** `navigator.serviceWorker` is undefined
- **THEN** registration SHALL be silently skipped and no error SHALL be thrown

### Requirement: Service worker receives and displays push notifications
The service worker (`/sw.js`) SHALL listen for `push` events and display a browser notification using `self.registration.showNotification()`. The displayed notification SHALL include the title and body from the push payload.

#### Scenario: Push event received with valid payload
- **WHEN** the service worker receives a `push` event containing a JSON payload with `title` and `body`
- **THEN** `self.registration.showNotification(title, { body })` SHALL be called and the OS notification SHALL appear

#### Scenario: Push event received with no payload
- **WHEN** the service worker receives a `push` event with no data
- **THEN** a fallback notification SHALL be shown with a generic title (e.g., "Thông báo mới")

### Requirement: Clicking a push notification opens or focuses the ERP app
The service worker SHALL listen for `notificationclick` events. When the user clicks the notification, the service worker SHALL open the ERP app URL or focus an existing open window.

#### Scenario: No existing app window open
- **WHEN** the user clicks a push notification and no window with the ERP app URL is open
- **THEN** the service worker SHALL call `clients.openWindow(url)` to open the app

#### Scenario: App window already open
- **WHEN** the user clicks a push notification and an existing window with the ERP app URL is open
- **THEN** the service worker SHALL focus the existing window rather than opening a new one

### Requirement: App requests notification permission and subscribes after login
The frontend SHALL request the browser's notification permission and, upon grant, call the subscribe endpoint to register the push subscription with the backend. This SHALL occur after the user is authenticated, triggered from `NotificationBell` or an auth-aware hook.

#### Scenario: Permission granted on first enable
- **WHEN** the user clicks the "Enable Notifications" toggle in `NotificationBell` for the first time (or permission is not yet granted)
- **THEN** `Notification.requestPermission()` SHALL be called; if the result is `"granted"`, the frontend SHALL call `pushManager.subscribe()` and then `POST /api/notifications/push/subscribe` with the resulting subscription object

#### Scenario: Permission already granted
- **WHEN** the user opens the app and notification permission is already `"granted"` and no subscription is active
- **THEN** the frontend SHALL auto-subscribe and register the subscription with the backend without prompting

#### Scenario: Permission denied
- **WHEN** the user denies the browser permission prompt
- **THEN** the toggle SHALL remain in the "disabled" state and a message SHALL inform the user to enable notifications from browser settings

#### Scenario: User disables notifications via toggle
- **WHEN** the user clicks the "Disable Notifications" toggle while push is enabled
- **THEN** the frontend SHALL call `DELETE /api/notifications/push/unsubscribe` with the current endpoint and SHALL call `subscription.unsubscribe()` on the PushSubscription object

### Requirement: NotificationBell toggle reflects current push permission state
The `NotificationBell` component SHALL display a toggle that accurately reflects whether push notifications are currently enabled (permission granted and subscription active).

#### Scenario: Push enabled state
- **WHEN** the user has granted permission and a valid subscription exists
- **THEN** the toggle SHALL display in the "enabled" state

#### Scenario: Push disabled state
- **WHEN** the user has not granted permission or has no active subscription
- **THEN** the toggle SHALL display in the "disabled" state
