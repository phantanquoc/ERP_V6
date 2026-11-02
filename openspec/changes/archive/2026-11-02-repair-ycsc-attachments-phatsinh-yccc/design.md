# Design

## Context

See proposal.md for motivation. Constraints that shape this design:

- `RepairRequest` (schema `common`, god schema) has only `fileDinhKem String?`; routes use `createSingleUploadMiddleware('repair-requests')` (field `file`); the frontend modal's create/edit pickers write into `selectedFiles`, but the YCSC save path reads a dead `selectedFile` state that is never set — files are silently dropped end-to-end.
- `InspectionRequest` already implements the exact target behavior: `tepDinhKem String[]`, `createUploadMiddleware('inspection-requests', 4)` on field `files`, controller `mapUploadedFiles(req)`, service append-merge capped at `MAX_ATTACHMENT_FILES = 4` (`inspectionRequestService.ts:678-694`).
- YCCC creation from inside the slip exists only at create time (`RepairRequestFormModal.tsx:1133-1239`); backend endpoints `POST /:id/material-needs` and `POST /:id/supply-links` (requireTechnical) are unused after create. Cost math already counts linked YCCCs (`cost-summary`), so a new linked YCCC flows into "Thực tế" automatically.
- The modal already hosts an inline `SupplyRequestDetailModal` (`RepairRequestFormModal.tsx:2653`); navigating to `?tab=supplyRequest&supplyRequestId=` unmounts the slip modal — documented in that comment.

## Goals / Non-Goals

**Goals:**
- YCSC attachments behave exactly like YCKT's (≤4, append-on-update, create/edit/view wired).
- A single in-slip flow to raise a material YCCC mid-repair, mirroring the create-time flow's requester resolution and toasts.
- Create-time YCCC carries the attachments picked in the form.

**Non-Goals:**
- Deleting individual attachments (YCKT has no delete UI either).
- Changing `cost-summary` math, YCCC status rules, or `SupplyRequestDetailModal` itself.
- Status guards beyond hiding the block on `DA_HUY`.
- Atomic multi-call backend endpoint (create YCCC + link + needs in one transaction) — frontend orchestration with staged toasts matches the existing create-time flow.

## Decisions

1. **Array column + append-merge, mirroring YCKT — not a child table.** AGENTS.md prefers child tables over JSON columns, but attachments-as-URL-list is the established pattern (`SupplyRequest.tepDinhKem`, `ReplenishmentRequest`, `PurchaseRequest`, `InspectionRequest`). A join table would diverge from 5 sibling models for no behavioral gain. `fileDinhKem` stays untouched for legacy rows; display unions both (already implemented in the shared view/edit blocks).
   *Alternative considered:* single-file fix (wire `selectedFile`) — rejected: user chose 4-file parity with YCKT/YCCC.

2. **Switch both POST and PUT to `createUploadMiddleware('repair-requests', 4)` (field `files`).** Multer `.array('files', 4)` rejects a 5th file with `LIMIT_UNEXPECTED_FILE` (request fails, nothing dropped). Controller maps `req.files` on create and appends on update; body-level `fileDinhKem` passthrough kept for compatibility. Only caller of the old `file` field is `frontend/src/services/repairRequestService.ts` — verified, gets updated in the same change.

3. **Merge logic duplicated locally in `repairRequestService`, not imported from inspection.** ~20 lines with a local `MAX_ATTACHMENT_FILES = 4`; cross-service constant import would couple two domains for a number. Cap violation throws `ValidationError('Mỗi phiếu tối đa 4 tệp đính kèm')` *before* any write so the update stays atomic.

4. **Phát-sinh creation order: validate → create YCCC → link → material needs.** YCCC is the high-value artifact; a step-1 failure must leave zero side effects (full pre-validation first). Link/need failures only degrade annotation quality and are recoverable (warning toasts; the "Chưa tạo YCCC" state, if ever reached, has the shortcut to re-run creation).
   *Alternative considered:* needs-first (matches create-time order) — rejected: a YCCC-creation failure would strand orphan material needs with no YCCC to show for them.

5. **Reuse, don't navigate.** After creation: invalidate `repairRequestKeys.detail/supplyChain/costSummary/materialNeeds` + `supplyRequests`, then `setSelectedSupplyId(newId)` to open the existing inline detail modal. No URL param — URL navigation unmounts the slip modal (documented at `RepairRequestFormModal.tsx:2652`).

6. **Gating: `!readOnly && can('supply-requests', 'CREATE', role) && trangThai !== 'DA_HUY'`, view mode only.** Frontend hides the block; backend remains the authority (`requireRule('supply-requests','CREATE')` on YCCC create, `requireTechnical` on link/needs) — a 403 surfaces via `getApiErrorMessage`. Money-row incidental-cost editing keeps its current `readOnly`-only gating (unchanged behavior).

7. **Extract two local helpers inside `RepairRequestFormModal.tsx`** rather than new files: (a) goods-rows editor component shared by the create-time YCCC section and the phát-sinh block (state type `MaterialDraft` already exists), (b) `resolveYcccRequester(viewUser, employees)` extracted verbatim from lines 1137-1188 (employee match, missing-employee error, `boPhan` fallback to `Kỹ thuật`). Keeps blast radius inside one already-owned file; no new file risks the >800-line gate.

## Risks / Trade-offs

- [Migration on `common.prisma` (god schema)] → purely additive column with default; run `prisma migrate dev` + `prisma generate` immediately; rollback = drop column (uploaded files remain on disk, harmless).
- [Modal file grows further (~2658 → ~2900 lines)] → additions are localized (one panel block + one section tweak); helpers extracted as local component/functions; no new god file created.
- [Multer field rename `file` → `files` breaks unknown callers] → grep confirms sole caller is `repairRequestService.ts`; both change together.
- [Double counting in cost summary] → impossible by construction: goods rows only ever enter via YCCC price×qty; money rows only via `RepairIncidentalCost.soTien`; the two sources are disjoint and `cost-summary` sums both once each.
- [Attachments cannot be removed once added] → same limitation as YCKT/YCCC today; documented as non-goal, revisit separately.
- [Front-end gate disagrees with backend rules for exotic roles] → backend always enforces; frontend mismatch only wastes a click, surfaces as error toast.

## Migration Plan

1. Add column → `npx prisma migrate dev` → `npx prisma generate` (same session; stale client is a known gotcha).
2. Deploy backend + frontend together (old FE with new BE: sends no `files`, still works; new FE with old BE: would 404-style fail on `files` field — so deploy backend first, then frontend).
3. Rollback: revert code, `migrate dev` down / drop `tep_dinh_kem` — no data loss beyond new attachments.

## Open Questions

None — all decisions above are locked; remaining choices (copy strings, exact block layout) are implementation-level and covered by specs' observable behavior.