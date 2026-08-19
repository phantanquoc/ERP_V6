import ExcelJS from 'exceljs';
import type { Response } from 'express';
import path from 'path';
import fs from 'fs';
import prisma from '@config/database';
import { COMPANY_HEADER, BM_CODES } from '../constants/warehouseCatalogs';

type SlipType = 'receipt' | 'issue';

const COL_WIDTHS = [6, 14, 12, 18, 10, 10, 10, 10, 12, 12, 10, 12, 12, 18];

function styleHeaderCell(cell: ExcelJS.Cell) {
  cell.font = { name: 'Times New Roman', size: 9, bold: true, color: { argb: 'FFFFFFFF' } };
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } } as any;
  cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  cell.border = thinBorder();
}
function thinBorder(): Partial<ExcelJS.Borders> {
  const s: Partial<ExcelJS.Border> = { style: 'thin', color: { argb: 'FF000000' } };
  return { top: s, left: s, bottom: s, right: s };
}
function styleDataCell(cell: ExcelJS.Cell, opts?: { bold?: boolean }) {
  cell.font = { name: 'Times New Roman', size: 9, bold: !!opts?.bold };
  cell.alignment = { vertical: 'middle', wrapText: true };
  cell.border = thinBorder();
}

function parseKienJson(v: string | null | undefined): string[] {
  if (!v) return [];
  try { const a = JSON.parse(v); if (Array.isArray(a)) return a.map(String); } catch {}
  return v.split(',').map(s => s.trim()).filter(Boolean);
}

function toHeaderDate(d: Date | string): string {
  const dt = new Date(d as any);
  const dd = String(dt.getDate()).padStart(2,'0');
  const mm = String(dt.getMonth()+1).padStart(2,'0');
  const yy = String(dt.getFullYear());
  return `${dd}/${mm}/${yy}`;
}

