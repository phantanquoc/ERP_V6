-- Migration: Normalize code formats based on actual DB data
-- Only transforms known old patterns. Custom codes (DM-MIT-DEO, MS-01, VP001, etc.) are left untouched.
-- Master data  → PREFIX-SEQ (no year)
-- Transactions → PREFIX-YEAR-SEQ
-- Employees    → NV{pad4} (no dash) — only NVxxx pattern, not VP/other prefixes

-- ============================================================
-- common.employees — NV001/NV002.../NV000 → NV0001/NV0002.../NV0000
-- Only transforms NV + exactly 3 digits (old format)
-- ============================================================
UPDATE common.employees
SET "employeeCode" = 'NV' || LPAD(REGEXP_REPLACE("employeeCode", '^NV', ''), 4, '0')
WHERE "employeeCode" ~ '^NV\d{3}$';

-- ============================================================
-- common.processes — QT-SAY-MIT and other non-numeric: leave untouched
-- Only transforms QT-NNN (3 digits, no year)
-- ============================================================
UPDATE common.processes
SET "maQuyTrinh" = 'QT-' || LPAD(SPLIT_PART("maQuyTrinh", '-', 2), 3, '0')
WHERE "maQuyTrinh" ~ '^QT-\d{1,3}$';

-- ============================================================
-- common.production_processes — QTSX-2026-001 → QTSX-001
-- Only transforms QTSX-YYYY-NNN (has year)
-- ============================================================
UPDATE common.production_processes
SET "maQuyTrinhSanXuat" = 'QTSX-' || LPAD(SPLIT_PART("maQuyTrinhSanXuat", '-', 3), 3, '0')
WHERE "maQuyTrinhSanXuat" ~ '^QTSX-\d{4}-\d+$';

-- ============================================================
-- common.material_standards — DM-MIT-DEO, DM-MIT-GION: leave untouched
-- Only transforms DM-NNN (3 digits)
-- ============================================================
UPDATE common.material_standards
SET "maDinhMuc" = 'DM-' || LPAD(SPLIT_PART("maDinhMuc", '-', 2), 3, '0')
WHERE "maDinhMuc" ~ '^DM-\d{1,3}$';

-- ============================================================
-- business.material_evaluations — MC-2026-001 → MC-001
-- Only transforms MC-YYYY-NNN (has year)
-- ============================================================
UPDATE business.material_evaluations
SET "maChien" = 'MC-' || LPAD(SPLIT_PART("maChien", '-', 3), 3, '0')
WHERE "maChien" ~ '^MC-\d{4}-\d+$';

-- ============================================================
-- business.machines — MS-01, MS-02, MV-01: leave untouched (custom format)
-- Only transforms MAY-NNN or MAYNNN
-- ============================================================
UPDATE business.machines
SET "maMay" = 'MAY-' || LPAD(REGEXP_REPLACE("maMay", '^MAY-?', ''), 3, '0')
WHERE "maMay" ~ '^MAY-?\d+$';

-- ============================================================
-- business.international_products
-- SP001..SP005 → SP-006..SP-010 (avoid collision with existing SP-001, SP-002)
-- SP-001, SP-002 already correct → skip
-- ============================================================
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (ORDER BY "createdAt" ASC) AS rn
  FROM business.international_products
  WHERE "maSanPham" ~ '^SP\d+$'
)
UPDATE business.international_products p
SET "maSanPham" = 'SP-' || LPAD(
  (100 + ranked.rn)::text,  -- offset by 100 to avoid any collision
  3, '0'
)
FROM ranked
WHERE p.id = ranked.id;

-- ============================================================
-- business.suppliers
-- NCC001/NCC002/NCC003 → offset to avoid collision with NCC-TEST-001, NCC-MW-001
-- Use offset 100 to be safe
-- ============================================================
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY "createdAt" ASC) AS rn
  FROM business.suppliers
  WHERE "maNhaCungCap" ~ '^NCC\d+$'
)
UPDATE business.suppliers s
SET "maNhaCungCap" = 'NCC-' || LPAD((100 + ranked.rn)::text, 3, '0')
FROM ranked
WHERE s.id = ranked.id;

