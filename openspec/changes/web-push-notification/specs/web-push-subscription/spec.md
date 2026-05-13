## ADDED Requirements

### Requirement: User can subscribe to web push notifications
The system SHALL allow an authenticated user to register a browser push subscription (endpoint + keys) with the backend. The subscription SHALL be stored in the `PushSubscription` table linked to the user's `userId`. If the same endpoint is submitted again, the system SHALL upsert (update) rather than create a duplicate.

#### Scenario: Successful subscription
- **WHEN** an authenticated user sends `POST /api/notifications/push/subscribe` with a valid `PushSubscription` object (endpoint, keys.p256dh, keys.auth)
- **THEN** the system SHALL respond with `200 OK` and `{ success: true }`, and the subscription SHALL be persisted in the database

#### Scenario: Duplicate endpoint upsert
- **WHEN** an authenticated user sends `POST /api/notifications/push/subscribe` with an endpoint that already exists in the database for that user
- **THEN** the system SHALL update the existing record rather than creating a duplicate, and respond with `200 OK` and `{ success: true }`

#### Scenario: Unauthenticated subscribe attempt
- **WHEN** a request is made to `POST /api/notifications/push/subscribe` without a valid auth token
- **THEN** the system SHALL respond with `401 Unauthorized`

#### Scenario: Invalid subscription body
- **WHEN** an authenticated user sends `POST /api/notifications/push/subscribe` with a missing or malformed body (missing endpoint or keys)
- **THEN** the system SHALL respond with `400 Bad Request`

### Requirement: User can unsubscribe from web push notifications
The system SHALL allow an authenticated user to remove their push subscription. The subscription SHALL be deleted from the database by matching the endpoint.

#### Scenario: Successful unsubscribe
- **WHEN** an authenticated user sends `DELETE /api/notifications/push/unsubscribe` with a body containing the `endpoint` to remove
- **THEN** the system SHALL delete the matching subscription and respond with `200 OK` and `{ success: true }`

#### Scenario: Unsubscribe for non-existent endpoint
- **WHEN** an authenticated user sends `DELETE /api/notifications/push/unsubscribe` with an endpoint that does not exist in the database
- **THEN** the system SHALL respond with `200 OK` and `{ success: true }` (idempotent, no error)

#### Scenario: Unauthenticated unsubscribe attempt
- **WHEN** a request is made to `DELETE /api/notifications/push/unsubscribe` without a valid auth token
- **THEN** the system SHALL respond with `401 Unauthorized`

### Requirement: VAPID public key is accessible to the frontend
The system SHALL expose the VAPID public key via a public (unauthenticated) endpoint so the frontend can call `pushManager.subscribe()` without hardcoding the key.

#### Scenario: Frontend requests VAPID public key
- **WHEN** any client sends `GET /api/notifications/push/vapid-public-key`
- **THEN** the system SHALL respond with `200 OK` and `{ publicKey: "<base64url VAPID public key>" }`

### Requirement: Expired push subscriptions are automatically removed
The system SHALL silently delete a `PushSubscription` record when a push delivery attempt returns HTTP 404 or 410, indicating the subscription is no longer valid.

#### Scenario: Push delivery returns 410 Gone
- **WHEN** a push delivery attempt for a subscription returns HTTP 410
- **THEN** the system SHALL delete that subscription record from the database and SHALL NOT throw an error or affect the notification creation flow

#### Scenario: Push delivery returns 404 Not Found
- **WHEN** a push delivery attempt for a subscription returns HTTP 404
- **THEN** the system SHALL delete that subscription record from the database and SHALL NOT throw an error
