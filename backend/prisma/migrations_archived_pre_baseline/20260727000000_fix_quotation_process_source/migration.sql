-- Fix: Bảng tính chi phí (quotation_calculator_products) đang trỏ productionProcessId
-- vào bảng template (common.processes) thay vì bảng sản xuất thật (common.production_processes).
-- Root cause: commit 3e0481b (2026-05-27) đổi từ productionProcessService sang processService
-- với chẩn đoán sai. ProductionProcess CÓ quan hệ flowchart, chỉ là dữ liệu chưa có lúc đó.
--
-- Migration này update productionProcessId sang đúng production_processes.id,
-- cập nhật maQuyTrinhSanXuat/tenQuyTrinhSanXuat từ production_processes,
-- và NULL flowchartData để code fallback sang flowchart mới (có soLuongKeHoach).
--
-- AN TOAN: Chỉ update khi có ĐÚNG MỘT ProductionProcess khớp processId.
-- Nếu 1 template -> nhiều QTSX thì BỎ QUA (không đoán), user xử lý thủ công.
-- Idempotent: WHERE clause tự loại các dòng đã đúng (productionProcessId đã tồn tại trong production_processes).

UPDATE business.quotation_calculator_products AS qcp
SET
  "productionProcessId" = pp.id,
  "maQuyTrinhSanXuat" = pp."maQuyTrinhSanXuat",
  "tenQuyTrinhSanXuat" = COALESCE(pp."tenQuyTrinhSanXuat", pp."tenQuyTrinh"),
  "flowchartData" = NULL
FROM common.production_processes AS pp
WHERE
  -- Chỉ xử lý các dòng đang trỏ sai vào bảng template
  qcp."productionProcessId" IS NOT NULL
  AND qcp."productionProcessId" NOT IN (SELECT id FROM common.production_processes)
  AND qcp."productionProcessId" IN (SELECT id FROM common.processes)
  -- Join: tìm production_process tương ứng qua processId
  AND pp."processId" = qcp."productionProcessId"
  -- An toàn: chỉ update khi mapping là duy nhất (1 template -> 1 QTSX)
  AND (
    SELECT COUNT(*) FROM common.production_processes pp2
    WHERE pp2."processId" = qcp."productionProcessId"
  ) = 1;