-- ============================================================
-- business.customers
-- KH001..KH004 → offset to avoid collision with existing KHQT/KHND codes
-- KHQT-001..KHND-009 already correct → skip
-- ============================================================
WITH ranked_qt AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY "createdAt" ASC) AS rn
  FROM business.customers
  WHERE "maKhachHang" ~ '^KH\d+$' AND "quocGia" IS NOT NULL
),
max_qt AS (
  SELECT COALESCE(MAX(CAST(SPLIT_PART("maKhachHang", '-', 2) AS INTEGER)), 0) AS mx
  FROM business.customers WHERE "maKhachHang" ~ '^KHQT-\d+$'
)
UPDATE business.customers c
SET "maKhachHang" = 'KHQT-' || LPAD((max_qt.mx + ranked_qt.rn)::text, 3, '0')
FROM ranked_qt, max_qt
WHERE c.id = ranked_qt.id;

WITH ranked_nd AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY "createdAt" ASC) AS rn
  FROM business.customers
  WHERE "maKhachHang" ~ '^KH\d+$' AND "quocGia" IS NULL
),
max_nd AS (
  SELECT COALESCE(MAX(CAST(SPLIT_PART("maKhachHang", '-', 2) AS INTEGER)), 0) AS mx
  FROM business.customers WHERE "maKhachHang" ~ '^KHND-\d+$'
)
UPDATE business.customers c
SET "maKhachHang" = 'KHND-' || LPAD((max_nd.mx + ranked_nd.rn)::text, 3, '0')
FROM ranked_nd, max_nd
WHERE c.id = ranked_nd.id;

-- ============================================================
-- business.general_costs — CP-C01..CP-C05: leave untouched (custom)
-- Only transforms CP-NNN (3 digits)
-- ============================================================
UPDATE business.general_costs
SET "maChiPhi" = 'CP-' || LPAD(SPLIT_PART("maChiPhi", '-', 2), 3, '0')
WHERE "maChiPhi" ~ '^CP-\d{1,3}$';

-- ============================================================
-- business.export_costs — CP-XK01..CP-XK05: leave untouched (custom)
-- Only transforms CPXK-NNN (3 digits)
-- ============================================================
UPDATE business.export_costs
SET "maChiPhi" = 'CPXK-' || LPAD(SPLIT_PART("maChiPhi", '-', 2), 3, '0')
WHERE "maChiPhi" ~ '^CPXK-\d{1,3}$';

-- ============================================================
-- business.quotation_requests
-- YCBG-2026-001..003 already correct
-- YCBG-2027, YCBG-2028 → these look like year-only (no seq) — assign seq
-- ============================================================
WITH ranked AS (
  SELECT id, REGEXP_REPLACE("maYeuCauBaoGia", '^YCBG-', '') AS yr
  FROM business.quotation_requests
  WHERE "maYeuCauBaoGia" ~ '^YCBG-\d{4}$'
)
UPDATE business.quotation_requests r
SET "maYeuCauBaoGia" = 'YCBG-' || ranked.yr || '-001'
FROM ranked
WHERE r.id = ranked.id;

-- ============================================================
-- business.quotations — BG-2026-001..003 already correct
-- ============================================================

-- ============================================================
-- business.orders — DH-2026-001..003 already correct
-- ============================================================

-- ============================================================
-- business.supply_requests
-- YCCU-2026-001 → YC-CC-2026-001
-- YC-CC001 → YC-CC-YEAR-NNN (sequential within year, offset after existing)
-- ============================================================
UPDATE business.supply_requests
SET "maYeuCau" = REGEXP_REPLACE("maYeuCau", '^YCCU-', 'YC-CC-')
WHERE "maYeuCau" ~ '^YCCU-\d{4}-\d+$';

