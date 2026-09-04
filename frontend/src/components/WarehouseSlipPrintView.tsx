import React from 'react';
import type { WarehouseReceiptLine } from '../services/warehouseReceiptService';
import type { WarehouseIssueLine } from '../services/warehouseIssueService';
import { totalsByUnit } from '../utils/warehouseSlipTotals';
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
  nguoiDeNghi?: string;
  boPhan?: string;
  items: (WarehouseReceiptLine | WarehouseIssueLine)[];
  daIn?: boolean;
  onClose: () => void;
  onMarkPrinted?: () => void;
}

function parseKienDisplay(v: any): string {
  if (!v) return '';
  if (Array.isArray(v)) return v.join(', ');
  try { const a = JSON.parse(String(v)); if (Array.isArray(a)) return a.join(', '); } catch {}
  return String(v);
}

const WarehouseSlipPrintView: React.FC<WarehouseSlipPrintViewProps> = ({
  type, maPhieu, ngay, tenNhanVien, maNhanVien, ghiChu, mucDich, lyDoXuatKho, nguoiDeNghi, boPhan, items, onClose, onMarkPrinted,
}) => {
  const isReceipt = type === 'receipt';
  const title = isReceipt ? 'PHIẾU NHẬP KHO' : 'PHIẾU XUẤT KHO';
  const bmCode = isReceipt ? BM_CODES.receipt : BM_CODES.issue;

  const handlePrint = () => {
    try { onMarkPrinted?.(); } catch {}
    window.print();
  };

  const headerDate = ngay;

  return (
    <div className="print-overlay" role="dialog" aria-modal="true" aria-label={title}>
      <style>{`@media print { .no-print { display: none !important; } .print-overlay { position: static !important; background: white !important; } .print-page { box-shadow: none !important; margin: 0 !important; } @page { size: A4 landscape; margin: 8mm; } }`}</style>
      <div className="print-controls no-print" style={{ display: 'flex', gap: 8, padding: 12, justifyContent: 'flex-end' }}>
        <button type="button" onClick={handlePrint} className="btn-print px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">In phiếu</button>
        <button type="button" onClick={onClose} className="btn-close-print px-4 py-2 border rounded hover:bg-gray-50">Đóng</button>
      </div>

      <div className="print-page" style={{ background: 'white', margin: '0 auto', maxWidth: 1100, padding: 16 }}>
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
        </div>

        {/* 14-col table: TT | Ma hang | Loai Kho | Ten hang | So lo KH | So lo TT | So kien KH | So kien TT | Tinh trang | Quy cach | Don vi | So luong KH | So luong TT | Ghi chu */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'Times New Roman', fontSize: 8 }}>
            <thead>
              <tr>
                {['TT','Mã hàng hóa','Loại Kho','Tên hàng hóa','Số lô','Số lô','Số kiện','Số kiện','Tình trạng','Quy cách','Đơn vị','Số lượng','Số lượng','Ghi chú'].map((h, i) => {
                  const isGroup = [4,6,11].includes(i);
                  const colSpan = isGroup ? 1 : 1;
                  return <th key={i} colSpan={colSpan} style={{ border: '1px solid #000', background: '#4472C4', color: 'white', padding: '4px 2px', textAlign: 'center', fontWeight: 700 }}>{h}</th>;
                })}
              </tr>
              <tr>
                {['','', '', '', 'Kế hoạch','Thực tế','Kế hoạch','Thực tế','','','', 'Kế hoạch','Thực tế',''].map((h, i) => (
                  <th key={i} style={{ border: '1px solid #000', background: '#4472C4', color: 'white', padding: '2px', textAlign: 'center', fontSize: 7 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr><td colSpan={14} style={{ border: '1px solid #000', textAlign: 'center', padding: 8 }}>Không có dòng hàng</td></tr>
              ) : items.map((line: any, idx) => {
                const soKienKH = parseKienDisplay(line.soKienKeHoach);
                const soKienTT = parseKienDisplay(line.soKienThucTe) || (line.maKien ?? '');
                const soLoKH = line.soLoKeHoach ?? '';
                const soLoTT = line.soLoThucTe ?? line.tenLo ?? '';
                return (
                  <tr key={line.id || idx}>
                    <td style={{ border: '1px solid #000', textAlign: 'center', padding: 2 }}>{line.stt ?? idx+1}</td>
                    <td style={{ border: '1px solid #000', padding: 2, fontFamily: 'monospace', fontSize: 7 }}>{line.maKien ?? (line.lotProductId?.slice(-6) ?? '')}</td>
                    <td style={{ border: '1px solid #000', padding: 2 }}>{line.tenKho ?? ''}</td>
                    <td style={{ border: '1px solid #000', padding: 2 }}>{line.tenSanPham}</td>
                    <td style={{ border: '1px solid #000', padding: 2 }}>{soLoKH}</td>
                    <td style={{ border: '1px solid #000', padding: 2 }}>{soLoTT}</td>
                    <td style={{ border: '1px solid #000', padding: 2, fontFamily: 'monospace', fontSize: 7 }}>{soKienKH}</td>
                    <td style={{ border: '1px solid #000', padding: 2, fontFamily: 'monospace', fontSize: 7 }}>{soKienTT}</td>
                    <td style={{ border: '1px solid #000', padding: 2 }}>{line.tinhTrang ?? ''}</td>
                    <td style={{ border: '1px solid #000', padding: 2 }}>{line.quyCach ?? ''}</td>
                    <td style={{ border: '1px solid #000', padding: 2, textAlign: 'center' }}>{line.donViTinh ?? ''}</td>
                    <td style={{ border: '1px solid #000', padding: 2, textAlign: 'right' }}>{line.soLuongYeuCau ?? line.soLuongThucTe}</td>
                    <td style={{ border: '1px solid #000', padding: 2, textAlign: 'right' }}>{line.soLuongThucTe}</td>
                    <td style={{ border: '1px solid #000', padding: 2 }}>{line.ghiChu ?? ''}</td>
                  </tr>
                );
              })}
              {totalsByUnit(items as any).map(([unit, totals]) => (
                <tr key={String(unit)} style={{ fontWeight: 700, background: '#f3f4f6' }}>
                  <td colSpan={11} style={{ border: '1px solid #000', textAlign: 'right', padding: 2 }}>Tổng cộng{unit ? ` (${unit})` : ''}:</td>
                  <td style={{ border: '1px solid #000', textAlign: 'right', padding: 2 }}>{totals.requested}</td>
                  <td style={{ border: '1px solid #000', textAlign: 'right', padding: 2 }}>{totals.actual}</td>
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