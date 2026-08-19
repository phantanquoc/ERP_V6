## Context

`GeneralPricing` (`frontend/src/pages/general/GeneralPricing.tsx`) is the pricing-room entry (`/general/pricing`, gated by `ProtectedSubRoute(department="general", subModule="pricing")` → `hasSubModuleAccess("general","pricing")`). It has 6 tabs (`requests`/`quotes`/`orders`/`costs`/`overtime-review`/`purchase-review`) and a `selectedMonth`/`selectedYear` picker that already threads `month`/`year` into list services. The overview above the tabs is the problem: 3 uniform cards (YCBG, BaoGia, DonHang) each showing only `total + QuocTe/NoiDia`. Data comes from 9 parallel `getAll(1,1)` calls (all + QuocTe + NoiDia per domain) plus two extra fetches for badges — `overtimePlanService.getAll({ trangThai: "CHO_DUYET" })` and a 1-1000 `purchaseRequestService.getAllPurchaseRequests` filtered client-side for "Cho duyet". Month/year correctly scopes the 9 stats calls; badge counts are unscoped backlog. `quotationAgingService.getAgingWarnings` exists but is unused in this page. Cards are clickable (`setActiveTab`) and the rest of the page (tab bar, 6 management components) is expected to stay untouched.

Prisma domains involved (no schema change):
- `QuotationRequest` (`business` schema) — `status: QuotationRequestStatus` = `CHO_XU_LY | DANG_BAO_GIA | DA_BAO_GIA | HUY`; FK `customerId` → `InternationalCustomer`, denormalized `maKhachHang/tenKhachHang`, date `ngayYeuCau`.
- `Quotation` (`business`) — `tinhTrang: QuotationStatus` 9 values (`DRAFT`, `DANG_CHO_PHAN_HOI`, `DANG_CHO_GUI_DON_HANG`, `DA_DAT_HANG`, `KHONG_DAT_HANG`, `SENT`, `APPROVED`, `REJECTED`, `EXPIRED`), `priceLocked: Boolean`, `daysOpen` (derived `now - ngayBaoGia` for non-terminal), `hieuLucBaoGia: Int?`, monetary `giaBaoKhach`, date `ngayBaoGia`, FK `quotationRequestId`/`customerId`.
- `Order` (`business`) — `trangThaiSanXuat: OrderProductionStatus` 7 values (`CHO_LEN_KE_HOACH`…`DA_GIAO_CHO_KHACH_HANG`), `trangThaiThanhToan: OrderPaymentStatus` 3 values (`DA_THANH_TOAN_DOT_1`/`CHO_THANH_TOAN_DOT_2`/`DA_THANH_TOAN_DU`), `giaTriDonHangVND/USD: Float?`, dates `ngayDatHang`, `ngayGiaoHang`.
- `GeneralCost` / `ExportCost` (`business`) — `loaiChiPhi: String`, `giaThanhNgay: Float?`, `donViTien: String?` (default VND), `donViTinh`, `tenChiPhi`.
- `OvertimePlan` (`common` schema) — `trangThai: OvertimePlanStatus` (`CHO_DUYET` is pending), with `OvertimePlanItem` children.
- `PurchaseRequest` (`business_production` schema) — `trangThai: String` pending is "Cho duyet" / "Chờ duyệt" (case/diacritic variants), polymorphic line types.
- `InternationalCustomer` distinguishes `QuocTe` vs `NoiDia` via `quocGia` (present → QuocTe) vs `tinhThanh`/`quanHuyen` without `quocGia` → NoiDia, which is what existing `customerType` filters implement.

Stack: Express 5 + Prisma on backend, React 18 + Vite + TanStack Query on frontend. Tokens in `openspec/ui-dna.md` — cool neutral base, blue primary, compact 8px rhythm, moderate consistent radii, dense-table typography, borders over shadows for inline content.

## Goals / Non-Goals

**Goals:**
- Replace the 3-card overview with a 5-card 2-row dashboard that is scannable in one glance, filtered by the existing month/year picker, without changing tab behavior or adding visual decoration that competes with business data.
- Collapse 11+ round-trips into one aggregated `GET /api/pricing/overview?month&year` read model, validated and auth-gated the same way as the pricing room.
- Surface the funnel and money that are invisible today: per-status funnels, grouped quotation statuses, `priceLocked` count, order monetary total, production/payment breakdown, cost shape (totals + avg daily + top types), and pending + aging warnings.
- Keep changes additive, migration-free, and `tsc --noEmit` clean on both sides.

