## ADDED Requirements

### Requirement: Push notification is sent when a notification is created
The system SHALL attempt to send a web push notification to all active subscriptions of the target user whenever any `create*Notification` method in `notificationService.ts` completes a DB write. Push delivery SHALL occur after the DB write and SHALL NOT block or fail the DB write if push delivery fails.

#### Scenario: Push sent after single notification creation
- **WHEN** `createNotification()`, `createTaskNotification()`, `createEvaluationNotification()`, or any other single-recipient create method completes successfully
- **THEN** `pushNotificationService.sendPushToEmployee(employeeId, title, message)` SHALL be called and push messages SHALL be dispatched to all active subscriptions for that employee's user account

#### Scenario: Push sent after batch notification creation
- **WHEN** `createTaskNotifications()`, `createLeaveRequestNotification()`, `createPayrollNotifications()`, or any other multi-recipient create method completes successfully
- **THEN** push messages SHALL be dispatched in parallel (via `Promise.allSettled`) to all active subscriptions for each target employee's user account

#### Scenario: Push delivery failure does not fail notification creation
- **WHEN** `webpush.sendNotification()` throws any error for any subscription
- **THEN** the notification record in the database SHALL remain intact, no error SHALL propagate to the caller, and the error SHALL be logged

#### Scenario: No subscriptions for user
- **WHEN** a notification is created for a user who has no active push subscriptions
- **THEN** no push is attempted and no error occurs

### Requirement: Push notification payload contains title and message
The web push payload SHALL be a JSON object with `title` and `body` fields, matching the DB notification's `title` and `message`. The payload MAY also include a `url` field pointing to the ERP application root, used by the service worker to open the app on click.

#### Scenario: Payload structure
- **WHEN** a push notification is sent
- **THEN** the JSON payload SHALL contain `{ title: string, body: string, url: string }` where `url` is the ERP app origin (e.g., `https://erp.example.com`)

### Requirement: Push is sent using VAPID authentication
The system SHALL authenticate all push messages using VAPID, with keys loaded from environment variables `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, and `VAPID_SUBJECT`. The `web-push` library SHALL be configured once at module initialization.

#### Scenario: VAPID keys configured at startup
- **WHEN** the backend server starts
- **THEN** `webpush.setVapidDetails(subject, publicKey, privateKey)` SHALL be called using values from environment variables before any push is sent

#### Scenario: Missing VAPID environment variables
- **WHEN** any of `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, or `VAPID_SUBJECT` is not set
- **THEN** the server SHALL log a warning and push delivery SHALL be silently skipped rather than crashing
