## Why

Product codes (`InternationalProduct.maSanPham`) were auto-generated and read-only. `generateProductCode()` read the highest `SP-` code and added one, giving an unbounded `SP-001`, `SP-002`, … sequence, and `ProductFormModal` marked the field `readOnly` in both create and edit mode.

Production data told a different story. None of the 77 products used `SP-NNN`. Every code was a two-segment string whose prefix already encoded a finer classification than `loaiSanPham` did:

- `NLT-TMITL`, `NLT-TXOAIK` — fresh fruit
- `NLD-DUAHL`, `NLD02-XK`, `NLĐ-XOAIK1` — frozen material, three spellings of one group
- `BB01-CT` … `BB06-GVS` — packaging and consumables, split across six numbered prefixes
- `SPK-MIA7`, `MSLB-B17`, `MSSS-B7` — dried product, three prefixes for one category

So the auto-generator had effectively never been used: someone was entering codes by another route, under a convention the application did not know about. Meanwhile `loaiSanPham` held five values with two overlapping pairs (*Nguyên liệu* / *Nguyên vật liệu*, *Sản phẩm* / *Thành phẩm*), the `product_categories` table held four names that did not match those five, and one prefix (`BB06`) appeared under two different categories.

Three defects followed from the gap between the code's assumptions and the data:

1. **A code generator that produces `SPNaN`.** `finishedProductService` selected the last code with `startsWith: 'SP'`, which matches the 20 real `SPK-*` and `SPD-*` codes in production. `parseInt('K-MSV2')` is `NaN`, so the generated code was the literal string `SPNaN`. Verified by running the expression; no such row existed yet, but the next finished-product entry naming a product that does not exist would have created one.

2. **The category taxonomy could not be corrected.** Renaming a category updated `loaiSanPham` on its products but nothing else, and since nothing tied a code to a category, the prefix and the category could disagree indefinitely.

3. **Đơn vị tính was invisible.** The `donViTinh` column existed and was written by two auto-create paths, but no screen displayed or edited it, so it could not be maintained.

## What Changes

Codes become `LOAI-STT-TENVIETTAT` (for example `NLT-001-MTLB`), **user-editable**, with the system offering a suggestion rather than owning the value. The category abbreviation is **derived from the category name** — first letter of each word, diacritics stripped — so there is no separate abbreviation field to keep in sync, and renaming a category rewrites the code prefix of its products.

- **Editable code.** `maSanPham` accepts a hand-typed value on create and update, validated for uniqueness (excluding the row itself). The only hard constraint is the existing `@unique`.
- **Suggestion from name + category.** The client requests a suggestion once both are filled; automatic suggestion stops as soon as the user edits the code, so a typed code is never silently replaced.
- **Rename cascade with preview.** Renaming a category rewrites the prefix of every three-segment code in it, inside one transaction, after the UI has shown the exact list of `maCu → maMoi` pairs for confirmation. Legacy codes that do not follow the format are left untouched.
- **Abbreviation collisions rejected.** Two categories whose names abbreviate to the same prefix (*Nguyên liệu* and *Nhiên liệu* are both `NL`) are refused at save time rather than auto-suffixed, which would produce prefixes nobody can predict from the name.
- **Đơn vị tính exposed.** Added to the create/edit form, the list table and the detail modal, and to the Excel export. No migration: the column already existed.
- **Catalogue rebuilt from the official spreadsheet.** 7 categories, 53 products; codes regenerated under the new rule.
- **`SPNaN` fixed.** Both auto-create paths (`finishedProductService`, `warehouseReceiptService`) now use the shared utility instead of prefix-matching on `'SP'`.

### Decisions worth recording

**Name abbreviation is capped at 10 characters, not 6.** At 6, real catalogue entries collided: "Mít sấy Lá Bàng loại vụn to" and "…loại vụn nhỏ" both became `MSLBLV`, as did several B / B-dầu and A / A-logo pairs. The sequence number keeps codes unique either way, but a tail that cannot distinguish two products defeats the purpose of putting the name in the code. 10 removes every collision in the current data.

**Acronyms and digit groups survive whole.** `abbreviateVietnamese` keeps a token that is already all-caps (`PE`) and any run of digits, rather than reducing it to an initial, because the existing codes follow that convention (`BB02-TPE60`, `BB03-MPE50`). Truncation happens on a token boundary so a number is never cut in half — `TPE60`, never `TPE601`.

**Sequence numbers count per category, never reused.** Each category numbers from `001` independently, and the next number comes from the maximum in use rather than a row count, so deleting a product does not cause its number to be handed out again.

**Codes are not parsed to derive meaning anywhere.** A hand-edited code that ignores the format must keep working; the format matters only when generating a suggestion and when rewriting a prefix.

## Impact

- Affected specs: `product-catalogue` (new)
- Affected code:
  - `backend/src/utils/productCode.ts` (new) — abbreviation, suggestion, prefix rewrite
  - `backend/src/services/internationalProductService.ts` — generate / create / update, rename cascade + preview, abbreviation-collision guard, writable-field whitelist, Excel export
  - `backend/src/services/finishedProductService.ts`, `warehouseReceiptService.ts` — `SPNaN` fix
  - `backend/src/controllers/internationalProductController.ts`, `routes/internationalProductRoutes.ts` — suggestion params, `POST /categories/rename-preview`
  - `frontend/src/utils/productCode.ts` (new) — display-only mirror of the backend abbreviation
  - `frontend/src/components/products/ProductFormModal.tsx`, `ProductDetailModal.tsx`, `CategorySettingsModal.tsx`, `InternationalProductManagement.tsx`, `services/internationalProductService.ts`
  - `backend/scripts/import-product-catalogue.ts` (new) — rebuild the catalogue from the spreadsheet
- Data: 77 → 56 products. 46 updated, 7 created, 27 deleted, 3 kept because quotations reference them, 1 duplicate merged into its canonical row with its quotation repointed.
- Not done: `loaiSanPham` remains a free-text string rather than a foreign key to `ProductCategory`. Converting it is a wider refactor and was left out.
