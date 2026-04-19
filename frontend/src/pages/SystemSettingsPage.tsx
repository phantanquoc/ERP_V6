import React, { useState, useEffect, useCallback } from 'react';
import {
  Settings, Palette, Type, Save, Check, Bell, ToggleLeft, ToggleRight,
  Clock, History, ChevronRight, Users, ArrowRight, Info, AlertCircle,
  Plus, Trash2, X, BarChart2, List, BookOpen,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useSystemSettings } from '../contexts/SystemSettingsContext';
import { isAdmin } from '../utils/permissions';
import systemSettingsService, {
  NotificationSettings,
  NotificationRoutingRule,
  NotificationRoutingTarget,
} from '../services/systemSettingsService';

// ─── Constants ───────────────────────────────────────────────────────────────

const THEMES = [
  { id: 'DEFAULT', name: 'Mặc định', description: 'Giao diện xanh dương chuyên nghiệp', preview: 'bg-gradient-to-r from-blue-600 to-indigo-600', icon: 'ABF' },
  { id: 'TET', name: 'Tết Nguyên Đán', description: 'Giao diện đỏ với hoa mai', preview: 'bg-gradient-to-r from-red-600 to-red-700', icon: '🏮' },
  { id: 'APR30', name: '30/4 - 1/5', description: 'Ngày Giải phóng & Quốc tế Lao động', preview: 'bg-gradient-to-r from-red-600 to-yellow-500', icon: '⭐' },
];

const CATEGORY_LABELS: Record<string, string> = {
  EVALUATION: 'Đánh giá nhân viên', TASK: 'Nhiệm vụ', LEAVE: 'Nghỉ phép',
  PAYROLL: 'Bảng lương', ACCEPTANCE: 'Nghiệm thu', OVERTIME: 'Tăng ca',
  SUPPLY: 'Cung ứng / Mua hàng', AUTH: 'Xác thực', FEEDBACK: 'Góp ý',
  REPORT: 'Báo cáo đơn hàng', WORK_PLAN: 'Kế hoạch làm việc', SYSTEM: 'Hệ thống',
};

// 10 bước luồng đơn hàng — event keys phải khớp với NotificationRoutingEvent backend
const ORDER_FLOW_STEPS = [
  { step: 1, event: 'quotation-request.created', label: 'Tạo yêu cầu báo giá', actor: 'Kinh doanh', color: 'blue' },
  { step: 2, event: 'quotation.created', label: 'Tạo báo giá', actor: 'Giá thành', color: 'purple' },
  { step: 3, event: 'quotation.customer-confirmed', label: 'Khách xác nhận báo giá', actor: 'Kinh doanh', color: 'green' },
  { step: 4, event: 'order.created', label: 'Tạo đơn hàng', actor: 'Hệ thống', color: 'yellow' },
  { step: 5, event: 'supply.request.created', label: 'Tạo yêu cầu cung ứng', actor: 'SX / Kho', color: 'orange' },
  { step: 6, event: 'supply.request.approved', label: 'Duyệt yêu cầu cung ứng', actor: 'Trưởng bộ phận', color: 'teal' },
  { step: 7, event: 'purchase-request.completed', label: 'Hoàn tất mua hàng', actor: 'Mua hàng', color: 'cyan' },
  { step: 8, event: 'tax-report.created', label: 'Tạo báo cáo thuế', actor: 'Hệ thống', color: 'indigo' },
  { step: 9, event: 'invoice.created', label: 'Tạo hóa đơn', actor: 'Kế toán', color: 'pink' },
  { step: 10, event: 'customer-feedback.created', label: 'Phản hồi khách hàng', actor: 'Kinh doanh', color: 'rose' },
];

