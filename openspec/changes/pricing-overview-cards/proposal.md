## Why

`GeneralPricing` (`frontend/src/pages/general/GeneralPricing.tsx`) is the entry point of the pricing room (`/general/pricing`, gated by `ProtectedSubRoute(department="general", subModule="pricing")`). Its overview currently renders 3 flat cards — YCBG / BaoGia / DonHang — each showing only `total + QuocTe/NoiDia` via 9 parallel `getAll(1,1)` calls with duplicated `QuocTe`/`NoiDia` filters. Overtime and purchase pending badges are fetched separately with an extra 1-1000 client-side filter. The cards convey little operational signal: no status funnels, no monetary totals, no cost shape, and no aging warning.

The business needs a compact dashboard that lets pricing members see at a glance where the funnel is jammed, how much money is on the table, what pricing is locked, what overhead looks like, and what is waiting for approval or overdue — filtered by the existing month/year picker. Backend already supports `month`/`year` in list services and `quotationAgingService` exists but is unused. A single aggregated endpoint removes the 9+ round-trips and makes the cards data-rich without making them noisy.

## What Changes

- **Backend — new endpoint** `GET /api/pricing/overview?month&year` returning aggregated pricing overview for the selected period (or all time when params omitted):
  ```ts
  {
    requests:   { total: number, byStatus: Record<QuotationRequestStatus, number>, byCustomerType: { quocTe: number, noiDia: number } },
    quotations: { total: number, byStatus: Record<string, number>, byCustomerType: { quocTe: number, noiDia: number }, priceLockedCount: number },
    orders:     { total: number, byStatus: { production: Record<OrderProductionStatus, number>, payment: Record<OrderPaymentStatus, number> }, byCustomerType: { quocTe: number, noiDia: number }, totalValueVND: number },
    costs:      { generalTotal: number, exportTotal: number, avgGiaThanhNgay: number | null, topLoaiChiPhi: Array<{ loaiChiPhi: string, total: number, count: number }> },
    approvals:  { overtimePending: number, purchasePending: number },
    warnings:   { agingYellow: number, agingRed: number }
  }
  ```
  Auth required; accessible to anyone who can enter the pricing room (`ADMIN` or `hasSubModuleAccess("general","pricing")` equivalent). Implementation via Prisma `groupBy`/`count`/`aggregate` — no new tables, no migration.

- **Frontend — replace 3-card grid with 5-card 2-row dashboard** in `GeneralPricing`:
  - Row 1 (3 cols): YCBG funnel (total + 4 status pills `CHO_XU_LY/DANG_BAO_GIA/DA_BAO_GIA/HUY` + QuocTe/NoiDia), BaoGia (total + 5 grouped statuses + `priceLocked` badge), DonHang (total + `totalValueVND` + production/payment breakdown).
  - Row 2 (3-col grid with 2 cards spanning): ChiPhi (general+export totals + avg `giaThanhNgay` + top-2 `loaiChiPhi`) and ChoDuyet&CanhBao (overtimePending + purchasePending + aging yellow/red).
  - Single fetch `GET /api/pricing/overview?month&year` replaces all `fetchAllStats` + badge fetches. Preserve month/year selects and loading/error states. Keep existing tab logic and 6 tabs unchanged; cards remain clickable to switch tabs (`requests`/`quotes`/`orders`/`costs`/`overtime-review`/`purchase-review`).

- **Not changed**: tab definitions/ordering/content, 6 tab components, `ExportCostManagement`, Prisma enums/schemas, module routing, auth, LLM. No migration. Existing list endpoints remain untouched.

## Capabilities

### New Capabilities
- `pricing-overview-dashboard`: 5-card 2-row pricing room dashboard — YCBG funnel, grouped quotation statuses with price-locked count, order monetary + production/payment breakdown, cost totals/avg/top-type, and pending-approval + aging warnings — all from one aggregated endpoint.
- `pricing-overview-api`: `GET /api/pricing/overview` aggregated read model for pricing domain (requests/quotations/orders/costs/approvals/warnings) with `month`/`year` filter.

### Modified Capabilities
- `pricing-quotation-request`: overview previously summarized as `total + QuocTe/NoiDia` only; now shows full status funnel in dashboard (list behavior unchanged).
- `pricing-quotation`: overview previously `total + QuocTe/NoiDia` only; now shows grouped status breakdown + `priceLocked` count.
- `pricing-order`: overview previously `total + QuocTe/NoiDia` only; now shows `totalValueVND` and production/payment status breakdown.

## Impact

**Frontend**: `frontend/src/pages/general/GeneralPricing.tsx` (overview fetch + 5-card layout, Vietnamese copy, `openspec/ui-dna.md` tokens), new `frontend/src/services/pricingOverviewService.ts` and optional `frontend/src/hooks/usePricingOverview.ts` (TanStack Query, key factory `{ all, overview(month,year) }`), reuse `hasSubModuleAccess` for card gating if needed.

**Backend**: `backend/src/services/pricingOverviewService.ts` (aggregation helpers), `backend/src/controllers/pricingOverviewController.ts` (query validation, `month` 1-12 / `year` 4-digit, standard `{success,data}` envelope), `backend/src/routes/pricingOverviewRoutes.ts`, entry in `backend/src/routes/index.ts` `ROUTE_MAP` (`pricingOverview → /api/pricing/overview`), `backend/src/types` if shared DTO added.

**Verification**: `npx tsc --noEmit` (backend) and `npx tsc --noEmit -p tsconfig.app.json` (frontend) must pass (0 errors, no `TS2304`); `npm --prefix backend run lint` / `npm --prefix frontend run lint`; `npm --prefix backend run test` (new service/controller tests, existing suites still green); manual on dev DB with GENERAL/pricing user toggling month/year.

**Not affected**: 6 tabs and their management components, `ExportCostManagement`, Prisma schema, purchasing/business/overtime pages, status enums.
