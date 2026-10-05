import { parseNumberInput } from '../../utils/numberInput';

interface Props {
  value: number;
  onChange: (v: number) => void;
  /** Đã mua (soLuongThucTe ?? soLuong) — null = không có YCMH, không clamp */
  bought: number | null;
  /** Đã nhập lũy kế cho cùng tên hàng */
  already?: number;
  donViTinh?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
}

/**
 * Số lượng kèm badge "Còn lại X / đã mua Y".
 * Reuse cho mọi phiếu có guard cumulative (nhập kho, xuất kho, ...).
 * Không tự chặn gõ — chỉ tô đỏ + message để confirm modal là gate cuối.
 */
export default function QuantityWithRemainingInput({ value, onChange, bought, already = 0, donViTinh, disabled, required, className }: Props) {
  const remaining = bought !== null ? bought - already : null;
  const over = remaining !== null && value - remaining > 1e-9;
  const overBy = over ? (value - (remaining ?? 0)) : 0;
  return (
    <div className="flex flex-col">
      <input
        type="number"
        value={value === 0 ? '' : value}
        onChange={(e) => onChange(parseNumberInput(e.target.value))}
        min="0.01"
        step="0.01"
        required={required}
        disabled={disabled}
        className={`w-full h-[32px] px-2 py-1.5 border rounded text-sm bg-white disabled:bg-gray-100 text-center ${over ? 'border-red-400 bg-red-50' : 'border-gray-300'} ${className ?? ''}`}
      />
      <div className="mt-1 min-h-[16px] text-[11px] leading-none">
        {remaining !== null ? (
          over ? <span className="text-red-600 font-medium">Còn lại {remaining}{donViTinh ? ` ${donViTinh}` : ''} — vượt {overBy.toFixed(2).replace(/\.00$/, '')}</span>
          : <span className="text-gray-500">Còn lại {remaining} / đã mua {bought}{donViTinh ? ` ${donViTinh}` : ''}</span>
        ) : null}
      </div>
    </div>
  );
}
