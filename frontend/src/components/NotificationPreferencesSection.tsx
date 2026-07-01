import React, { useState, useEffect } from 'react';
import { Bell, BellOff, Save, Check, ChevronDown, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  useNotificationPreferences,
  useUpdateNotificationPreferences,
} from '../hooks/useNotificationPreferences';

// ---- Notification type definitions + grouping ---------------------------

export const NOTIFICATION_TYPE_LABELS: Record<string, string> = {
  FAULT_RECORD: 'Sự cố thiết bị / Lỗi máy',
  REPAIR_REQUEST: 'Yêu cầu sửa chữa',
  ACCEPTANCE_HANDOVER: 'Nghiệm thu bàn giao',
  OVERTIME_PLAN: 'Kế hoạch tăng ca',
  OVERTIME_PLAN_APPROVAL: 'Phê duyệt tăng ca',
  SUPPLY_REQUEST: 'Yêu cầu vật tư',
  SUPPLY_REQUEST_PROCESSING: 'Vật tư đang xử lý',
  SUPPLY_REQUEST_APPROVED: 'Vật tư đã duyệt',
  SUPPLY_REQUEST_FULFILLED: 'Vật tư đã cấp',
  PROJECT_APPROVAL: 'Phê duyệt dự án',
  PURCHASE_REQUEST: 'Yêu cầu mua hàng',
  DAILY_WORK_REPORT: 'Báo cáo công việc hàng ngày',
  PRODUCTION_REPORT: 'Báo cáo sản xuất',
  WORK_PLAN: 'Kế hoạch công việc',
  PRIVATE_FEEDBACK: 'Góp ý riêng',
  EVALUATION: 'Đánh giá nhân viên',
  EVALUATION_SUPERVISOR1: 'Đánh giá cấp 1',
  EVALUATION_SUPERVISOR2: 'Đánh giá cấp 2',
  EVALUATION_SUPERVISOR1_COMPLETED: 'Hoàn thành đánh giá cấp 1',
  EVALUATION_COMPLETED: 'Hoàn thành đánh giá',
  PAYROLL: 'Bảng lương',
  TASK: 'Nhiệm vụ được giao',
  TASK_ADMIN: 'Nhiệm vụ (admin)',
  PASSWORD_RESET: 'Đặt lại mật khẩu',
  ORDER: 'Đơn hàng',
  WAREHOUSE: 'Kho hàng',
  INVOICE: 'Hóa đơn',
  DEBT: 'Công nợ',
  PRICING: 'Báo giá / Định giá',
  LEAVE_REQUEST: 'Đơn nghỉ phép',
  LEAVE_REQUEST_RESPONSE: 'Phản hồi đơn nghỉ phép',
};

interface NotificationGroup {
  label: string;
  hint?: string;
  types: string[];
}

export const NOTIFICATION_GROUPS: NotificationGroup[] = [
  {
    label: 'Cảnh báo kỹ thuật',
    hint: 'Nên giữ bật',
    types: [
      'FAULT_RECORD',
      'REPAIR_REQUEST',
      'ACCEPTANCE_HANDOVER',
    ],
  },
  {
    label: 'Luồng phê duyệt',
    hint: 'Nên giữ bật',
    types: [
      'OVERTIME_PLAN',
      'OVERTIME_PLAN_APPROVAL',
      'SUPPLY_REQUEST',
      'SUPPLY_REQUEST_PROCESSING',
      'SUPPLY_REQUEST_APPROVED',
      'SUPPLY_REQUEST_FULFILLED',
      'PROJECT_APPROVAL',
      'PURCHASE_REQUEST',
    ],
  },
  {
    label: 'Báo cáo',
    types: [
      'DAILY_WORK_REPORT',
      'PRODUCTION_REPORT',
      'WORK_PLAN',
      'PRIVATE_FEEDBACK',
      'EVALUATION',
      'EVALUATION_SUPERVISOR1',
      'EVALUATION_SUPERVISOR2',
      'EVALUATION_SUPERVISOR1_COMPLETED',
      'EVALUATION_COMPLETED',
      'PAYROLL',
    ],
  },
  {
    label: 'Khác',
    types: [
      'TASK',
      'TASK_ADMIN',
      'PASSWORD_RESET',
      'ORDER',
      'WAREHOUSE',
      'INVOICE',
      'DEBT',
      'PRICING',
      'LEAVE_REQUEST',
      'LEAVE_REQUEST_RESPONSE',
    ],
  },
];

