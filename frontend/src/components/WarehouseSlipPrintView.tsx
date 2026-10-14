import React, { useEffect, useRef } from 'react';
import type { WarehouseReceiptLine } from '../services/warehouseReceiptService';
import type { WarehouseIssueLine } from '../services/warehouseIssueService';
import { totalsByUnit } from '../utils/warehouseSlipTotals';
import { displayLoaiKho, displayMaHang } from '../utils/warehouseSlipLines';
import { COMPANY_HEADER, BM_CODES } from '../constants/warehouseCatalogs';
import abfLogo from '@assets/abf-logo.png';

interface WarehouseSlipPrintViewProps {
  type: 'receipt' | 'issue';
  maPhieu: string;
  ngay: string;
  tenNhanVien: string;
  maNhanVien: string;
  ghiChu?: string;
  mucDich?: string;
  lyDoXuatKho?: string;
  lyDoChenhLech?: string;
  nguoiDeNghi?: string;
  boPhan?: string;
  items: (WarehouseReceiptLine | WarehouseIssueLine)[];
  isVoided?: boolean;
  voidReason?: string | null;
  daIn?: boolean;
  onClose: () => void;
  onMarkPrinted?: () => void;
}

function parseKienDisplay(v: unknown): string {
  if (!v) return '';
  if (Array.isArray(v)) return v.join(', ');
  try { const a = JSON.parse(String(v)); if (Array.isArray(a)) return a.join(', '); } catch { /* ignore */ }
  return String(v);
}

const nf = new Intl.NumberFormat('vi-VN');
function fmtNum(v: unknown): string {
  if (v == null || v === '') return '';
  const n = Number(v);
  if (Number.isNaN(n)) return String(v);
  return nf.format(n);
}

const PRINT_CSS = `
@media print {
  * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  body.printing * { visibility: hidden; }
  body.printing .print-overlay, body.printing .print-overlay * { visibility: visible; }
  body.printing .print-overlay { position: absolute !important; left: 0 !important; top: 0 !important; width: 100% !important; background: white !important; }
  .no-print { display: none !important; }
  .print-page { box-shadow: none !important; margin: 0 !important; max-width: none !important; }
  thead { display: table-header-group !important; }
  tr { page-break-inside: avoid; break-inside: avoid; }
  .void-watermark { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; opacity: 0.12 !important; }
  @page { size: A4 landscape; margin: 8mm; }
}
`;

