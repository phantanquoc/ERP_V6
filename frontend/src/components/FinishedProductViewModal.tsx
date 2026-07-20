import React from 'react';
import { X } from 'lucide-react';
import { FinishedProduct } from '../services/finishedProductService';
import Modal from './Modal';

interface FinishedProductViewModalProps {
  isOpen: boolean;
  product: FinishedProduct | null;
  onClose: () => void;
  onEdit?: (product: FinishedProduct) => void;
}

const FinishedProductViewModal: React.FC<FinishedProductViewModalProps> = ({
  isOpen,
  product,
  onClose,
  onEdit,
}) => {
  if (!isOpen || !product) return null;

  const formatDateTime = (datetime: string) => {
    if (!datetime) return '-';
    try {
      // Handle different datetime formats
      let date: Date;

      // Check if it's an ISO string (contains 'T' and possibly 'Z' or timezone)
      if (datetime.includes('T')) {
        date = new Date(datetime);
      } else if (datetime.includes('/')) {
        // Handle DD/MM/YYYY or DD/MM/YYYY HH:mm format
        const parts = datetime.split(' ');
        const dateParts = parts[0].split('/');
        if (dateParts.length === 3) {
          const [day, month, year] = dateParts;
          const timePart = parts[1] || '00:00';
          date = new Date(`${year}-${month}-${day}T${timePart}`);
        } else {
          return datetime;
        }
      } else {
        date = new Date(datetime);
      }

      // Check if date is valid
      if (isNaN(date.getTime())) {
        return datetime || '-';
      }

      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${hours}:${minutes} ${day}/${month}/${year}`;
    } catch {
      return datetime || '-';
    }
  };

  const InfoRow = ({ label, value }: { label: string; value: any }) => (
    <div className="grid grid-cols-2 gap-4 py-2 border-b border-gray-100">
      <div className="text-sm font-medium text-gray-600">{label}</div>
      <div className="text-sm text-gray-900">{value || '-'}</div>
    </div>
  );

  const ProductSection = ({ title, khoiLuong, tiLe }: { title: string; khoiLuong: number; tiLe: number }) => (
    <div className="bg-gray-50 p-4 rounded-lg">
      <h5 className="font-semibold text-gray-800 mb-2">{title}</h5>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <span className="text-sm text-gray-600">Khối lượng:</span>
          <span className="ml-2 text-sm font-medium text-gray-900">{khoiLuong} kg</span>
        </div>
        <div>
          <span className="text-sm text-gray-600">Tỉ lệ:</span>
          <span className="ml-2 text-sm font-medium text-gray-900">{tiLe}%</span>
        </div>
      </div>
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} showBackdrop closeOnBackdrop={true}>
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full flex flex-col max-h-[calc(100vh-2rem)]" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between shrink-0">
          <h3 className="text-xl font-semibold text-gray-900">Chi tiết thành phẩm</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Thông tin cơ bản */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h4 className="text-lg font-semibold text-gray-800 mb-4">Thông tin cơ bản</h4>
            <InfoRow label="Mã chiên" value={product.maChien} />
            <InfoRow label="Thời gian chiên" value={formatDateTime(product.thoiGianChien)} />
            <InfoRow label="Tên hàng hóa" value={product.tenHangHoa} />
            <InfoRow label="Khối lượng đầu vào" value={`${product.khoiLuong} kg`} />
            <InfoRow label="Người thực hiện" value={product.nguoiThucHien} />
            <InfoRow label="Tổng khối lượng thành phẩm" value={`${product.tongKhoiLuong} kg`} />
            {product.fileDinhKem && (
              <InfoRow
                label="File đính kèm"
                value={
                  <a
                    href={product.fileDinhKem} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    Xem file
                  </a>
                } 
              />
            )}
          </div>

          {/* Chi tiết thành phẩm */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h4 className="text-lg font-semibold text-gray-800 mb-4">Chi tiết thành phẩm</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ProductSection 
                title="Thành phẩm A" 
                khoiLuong={product.aKhoiLuong} 
                tiLe={product.aTiLe} 
              />
              <ProductSection 
                title="Thành phẩm B" 
                khoiLuong={product.bKhoiLuong} 
                tiLe={product.bTiLe} 
              />
              <ProductSection 
                title="Thành phẩm B Dầu" 
                khoiLuong={product.bDauKhoiLuong} 
                tiLe={product.bDauTiLe} 
              />
              <ProductSection 
                title="Thành phẩm C" 
                khoiLuong={product.cKhoiLuong} 
                tiLe={product.cTiLe} 
              />
              <ProductSection 
                title="Vụn lớn" 
                khoiLuong={product.vunLonKhoiLuong} 
                tiLe={product.vunLonTiLe} 
              />
              <ProductSection 
                title="Vụn nhỏ" 
                khoiLuong={product.vunNhoKhoiLuong} 
                tiLe={product.vunNhoTiLe} 
              />
              <ProductSection 
                title="Phế phẩm" 
                khoiLuong={product.phePhamKhoiLuong} 
                tiLe={product.phePhamTiLe} 
              />
              <ProductSection 
                title="Ướt" 
                khoiLuong={product.uotKhoiLuong} 
                tiLe={product.uotTiLe} 
              />
            </div>
          </div>

          {/* Thời gian */}
          {(product.createdAt || product.updatedAt) && (
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h4 className="text-lg font-semibold text-gray-800 mb-4">Thời gian</h4>
              {product.createdAt && (
                <InfoRow 
                  label="Ngày tạo" 
                  value={new Date(product.createdAt).toLocaleString('vi-VN')} 
                />
              )}
              {product.updatedAt && (
                <InfoRow 
                  label="Ngày cập nhật" 
                  value={new Date(product.updatedAt).toLocaleString('vi-VN')} 
                />
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 shrink-0">
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Đóng
            </button>
            {onEdit && (
              <button
                onClick={() => {
                  onClose();
                  onEdit(product);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Chỉnh sửa
              </button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default FinishedProductViewModal;