WITH existing_max AS (
  SELECT EXTRACT(YEAR FROM "ngayYeuCau")::text AS yr,
         COALESCE(MAX(CAST(SPLIT_PART("maYeuCau", '-', 4) AS INTEGER)), 0) AS mx
  FROM business.supply_requests
  WHERE "maYeuCau" ~ '^YC-CC-\d{4}-\d+$'
  GROUP BY EXTRACT(YEAR FROM "ngayYeuCau")::text
),
ranked AS (
  SELECT sr.id, EXTRACT(YEAR FROM sr."ngayYeuCau")::text AS yr,
         ROW_NUMBER() OVER (PARTITION BY EXTRACT(YEAR FROM sr."ngayYeuCau") ORDER BY sr."ngayYeuCau" ASC) AS rn
  FROM business.supply_requests sr
  WHERE sr."maYeuCau" ~ '^YC-CC\d+$'
)
UPDATE business.supply_requests sr
SET "maYeuCau" = 'YC-CC-' || ranked.yr || '-' || LPAD((COALESCE(em.mx, 0) + ranked.rn)::text, 3, '0')
FROM ranked
LEFT JOIN existing_max em ON em.yr = ranked.yr
WHERE sr.id = ranked.id;

-- ============================================================
-- business.purchase_requests
-- YCMH-2026-001 → YC-MH-2026-001
-- YC-MH0001 → YC-MH-YEAR-NNN (sequential, offset after existing)
-- ============================================================
UPDATE business.purchase_requests
SET "maYeuCau" = REGEXP_REPLACE("maYeuCau", '^YCMH-', 'YC-MH-')
WHERE "maYeuCau" ~ '^YCMH-\d{4}-\d+$';

WITH existing_max AS (
  SELECT EXTRACT(YEAR FROM "ngayYeuCau")::text AS yr,
         COALESCE(MAX(CAST(SPLIT_PART("maYeuCau", '-', 4) AS INTEGER)), 0) AS mx
  FROM business.purchase_requests
  WHERE "maYeuCau" ~ '^YC-MH-\d{4}-\d+$'
  GROUP BY EXTRACT(YEAR FROM "ngayYeuCau")::text
),
ranked AS (
  SELECT pr.id, EXTRACT(YEAR FROM pr."ngayYeuCau")::text AS yr,
         ROW_NUMBER() OVER (PARTITION BY EXTRACT(YEAR FROM pr."ngayYeuCau") ORDER BY pr."ngayYeuCau" ASC) AS rn
  FROM business.purchase_requests pr
  WHERE pr."maYeuCau" ~ '^YC-MH\d+$'
)
UPDATE business.purchase_requests pr
SET "maYeuCau" = 'YC-MH-' || ranked.yr || '-' || LPAD((COALESCE(em.mx, 0) + ranked.rn)::text, 3, '0')
FROM ranked
LEFT JOIN existing_max em ON em.yr = ranked.yr
WHERE pr.id = ranked.id;

-- ============================================================
-- common.repair_requests
-- SC-TEST-001, SC-002, YC-TEST-001, YC-TEST-WS: leave untouched (custom/test data)
-- Only transforms YC-{13digits} (timestamp format)
-- ============================================================
WITH ranked AS (
  SELECT id, EXTRACT(YEAR FROM "ngayThang")::text AS yr,
         ROW_NUMBER() OVER (PARTITION BY EXTRACT(YEAR FROM "ngayThang") ORDER BY "ngayThang" ASC) AS rn
  FROM common.repair_requests
  WHERE "maYeuCau" ~ '^YC-\d{10,}$'
)
UPDATE common.repair_requests r
SET "maYeuCau" = 'YC-SC-' || ranked.yr || '-' || LPAD(ranked.rn::text, 3, '0')
FROM ranked
WHERE r.id = ranked.id;

-- ============================================================
-- business.invoices — HD001 → HD-YEAR-001 (use ngayLap year)
-- ============================================================
UPDATE business.invoices
SET "soHoaDon" = 'HD-' || EXTRACT(YEAR FROM "ngayLap")::text || '-' ||
  LPAD(REGEXP_REPLACE("soHoaDon", '^HD', ''), 3, '0')
WHERE "soHoaDon" ~ '^HD\d+$';

-- ============================================================
-- common.leave_requests — NP-001 → NP-YEAR-001 (use startDate year)
-- ============================================================
UPDATE common.leave_requests
SET "code" = 'NP-' || EXTRACT(YEAR FROM "startDate")::text || '-' ||
  LPAD(REGEXP_REPLACE("code", '^NP-', ''), 3, '0')
WHERE "code" ~ '^NP-\d{1,3}$';

