import { useEffect, useMemo, useState } from 'react';
import { X, Trash2 } from 'lucide-react';
import Modal from '../Modal';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  purchaseRequest: { id: string; maYeuCau: string; trangThai: string; tepDinhKem?: string[] | null; fileKemTheo?: string | null; aggregatedAttachments?: { all: string[] } | null } | null;
  onSubmit: (id: string, files: File[], keptUrls: string[]) => Promise<void>;
}

function fileNameOf(u: string): string { return u.split('/').pop() ?? u; }

export default function PurchaseRequestAttachmentModal({ isOpen, onClose, purchaseRequest: pr, onSubmit }: Props) {
  const [keptUrls, setKeptUrls] = useState<string[]>([]);
  const [incoming, setIncoming] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const existing = useMemo(() => {
    if (!pr) return [];
    const arr = (pr as unknown as { tepDinhKem?: string[] | null }).tepDinhKem;
    if (Array.isArray(arr) && arr.length) return arr.filter(Boolean);
    const legacy = (pr as unknown as { fileKemTheo?: string | null }).fileKemTheo;
    return legacy ? [legacy] : [];
  }, [pr]);

  useEffect(() => {
    if (!isOpen) return;
    setKeptUrls(existing);
    setIncoming([]);
    setApiError(null);
  }, [isOpen, existing]);

  if (!isOpen || !pr) return null;
  const total = keptUrls.length + incoming.length;
  const cap = 4;
  const remaining = cap - keptUrls.length;

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const list = Array.from(files).slice(0, remaining);
    if (list.length < files.length) setApiError(`Chỉ chọn tối đa ${remaining} tệp nữa (tối đa ${cap} tệp)`);
    setIncoming((prev) => [...prev, ...list].slice(0, remaining));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (total === 0) { setApiError('Vui lòng chọn ít nhất 1 tệp hoặc giữ lại tệp hiện tại.'); return; }
    if (total > cap) { setApiError(`Tối đa ${cap} tệp`); return; }
    setApiError(null); setLoading(true);
    try { await onSubmit(pr.id, incoming, keptUrls); onClose(); }
    catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message ?? (err as { message?: string })?.message ?? 'Lỗi hệ thống';
      setApiError(msg);
    } finally { setLoading(false); }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} closeOnBackdrop ariaLabel="Cập nhật tệp đính kèm">
      <div className="bg-white rounded-lg shadow-sm w-full max-w-lg mx-4 p-6" onClick={(e) => e.stopPropagation()} role="document">
        <div className="flex justify-between items-center mb-4">
          <div><h2 className="text-lg font-bold text-gray-800">Cập nhật tệp đính kèm</h2><p className="text-sm text-gray-500 mt-0.5">{pr.maYeuCau} - {pr.trangThai}</p></div>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {apiError && <div className="p-3 bg-red-50 border border-red-300 rounded-md text-sm text-red-700">{apiError}</div>}
          <p className="text-xs text-gray-500 bg-blue-50 border border-blue-100 rounded px-3 py-2">Phiếu đã hoàn thành — chỉ được cập nhật tệp hóa đơn/chứng từ. Tối đa 4 tệp.</p>
          {keptUrls.length > 0 && <div><p className="text-xs font-medium text-gray-600 mb-1">Tệp hiện tại ({keptUrls.length})</p>
            <ul className="space-y-1">{keptUrls.map((u) => <li key={u} className="flex items-center justify-between bg-gray-50 rounded px-2 py-1.5 text-sm"><span className="truncate">{fileNameOf(u)}</span><button type="button" onClick={() => setKeptUrls((prev) => prev.filter((x) => x !== u))} className="ml-2 text-red-500 hover:text-red-700"><Trash2 className="w-4 h-4" /></button></li>)}</ul></div>}
          <div><label className="block text-xs font-medium text-gray-600 mb-1">Thêm tệp mới ({incoming.length}/{Math.max(0, remaining)} còn trống)</label>
            <input type="file" multiple accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png" onChange={(e) => handleFiles(e.target.files)} className="block w-full text-sm" />
            {incoming.length > 0 && <ul className="mt-2 space-y-1">{incoming.map((f, i) => <li key={i} className="flex items-center justify-between bg-blue-50 rounded px-2 py-1 text-sm"><span className="truncate">{f.name}</span><button type="button" onClick={() => setIncoming((prev) => prev.filter((_, j) => j !== i))} className="ml-2 text-red-500"><Trash2 className="w-4 h-4" /></button></li>)}</ul>}
          </div>
          <div className="flex justify-end gap-3 pt-2"><button type="button" onClick={onClose} className="px-4 py-2 border border-gray-200 rounded-md text-gray-700 hover:bg-gray-50">Hủy</button><button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">{loading ? 'Đang lưu...' : 'Lưu tệp'}</button></div>
        </form>
      </div>
    </Modal>
  );
}