// Groups considered "important" for IMPORTANT_ONLY preset (first 2)
const IMPORTANT_GROUP_LABELS = new Set(['Cảnh báo kỹ thuật', 'Luồng phê duyệt']);

type PresetMode = 'ALL' | 'IMPORTANT_ONLY' | 'CUSTOM';

function detectPreset(mutedMap: Record<string, boolean>): PresetMode {
  const allTypes = NOTIFICATION_GROUPS.flatMap((g) => g.types);
  const allOff = allTypes.every((t) => !mutedMap[t]);
  if (allOff) return 'ALL';

  const importantTypes = NOTIFICATION_GROUPS
    .filter((g) => IMPORTANT_GROUP_LABELS.has(g.label))
    .flatMap((g) => g.types);
  const otherTypes = NOTIFICATION_GROUPS
    .filter((g) => !IMPORTANT_GROUP_LABELS.has(g.label))
    .flatMap((g) => g.types);

  const importantAllOn = importantTypes.every((t) => !mutedMap[t]);
  const othersAllOff = otherTypes.every((t) => mutedMap[t]);
  if (importantAllOn && othersAllOff) return 'IMPORTANT_ONLY';

  return 'CUSTOM';
}

function buildMutedMapForPreset(preset: 'ALL' | 'IMPORTANT_ONLY'): Record<string, boolean> {
  const map: Record<string, boolean> = {};
  for (const group of NOTIFICATION_GROUPS) {
    const muted = preset === 'IMPORTANT_ONLY'
      ? !IMPORTANT_GROUP_LABELS.has(group.label)
      : false;
    for (const type of group.types) {
      map[type] = muted;
    }
  }
  return map;
}

// ---- CollapsibleGroup sub-component ------------------------------------

interface CollapsibleGroupProps {
  group: NotificationGroup;
  mutedMap: Record<string, boolean>;
  defaultOpen: boolean;
  onToggle: (type: string) => void;
}

const CollapsibleGroup: React.FC<CollapsibleGroupProps> = ({
  group,
  mutedMap,
  defaultOpen,
  onToggle,
}) => {
  const [open, setOpen] = useState(defaultOpen);
  const totalCount = group.types.length;
  const mutedCount = group.types.filter((t) => mutedMap[t]).length;
  const activeCount = totalCount - mutedCount;

  const countLabel = mutedCount > 0
    ? `${mutedCount}/${totalCount} tắt`
    : `${activeCount}/${totalCount} bật`;

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors bg-white"
      >
        <div className="flex items-center gap-2">
          {open
            ? <ChevronDown className="w-4 h-4 text-gray-500 shrink-0" />
            : <ChevronRight className="w-4 h-4 text-gray-500 shrink-0" />}
          <span className="text-sm font-semibold text-gray-700">{group.label}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            mutedCount > 0
              ? 'bg-gray-100 text-gray-500'
              : 'bg-blue-50 text-blue-600'
          }`}>
            {countLabel}
          </span>
        </div>
        {group.hint && (
          <span className="text-xs text-gray-400 italic hidden sm:inline">{group.hint}</span>
        )}
      </button>

      {open && (
        <div className="border-t border-gray-100 divide-y divide-gray-50">
          {group.types.map((type) => {
            const muted = mutedMap[type] ?? false;
            return (
              <div
                key={type}
                className="flex items-center justify-between py-2.5 px-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {muted
                    ? <BellOff className="w-4 h-4 text-gray-400 shrink-0" />
                    : <Bell className="w-4 h-4 text-blue-500 shrink-0" />}
                  <div>
                    <span className={`text-sm font-medium ${muted ? 'text-gray-400' : 'text-gray-800'}`}>
                      {NOTIFICATION_TYPE_LABELS[type] ?? type}
                    </span>
                    {muted && (
                      <p className="text-xs text-gray-400 mt-0.5">Đã tắt — sẽ không nhận</p>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  role="switch"
                  aria-checked={!muted}
                  onClick={() => onToggle(type)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    muted ? 'bg-gray-300' : 'bg-blue-500'
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${
                      muted ? 'translate-x-0.5' : 'translate-x-5'
                    }`}
                  />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ---- Main component -----------------------------------------------------