**Non-Goals:**
- No Prisma schema/migration, no new tables, no `@@schema` changes.
- No change to tab definitions, ordering, icons, deep-link `?tab=` handling, or the 6 management components (including `ExportCostManagement` inside `costs`).
- No change to status enums, `advanceStatus` forward-only rules, or status-transition endpoints (`PATCH /status` is still forbidden as a generic endpoint).
- No new LLM provider, no `agent/registry.py` change, no AI-service change.
- No backend PDF/Excel generation, no new dependency.

## Decisions

### D1: One aggregated endpoint replaces 9+ list paginations

`GET /api/pricing/overview?month&year` returns the full dashboard payload in a single `{ success, data }` envelope (standard shape from `AGENTS.md`). Query params are optional; when omitted the endpoint aggregates all time. `month` must be 1-12 and `year` a 4-digit year when present — validated via zod at controller boundary, 400 on malformed input. A missing `month` without `year` (or vice versa) is accepted as partial filter (only provided dimension scopes; no implicit defaults). This eliminates 9 `getAll(1,1)` calls plus the 2 badge fetches and the client-side purchase-status scan, while preserving the call site that already had `month`/`year` support.

Rejected: keep client-side fan-out but memoize — still wastes DB connections and duplicates filter logic; a server-side `groupBy` is cheaper and authoritative.

### D2: Filter window semantics

Each domain scopes by its canonical business date when `month`/`year` are present, built as a half-open range `[from, to)` in UTC (server local is UTC in Docker):
- `QuotationRequest.ngayYeuCau`
- `Quotation.ngayBaoGia`
- `Order.ngayDatHang`
- `GeneralCost.createdAt` / `ExportCost.createdTo` (costs are master data; windowing by `createdAt` keeps the card comparable to other period cards and matches how `getAll` already windows — when windowed costs feel misleading, caller can omit params to see all-time overhead)
`approvals` and `warnings` are backlog, not period — they are counted un-windowed (current open queue). This matches current badge behavior (badges were fetched without `month`/`year`) and prevents a month filter from hiding overdue quotations.

### D3: Counting and grouping strategy (Prisma)

All domains use Prisma `groupBy`/`count`/`aggregate` inside one `Promise.all` fan-out (4-6 parallel aggregates), no N+1:
- `requests.byStatus` — `groupBy({ by: ['status'], where: requestWhere, _count: true })`, filling missing enum keys with 0 so the UI always sees the 4 pills in stable order (`CHO_XU_LY`, `DANG_BAO_GIA`, `DA_BAO_GIA`, `HUY`). `requests.byCustomerType` — two filtered counts reusing the same `requestWhere` plus customer-type clause (see D4), computed via `$transaction` or `Promise.all` of `count`. `total` is `count` with only the date window.
- `quotations.byStatus` — `groupBy({ by: ['tinhTrang'], ... })` over the 9 `QuotationStatus` values; frontend collapses them into 5 visual groups (see D6) but the API returns raw per-status map so grouping stays a presentation choice. Missing keys zero-filled. `priceLockedCount` via `count({ where: { ...quotationWhere, priceLocked: true } })`.
- `orders.byStatus` — two `groupBy`s: one on `trangThaiSanXuat`, one on `trangThaiThanhToan`, each zero-filled over their enums, returned as `{ production, payment }`. `totalValueVND` via `aggregate({ _sum: { giaTriDonHangVND: true }, where: orderWhere })`, null → 0, rounded to integer VND in response. `total` and `byCustomerType` mirror requests.
- `costs` — `count` for `generalTotal`/`exportTotal` (inventory shape), `aggregate({ _avg: { giaThanhNgay: true } })` over both tables union for `avgGiaThanhNgay` (null when no rows with non-null `giaThanhNgay`), and `groupBy({ by: ['loaiChiPhi'], _sum: { giaThanhNgay: true }, _count: true, orderBy: { _sum: { giaThanhNgay: 'desc' } }, take: 2 })` per table then merged, picking the top-2 `loaiChiPhi` across both domains by summed `giaThanhNgay`. Keeps the card to two chips as spec'd.
- `approvals` — `count({ where: { trangThai: OvertimePlanStatus.CHO_DUYET } })` and `count` on `PurchaseRequest` where normalized `trangThai` equals pending (see D4).
- `warnings` — filtered count on `Quotation` where `tinhTrang` is non-terminal and `daysOpen` band hits yellow/red (see D5).

All aggregates respect the date window except where D2 says otherwise. Results are plain JSON numbers, no Prisma decimals.

