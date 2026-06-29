import React from 'react';
import {
  FIELD_LABELS,
  STATUS_LABELS,
  PRICE_FIELDS,
  DATE_FIELDS,
  formatNumber,
  formatDateTime,
} from './snapshotFormat';

type Snapshot = Record<string, unknown>;

interface RevisionSnapshotViewProps {
  snapshot: Snapshot;
}

const PRIMARY_ORDER = [
  'maBaoGia', 'maYeuCauBaoGia',
  'tenKhachHang', 'maKhachHang', 'tenNhanVien',
  'tinhTrang', 'ngayBaoGia',
  'giaBaoKhach', 'thoiGianGiaoHang', 'hieuLucBaoGia',
  'maDinhMuc', 'tenDinhMuc', 'tiLeThuHoi', 'sanPhamDauRa',
  'tongThanhPhamCanSxThem', 'thanhPhamTonKho',
  'tongNguyenLieuCanSanXuat', 'nguyenLieuTonKho', 'nguyenLieuCanNhapThem',
  'ghiChu',
  'priceLocked', 'priceLockedAt', 'priceLockedByName',
  'createdAt', 'updatedAt',
];

const formatValue = (key: string, value: unknown): React.ReactNode => {
  if (value === null || value === undefined || value === '') {
    return <span className="text-gray-400 italic">—</span>;
  }
  if (typeof value === 'boolean') {
    return value ? <span className="text-green-700">✓ Có</span> : <span className="text-gray-600">✗ Không</span>;
  }
  if (key === 'tinhTrang' && typeof value === 'string') {
    return STATUS_LABELS[value] ?? value;
  }
  if (DATE_FIELDS.has(key) && typeof value === 'string') {
    return formatDateTime(value);
  }
  if (PRICE_FIELDS.has(key) && typeof value === 'number') {
    return formatNumber(value);
  }
  if (typeof value === 'number') {
    return formatNumber(value);
  }
  if (typeof value === 'string') {
    return value;
  }
  return JSON.stringify(value);
};

const ItemsTable: React.FC<{ items: any[] }> = ({ items }) => {
  if (!items?.length) return <span className="text-gray-400 italic">— Không có thành phẩm —</span>;
  return (
    <table className="w-full text-xs border-collapse mt-1">
      <thead>
        <tr className="bg-gray-100 border-b border-gray-200">
          <th className="px-2 py-1 text-left font-medium text-gray-700">Tên thành phẩm</th>
          <th className="px-2 py-1 text-right font-medium text-gray-700">Tỉ lệ (%)</th>
          <th className="px-2 py-1 text-right font-medium text-gray-700">Khối lượng (kg)</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item, idx) => (
          <tr key={item.id ?? idx} className="border-b border-gray-100">
            <td className="px-2 py-1">{item.tenThanhPham ?? '—'}</td>
            <td className="px-2 py-1 text-right">{item.tiLe != null ? formatNumber(item.tiLe) : '—'}</td>
            <td className="px-2 py-1 text-right">{item.khoiLuongTuongUng != null ? formatNumber(item.khoiLuongTuongUng) : '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

const RevisionSnapshotView: React.FC<RevisionSnapshotViewProps> = ({ snapshot }) => {
  const visibleKeys = Object.keys(snapshot).filter(k => FIELD_LABELS[k] !== undefined);
  const orderedKeys = [
    ...PRIMARY_ORDER.filter(k => visibleKeys.includes(k)),
    ...visibleKeys.filter(k => !PRIMARY_ORDER.includes(k)).sort(),
  ];
  const items = Array.isArray((snapshot as any).items) ? (snapshot as any).items : null;

  return (
    <div className="space-y-4">
      <table className="w-full text-sm border-collapse">
        <tbody>
          {orderedKeys.map(key => {
            const value = (snapshot as any)[key];
            return (
              <tr key={key} className="border-b border-gray-100">
                <td className="px-3 py-2 text-gray-600 font-medium w-1/3 align-top">
                  {FIELD_LABELS[key]}
                </td>
                <td className="px-3 py-2 text-gray-900 break-words">
                  {formatValue(key, value)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {items && (
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-1">Danh sách thành phẩm</h4>
          <ItemsTable items={items} />
        </div>
      )}
    </div>
  );
};

export default RevisionSnapshotView;