const NotificationPreferencesSection: React.FC = () => {
  const { data: preferences, isLoading } = useNotificationPreferences();
  const updateMutation = useUpdateNotificationPreferences();

  const [mutedMap, setMutedMap] = useState<Record<string, boolean>>({});
  const [isDirty, setIsDirty] = useState(false);
  const [presetMode, setPresetMode] = useState<PresetMode>('ALL');

  // Sync server state into local state
  useEffect(() => {
    if (!preferences) return;
    const map: Record<string, boolean> = {};
    for (const pref of preferences) {
      map[pref.notificationType] = pref.muted;
    }
    setMutedMap(map);
    setIsDirty(false);
  }, [preferences]);

  // Detect preset from mutedMap whenever it changes
  useEffect(() => {
    if (!preferences) return;
    setPresetMode(detectPreset(mutedMap));
  }, [mutedMap, preferences]);

  const handleToggle = (type: string) => {
    setMutedMap((prev) => ({ ...prev, [type]: !prev[type] }));
    setIsDirty(true);
  };

  const handlePresetSelect = (preset: PresetMode) => {
    if (preset === 'CUSTOM') {
      setPresetMode('CUSTOM');
      return;
    }
    const newMap = buildMutedMapForPreset(preset);
    setMutedMap(newMap);
    setPresetMode(preset);
    setIsDirty(true);
  };

  const handleSave = async () => {
    const allTypes = NOTIFICATION_GROUPS.flatMap((g) => g.types);
    const items = allTypes.map((type) => ({
      notificationType: type,
      muted: mutedMap[type] ?? false,
    }));

    try {
      await updateMutation.mutateAsync(items);
      toast.success('Đã lưu cài đặt thông báo');
      setIsDirty(false);
    } catch {
      toast.error('Không thể lưu cài đặt thông báo');
    }
  };

  if (isLoading) {
    return (
      <div className="py-8 text-center text-sm text-gray-500">
        Đang tải cài đặt thông báo...
      </div>
    );
  }

  const presets: Array<{ id: PresetMode; title: string; description: string; recommended?: boolean }> = [
    {
      id: 'ALL',
      title: 'Nhận tất cả',
      description: 'Không bỏ lỡ thông báo nào',
    },
    {
      id: 'IMPORTANT_ONLY',
      title: 'Chỉ tin quan trọng',
      description: 'Cảnh báo kỹ thuật + Luồng phê duyệt',
      recommended: true,
    },
    {
      id: 'CUSTOM',
      title: 'Tùy chỉnh',
      description: 'Tự chọn từng loại thông báo',
    },
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Bell className="w-5 h-5 text-blue-600" />
            Cài đặt thông báo
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Thay đổi chỉ áp dụng cho tài khoản của bạn.
          </p>
        </div>
        {isDirty && (
          <button
            onClick={handleSave}
            disabled={updateMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {updateMutation.isPending ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Đang lưu...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Lưu thay đổi
              </>
            )}
          </button>
        )}
        {!isDirty && preferences && preferences.length > 0 && (
          <span className="flex items-center gap-1 text-sm text-green-600">
            <Check className="w-4 h-4" />
            Đã lưu
          </span>
        )}
      </div>

      {/* Preset selector */}
      <div className="mb-6">
        <p className="text-sm font-medium text-gray-700 mb-3">Chế độ nhận thông báo</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {presets.map((preset) => {
            const isSelected = presetMode === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => handlePresetSelect(preset.id)}
                className={`relative text-left p-4 rounded-xl border-2 transition-all duration-150 ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                {preset.recommended && (
                  <span className="absolute top-2 right-2 text-xs font-semibold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">
                    Đề xuất
                  </span>
                )}
                <p className={`text-sm font-semibold ${isSelected ? 'text-blue-700' : 'text-gray-800'}`}>
                  {preset.title}
                </p>
                <p className={`text-xs mt-0.5 ${isSelected ? 'text-blue-500' : 'text-gray-500'}`}>
                  {preset.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Collapsible detail groups — only in CUSTOM mode */}
      {presetMode === 'CUSTOM' && (
        <div className="space-y-3">
          {NOTIFICATION_GROUPS.map((group, idx) => (
            <CollapsibleGroup
              key={group.label}
              group={group}
              mutedMap={mutedMap}
              defaultOpen={idx < 2}
              onToggle={handleToggle}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default NotificationPreferencesSection;