-- ============================================================
-- common.private_feedbacks — GY-001/KK-001 → GY-YEAR-001/KK-YEAR-001
-- ============================================================
UPDATE common.private_feedbacks
SET "code" = 'GY-' || EXTRACT(YEAR FROM "date")::text || '-' ||
  LPAD(REGEXP_REPLACE("code", '^GY-', ''), 3, '0')
WHERE "code" ~ '^GY-\d{1,3}$';

UPDATE common.private_feedbacks
SET "code" = 'KK-' || EXTRACT(YEAR FROM "date")::text || '-' ||
  LPAD(REGEXP_REPLACE("code", '^KK-', ''), 3, '0')
WHERE "code" ~ '^KK-\d{1,3}$';

-- ============================================================
-- business.warehouse_receipts — PN{YYYYMMDD}{SEQ} → PN-YEAR-SEQ
-- ============================================================
WITH ranked AS (
  SELECT id, EXTRACT(YEAR FROM "ngayNhap")::text AS yr,
         ROW_NUMBER() OVER (PARTITION BY EXTRACT(YEAR FROM "ngayNhap") ORDER BY "ngayNhap" ASC) AS rn
  FROM business.warehouse_receipts
  WHERE "maPhieuNhap" ~ '^PN\d{12}$'
)
UPDATE business.warehouse_receipts r
SET "maPhieuNhap" = 'PN-' || ranked.yr || '-' || LPAD(ranked.rn::text, 3, '0')
FROM ranked
WHERE r.id = ranked.id;

-- ============================================================
-- business.warehouse_issues — PX-{YYYYMMDD}-{SEQ} → PX-YEAR-SEQ
-- ============================================================
WITH ranked AS (
  SELECT id, EXTRACT(YEAR FROM "ngayXuat")::text AS yr,
         ROW_NUMBER() OVER (PARTITION BY EXTRACT(YEAR FROM "ngayXuat") ORDER BY "ngayXuat" ASC) AS rn
  FROM business.warehouse_issues
  WHERE "maPhieuXuat" ~ '^PX-\d{8}-\d+$'
)
UPDATE business.warehouse_issues r
SET "maPhieuXuat" = 'PX-' || ranked.yr || '-' || LPAD(ranked.rn::text, 3, '0')
FROM ranked
WHERE r.id = ranked.id;

-- ============================================================
-- DENORMALIZED COPIES — sync after source tables updated
-- ============================================================

-- quotations: maYeuCauBaoGia
UPDATE business.quotations q
SET "maYeuCauBaoGia" = qr."maYeuCauBaoGia"
FROM business.quotation_requests qr
WHERE q."quotationRequestId" = qr.id
  AND q."maYeuCauBaoGia" != qr."maYeuCauBaoGia";

-- quotation_calculators: maYeuCauBaoGia
UPDATE business.quotation_calculators qc
SET "maYeuCauBaoGia" = qr."maYeuCauBaoGia"
FROM business.quotation_requests qr
WHERE qc."quotationRequestId" = qr.id
  AND qc."maYeuCauBaoGia" != qr."maYeuCauBaoGia";

-- orders: maBaoGia, maYeuCauBaoGia
UPDATE business.orders o
SET "maBaoGia" = q."maBaoGia"
FROM business.quotations q
WHERE o."quotationId" = q.id
  AND o."maBaoGia" != q."maBaoGia";

UPDATE business.orders o
SET "maYeuCauBaoGia" = qr."maYeuCauBaoGia"
FROM business.quotation_requests qr
WHERE o."quotationRequestId" = qr.id
  AND o."maYeuCauBaoGia" != qr."maYeuCauBaoGia";

-- tax_reports: maDonHang
UPDATE business.tax_reports tr
SET "maDonHang" = o."maDonHang"
FROM business.orders o
WHERE tr."orderId" = o.id
  AND tr."maDonHang" != o."maDonHang";

-- acceptance_handovers: maYeuCauSuaChua
UPDATE common.acceptance_handovers ah
SET "maYeuCauSuaChua" = rr."maYeuCau"
FROM common.repair_requests rr
WHERE ah."repairRequestId" = rr.id
  AND ah."maYeuCauSuaChua" != rr."maYeuCau";

