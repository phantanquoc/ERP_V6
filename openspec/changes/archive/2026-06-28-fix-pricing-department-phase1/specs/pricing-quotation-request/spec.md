## ADDED Requirements

### Requirement: Server-driven pagination for quotation request list

The `GET /api/quotation-requests` endpoint SHALL return paginated results driven entirely by server-side `page`, `limit`, `search`, `customerType`, `status`, `dateFrom`, and `dateTo` query parameters and SHALL NOT require the client to download more rows than the page size. `limit` MUST be one of `10`, `20`, `50`, `100` with default `20`. The response envelope MUST be `{ success: true, data: QuotationRequest[], pagination: { page, limit, total, totalPages } }`.

#### Scenario: Default page size

- **WHEN** the client calls `GET /api/quotation-requests` without `page` or `limit`
- **THEN** the server returns at most 20 rows with `pagination.page === 1` and `pagination.limit === 20`

#### Scenario: Custom page and limit

- **WHEN** the client calls `GET /api/quotation-requests?page=3&limit=50`
- **THEN** the server returns up to 50 rows from the third page

#### Scenario: Invalid limit falls back to default

- **WHEN** the client calls `GET /api/quotation-requests?limit=37`
- **THEN** the server returns 20 rows and `pagination.limit === 20`

#### Scenario: Search and customer type filter combined

- **WHEN** the client calls `GET /api/quotation-requests?search=mango&customerType=QUOC_TE`
- **THEN** the server returns only international-customer rows whose searchable fields contain "mango"

### Requirement: Quotation request service exposes items array

The frontend `QuotationRequest` TypeScript interface SHALL declare `items: QuotationRequestItem[]` matching the backend payload and consumers SHALL access items through the typed property without `any` casts.

#### Scenario: Listing rows preserves items array typing

- **WHEN** a component reads `request.items` after fetching the list
- **THEN** TypeScript resolves the field to `QuotationRequestItem[]` and rejects any `(request as any).items` cast added in the source

#### Scenario: Empty items array

- **WHEN** a quotation request has no items
- **THEN** `request.items` equals `[]` (never `undefined` or `null` in the typed shape returned by the service)
