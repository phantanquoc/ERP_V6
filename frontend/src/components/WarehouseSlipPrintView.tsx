import React from 'react';
import type { WarehouseReceiptLine } from '../services/warehouseReceiptService';
import type { WarehouseIssueLine } from '../services/warehouseIssueService';
import { totalsByUnit } from '../utils/warehouseSlipTotals';

interface WarehouseSlipPrintViewProps {
  type: 'receipt' | 'issue';
  maPhieu: string;
  ngay: string;
  tenNhanVien: string;
  maNhanVien: string;
  ghiChu?: string;
  mucDich?: string;
  items: (WarehouseReceiptLine | WarehouseIssueLine)[];
  onClose: () => void;
}

function groupByWarehouse(items: (WarehouseReceiptLine | WarehouseIssueLine)[]) {
  const groups = new Map<string, (WarehouseReceiptLine | WarehouseIssueLine)[]>();
  for (const item of items) {
    const key = item.warehouseId || 'unknown';
    const existing = groups.get(key);
    if (existing) existing.push(item);
    else groups.set(key, [item]);
  }
  return groups;
}

const WarehouseSlipPrintView: React.FC<WarehouseSlipPrintViewProps> = ({
  type,
  maPhieu,
  ngay,
  tenNhanVien,
  maNhanVien,
  ghiChu,
  mucDich,
  items,
  onClose,
}) => {
  const isReceipt = type === 'receipt';
  const title = isReceipt ? 'PHIẾU NHẬP KHO' : 'PHIẾU XUẤT KHO';
  const qtyLabel = isReceipt ? 'Thực nhập' : 'Thực xuất';
  const groups = groupByWarehouse(items);
  const showWarehouseGroups = groups.size > 1;

  const handlePrint = () => {
    window.print();
  };

  const renderTable = (lines: (WarehouseReceiptLine | WarehouseIssueLine)[], warehouseLabel?: string) => {
    if (lines.length === 0) {
      return (
        <p className="print-empty-message" role="status">
          Không có dòng hàng để in.
        </p>
      );
    }

    return (
    <div className="print-table-container">
      {warehouseLabel && (
        <h3 className="print-warehouse-label">{warehouseLabel}</h3>
      )}
      <table className="print-table">
        <thead>
          <tr>
            <th scope="col">STT</th>
            <th scope="col">Tên sản phẩm</th>
            <th scope="col">ĐVT</th>
            <th scope="col">SL yêu cầu</th>
            <th scope="col">{qtyLabel}</th>
            <th scope="col">Ghi chú</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line, index) => (
            <tr key={line.id || index}>
              <td className="text-center">{line.stt || index + 1}</td>
              <td>{line.tenSanPham}</td>
              <td className="text-center">{line.donViTinh || ''}</td>
              <td className="text-right">{line.soLuongYeuCau ?? line.soLuongThucTe}</td>
              <td className="text-right">{line.soLuongThucTe}</td>
              <td>{line.ghiChu || ''}</td>
            </tr>
          ))}
          {/* Totals are per unit of measure. Summing 1 Cái with 1 Cuộn into
              "2 Cái" is meaningless, so each unit gets its own total row and a
              mixed-unit table prints one row per unit instead of one grand total. */}
          {totalsByUnit(lines).map(([unit, totals]) => (
            <tr key={unit || '__none__'} className="print-total-row">
              <td colSpan={2} className="text-right font-bold">
                {`Tổng cộng${unit ? ` (${unit})` : ''}:`}
              </td>
              <td className="text-center font-bold">{unit}</td>
              <td className="text-right font-bold">{totals.requested}</td>
              <td className="text-right font-bold">{totals.actual}</td>
              <td></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    );
  };

  return (
    <div className="print-overlay" role="dialog" aria-modal="true" aria-label={title}>
      <div className="print-controls no-print">
        <button type="button" onClick={handlePrint} className="btn-print" aria-label="In phiếu">
          In phiếu
        </button>
        <button type="button" onClick={onClose} className="btn-close-print" aria-label="Đóng bản xem trước">
          Đóng
        </button>
      </div>

      <div className="print-page">
        <div className="print-header">
          <div className="print-title">{title}</div>
          <div className="print-meta">
            <div className="print-meta-row">
              <span className="print-label">Mã phiếu:</span>
              <span className="print-value">{maPhieu}</span>
            </div>
            <div className="print-meta-row">
              <span className="print-label">Ngày:</span>
              <span className="print-value">{ngay}</span>
            </div>
            <div className="print-meta-row">
              <span className="print-label">Nhân viên:</span>
              <span className="print-value">{tenNhanVien} ({maNhanVien})</span>
            </div>
            {mucDich && (
              <div className="print-meta-row">
                <span className="print-label">Mục đích:</span>
                <span className="print-value">{mucDich}</span>
              </div>
            )}
            {ghiChu && (
              <div className="print-meta-row">
                <span className="print-label">Ghi chú:</span>
                <span className="print-value">{ghiChu}</span>
              </div>
            )}
          </div>
        </div>

        {showWarehouseGroups
          ? Array.from(groups.entries()).map(([whId, lines]) => {
              const whName = (lines[0] as any).tenKho || whId;
              return (
                <React.Fragment key={whId}>
                  {renderTable(lines, `Kho: ${whName}`)}
                </React.Fragment>
              );
            })
          : renderTable(items)
        }

        <div className="print-footer">
          <div className="print-signature-row">
            <div className="print-signature">
              <div className="print-signature-label">Người lập phiếu</div>
              <div className="print-signature-note">(Ký, ghi rõ họ tên)</div>
            </div>
            <div className="print-signature">
              <div className="print-signature-label">Thủ kho</div>
              <div className="print-signature-note">(Ký, ghi rõ họ tên)</div>
            </div>
            <div className="print-signature">
              <div className="print-signature-label">Người giao/nhận</div>
              <div className="print-signature-note">(Ký, ghi rõ họ tên)</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WarehouseSlipPrintView;
