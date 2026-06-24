import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import type { RepairStepInput } from '../services/faultTemplateService';

interface RepairStepFormProps {
  steps: RepairStepInput[];
  onChange: (steps: RepairStepInput[]) => void;
  disabled?: boolean;
}

const emptyStep = (): RepairStepInput => ({
  moTa: '',
  thoiGianUocTinh: null,
  dungCu: null,
  ghiChu: null,
});

const RepairStepForm = ({ steps, onChange, disabled = false }: RepairStepFormProps) => {
  const addStep = () => {
    onChange([...steps, emptyStep()]);
  };

  const removeStep = (index: number) => {
    onChange(steps.filter((_, i) => i !== index));
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    const next = [...steps];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    onChange(next);
  };

  const moveDown = (index: number) => {
    if (index === steps.length - 1) return;
    const next = [...steps];
    [next[index], next[index + 1]] = [next[index + 1], next[index]];
    onChange(next);
  };

  const updateField = <K extends keyof RepairStepInput>(
    index: number,
    field: K,
    value: RepairStepInput[K],
  ) => {
    const next = steps.map((step, i) =>
      i === index ? { ...step, [field]: value } : step,
    );
    onChange(next);
  };

  return (
    <div className="space-y-3">
      {steps.length === 0 ? (
        <p className="text-sm text-gray-400">Chưa có bước sửa chữa nào.</p>
      ) : (
        <ol className="space-y-3">
          {steps.map((step, index) => (
            <li
              key={index}
              className="rounded-lg border border-gray-200 bg-gray-50 p-3"
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500">
                  Bước {index + 1}
                </span>
                {!disabled && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      title="Di chuyển lên"
                      onClick={() => moveUp(index)}
                      disabled={index === 0}
                      className="rounded p-1 text-gray-400 hover:bg-gray-200 disabled:opacity-30"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      title="Di chuyển xuống"
                      onClick={() => moveDown(index)}
                      disabled={index === steps.length - 1}
                      className="rounded p-1 text-gray-400 hover:bg-gray-200 disabled:opacity-30"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      title="Xóa bước"
                      onClick={() => removeStep(index)}
                      className="rounded p-1 text-red-400 hover:bg-red-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                <label className="space-y-1 md:col-span-2">
                  <span className="text-xs font-medium text-gray-600">
                    Mô tả <span className="text-red-500">*</span>
                  </span>
                  <textarea
                    required
                    rows={2}
                    disabled={disabled}
                    value={step.moTa}
                    onChange={(e) => updateField(index, 'moTa', e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm disabled:bg-white"
                    placeholder="Mô tả bước sửa chữa..."
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-xs font-medium text-gray-600">
                    Thời gian ước tính (phút)
                  </span>
                  <input
                    type="number"
                    min={0}
                    disabled={disabled}
                    value={step.thoiGianUocTinh ?? ''}
                    onChange={(e) =>
                      updateField(
                        index,
                        'thoiGianUocTinh',
                        e.target.value === '' ? null : Number(e.target.value),
                      )
                    }
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm disabled:bg-white"
                    placeholder="VD: 30"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-xs font-medium text-gray-600">Dụng cụ</span>
                  <input
                    type="text"
                    disabled={disabled}
                    value={step.dungCu ?? ''}
                    onChange={(e) =>
                      updateField(index, 'dungCu', e.target.value || null)
                    }
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm disabled:bg-white"
                    placeholder="VD: Tuốc vít, đồng hồ đo..."
                  />
                </label>
                <label className="space-y-1 md:col-span-2">
                  <span className="text-xs font-medium text-gray-600">Ghi chú</span>
                  <input
                    type="text"
                    disabled={disabled}
                    value={step.ghiChu ?? ''}
                    onChange={(e) =>
                      updateField(index, 'ghiChu', e.target.value || null)
                    }
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm disabled:bg-white"
                    placeholder="Ghi chú thêm..."
                  />
                </label>
              </div>
            </li>
          ))}
        </ol>
      )}
      {!disabled && (
        <button
          type="button"
          onClick={addStep}
          className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-gray-300 px-3 py-2 text-sm text-gray-600 hover:border-blue-400 hover:text-blue-600"
        >
          <Plus className="h-4 w-4" />
          Thêm bước sửa chữa
        </button>
      )}
    </div>
  );
};

export default RepairStepForm;
