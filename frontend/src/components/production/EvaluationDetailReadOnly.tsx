import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, Loader2 } from 'lucide-react';
import Modal from '../Modal';
import materialEvaluationService, { MaterialEvaluation } from '../../services/materialEvaluationService';
import materialEvaluationCriteriaService, { MaterialEvaluationCriteria } from '../../services/materialEvaluationCriteriaService';
import { getFileUrl } from '../../config/api';

interface EvaluationDetailReadOnlyProps {
  id: string;
  onClose: () => void;
}

function mapCodesToText(codes: string | undefined | null, criteria: MaterialEvaluationCriteria[]): string {
  if (!codes) return '';
  const list = codes
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
  if (list.length === 0) return '';
  const byCode = new Map<number, string>();
  criteria.forEach(c => byCode.set(c.code, c.description));
  return list
    .map(code => {
      const n = Number(code);
      if (Number.isNaN(n)) return code;
      const desc = byCode.get(n);
      return desc ? `${n}. ${desc}` : String(n);
    })
    .join('; ');
}

function formatDateTime(dt: string | undefined | null): string {
  if (!dt) return '';
  const d = new Date(dt);
  if (isNaN(d.getTime())) return String(dt);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${dd}/${mm}/${yyyy} ${hh}:${mi}`;
}

const Field: React.FC<{ label: string; value?: React.ReactNode }> = ({ label, value }) => (
  <div>
    <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
    <div className="bg-gray-50 border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-800 min-h-[38px]">
      {value !== undefined && value !== null && value !== '' ? value : <span className="text-gray-400">—</span>}
    </div>
  </div>
);

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">{children}</h3>
);

const EvaluationDetailReadOnly: React.FC<EvaluationDetailReadOnlyProps> = ({ id, onClose }) => {
  const { data: evalData, isLoading, error } = useQuery<MaterialEvaluation>({
    queryKey: ['material-eval-detail', id],
    queryFn: () => materialEvaluationService.getMaterialEvaluationById(id),
    enabled: !!id,
  });

  const { data: criteria = [] } = useQuery<MaterialEvaluationCriteria[]>({
    queryKey: ['material-eval-criteria'],
    queryFn: () => materialEvaluationCriteriaService.getAllCriteria(),
    staleTime: 5 * 60 * 1000,
  });

  const truocNgamText = useMemo(
    () => mapCodesToText(evalData?.danhGiaTruocNgam, criteria),
    [evalData?.danhGiaTruocNgam, criteria],
  );
  const sauNgamText = useMemo(
    () => mapCodesToText(evalData?.danhGiaSauNgam, criteria),
    [evalData?.danhGiaSauNgam, criteria],
  );

  return (
    <Modal isOpen={true} onClose={onClose}>
      <div className="bg-white w-full max-w-2xl rounded-t-xl sm:rounded-xl shadow-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-gray-800 truncate">
              {evalData?.maChien ? `Chi tiết đánh giá · ${evalData.maChien}` : 'Chi tiết đánh giá'}
            </h2>
            {evalData?.ca != null && (
              <p className="text-xs text-gray-500 mt-0.5">Ca {evalData.ca}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 p-2 rounded-lg text-gray-500 hover:bg-gray-100"
            title="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-gray-500 py-8 justify-center">
              <Loader2 className="w-5 h-5 animate-spin" />
              Đang tải chi tiết...
            </div>
          ) : error ? (
            <div className="text-sm text-red-600 py-8 text-center">
              Không tải được chi tiết đánh giá.
            </div>
          ) : evalData ? (
            <div className="space-y-6">
              {/* Section 1 — Thông tin chung */}
              <div className="space-y-2">
                <SectionTitle>Thông tin chung</SectionTitle>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Mã chiên" value={evalData.maChien} />
                  <Field label="Ca" value={evalData.ca != null ? `Ca ${evalData.ca}` : ''} />
                  <Field label="Thời gian chiên" value={formatDateTime(evalData.thoiGianChien)} />
                  <Field label="Người thực hiện" value={evalData.nguoiThucHien} />
                </div>
              </div>

              {/* Section 2 — Nguyên liệu */}
              <div className="space-y-2">
                <SectionTitle>Nguyên liệu</SectionTitle>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Mã hàng hóa" value={evalData.maSanPham || '—'} />
                  <Field label="Số lô/kiện" value={evalData.soLoKien} />
                  <Field label="Khối lượng (kg)" value={evalData.khoiLuong} />
                </div>
              </div>

              {/* Section 3 — Thông số ngâm/chiên */}
              <div className="space-y-2">
                <SectionTitle>Thông số ngâm/chiên</SectionTitle>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Số lần ngâm" value={evalData.soLanNgam} />
                  <Field label="Nhiệt độ trước ngâm (°C)" value={evalData.nhietDoNuocTruocNgam} />
                  <Field label="Nhiệt độ sau vớt (°C)" value={evalData.nhietDoNuocSauVot} />
                  <Field label="Thời gian ngâm (phút)" value={evalData.thoiGianNgam} />
                  <Field label="Brix" value={evalData.brixNuocNgam} />
                </div>
              </div>

              {/* Section 4 — Đánh giá */}
              <div className="space-y-2">
                <SectionTitle>Đánh giá</SectionTitle>
                <div className="space-y-3">
                  <Field label="Trước ngâm" value={truocNgamText} />
                  <Field label="Sau ngâm" value={sauNgamText} />
                </div>
              </div>

              {/* Section 5 — File đính kèm */}
              <div className="space-y-2">
                <SectionTitle>File đính kèm</SectionTitle>
                {evalData.fileDinhKem ? (
                  <img
                    src={getFileUrl(evalData.fileDinhKem)}
                    alt="Ảnh nguyên liệu"
                    className="max-h-80 rounded-lg border border-gray-200"
                  />
                ) : (
                  <p className="text-sm text-gray-400">Không có file đính kèm</p>
                )}
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-5 py-3 border-t border-gray-200 bg-gray-50 rounded-b-xl">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            Đóng
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default EvaluationDetailReadOnly;