-- quotation_calculator_products: maBaoGia
UPDATE business.quotation_calculator_products qcp
SET "maBaoGia" = q."maBaoGia"
FROM business.quotation_calculators qc
JOIN business.quotation_requests qr ON qc."quotationRequestId" = qr.id
JOIN business.quotations q ON q."quotationRequestId" = qr.id
WHERE qcp."calculatorId" = qc.id
  AND qcp."maBaoGia" != q."maBaoGia";

-- quotations: maDinhMuc
UPDATE business.quotations q
SET "maDinhMuc" = ms."maDinhMuc"
FROM common.material_standards ms
WHERE q."materialStandardId" = ms.id
  AND q."maDinhMuc" IS NOT NULL
  AND q."maDinhMuc" != ms."maDinhMuc";

-- quotation_calculator_products: maDinhMuc, maQuyTrinhSanXuat
UPDATE business.quotation_calculator_products qcp
SET "maDinhMuc" = ms."maDinhMuc"
FROM common.material_standards ms
WHERE qcp."materialStandardId" = ms.id
  AND qcp."maDinhMuc" IS NOT NULL
  AND qcp."maDinhMuc" != ms."maDinhMuc";

UPDATE business.quotation_calculator_products qcp
SET "maQuyTrinhSanXuat" = pp."maQuyTrinhSanXuat"
FROM common.production_processes pp
WHERE qcp."productionProcessId" = pp.id
  AND qcp."maQuyTrinhSanXuat" IS NOT NULL
  AND qcp."maQuyTrinhSanXuat" != pp."maQuyTrinhSanXuat";

-- system_operations, finished_products, quality_evaluations: maChien
UPDATE business.system_operations so
SET "maChien" = me."maChien"
FROM business.material_evaluations me
WHERE so."materialEvaluationId" = me.id
  AND so."maChien" != me."maChien";

UPDATE business.finished_products fp
SET "maChien" = me."maChien"
FROM business.material_evaluations me
WHERE fp."materialEvaluationId" = me.id
  AND fp."maChien" != me."maChien";

UPDATE business.quality_evaluations qe
SET "maChien" = me."maChien"
FROM business.material_evaluations me
WHERE qe."materialEvaluationId" = me.id
  AND qe."maChien" != me."maChien";

-- customers: maKhachHang denormalized copies
UPDATE business.quotations q
SET "maKhachHang" = c."maKhachHang"
FROM business.customers c
WHERE q."customerId" = c.id
  AND q."maKhachHang" != c."maKhachHang";

UPDATE business.quotation_requests qr
SET "maKhachHang" = c."maKhachHang"
FROM business.customers c
WHERE qr."customerId" = c.id
  AND qr."maKhachHang" != c."maKhachHang";

UPDATE business.orders o
SET "maKhachHang" = c."maKhachHang"
FROM business.customers c
WHERE o."customerId" = c.id
  AND o."maKhachHang" != c."maKhachHang";

-- debts: maNhaCungCap (string ref, no FK — same regex as suppliers)
UPDATE business.debts
SET "maNhaCungCap" = 'NCC-' || LPAD(REGEXP_REPLACE("maNhaCungCap", '^NCC', ''), 3, '0')
WHERE "maNhaCungCap" ~ '^NCC\d+$';

-- production_reports: maDinhMuc (string ref, no FK)
UPDATE business.production_reports
SET "maDinhMuc" = 'DM-' || LPAD(SPLIT_PART("maDinhMuc", '-', 2), 3, '0')
WHERE "maDinhMuc" ~ '^DM-\d{1,3}$';

-- quotation_calculator_general_costs: maChiPhi
UPDATE business.quotation_calculator_general_costs qcgc
SET "maChiPhi" = gc."maChiPhi"
FROM business.general_costs gc
WHERE qcgc."generalCostId" = gc.id
  AND qcgc."maChiPhi" != gc."maChiPhi";

-- quotation_calculator_export_costs: maChiPhi
UPDATE business.quotation_calculator_export_costs qcec
SET "maChiPhi" = ec."maChiPhi"
FROM business.export_costs ec
WHERE qcec."exportCostId" = ec.id
  AND qcec."maChiPhi" != ec."maChiPhi";
