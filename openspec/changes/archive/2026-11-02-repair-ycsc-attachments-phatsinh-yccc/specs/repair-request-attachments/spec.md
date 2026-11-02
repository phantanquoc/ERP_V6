# Spec Delta

## Purpose

Repair requests (YCSC) carry their own evidence files: users attach up to four documents when creating or editing a slip, new files append to the ones already stored, and every stored file is listed in view mode.

## ADDED Requirements

### Requirement: Multi-file attachment storage on repair requests
`RepairRequest` SHALL store attachments in a `tepDinhKem` string-array column that defaults to empty, while the legacy single `fileDinhKem` column SHALL be preserved for existing rows. Display code SHALL treat the union of `tepDinhKem` and legacy `fileDinhKem` as the slip's attachments.

#### Scenario: legacy slip keeps its single file
- **WHEN** a `RepairRequest` predates the array column and has only `fileDinhKem` set
- **THEN** view mode lists that file alongside any `tepDinhKem` entries, and the legacy value is not dropped by later updates

#### Scenario: new slip stores multiple files
- **WHEN** a user creates a repair request with 3 files selected
- **THEN** all 3 URLs are stored in `tepDinhKem` and all 3 are listed in view mode

### Requirement: Upload API accepts up to four files on create and update
`POST /api/repair-requests` and `PUT /api/repair-requests/:id` SHALL accept multipart uploads on the `files` field with a maximum of 4 files, subject to the shared extension/size allowlist. More than 4 files SHALL fail the request instead of being silently dropped. Requests with no files SHALL continue to succeed.

#### Scenario: create with four files
- **WHEN** `POST /api/repair-requests` is sent as multipart with 4 valid files
- **THEN** the response is `201` and the created slip's `tepDinhKem` contains 4 URLs

#### Scenario: fifth file rejected
- **WHEN** a request is sent with 5 files on the `files` field
- **THEN** the request fails with an error response and no slip is created

#### Scenario: create without files still works
- **WHEN** `POST /api/repair-requests` is sent with no `files` field
- **THEN** the slip is created with `tepDinhKem = []`

### Requirement: Updates append files up to the cap
On update, newly uploaded files SHALL be appended to the slip's existing `tepDinhKem` rather than replacing it, and the merged list SHALL be capped at 4 entries. If existing plus new files would exceed 4, the update SHALL fail with a validation error and stored files SHALL remain unchanged.

#### Scenario: append preserves earlier files
- **WHEN** a slip already has 2 attachments and the user uploads 1 more on update
- **THEN** the update succeeds and `tepDinhKem` contains the original 2 followed by the new 1

#### Scenario: exceeding the cap fails atomically
- **WHEN** a slip already has 3 attachments and the user uploads 2 more
- **THEN** the update fails with a validation error stating the 4-file maximum, and no new file is appended

### Requirement: Create and edit UI persist selected files
The repair form's attachment picker SHALL send the selected files on both create and edit of a `RepairRequest`, replacing the current behavior where picked files are discarded. View mode SHALL list all stored attachments as download links.

#### Scenario: files picked at create time persist
- **WHEN** a user picks 2 files while creating a YCSC and submits
- **THEN** both files are uploaded with the create request and appear in view mode

#### Scenario: files added while editing persist
- **WHEN** a user adds a file on an existing slip and saves
- **THEN** the save request carries the file and view mode lists it together with the previous attachments