const WarehouseSlipPrintView: React.FC<WarehouseSlipPrintViewProps> = ({
  type, maPhieu, ngay, tenNhanVien, maNhanVien, ghiChu, mucDich, lyDoXuatKho, lyDoChenhLech, nguoiDeNghi, boPhan, items, isVoided, voidReason, onClose, onMarkPrinted,
}) => {
  const isReceipt = type === 'receipt';
  const title = isReceipt ? 'PHIẾU NHẬP KHO' : 'PHIẾU XUẤT KHO';
  const bmCode = isReceipt ? BM_CODES.receipt : BM_CODES.issue;
  const markedRef = useRef(false);

  const markPrintedOnce = () => {
    if (markedRef.current) return;
    markedRef.current = true;
    try { onMarkPrinted?.(); } catch { /* ignore */ }
  };

  const handlePrint = () => {
    markPrintedOnce();
    window.print();
  };

  useEffect(() => {
    const style = document.createElement('style');
    style.setAttribute('data-print-overlay', 'warehouse-slip');
    style.textContent = PRINT_CSS;
    document.head.appendChild(style);
    document.body.classList.add('printing');

    const onBeforePrint = () => markPrintedOnce();
    const onAfterPrint = () => { /* keep marked guard so Ctrl+P twice doesn't double-fire in same mount */ };

    window.addEventListener('beforeprint', onBeforePrint);
    window.addEventListener('afterprint', onAfterPrint);
    // Chrome also fires matchMedia
    const mql = window.matchMedia('print');
    const mqlHandler = (e: MediaQueryListEvent) => { if (e.matches) markPrintedOnce(); };
    // mql.addEventListener not in old Safari
    try { mql.addEventListener('change', mqlHandler); } catch { mql.addListener(mqlHandler as never); }

    return () => {
      style.remove();
      document.body.classList.remove('printing');
      window.removeEventListener('beforeprint', onBeforePrint);
      window.removeEventListener('afterprint', onAfterPrint);
      try { mql.removeEventListener('change', mqlHandler); } catch { mql.removeListener(mqlHandler as never); }
    };
  }, []);

  const headerDate = ngay;

  return (
    <div className="print-overlay" role="dialog" aria-modal="true" aria-label={title}>
      <div className="print-controls no-print" style={{ display: 'flex', gap: 8, padding: 12, justifyContent: 'flex-end' }}>
        <button type="button" onClick={handlePrint} className="btn-print px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">In phiếu</button>
        <button type="button" onClick={onClose} className="btn-close-print px-4 py-2 border rounded hover:bg-gray-50">Đóng</button>
      </div>

      <div className="print-page" style={{ background: 'white', margin: '0 auto', maxWidth: 1100, padding: 16, position: 'relative', overflow: 'hidden' }}>
        {isVoided && (
          <div className="void-watermark" style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', opacity: 0.12, transform: 'rotate(-30deg)', fontSize: 96, fontWeight: 800, color: '#dc2626', letterSpacing: 8, zIndex: 10 }}>ĐÃ VÔ HIỆU</div>
        )}
        {/* Company header + logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, borderBottom: '2px solid #1f2937', paddingBottom: 8, marginBottom: 8 }}>
          <img src={abfLogo} alt="ABF" style={{ height: 36, objectFit: 'contain' }} onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')} />
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontFamily: 'Times New Roman', fontWeight: 700, fontSize: 11 }}>{COMPANY_HEADER.name}</div>
            <div style={{ fontFamily: 'Times New Roman', fontSize: 8, color: '#4b5563' }}>{COMPANY_HEADER.address}  ĐT: {COMPANY_HEADER.phone}  Email: {COMPANY_HEADER.email}  Website: {COMPANY_HEADER.website}</div>
          </div>
        </div>

        <div style={{ textAlign: 'center', fontFamily: 'Times New Roman', fontWeight: 700, fontSize: 16, marginBottom: 8 }}>{title}</div>

        {/* Meta rows */}
        <div style={{ fontFamily: 'Times New Roman', fontSize: 10, marginBottom: 8, lineHeight: 1.6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <span><strong>Người đề nghị:</strong> {nguoiDeNghi || tenNhanVien || '—'}</span>
            <span><strong>Ngày:</strong> {headerDate}</span>
          </div>
          <div><strong>Bộ phận:</strong> {boPhan || '—'}</div>
          <div><strong>{isReceipt ? 'Mục đích' : 'Lý do xuất'}:</strong> {(isReceipt ? mucDich : lyDoXuatKho) || ghiChu || '—'}</div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <span><strong>Mã phiếu:</strong> {maPhieu}</span>
            <span><strong>Nhân viên:</strong> {tenNhanVien} ({maNhanVien})</span>
          </div>
          {ghiChu && (isReceipt ? mucDich : lyDoXuatKho) ? <div><strong>Ghi chú:</strong> {ghiChu}</div> : null}
          {lyDoChenhLech ? <div><strong>Lý do chênh lệch:</strong> {lyDoChenhLech}</div> : null}
          {isVoided && voidReason ? <div style={{ color: '#dc2626', fontWeight: 600 }}><strong>Lý do vô hiệu:</strong> {voidReason}</div> : null}
        </div>

        {/* 14-col table with merged header groups: So lo(2), So kien(2), So luong(2) */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'Times New Roman', fontSize: 8, tableLayout: 'fixed', wordBreak: 'break-word' }}>
            <thead>
              <tr>
                <th rowSpan={2} style={{ border: '1px solid #000', background: '#4472C4', color: 'white', padding: '4px 2px', textAlign: 'center', fontWeight: 700, width: 28 }}>TT</th>
                <th rowSpan={2} style={{ border: '1px solid #000', background: '#4472C4', color: 'white', padding: '4px 2px', textAlign: 'center', fontWeight: 700 }}>Mã hàng hóa</th>
                <th rowSpan={2} style={{ border: '1px solid #000', background: '#4472C4', color: 'white', padding: '4px 2px', textAlign: 'center', fontWeight: 700 }}>Loại Kho</th>
                <th rowSpan={2} style={{ border: '1px solid #000', background: '#4472C4', color: 'white', padding: '4px 2px', textAlign: 'center', fontWeight: 700 }}>Tên hàng hóa</th>
                <th colSpan={2} style={{ border: '1px solid #000', background: '#4472C4', color: 'white', padding: '4px 2px', textAlign: 'center', fontWeight: 700 }}>Số lô</th>
                <th colSpan={2} style={{ border: '1px solid #000', background: '#4472C4', color: 'white', padding: '4px 2px', textAlign: 'center', fontWeight: 700 }}>Số kiện</th>
                <th rowSpan={2} style={{ border: '1px solid #000', background: '#4472C4', color: 'white', padding: '4px 2px', textAlign: 'center', fontWeight: 700 }}>Tình trạng</th>
                <th rowSpan={2} style={{ border: '1px solid #000', background: '#4472C4', color: 'white', padding: '4px 2px', textAlign: 'center', fontWeight: 700 }}>Quy cách</th>
                <th rowSpan={2} style={{ border: '1px solid #000', background: '#4472C4', color: 'white', padding: '4px 2px', textAlign: 'center', fontWeight: 700 }}>Đơn vị</th>
                <th colSpan={2} style={{ border: '1px solid #000', background: '#4472C4', color: 'white', padding: '4px 2px', textAlign: 'center', fontWeight: 700 }}>Số lượng</th>
                <th rowSpan={2} style={{ border: '1px solid #000', background: '#4472C4', color: 'white', padding: '4px 2px', textAlign: 'center', fontWeight: 700 }}>Ghi chú</th>
              </tr>
              <tr>
                <th style={{ border: '1px solid #000', background: '#4472C4', color: 'white', padding: '2px', textAlign: 'center', fontSize: 7 }}>Kế hoạch</th>
                <th style={{ border: '1px solid #000', background: '#4472C4', color: 'white', padding: '2px', textAlign: 'center', fontSize: 7 }}>Thực tế</th>
                <th style={{ border: '1px solid #000', background: '#4472C4', color: 'white', padding: '2px', textAlign: 'center', fontSize: 7 }}>Kế hoạch</th>
                <th style={{ border: '1px solid #000', background: '#4472C4', color: 'white', padding: '2px', textAlign: 'center', fontSize: 7 }}>Thực tế</th>
                <th style={{ border: '1px solid #000', background: '#4472C4', color: 'white', padding: '2px', textAlign: 'center', fontSize: 7 }}>Kế hoạch</th>
                <th style={{ border: '1px solid #000', background: '#4472C4', color: 'white', padding: '2px', textAlign: 'center', fontSize: 7 }}>Thực tế</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr><td colSpan={14} style={{ border: '1px solid #000', textAlign: 'center', padding: 8 }}>Không có dòng hàng</td></tr>
              ) : items.map((line: unknown, idx: number) => {
                const l = line as Record<string, unknown> & { id?: string; stt?: number; tenSanPham?: string; tinhTrang?: string; quyCach?: string; donViTinh?: string; soLuongYeuCau?: unknown; soLuongThucTe?: unknown; ghiChu?: string; maKien?: string; tenLo?: string };
                const soKienKH = parseKienDisplay(l.soKienKeHoach);
                const soKienTT = parseKienDisplay(l.soKienThucTe) || (l.maKien ?? '');
                const soLoKH = (l.soLoKeHoach as string) ?? '';
                const soLoTT = (l.soLoThucTe as string) ?? (l.tenLo ?? '');
                return (
                  <tr key={(l.id as string) || String(idx)}>
                    <td style={{ border: '1px solid #000', textAlign: 'center', padding: 2, overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.stt ?? idx+1}</td>
                    <td style={{ border: '1px solid #000', padding: 2, fontFamily: 'monospace', fontSize: 7, overflow: 'hidden', textOverflow: 'ellipsis' }}>{displayMaHang(l as never)}</td>
                    <td style={{ border: '1px solid #000', padding: 2, overflow: 'hidden', textOverflow: 'ellipsis' }}>{displayLoaiKho(l as never)}</td>
                    <td style={{ border: '1px solid #000', padding: 2, overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.tenSanPham}</td>
                    <td style={{ border: '1px solid #000', padding: 2, overflow: 'hidden', textOverflow: 'ellipsis' }}>{soLoKH}</td>
                    <td style={{ border: '1px solid #000', padding: 2, overflow: 'hidden', textOverflow: 'ellipsis' }}>{soLoTT}</td>
                    <td style={{ border: '1px solid #000', padding: 2, fontFamily: 'monospace', fontSize: 7, overflow: 'hidden', textOverflow: 'ellipsis' }}>{soKienKH}</td>
                    <td style={{ border: '1px solid #000', padding: 2, fontFamily: 'monospace', fontSize: 7, overflow: 'hidden', textOverflow: 'ellipsis' }}>{soKienTT}</td>
                    <td style={{ border: '1px solid #000', padding: 2, overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.tinhTrang ?? ''}</td>
                    <td style={{ border: '1px solid #000', padding: 2, overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.quyCach ?? ''}</td>
                    <td style={{ border: '1px solid #000', padding: 2, textAlign: 'center' }}>{l.donViTinh ?? ''}</td>
                    <td style={{ border: '1px solid #000', padding: 2, textAlign: 'right' }}>{fmtNum(l.soLuongYeuCau ?? l.soLuongThucTe)}</td>
                    <td style={{ border: '1px solid #000', padding: 2, textAlign: 'right' }}>{fmtNum(l.soLuongThucTe)}</td>
                    <td style={{ border: '1px solid #000', padding: 2, overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.ghiChu ?? ''}</td>
                  </tr>
                );
              })}
              {totalsByUnit(items as never).map(([unit, totals]) => (
                <tr key={String(unit)} style={{ fontWeight: 700, background: '#f3f4f6' }}>
                  <td colSpan={11} style={{ border: '1px solid #000', textAlign: 'right', padding: 2 }}>Tổng cộng{unit ? ` (${unit})` : ''}:</td>
                  <td style={{ border: '1px solid #000', textAlign: 'right', padding: 2 }}>{fmtNum(totals.requested)}</td>
                  <td style={{ border: '1px solid #000', textAlign: 'right', padding: 2 }}>{fmtNum(totals.actual)}</td>
                  <td style={{ border: '1px solid #000', padding: 2 }}></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Signatures: 2 for receipt, 3 for issue */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16, fontFamily: 'Times New Roman', fontSize: 9, textAlign: 'center' }}>
          {isReceipt ? (
            <>
              <div style={{ flex: 1 }}><div style={{ fontWeight: 700 }}>Người nhập kho</div><div style={{ fontSize: 8, color: '#6b7280' }}>(Ký, ghi rõ họ tên)</div></div>
              <div style={{ flex: 1 }}><div style={{ fontWeight: 700 }}>Quản lý kho</div><div style={{ fontSize: 8, color: '#6b7280' }}>(Ký, ghi rõ họ tên)</div></div>
            </>
          ) : (
            <>
              <div style={{ flex: 1 }}><div style={{ fontWeight: 700 }}>Người xuất kho</div><div style={{ fontSize: 8, color: '#6b7280' }}>(Ký, ghi rõ họ tên)</div></div>
              <div style={{ flex: 1 }}><div style={{ fontWeight: 700 }}>Người nhận</div><div style={{ fontSize: 8, color: '#6b7280' }}>(Ký, ghi rõ họ tên)</div></div>
              <div style={{ flex: 1 }}><div style={{ fontWeight: 700 }}>Quản lý kho</div><div style={{ fontSize: 8, color: '#6b7280' }}>(Ký, ghi rõ họ tên)</div></div>
            </>
          )}
        </div>

        <div style={{ textAlign: 'center', marginTop: 12, fontFamily: 'Times New Roman', fontSize: 7, fontStyle: 'italic', color: '#666' }}>
          {bmCode} &nbsp; {BM_CODES.version} &nbsp; {BM_CODES.kienNote}
        </div>
      </div>
    </div>
  );
};

export default WarehouseSlipPrintView;