### D4: Customer type and pending-purchase normalization mirror existing services

`byCustomerType.quocTe/noiDia` must reproduce the filter that callers previously expressed as `customerType='Quoc tế'/'Nội địa'` to `getAll(..., customerType)` so the new totals equal the old card totals. Implementation reuses the same predicate the list services already use (presence of `InternationalCustomer.quocGia` vs absence), either via a relation filter (`customer: { quocGia: { not: null } }` vs `customer: { quocGia: null }`) or, when the schema stores no FK, via the existing helper that resolves the type from `tenKhachHang`/`maKhachHang` join — whichever path the current `quotationService`/`orderService` take. This avoids silent drift between overview and list totals.

Purchase pending normalization trims, lower-cases, strips diacritics, and maps `trangThai` to a canonical token, treating `"chờ duyệt"`, `"cho duyet"`, `"cho_duyet"` as equal. Mirrors the client filter currently at `GeneralPricing.tsx:88-91` so the migrated badge count does not change.

### D5: Aging bands reuse existing frontend thresholds

`QuotationManagement.tsx:23-26` defines `getAgingBand(daysOpen,status)` with `NON_TERMINAL_STATUSES` guard, `>=14` → red, `>=AGING_THRESHOLD` (7) → yellow. Backend `warnings` recomputes the same bands server-side: `daysOpen = floor((now - ngayBaoGia)/86400000)` for quotations whose `tinhTrang` is in non-terminal (`DRAFT`, `DANG_CHO_PHAN_HOI`, `DANG_CHO_GUI_DON_HANG`, `SENT`, `APPROVED` — whichever constant list `QuotationManagement` uses), then `agingYellow = count(daysOpen >=7 && daysOpen <14)`, `agingRed = count(daysOpen >=14)`. Yellow and red are mutually exclusive buckets so `yellow + red` is total at-risk. Threshold constants are extracted to a shared `backend/src/constants/quotationAging.ts` so frontend and backend import one truth (fallback: duplicate constants with a test asserting equality).

### D6: Quotation status 5-group presentation

The API returns all 9 per-status counts; the dashboard card groups them into 5 pills for scanability:
1. `Nháp` — `DRAFT`
2. `Chờ phản hồi` — `DANG_CHO_PHAN_HOI | SENT`
3. `Chờ gửi ĐH` — `DANG_CHO_GUI_DON_HANG | APPROVED`
4. `Đã đặt` — `DA_DAT_HANG`
5. `Không đặt/Hủy/Hết hạn` — `KHONG_DAT_HANG | REJECTED | EXPIRED`

Group totals are sums of their members. The `priceLocked` badge is shown beside the header (lock icon + count) and is independent of groups — a quotation can be in any non-terminal status while `priceLocked=true`. If design review prefers no grouping, the card falls back to rendering only the top-5 by count plus an overflow count.

### D7: Auth and room gate match the page gate

Anyone who can enter `/general/pricing` can read the overview. Backend gate mirrors `ProtectedSubRoute` via a helper `isPricingMember(user)` that checks `ADMIN` bypass, then `department === GENERAL` with `DEPARTMENT_HEAD|TEAM_LEAD`, or `EMPLOYEE` whose `subDepartment` or `secondaryDepartments` includes `pricing` — the same predicate introduced in `pricing-room-review-tabs` as `isPricingApprover(user)`. Endpoint is `authenticate` + `isPricingMember` → 403 otherwise. No broader `authorize(...roles)` is needed because room membership is narrower than role alone.

### D8: Frontend replaces fetch with one query and a 5-card 2-row layout

New `frontend/src/services/pricingOverviewService.ts` exposing `getOverview(month?, year?): Promise<PricingOverview>` with the typed DTO above, calling `GET /api/pricing/overview` via the shared `apiClient`. New `frontend/src/hooks/usePricingOverview.ts` wrapping TanStack Query with key factory `{ all: ['pricingOverview'], overview: (m,y) => [...all, 'overview', m, y] }`, `staleTime` ~60s, `refetchOnWindowFocus: false` (pricing stats are not chatty). `GeneralPricing.tsx` replaces `fetchAllStats`/`fetchPendingCounts` and their 5 pieces of `useState` with a single `usePricingOverview(selectedMonth, selectedYear)` call; `isLoading` shows skeletons per card, `isError` shows a Vietnamese inline retry (`"Không tải được tổng quan. Thử lại."`).