const STEP_COLOR_MAP: Record<string, string> = {
  blue: 'bg-blue-50 border-blue-200 text-blue-800',
  purple: 'bg-purple-50 border-purple-200 text-purple-800',
  green: 'bg-green-50 border-green-200 text-green-800',
  yellow: 'bg-yellow-50 border-yellow-200 text-yellow-800',
  orange: 'bg-orange-50 border-orange-200 text-orange-800',
  teal: 'bg-teal-50 border-teal-200 text-teal-800',
  cyan: 'bg-cyan-50 border-cyan-200 text-cyan-800',
  indigo: 'bg-indigo-50 border-indigo-200 text-indigo-800',
  pink: 'bg-pink-50 border-pink-200 text-pink-800',
  rose: 'bg-rose-50 border-rose-200 text-rose-800',
};

const RECIPIENT_TYPE_LABELS: Record<string, string> = {
  role: 'Vai trò', department: 'Phòng ban', subDepartment: 'Bộ phận con',
};

const PRESET_RECIPIENTS: NotificationRoutingTarget[] = [
  { id: 'role-admin', type: 'role', value: 'ADMIN', label: 'Admin' },
  { id: 'role-manager', type: 'role', value: 'MANAGER', label: 'Quản lý' },
  { id: 'dept-business', type: 'department', value: 'DEPT_BUSINESS', label: 'Phòng kinh doanh' },
  { id: 'dept-production', type: 'department', value: 'DEPT_PRODUCTION', label: 'Phòng sản xuất' },
  { id: 'dept-accounting', type: 'department', value: 'DEPT_ACCOUNTING', label: 'Phòng kế toán' },
  { id: 'subdept-pricing', type: 'subDepartment', value: 'SUBDEPT_GENERAL_PRICING', label: 'Tổng hợp / Tính giá' },
  { id: 'subdept-prod-mgmt', type: 'subDepartment', value: 'SUBDEPT_PRODUCTION_MANAGEMENT', label: 'Quản lý sản xuất' },
  { id: 'subdept-procurement', type: 'subDepartment', value: 'SUBDEPT_PROCUREMENT', label: 'Mua hàng' },
  { id: 'subdept-accounting-admin', type: 'subDepartment', value: 'SUBDEPT_ACCOUNTING_ADMIN', label: 'Kế toán admin' },
  { id: 'subdept-accounting-tax', type: 'subDepartment', value: 'SUBDEPT_ACCOUNTING_TAX', label: 'Kế toán thuế' },
];

