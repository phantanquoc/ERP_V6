import React, { useEffect, useState } from 'react';
import { X, XCircle, Loader2, AlertTriangle } from 'lucide-react';
import Modal from '../Modal';

interface CancelWithReasonModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Called with the trimmed reason once the user confirms. */
  onConfirm: (lyDoHuy: string) => void | Promise<void>;
  /** Ticket label shown in the header, e.g. "YCBS YC-BS-2026-004". */
  ticketLabel: string;
  /** Optional context line under the header (what cancelling implies for this flow). */
  description?: string;
  /** Extra consequences to surface before confirming (e.g. parent ticket behaviour). */
  details?: string[];
  loading?: boolean;
}

const MIN_LEN = 3;

/**
 * Shared "cancel with a reason" dialog for the three request flows (YCCB / YCBS / YCMH).
 *
 * The reason is mandatory and validated here as well as server-side: the whole point of
 * the feature is that a cancellation carries an explanation the requester can read in
 * their notification and in the ticket detail. A blank confirm would reproduce the old
 * silent "Bạn có chắc?" prompt, so the button stays disabled until a real reason is typed.
 */
const CancelWithReasonModal: React.FC<CancelWithReasonModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  ticketLabel,
  description,
  details,
  loading = false,
}) => {
  const [reason, setReason] = useState('');
  const [touched, setTouched] = useState(false);

  // Reset the field each time the dialog opens so a prior reason never lingers on
  // the next ticket the user cancels.
  useEffect(() => {
    if (isOpen) {
      setReason('');
      setTouched(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const trimmed = reason.trim();
  const tooShort = trimmed.length > 0 && trimmed.length < MIN_LEN;
  const canSubmit = trimmed.length >= MIN_LEN && !loading;

  const handleSubmit = async () => {
    setTouched(true);
    if (!canSubmit) return;
    await onConfirm(trimmed);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} ariaLabel={`Hủy ${ticketLabel}`}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[92vh] flex flex-col">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-200 shrink-0">
          <div className="flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-full bg-red-100">
            <XCircle className="w-5 h-5 text-red-600" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-gray-900">Hủy {ticketLabel}</h2>
            {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
          </div>
          <button type="button" onClick={onClose} disabled={loading} aria-label="Đóng" className="ml-auto p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-4 overflow-y-auto flex-1 space-y-3">
          {details && details.length > 0 && (
            <ul className="space-y-1">
              {details.map((d, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-gray-600">
                  <span className="mt-1 w-1.5 h-1.5 rounded-full bg-gray-400 flex-shrink-0" />
                  {d}
                </li>
              ))}
            </ul>
          )}

          <div>
            <label htmlFor="cancel-reason" className="block text-sm font-medium text-gray-700 mb-1">
              Lý do hủy <span className="text-red-600">*</span>
            </label>
            <textarea
              id="cancel-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              onBlur={() => setTouched(true)}
              rows={3}
              disabled={loading}
              placeholder="Ví dụ: nhập nhầm số lượng, đã có hàng trong kho, hủy theo yêu cầu bộ phận…"
              aria-invalid={touched && trimmed.length < MIN_LEN}
              className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 ${
                touched && trimmed.length < MIN_LEN
                  ? 'border-red-400 bg-red-50 focus:ring-red-500 focus:border-red-500'
                  : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
              }`}
            />
            {tooShort && (
              <p className="text-xs text-red-600 mt-1">Lý do cần ngắn gọn nhưng rõ ràng (tối thiểu {MIN_LEN} ký tự).</p>
            )}
            {touched && trimmed.length === 0 && (
              <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> Vui lòng nhập lý do hủy.
              </p>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50 shrink-0 rounded-b-lg">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40"
          >
            Không hủy
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            title={!canSubmit && trimmed.length === 0 ? 'Cần nhập lý do hủy' : undefined}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? 'Đang hủy…' : 'Xác nhận hủy'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default CancelWithReasonModal;