Layout (desktop): `grid grid-cols-1 lg:grid-cols-3` Row 1 with 3 equal cards (`YCBG funnel`, `BaoGia`, `DonHang`); `grid grid-cols-1 lg:grid-cols-3` Row 2 with 2 cards where `ChiPhi` spans 2 cols and `ChoDuyet&CanhBao` spans 1 col on `lg` (`lg:col-span-2` / `lg:col-span-1`), stacking to single column below `lg`. Cards use `openspec/ui-dna.md` tokens: white surface, `border` (not heavy shadow), `rounded-xl` (moderate radii), `space-y-3` with compact 8px rhythm inside, blue primary for totals/action, green/red only as semantic accents (price-locked, aging red). No new dependency, no chart library — pills, compact badges, and tabular breakdowns provide density without decoration. Cards stay clickable (`onClick → setActiveTab`) with `hover:border-blue-300`/`hover:shadow-sm` matching current `hover:border-*-400` intent but softer.

Empty/noise rules per UI DNA: empty breakdown rows omitted (e.g., if a production status bucket is 0 across the dataset, hide its row); `totalValueVND` formats as `vi-VN` VND with `—` when 0; `avgGiaThanhNgay` shows `—` when null; `topLoaiChiPhi` hides when empty rather than showing placeholder chips.

### D9: Vietnamese copy and compact formatting

All user-facing strings are Vietnamese, concise, operational: headers `Yêu cầu báo giá`, `Báo giá`, `Đơn hàng`, `Chi phí`, `Chờ duyệt & Cảnh báo`; pills use status short names in Vietnamese; monetary `totalValueVND` uses `toLocaleString('vi-VN') + ' VND'`; counts are locale integers. Dates not rendered in cards; cards show only aggregated counts and currencies per spec — no raw IDs, no internal status codes exposed without labels.

### D10: No schema change, index reliance, and performance bounds

The endpoint reads existing B-tree indexes on `ngayYeuCau`/`ngayBaoGia`/`ngayDatHang`/`createdAt` and `status`/`tinhTrang`/`trangThai` columns; `groupBy` benefits from composite `(status, ngayYeuCau)`-style indexes where present but does not require new ones for the expected volumes (pricing domain is hundreds to low thousands, not millions). Queries run in parallel; expected p95 < 200ms for a filtered month, < 500ms all-time. If a table lacks the needed index, the change notes it but does not create one — index tuning is a follow-up.

## Risks / Trade-offs

- **Customer-type predicate drift** — `byCustomerType` could diverge from list-service totals if the predicate is re-implemented rather than reused → Mitigation: extract/share the same helper or copy its exact where-clause and add a test asserting overview `quocTe+noiDia ≤ total` and, when customer type is mandatory, `quocTe+noiDia == total`; manual spot-check old card numbers vs new endpoint on dev DB.
- **Month/year timezone edge** — constructing `[from,to)` in the wrong timezone could miscount boundary days → Mitigation: use UTC date construction in service, test with a record at 00:00+07 vs 17:00Z previous day.
- **Cost averaging skew** — averaging `giaThanhNgay` across sparse rows with many nulls could mislead → Mitigation: `_avg` in Prisma ignores nulls by design; document that avg is over non-null daily costs only, and show count alongside avg in tooltip.
- **Aging threshold divergence** — frontend and backend aging constants could drift → Mitigation: shared constant file and a test pinning both to 7/14.
- **Backlog vs period confusion** — users might expect `approvals`/`warnings` to be period-filtered → Mitigation: label the card footer `"Tồn chờ xử lý"` and tooltip `"Không áp dụng bộ lọc tháng/năm"`.
- **Over-grouping quotations** — 5-group rollup might hide a status the team watches → Mitigation: API still returns full per-status map; card can expand on click or fall back to top-N rendering without re-querying.

## Migration Plan

- No migration. Backend ships first — new `GET /api/pricing/overview` is additive; old `getAll` endpoints unchanged so deployed frontend keeps working.
- Frontend swaps overview fetch to the new endpoint; fallback is to keep old fan-out behind a flag until verified — feature-flag not required, but rollback is simply reverting `GeneralPricing.tsx` and keeping the endpoint.
- Deploy order: migrate-free backend → frontend. No DB backup needed beyond normal deploys.
- Rollback: revert frontend page and optionally leave endpoint in place (read-only, no data impact).

## Open Questions

- None — scope, card inventory, response shape, filter semantics, and gating are fixed by this spec. One optional product decision for implementation: whether `costs` should be period-windowed or always all-time — spec chooses windowed with null-safe avg, but product may prefer all-time overhead; trivial to switch by removing cost `where` clause.