type MainTab = 'general' | 'notifications';
type NotifSubTab = 'overview' | 'routing' | 'reference';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const ToggleSwitch: React.FC<{ value: boolean; onChange: (v: boolean) => void; size?: 'sm' | 'md' }> = ({ value, onChange, size = 'md' }) => {
  const sz = size === 'sm' ? 'w-6 h-6' : 'w-8 h-8';
  return (
    <button onClick={() => onChange(!value)} className="flex-shrink-0">
      {value ? <ToggleRight className={`${sz} text-blue-600`} /> : <ToggleLeft className={`${sz} text-gray-400`} />}
    </button>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────

const SystemSettingsPage: React.FC = () => {
  const { user } = useAuth();
  const { settings, refreshSettings } = useSystemSettings();

  const [mainTab, setMainTab] = useState<MainTab>('general');
  const [notifTab, setNotifTab] = useState<NotifSubTab>('overview');

  // General
  const [selectedTheme, setSelectedTheme] = useState('DEFAULT');
  const [slogan, setSlogan] = useState('');
  const [savingGeneral, setSavingGeneral] = useState(false);
  const [savedGeneral, setSavedGeneral] = useState(false);

  // Notifications
  const [notifSettings, setNotifSettings] = useState<NotificationSettings | null>(null);
  const [notifDirty, setNotifDirty] = useState(false);
  const [savingNotif, setSavingNotif] = useState(false);
  const [savedNotif, setSavedNotif] = useState(false);
  const [notifError, setNotifError] = useState<string | null>(null);

  // Routing master/detail
  const [selectedEventKey, setSelectedEventKey] = useState<string | null>(null);
  const [editingRule, setEditingRule] = useState<NotificationRoutingRule | null>(null);
  const [showAddRecipient, setShowAddRecipient] = useState(false);
  const [newRecipient, setNewRecipient] = useState<Partial<NotificationRoutingTarget>>({ type: 'role' });

  // Reference flow collapse
  const [refFlowExpanded, setRefFlowExpanded] = useState(false);

  // ── Load settings ──
  useEffect(() => {
    if (settings) {
      setSelectedTheme(settings.activeTheme);
      setSlogan(settings.slogan);
      if (settings.notificationSettings) {
        setNotifSettings(settings.notificationSettings);
      }
    }
  }, [settings]);

  // Fetch notification settings directly if not in context
  useEffect(() => {
    if (!notifSettings) {
      systemSettingsService.getSettings().then(s => {
        if (s.notificationSettings) setNotifSettings(s.notificationSettings);
      }).catch(() => {});
    }
  }, [notifSettings]);

  if (!user || !isAdmin(user.department)) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Settings className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-600">Không có quyền truy cập</h2>
          <p className="text-gray-400 mt-2">Chỉ quản trị viên mới có thể truy cập trang này.</p>
        </div>
      </div>
    );
  }

  // ── Notification mutators ──
  const updateNotif = useCallback((updater: (prev: NotificationSettings) => NotificationSettings) => {
    setNotifSettings(prev => { if (!prev) return prev; const next = updater(prev); setNotifDirty(true); return next; });
  }, []);

  const toggleChannel = (key: keyof NotificationSettings['channels']) =>
    updateNotif(p => ({ ...p, channels: { ...p.channels, [key]: !p.channels[key] } }));

  const updateUi = (key: keyof NotificationSettings['ui'], value: number | boolean) =>
    updateNotif(p => ({ ...p, ui: { ...p.ui, [key]: value } }));

  const toggleCategory = (cat: string) =>
    updateNotif(p => ({ ...p, categories: { ...p.categories, [cat]: !p.categories[cat] } }));

  const toggleRuleEnabled = (eventKey: string) =>
    updateNotif(p => ({
      ...p,
      routingRules: {
        ...p.routingRules,
        [eventKey]: { ...p.routingRules[eventKey], enabled: !p.routingRules[eventKey].enabled },
      },
    }));

  // ── Select rule for editing ──
  const selectRule = (eventKey: string) => {
    const rule = notifSettings?.routingRules[eventKey];
    if (!rule) return;
    setSelectedEventKey(eventKey);
    setEditingRule(JSON.parse(JSON.stringify(rule))); // deep copy
    setShowAddRecipient(false);
  };

  const saveEditingRule = () => {
    if (!editingRule || !selectedEventKey) return;
    updateNotif(p => ({
      ...p,
      routingRules: { ...p.routingRules, [selectedEventKey]: editingRule },
    }));
  };

  const removeRecipient = (id: string) => {
    if (!editingRule) return;
    setEditingRule(prev => prev ? { ...prev, recipients: prev.recipients.filter(r => r.id !== id) } : prev);
  };

  const addRecipientFromPreset = (preset: NotificationRoutingTarget) => {
    if (!editingRule) return;
    if (editingRule.recipients.some(r => r.id === preset.id)) return;
    setEditingRule(prev => prev ? { ...prev, recipients: [...prev.recipients, preset] } : prev);
  };

  const addCustomRecipient = () => {
    if (!newRecipient.value || !newRecipient.label || !editingRule) return;
    const id = `custom-${Date.now()}`;
    setEditingRule(prev => prev ? {
      ...prev,
      recipients: [...prev.recipients, { id, type: newRecipient.type as any, value: newRecipient.value!, label: newRecipient.label! }],
    } : prev);
    setNewRecipient({ type: 'role' });
    setShowAddRecipient(false);
  };

  // ── Save handlers ──
  const handleSaveGeneral = async () => {
    setSavingGeneral(true); setSavedGeneral(false);
    try {
      await systemSettingsService.updateSettings({ activeTheme: selectedTheme, slogan });
      await refreshSettings();
      setSavedGeneral(true);
      setTimeout(() => setSavedGeneral(false), 3000);
    } catch { alert('Có lỗi xảy ra khi lưu cài đặt giao diện.'); }
    finally { setSavingGeneral(false); }
  };

  const handleSaveNotifications = async () => {
    if (!notifSettings) return;
    setSavingNotif(true); setSavedNotif(false); setNotifError(null);
    try {
      await systemSettingsService.updateSettings({ notificationSettings: notifSettings });
      await refreshSettings();
      setNotifDirty(false);
      setSavedNotif(true);
      setTimeout(() => setSavedNotif(false), 3000);
    } catch { setNotifError('Có lỗi xảy ra khi lưu cài đặt thông báo.'); }
    finally { setSavingNotif(false); }
  };

  // ── Computed stats ──
  const notifStats = notifSettings ? {
    totalRules: Object.keys(notifSettings.routingRules).length,
    enabledRules: Object.values(notifSettings.routingRules).filter(r => r.enabled).length,
    totalCategories: Object.keys(notifSettings.categories).length,
    enabledCategories: Object.values(notifSettings.categories).filter(Boolean).length,
    channels: [notifSettings.channels.inAppEnabled, notifSettings.channels.webPushEnabled].filter(Boolean).length,
  } : null;

  // ── Sub-components ─────────────────────────────────────────────────────────

  const SaveBtn: React.FC<{ onClick: () => void; saving: boolean; saved: boolean; dirty?: boolean }> =
    ({ onClick, saving, saved, dirty }) => (
      <button
        onClick={onClick}
        disabled={saving}
        className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-white text-sm transition-all ${
          saved ? 'bg-green-500' : (dirty === false ? 'bg-gray-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700')
        } disabled:opacity-60`}
      >
        {saving
          ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Đang lưu...</>
          : saved
            ? <><Check className="w-4 h-4" />Đã lưu!</>
            : <><Save className="w-4 h-4" />Lưu thay đổi</>}
      </button>
    );

  // ── Panels ────────────────────────────────────────────────────────────────

  const OverviewPanel = () => (
    <div className="space-y-6">
      {/* Stats */}
      {notifStats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Kênh bật', value: `${notifStats.channels}/2`, icon: Bell, color: 'text-blue-600 bg-blue-50' },
            { label: 'Quy tắc bật', value: `${notifStats.enabledRules}/${notifStats.totalRules}`, icon: ArrowRight, color: 'text-green-600 bg-green-50' },
            { label: 'Danh mục bật', value: `${notifStats.enabledCategories}/${notifStats.totalCategories}`, icon: List, color: 'text-purple-600 bg-purple-50' },
            { label: 'Polling (giây)', value: String(notifSettings!.ui.unreadPollingIntervalSeconds), icon: Clock, color: 'text-orange-600 bg-orange-50' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-lg font-bold text-gray-900">{value}</p>
                <p className="text-xs text-gray-500">{label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Channels */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><Bell className="w-4 h-4 text-blue-600" />Kênh thông báo</h3>
        <div className="space-y-3">
          {[
            { key: 'inAppEnabled' as const, label: 'Thông báo trong ứng dụng', desc: 'Hiển thị chuông và hộp thư trên giao diện' },
            { key: 'webPushEnabled' as const, label: 'Web Push Notification', desc: 'Gửi push đến trình duyệt khi không mở ứng dụng' },
          ].map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div><p className="font-medium text-sm text-gray-900">{label}</p><p className="text-xs text-gray-500">{desc}</p></div>
              <ToggleSwitch value={notifSettings!.channels[key]} onChange={() => toggleChannel(key)} />
            </div>
          ))}
        </div>
      </div>

      {/* UI Settings */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><Clock className="w-4 h-4 text-purple-600" />Cấu hình hiển thị</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          {[
            { key: 'unreadPollingIntervalSeconds' as const, label: 'Polling interval (giây)', min: 10, max: 300 },
            { key: 'recentLimit' as const, label: 'Số thông báo gần đây', min: 5, max: 100 },
            { key: 'historyWindowDays' as const, label: 'Lịch sử (ngày)', min: 7, max: 365 },
          ].map(({ key, label, min, max }) => (
            <div key={key}>
              <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
              <input type="number" min={min} max={max}
                value={notifSettings!.ui[key] as number}
                onChange={e => updateUi(key, parseInt(e.target.value) || min)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div><p className="text-sm font-medium text-gray-900">Hiển thị sơ đồ luồng cho Admin</p></div>
          <ToggleSwitch value={notifSettings!.ui.showAdminFlowOverview} onChange={v => updateUi('showAdminFlowOverview', v)} />
        </div>
      </div>

      {/* Categories */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><History className="w-4 h-4 text-teal-600" />Danh mục thông báo</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {Object.entries(notifSettings!.categories).map(([cat, enabled]) => (
            <div key={cat} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm font-medium text-gray-700">{CATEGORY_LABELS[cat] || cat}</span>
              <ToggleSwitch value={enabled as boolean} onChange={() => toggleCategory(cat)} size="sm" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const RoutingPanel = () => {
    const rules = notifSettings!.routingRules;
    const allEvents = ORDER_FLOW_STEPS.map(s => s.event);
    const otherEvents = Object.keys(rules).filter(k => !allEvents.includes(k));

    const RuleCard = ({ eventKey, stepInfo }: { eventKey: string; stepInfo?: typeof ORDER_FLOW_STEPS[0] }) => {
      const rule = rules[eventKey];
      if (!rule) return null;
      const isOpen = selectedEventKey === eventKey;
      const colorCls = stepInfo ? STEP_COLOR_MAP[stepInfo.color] : 'bg-gray-100 border-gray-200 text-gray-600';

      return (
        <div className={`rounded-xl border transition-all ${isOpen ? 'border-blue-400 shadow-sm' : 'border-gray-200 hover:border-gray-300'}`}>
          {/* ── Row header ── */}
          <div
            onClick={() => isOpen ? (setSelectedEventKey(null), setEditingRule(null)) : selectRule(eventKey)}
            className={`flex items-center gap-4 p-4 cursor-pointer rounded-xl ${isOpen ? 'bg-blue-50 rounded-b-none' : 'bg-white hover:bg-gray-50'}`}
          >
            {/* Step badge */}
            {stepInfo ? (
              <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 border ${colorCls}`}>
                {stepInfo.step}
              </span>
            ) : (
              <span className="w-8 h-8 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center flex-shrink-0">
                <Bell className="w-4 h-4 text-gray-400" />
              </span>
            )}

            {/* Title + meta */}
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-900 leading-tight">
                {stepInfo?.label || eventKey}
              </p>
              <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                {stepInfo?.actor && (
                  <span className="text-xs text-gray-400 flex items-center gap-1">
                    <Users className="w-3 h-3" />{stepInfo.actor}
                  </span>
                )}
                <code className="text-xs text-gray-400">{eventKey}</code>
              </div>
            </div>

            {/* Status + count + chevron */}
            <div className="flex items-center gap-3 flex-shrink-0">
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${rule.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                {rule.enabled ? '● Bật' : '○ Tắt'}
              </span>
              <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full font-medium flex items-center gap-1">
                <Users className="w-3 h-3" />{rule.recipients.length} người nhận
              </span>
              <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
            </div>
          </div>

          {/* ── Expanded editor ── */}
          {isOpen && editingRule && (
            <div className="border-t border-blue-200 bg-white rounded-b-xl">
              {/* Toggle row */}
              <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Cấu hình quy tắc</p>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">Trạng thái:</span>
                  <ToggleSwitch
                    value={editingRule.enabled}
                    onChange={v => setEditingRule(prev => prev ? { ...prev, enabled: v } : prev)}
                    size="sm"
                  />
                  <span className={`text-xs font-semibold ${editingRule.enabled ? 'text-green-600' : 'text-gray-400'}`}>
                    {editingRule.enabled ? 'Bật' : 'Tắt'}
                  </span>
                </div>
              </div>

              <div className="p-4 space-y-4">
                {/* Recipients list */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-blue-500" />
                      Người nhận ({editingRule.recipients.length})
                    </p>
                    <button
                      onClick={() => setShowAddRecipient(v => !v)}
                      className="flex items-center gap-1 text-xs bg-blue-600 text-white px-2.5 py-1 rounded-lg hover:bg-blue-700 font-medium"
                    >
                      <Plus className="w-3 h-3" />{showAddRecipient ? 'Đóng' : 'Thêm người nhận'}
                    </button>
                  </div>

                  {editingRule.recipients.length === 0 ? (
                    <div className="text-center py-4 border-2 border-dashed border-gray-200 rounded-lg">
                      <p className="text-xs text-gray-400 italic">Chưa có người nhận nào — nhấn "Thêm người nhận" để cấu hình</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {editingRule.recipients.map(r => (
                        <div key={r.id} className="flex items-center justify-between p-2.5 bg-gray-50 border border-gray-100 rounded-lg">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{r.label}</p>
                            <p className="text-xs text-gray-400">{RECIPIENT_TYPE_LABELS[r.type] || r.type} · <code>{r.value}</code></p>
                          </div>
                          <button
                            onClick={() => removeRecipient(r.id)}
                            className="ml-2 p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg flex-shrink-0"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Add recipient panel */}
                {showAddRecipient && (
                  <div className="border border-blue-200 bg-blue-50/60 rounded-xl p-4 space-y-3">
                    <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Thêm người nhận</p>

                    {/* Presets */}
                    <div>
                      <p className="text-xs text-gray-500 mb-2 font-medium">Chọn nhanh từ danh sách:</p>
                      <div className="flex flex-wrap gap-2">
                        {PRESET_RECIPIENTS
                          .filter(p => !editingRule.recipients.some(r => r.id === p.id))
                          .map(p => (
                            <button
                              key={p.id}
                              onClick={() => addRecipientFromPreset(p)}
                              className="text-xs bg-white border border-gray-300 text-gray-700 px-3 py-1.5 rounded-full hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                            >
                              + {p.label}
                            </button>
                          ))}
                        {PRESET_RECIPIENTS.filter(p => !editingRule.recipients.some(r => r.id === p.id)).length === 0 && (
                          <p className="text-xs text-gray-400 italic">Đã thêm tất cả preset</p>
                        )}
                      </div>
                    </div>

                    {/* Divider */}
                    <div className="flex items-center gap-2">
                      <div className="flex-1 border-t border-blue-200" />
                      <span className="text-xs text-blue-400">hoặc nhập tùy chỉnh</span>
                      <div className="flex-1 border-t border-blue-200" />
                    </div>

                    {/* Custom input */}
                    <div className="grid grid-cols-3 gap-2">
                      <select
                        value={newRecipient.type}
                        onChange={e => setNewRecipient(p => ({ ...p, type: e.target.value as any }))}
                        className="text-xs border border-gray-300 rounded-lg px-2.5 py-2 bg-white"
                      >
                        <option value="role">Vai trò</option>
                        <option value="department">Phòng ban</option>
                        <option value="subDepartment">Bộ phận con</option>
                      </select>
                      <input
                        placeholder="Value (VD: ADMIN)"
                        value={newRecipient.value || ''}
                        onChange={e => setNewRecipient(p => ({ ...p, value: e.target.value }))}
                        className="text-xs border border-gray-300 rounded-lg px-2.5 py-2"
                      />
                      <input
                        placeholder="Tên hiển thị"
                        value={newRecipient.label || ''}
                        onChange={e => setNewRecipient(p => ({ ...p, label: e.target.value }))}
                        className="text-xs border border-gray-300 rounded-lg px-2.5 py-2"
                      />
                    </div>
                    <div className="flex justify-end">
                      <button onClick={addCustomRecipient} className="text-xs bg-blue-600 text-white px-4 py-1.5 rounded-lg hover:bg-blue-700 font-medium">
                        Thêm người nhận
                      </button>
                    </div>
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                  <button
                    onClick={() => { setSelectedEventKey(null); setEditingRule(null); setShowAddRecipient(false); }}
                    className="text-sm text-gray-400 hover:text-gray-600"
                  >
                    Hủy
                  </button>
                  <button
                    onClick={() => { saveEditingRule(); setSelectedEventKey(null); setEditingRule(null); setShowAddRecipient(false); }}
                    className="flex items-center gap-1.5 text-sm bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 font-medium"
                  >
                    <Check className="w-3.5 h-3.5" />Lưu quy tắc
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      );
    };

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-700">Luồng đơn hàng ({ORDER_FLOW_STEPS.length} bước)</p>
          <p className="text-xs text-gray-400">Nhấn vào một bước để chỉnh sửa người nhận</p>
        </div>

        {/* Order flow steps */}
        <div className="space-y-2">
          {ORDER_FLOW_STEPS.map(step => (
            <RuleCard key={step.event} eventKey={step.event} stepInfo={step} />
          ))}
        </div>

        {/* Other events */}
        {otherEvents.length > 0 && (
          <div className="space-y-2 pt-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-1">Sự kiện khác</p>
            {otherEvents.map(ek => (
              <RuleCard key={ek} eventKey={ek} />
            ))}
          </div>
        )}
      </div>
    );
  };

  const ReferenceFlowPanel = () => (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <button
        onClick={() => setRefFlowExpanded(v => !v)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-orange-600" />
          <span className="font-semibold text-gray-900">Sơ đồ luồng thông báo đơn hàng</span>
          <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Chỉ xem</span>
        </div>
        <ChevronRight className={`w-5 h-5 text-gray-400 transition-transform ${refFlowExpanded ? 'rotate-90' : ''}`} />
      </button>

      {refFlowExpanded && (
        <div className="border-t border-gray-100 p-4">
          <p className="text-sm text-gray-500 mb-4">Tổng quan từ khi tạo yêu cầu báo giá đến khi nhận phản hồi khách hàng. Admin luôn nhận thông báo ở mọi bước.</p>
          <div className="space-y-1">
            {ORDER_FLOW_STEPS.map((step, idx) => {
              const rule = notifSettings?.routingRules[step.event];
              return (
                <div key={step.event}>
                  <div className={`flex items-center gap-3 p-3 rounded-lg border ${STEP_COLOR_MAP[step.color]}`}>
                    <span className="w-6 h-6 rounded-full bg-white/70 flex items-center justify-center text-xs font-bold flex-shrink-0">{step.step}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{step.label}</p>
                      <p className="text-xs opacity-70">Thực hiện bởi: {step.actor}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {rule && (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${rule.enabled ? 'bg-white/70 text-green-700' : 'bg-white/40 text-gray-500'}`}>
                          {rule.enabled ? `${rule.recipients.length} người nhận` : 'Tắt'}
                        </span>
                      )}
                    </div>
                  </div>
                  {idx < ORDER_FLOW_STEPS.length - 1 && (
                    <div className="flex justify-center">
                      <div className="w-0.5 h-3 bg-gray-300" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-5xl mx-auto pb-24">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
          <Settings className="w-7 h-7 text-blue-600" />Cài đặt hệ thống
        </h1>
        <p className="text-gray-500 mt-1">Quản lý theme, slogan và cấu hình thông báo</p>
      </div>

      {/* Main tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {([['general', <Palette key="p" className="w-4 h-4" />, 'Giao diện'], ['notifications', <Bell key="b" className="w-4 h-4" />, 'Thông báo']] as const).map(([tab, icon, label]) => (
          <button
            key={tab}
            onClick={() => setMainTab(tab)}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
              mainTab === tab ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {icon}{label}
            {tab === 'notifications' && notifDirty && (
              <span className="w-2 h-2 bg-orange-400 rounded-full" title="Có thay đổi chưa lưu" />
            )}
          </button>
        ))}
      </div>

      {/* ── General tab ── */}
      {mainTab === 'general' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Palette className="w-5 h-5 text-purple-600" />Theme hệ thống
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {THEMES.map(theme => (
                <div
                  key={theme.id}
                  onClick={() => setSelectedTheme(theme.id)}
                  className={`cursor-pointer rounded-xl border-2 overflow-hidden transition-all ${
                    selectedTheme === theme.id ? 'border-blue-500 shadow-md scale-[1.02]' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className={`h-16 ${theme.preview} flex items-center justify-center`}>
                    <span className="text-2xl">{theme.icon}</span>
                  </div>
                  <div className="p-3 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-sm text-gray-900">{theme.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{theme.description}</p>
                    </div>
                    {selectedTheme === theme.id && (
                      <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Type className="w-5 h-5 text-green-600" />Slogan hệ thống
            </h2>
            <textarea
              value={slogan}
              onChange={e => setSlogan(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 resize-none"
              rows={3}
              maxLength={500}
            />
            <p className="text-xs text-gray-400 mt-1 text-right">{slogan.length}/500</p>
          </div>

          <div className="flex justify-end">
            <SaveBtn onClick={handleSaveGeneral} saving={savingGeneral} saved={savedGeneral} />
          </div>
        </div>
      )}

      {/* ── Notifications tab ── */}
      {mainTab === 'notifications' && (
        <div>
          {!notifSettings ? (
            <div className="flex items-center justify-center h-48 bg-white rounded-xl border border-gray-200">
              <div className="text-center text-gray-400">
                <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin mx-auto mb-3" />
                <p className="text-sm">Đang tải cấu hình thông báo...</p>
              </div>
            </div>
          ) : (
            <>
              {/* Notif sub-tabs */}
              <div className="flex gap-1 mb-5 bg-gray-100 rounded-xl p-1">
                {([
                  ['overview', BarChart2, 'Tổng quan'],
                  ['routing', List, 'Quy tắc định tuyến'],
                  ['reference', BookOpen, 'Sơ đồ luồng'],
                ] as const).map(([tab, Icon, label]) => (
                  <button
                    key={tab}
                    onClick={() => setNotifTab(tab)}
                    className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg flex-1 justify-center transition-colors ${
                      notifTab === tab ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <Icon className="w-4 h-4" />{label}
                  </button>
                ))}
              </div>

              {notifTab === 'overview' && <OverviewPanel />}
              {notifTab === 'routing' && <RoutingPanel />}
              {notifTab === 'reference' && (
                <div className="space-y-4">
                  <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <Info className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-amber-700">Đây là sơ đồ tham chiếu chỉ đọc. Để chỉnh sửa người nhận của từng bước, hãy dùng tab <strong>Quy tắc định tuyến</strong>.</p>
                  </div>
                  <ReferenceFlowPanel />
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Sticky save bar for notifications ── */}
      {mainTab === 'notifications' && notifSettings && (
        <div className={`fixed bottom-0 left-0 right-0 z-40 transition-transform duration-300 ${notifDirty ? 'translate-y-0' : 'translate-y-full'}`}>
          <div className="max-w-5xl mx-auto px-6 pb-4">
            <div className="bg-white border border-gray-200 shadow-lg rounded-xl px-5 py-3 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-sm text-amber-700">
                <AlertCircle className="w-4 h-4 text-amber-500" />
                Có thay đổi chưa được lưu
              </div>
              {notifError && <p className="text-xs text-red-500">{notifError}</p>}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setNotifDirty(false); if (settings?.notificationSettings) setNotifSettings(settings.notificationSettings); }}
                  className="text-sm text-gray-500 hover:text-gray-700 px-3 py-2"
                >
                  Hoàn tác
                </button>
                <SaveBtn onClick={handleSaveNotifications} saving={savingNotif} saved={savedNotif} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


export default SystemSettingsPage;