async function buildWorkbook(type: SlipType, id: string): Promise<{ wb: ExcelJS.Workbook; ws: ExcelJS.Worksheet; fileName: string; slip: any }> {
  const isReceipt = type === 'receipt';
  let slip: any;
  if (isReceipt) {
    slip = await (prisma as any).warehouseReceipt.findUnique({ where: { id }, include: { items: { orderBy: { stt: 'asc' } } } });
  } else {
    slip = await (prisma as any).warehouseIssue.findUnique({ where: { id }, include: { items: { orderBy: { stt: 'asc' } } } });
  }
  if (!slip) throw new Error('Không tìm thấy phiếu');

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(isReceipt ? 'PhieuNhap' : 'PhieuXuat', {
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9 as unknown as number, horizontalCentered: true },
  });
  ws.properties.defaultRowHeight = 15;
  ws.pageSetup.margins = { left: 0.2, right: 0.2, top: 0.2, bottom: 0.2, header: 0.2, footer: 0.2 };
  ws.pageSetup.printArea = `A1:N${Math.max(20, 10 + (slip.items?.length ?? 0) + 8)}`;

  // Columns: 14 cols A..N
  ws.columns = COL_WIDTHS.map((w, i) => ({ width: w, key: `c${i}` }));

  const title = isReceipt ? 'PHIẾU NHẬP KHO' : 'PHIẾU XUẤT KHO';
  const bmCode = isReceipt ? BM_CODES.receipt : BM_CODES.issue;

  // Company header rows (1-3)
  ws.mergeCells('A1:N1'); ws.getCell('A1').value = COMPANY_HEADER.name;
  ws.getCell('A1').font = { name: 'Times New Roman', size: 10, bold: true };
  ws.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
  ws.mergeCells('A2:N2'); ws.getCell('A2').value = `${COMPANY_HEADER.address}  ĐT: ${COMPANY_HEADER.phone}  Fax: ${COMPANY_HEADER.fax}`;
  ws.getCell('A2').font = { name: 'Times New Roman', size: 8 };
  ws.getCell('A2').alignment = { horizontal: 'center' };
  ws.mergeCells('A3:N3'); ws.getCell('A3').value = title;
  ws.getCell('A3').font = { name: 'Times New Roman', size: 14, bold: true };
  ws.getCell('A3').alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(3).height = 22;

  // Requester / department / reason / date row (4-6)
  const dateStr = toHeaderDate(slip.ngayNhap ?? slip.ngayXuat ?? new Date());
  const nguoiDeNghi = slip.nguoiDeNghi ?? slip.tenNhanVien ?? '';
  const boPhan = slip.boPhan ?? '';
  const reason = isReceipt ? (slip.mucDich ?? '') : (slip.lyDoXuatKho ?? slip.ghiChu ?? '');
  ws.mergeCells('A4:G4'); ws.getCell('A4').value = `Người đề nghị: ${nguoiDeNghi}`;
  ws.mergeCells('H4:N4'); ws.getCell('H4').value = `Ngày: ${dateStr}`;
  ws.mergeCells('A5:G5'); ws.getCell('A5').value = `Bộ phận: ${boPhan}`;
  ws.mergeCells('A6:N6'); ws.getCell('A6').value = `${isReceipt ? 'Mục đích' : 'Lý do xuất'}: ${reason}`;
  for (const r of [4,5,6]) { ws.getRow(r).font = { name: 'Times New Roman', size: 9 }; }

  // Header rows 8-9: 14 cols, first row merged groups
  const headerRow = 8;
  const subRow = 9;
  // Build row 8: for split groups, put group name merged across KH/TT
  // Layout: A TT, B Ma hang, C Loai Kho, D Ten hang, E-F So lo (KH/TT), G-H So kien (KH/TT), I Tinh trang, J Quy cach, K Don vi, L-M So luong (KH/TT), N Ghi chu
  const setH = (col: string, v: string) => { const c = ws.getCell(`${col}${headerRow}`); c.value = v; styleHeaderCell(c); };
  const setSub = (col: string, v: string) => { const c = ws.getCell(`${col}${subRow}`); c.value = v; styleHeaderCell(c); };
  setH('A','TT'); setH('B','Mã hàng hóa'); setH('C','Loại Kho'); setH('D','Tên hàng hóa');
  // So lo group
  ws.mergeCells(`E${headerRow}:F${headerRow}`); setH('E','Số lô');
  ws.mergeCells(`G${headerRow}:H${headerRow}`); setH('G','Số kiện');
  setH('I','Tình trạng'); setH('J','Quy cách'); setH('K','Đơn vị');
  ws.mergeCells(`L${headerRow}:M${headerRow}`); setH('L','Số lượng');
  setH('N','Ghi chú');
  // Sub-row 9: KH/TT for split groups, empty for singles (keep border)
  const blankSub = (col: string) => { const c = ws.getCell(`${col}${subRow}`); c.value = ''; styleHeaderCell(c); };
  blankSub('A'); blankSub('B'); blankSub('C'); blankSub('D');
  setSub('E','Kế hoạch'); setSub('F','Thực tế');
  setSub('G','Kế hoạch'); setSub('H','Thực tế');
  blankSub('I'); blankSub('J'); blankSub('K');
  setSub('L','Kế hoạch'); setSub('M','Thực tế');
  blankSub('N');
  ws.getRow(headerRow).height = 18;
  ws.getRow(subRow).height = 16;

  // Data rows from subRow+1
  let rIdx = subRow + 1;
  const items: any[] = slip.items ?? [];
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    const soKienKH = parseKienJson(it.soKienKeHoach).join(', ');
    const soKienTT = parseKienJson(it.soKienThucTe).join(', ') || (it.maKien ?? '');
    const soLoKH = it.soLoKeHoach ?? '';
    const soLoTT = it.soLoThucTe ?? it.tenLo ?? '';
    const soLuongKH = it.soLuongYeuCau ?? it.soLuongThucTe;
    const soLuongTT = it.soLuongThucTe;
    const cols: Array<{ col: string; val: any; align?: string }> = [
      { col: 'A', val: it.stt ?? (i+1), align: 'center' },
      { col: 'B', val: it.lotProductId ? (it.maKien ?? it.lotProductId.slice(-6)) : '' },
      { col: 'C', val: it.tenKho ?? '' },
      { col: 'D', val: it.tenSanPham ?? '' },
      { col: 'E', val: soLoKH },
      { col: 'F', val: soLoTT },
      { col: 'G', val: soKienKH },
      { col: 'H', val: soKienTT },
      { col: 'I', val: it.tinhTrang ?? '' },
      { col: 'J', val: it.quyCach ?? '' },
      { col: 'K', val: it.donViTinh ?? '' },
      { col: 'L', val: soLuongKH },
      { col: 'M', val: soLuongTT },
      { col: 'N', val: it.ghiChu ?? '' },
    ];
    for (const { col, val, align } of cols) {
      const c = ws.getCell(`${col}${rIdx}`);
      c.value = val as any;
      styleDataCell(c);
      if (align) c.alignment = { ...(c.alignment as any), horizontal: align as any };
    }
    ws.getRow(rIdx).height = 16;
    rIdx++;
  }
  if (items.length === 0) {
    ws.mergeCells(`A${rIdx}:N${rIdx}`); const c = ws.getCell(`A${rIdx}`); c.value = 'Không có dòng hàng'; c.alignment = { horizontal: 'center' }; styleDataCell(c); rIdx++;
  }

  // Totals row
  const totalActual = items.reduce((s: number, it: any) => s + Number(it.soLuongThucTe || 0), 0);
  const totalPlan = items.reduce((s: number, it: any) => s + Number(it.soLuongYeuCau ?? it.soLuongThucTe ?? 0), 0);
  ws.mergeCells(`A${rIdx}:K${rIdx}`); ws.getCell(`A${rIdx}`).value = 'Tổng cộng'; ws.getCell(`A${rIdx}`).alignment = { horizontal: 'right' }; styleDataCell(ws.getCell(`A${rIdx}`), { bold: true });
  ws.getCell(`L${rIdx}`).value = totalPlan; styleDataCell(ws.getCell(`L${rIdx}`), { bold: true });
  ws.getCell(`M${rIdx}`).value = totalActual; styleDataCell(ws.getCell(`M${rIdx}`), { bold: true });
  styleDataCell(ws.getCell(`N${rIdx}`)); rIdx++;

  // Signatures
  rIdx += 1;
  if (isReceipt) {
    ws.mergeCells(`A${rIdx}:G${rIdx}`); ws.getCell(`A${rIdx}`).value = 'Người nhập kho\n(Ký, ghi rõ họ tên)'; ws.getCell(`A${rIdx}`).alignment = { horizontal: 'center', wrapText: true }; ws.getCell(`A${rIdx}`).font = { name: 'Times New Roman', size: 9, bold: true };
    ws.mergeCells(`H${rIdx}:N${rIdx}`); ws.getCell(`H${rIdx}`).value = 'Quản lý kho\n(Ký, ghi rõ họ tên)'; ws.getCell(`H${rIdx}`).alignment = { horizontal: 'center', wrapText: true }; ws.getCell(`H${rIdx}`).font = { name: 'Times New Roman', size: 9, bold: true };
  } else {
    ws.mergeCells(`A${rIdx}:E${rIdx}`); ws.getCell(`A${rIdx}`).value = 'Người xuất kho\n(Ký, ghi rõ họ tên)'; ws.getCell(`A${rIdx}`).alignment = { horizontal: 'center', wrapText: true }; ws.getCell(`A${rIdx}`).font = { name: 'Times New Roman', size: 9, bold: true };
    ws.mergeCells(`F${rIdx}:J${rIdx}`); ws.getCell(`F${rIdx}`).value = 'Người nhận\n(Ký, ghi rõ họ tên)'; ws.getCell(`F${rIdx}`).alignment = { horizontal: 'center', wrapText: true }; ws.getCell(`F${rIdx}`).font = { name: 'Times New Roman', size: 9, bold: true };
    ws.mergeCells(`K${rIdx}:N${rIdx}`); ws.getCell(`K${rIdx}`).value = 'Quản lý kho\n(Ký, ghi rõ họ tên)'; ws.getCell(`K${rIdx}`).alignment = { horizontal: 'center', wrapText: true }; ws.getCell(`K${rIdx}`).font = { name: 'Times New Roman', size: 9, bold: true };
  }
  rIdx += 1;

  // BM footer + kien note
  ws.mergeCells(`A${rIdx}:N${rIdx}`); ws.getCell(`A${rIdx}`).value = `${bmCode}   ${BM_CODES.version}   ${BM_CODES.kienNote}`;
  ws.getCell(`A${rIdx}`).font = { name: 'Times New Roman', size: 7, italic: true, color: { argb: 'FF666666' } };
  ws.getCell(`A${rIdx}`).alignment = { horizontal: 'center' };

  // Logo (best-effort)
  try {
    const candidates = [
      path.resolve(process.cwd(), 'frontend/public/abf-logo.png'),
      path.resolve(__dirname, '../../../frontend/public/abf-logo.png'),
      path.resolve(__dirname, '../../frontend/public/abf-logo.png'),
    ];
    for (const p of candidates) {
      if (fs.existsSync(p)) {
        const ext = path.extname(p).slice(1).toLowerCase() as 'png' | 'jpg' | 'jpeg';
        const imgId = wb.addImage({ filename: p, extension: ext === 'jpg' ? 'jpeg' : ext } as any);
        // Top-left, small
        ws.addImage(imgId, { tl: { col: 0, row: 0 }, ext: { width: 70, height: 28 } } as any);
        break;
      }
    }
  } catch {}

  const fileName = isReceipt ? `phieu-nhap-${slip.maPhieuNhap ?? id}.xlsx` : `phieu-xuat-${slip.maPhieuXuat ?? id}.xlsx`;
  return { wb, ws, fileName, slip };
}

export async function exportReceiptXlsx(id: string, res: Response): Promise<void> {
  const { wb, fileName } = await buildWorkbook('receipt', id);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
  await wb.xlsx.write(res);
}

export async function exportIssueXlsx(id: string, res: Response): Promise<void> {
  const { wb, fileName } = await buildWorkbook('issue', id);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
  await wb.xlsx.write(res);
}

export default { exportReceiptXlsx, exportIssueXlsx };
