import React, { useState, useEffect } from 'react';
import {
  Settings, Palette, Type, Save, Check, Bell, ToggleLeft, ToggleRight,
  Clock, History, ChevronRight, Users, ArrowRight, Info,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useSystemSettings } from '../contexts/SystemSettingsContext';
import { isAdmin } from '../utils/permissions';
import systemSettingsService, { NotificationSettings, NotificationRoutingRule } from '../services/systemSettingsService';

const THEMES = [
  {
    id: 'DEFAULT',
    name: 'Mặc định',
    description: 'Giao diện xanh dương chuyên nghiệp',
    preview: 'bg-gradient-to-r from-blue-600 to-indigo-600',
  },
  {
    id: 'TET',
    name: 'Tết Nguyên Đán',
    description: 'Giao diện đỏ với hoa mai',
    preview: 'bg-gradient-to-r from-red-600 to-red-700',
  },
  {
    id: 'APR30',
    name: '30/4 - 1/5',
    description: 'Ngày Giải phóng & Quốc tế Lao động',
    preview: 'bg-gradient-to-r from-red-600 to-yellow-500',
  },
];

// Order flow steps for the notification flow diagram
const ORDER_FLOW_STEPS = [
  { step: 1, event: 'quotation-request.created', label: 'Tạo yêu cầu báo giá', actor: 'Kinh doanh', recipients: 'Giá thành + Admin', color: 'bg-blue-100 border-blue-300 text-blue-800' },
  { step: 2, event: 'quotation.created', label: 'Tạo báo giá', actor: 'Giá thành', recipients: 'Kinh doanh + Admin', color: 'bg-purple-100 border-purple-300 text-purple-800' },
  { step: 3, event: 'quotation.customer-confirmed', label: 'Khách xác nhận báo giá', actor: 'Kinh doanh', recipients: 'Kinh doanh + Quản lý SX + Kế toán + Admin', color: 'bg-green-100 border-green-300 text-green-800' },
  { step: 4, event: 'order.created', label: 'Tạo đơn hàng', actor: 'Hệ thống', recipients: 'Quản lý SX + Admin', color: 'bg-yellow-100 border-yellow-300 text-yellow-800' },
  { step: 5, event: 'supply.request.created', label: 'Tạo yêu cầu cung ứng', actor: 'SX / Kho', recipients: 'Cung ứng / Mua hàng + Admin', color: 'bg-orange-100 border-orange-300 text-orange-800' },
  { step: 6, event: 'supply.request.approved', label: 'Duyệt yêu cầu cung ứng', actor: 'Trưởng bộ phận', recipients: 'Mua hàng + Admin', color: 'bg-teal-100 border-teal-300 text-teal-800' },
  { step: 7, event: 'purchase-request.completed', label: 'Hoàn tất mua hàng', actor: 'Mua hàng', recipients: 'Downstream + Admin', color: 'bg-cyan-100 border-cyan-300 text-cyan-800' },
  { step: 8, event: 'tax-report.created', label: 'Tạo báo cáo thuế', actor: 'Hệ thống', recipients: 'Kế toán thuế + Admin', color: 'bg-indigo-100 border-indigo-300 text-indigo-800' },
  { step: 9, event: 'invoice.created', label: 'Tạo hóa đơn', actor: 'Kế toán', recipients: 'Kế toán HC + Kinh doanh + Admin', color: 'bg-pink-100 border-pink-300 text-pink-800' },
  { step: 10, event: 'customer-feedback.created', label: 'Phản hồi khách hàng', actor: 'Kinh doanh', recipients: 'Kinh doanh + Khối chung + Admin', color: 'bg-rose-100 border-rose-300 text-rose-800' },
];

const CATEGORY_LABELS: Record<string, string> = {
  EVALUATION: 'Đánh giá nhân viên',
  TASK: 'Nhiệm vụ',
  LEAVE: 'Nghỉ phép',
  PAYROLL: 'Bảng lương',
  ACCEPTANCE: 'Nghiệm thu',
  OVERTIME: 'Tăng ca',
  SUPPLY: 'Cung ứng / Mua hàng',
  AUTH: 'Xác thực',
  FEEDBACK: 'Góp ý',
  REPORT: 'Báo cáo đơn hàng',
  WORK_PLAN: 'Kế hoạch làm việc',
  SYSTEM: 'Hệ thống',
};

type Tab = 'general' | 'notifications';

const SystemSettingsPage: React.FC = () => {
  const { user } = useAuth();
  const { settings, refreshSettings } = useSystemSettings();

  const [activeTab, setActiveTab] = useState<Tab>('general');

  // General tab state
  const [selectedTheme, setSelectedTheme] = useState('DEFAULT');
  const [slogan, setSlogan] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Notification tab state
  const [notifSettings, setNotifSettings] = useState<NotificationSettings | null>(null);
  const [savingNotif, setSavingNotif] = useState(false);
  const [savedNotif, setSavedNotif] = useState(false);
  const [expandedRule, setExpandedRule] = useState<string | null>(null);

  useEffect(() => {
    if (settings) {
      setSelectedTheme(settings.activeTheme);
      setSlogan(settings.slogan);
      if (settings.notificationSettings) {
        setNotifSettings(settings.notificationSettings);
      }
    }
  }, [settings]);

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

  const handleSaveGeneral = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await systemSettingsService.updateSettings({ activeTheme: selectedTheme, slogan });
      await refreshSettings();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      alert('Có lỗi xảy ra khi lưu cài đặt.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNotifications = async () => {
    if (!notifSettings) return;
    setSavingNotif(true);
    setSavedNotif(false);
    try {
      await systemSettingsService.updateSettings({ notificationSettings: notifSettings });
      await refreshSettings();
      setSavedNotif(true);
      setTimeout(() => setSavedNotif(false), 3000);
    } catch {
      alert('Có lỗi xảy ra khi lưu cài đặt thông báo.');
    } finally {
      setSavingNotif(false);
    }
  };

  const updateChannel = (key: keyof NotificationSettings['channels'], value: boolean) => {
    setNotifSettings(prev => prev ? { ...prev, channels: { ...prev.channels, [key]: value } } : prev);
  };

  const updateUi = (key: keyof NotificationSettings['ui'], value: number | boolean) => {
    setNotifSettings(prev => prev ? { ...prev, ui: { ...prev.ui, [key]: value } } : prev);
  };

  const updateCategory = (cat: string, value: boolean) => {
    setNotifSettings(prev => prev ? { ...prev, categories: { ...prev.categories, [cat]: value } } : prev);
  };

  const toggleRuleEnabled = (eventKey: string, enabled: boolean) => {
    setNotifSettings(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        routingRules: {
          ...prev.routingRules,
          [eventKey]: { ...prev.routingRules[eventKey], enabled },
        },
      };
    });
  };

  const SaveButton = ({ onClick, saving: s, saved: sv }: { onClick: () => void; saving: boolean; saved: boolean }) => (
    <button
      onClick={onClick}
      disabled={s}
      className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium text-white transition-all duration-200 ${
        sv ? 'bg-green-500 hover:bg-green-600' : 'bg-blue-600 hover:bg-blue-700'
      } disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      {s ? (
        <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />Đang lưu...</>
      ) : sv ? (
        <><Check className="w-5 h-5" />Đã lưu!</>
      ) : (
        <><Save className="w-5 h-5" />Lưu thay đổi</>
      )}
    </button>
  );

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
          <Settings className="w-7 h-7 text-blue-600" />
          Cài đặt hệ thống
        </h1>
        <p className="text-gray-500 mt-1">Quản lý theme, slogan và cấu hình thông báo</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('general')}
          className={`px-5 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === 'general'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <span className="flex items-center gap-2"><Palette className="w-4 h-4" />Giao diện</span>
        </button>
        <button
          onClick={() => setActiveTab('notifications')}
          className={`px-5 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === 'notifications'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <span className="flex items-center gap-2"><Bell className="w-4 h-4" />Thông báo</span>
        </button>
      </div>

      {/* ── General tab ── */}
      {activeTab === 'general' && (
        <>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Palette className="w-5 h-5 text-purple-600" />Theme hệ thống
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {THEMES.map((theme) => (
                <div
                  key={theme.id}
                  onClick={() => setSelectedTheme(theme.id)}
                  className={`cursor-pointer rounded-xl border-2 transition-all duration-200 overflow-hidden ${
                    selectedTheme === theme.id ? 'border-blue-500 shadow-lg scale-[1.02]' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className={`h-20 ${theme.preview} flex items-center justify-center`}>
                    {theme.id === 'TET' && <span className="text-3xl">🏮</span>}
                    {theme.id === 'APR30' && <span className="text-3xl">⭐</span>}
                    {theme.id === 'DEFAULT' && <span className="text-3xl text-white/80">ABF</span>}
                  </div>
                  <div className="p-4 flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900">{theme.name}</h3>
                      <p className="text-sm text-gray-500 mt-0.5">{theme.description}</p>
                    </div>
                    {selectedTheme === theme.id && (
                      <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Type className="w-5 h-5 text-green-600" />Slogan hệ thống
            </h2>
            <textarea
              value={slogan}
              onChange={(e) => setSlogan(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              rows={3}
              maxLength={500}
            />
            <p className="text-xs text-gray-400 mt-1 text-right">{slogan.length}/500</p>
          </div>

          <div className="flex justify-end">
            <SaveButton onClick={handleSaveGeneral} saving={saving} saved={saved} />
          </div>
        </>
      )}

      {/* ── Notifications tab ── */}
      {activeTab === 'notifications' && (
        <>
          {!notifSettings ? (
            <div className="text-center py-12 text-gray-400">Đang tải cấu hình thông báo...</div>
          ) : (
            <>
              {/* ─ Channels ─ */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Bell className="w-5 h-5 text-blue-600" />Kênh thông báo
                </h2>
                <div className="space-y-3">
                  {[
                    { key: 'inAppEnabled' as const, label: 'Thông báo trong ứng dụng (In-app)', desc: 'Hiển thị chuông và hộp thư thông báo trên giao diện' },
                    { key: 'webPushEnabled' as const, label: 'Web Push Notification', desc: 'Gửi thông báo push đến trình duyệt khi không mở ứng dụng' },
                  ].map(({ key, label, desc }) => (
                    <div key={key} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">{label}</p>
                        <p className="text-sm text-gray-500">{desc}</p>
                      </div>
                      <button onClick={() => updateChannel(key, !notifSettings.channels[key])} className="flex-shrink-0">
                        {notifSettings.channels[key]
                          ? <ToggleRight className="w-8 h-8 text-blue-600" />
                          : <ToggleLeft className="w-8 h-8 text-gray-400" />}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* ─ UI settings ─ */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-purple-600" />Cấu hình hiển thị
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
                    { key: 'unreadPollingIntervalSeconds' as const, label: 'Polling interval (giây)', min: 10, max: 300 },
                    { key: 'recentLimit' as const, label: 'Số thông báo gần đây', min: 5, max: 100 },
                    { key: 'historyWindowDays' as const, label: 'Lịch sử (ngày)', min: 7, max: 365 },
                  ].map(({ key, label, min, max }) => (
                    <div key={key}>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                      <input
                        type="number"
                        min={min}
                        max={max}
                        value={notifSettings.ui[key] as number}
                        onChange={(e) => updateUi(key, parseInt(e.target.value) || min)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">Hiển thị sơ đồ luồng đơn hàng</p>
                    <p className="text-sm text-gray-500">Hiển thị luồng thông báo quy trình đơn hàng cho Admin</p>
                  </div>
                  <button onClick={() => updateUi('showAdminFlowOverview', !notifSettings.ui.showAdminFlowOverview)}>
                    {notifSettings.ui.showAdminFlowOverview
                      ? <ToggleRight className="w-8 h-8 text-blue-600" />
                      : <ToggleLeft className="w-8 h-8 text-gray-400" />}
                  </button>
                </div>
              </div>

              {/* ─ Category toggles ─ */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <History className="w-5 h-5 text-teal-600" />Phân loại thông báo
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {Object.entries(notifSettings.categories).map(([cat, enabled]) => (
                    <div key={cat} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm font-medium text-gray-700">{CATEGORY_LABELS[cat] || cat}</span>
                      <button onClick={() => updateCategory(cat, !enabled)}>
                        {enabled
                          ? <ToggleRight className="w-7 h-7 text-blue-600" />
                          : <ToggleLeft className="w-7 h-7 text-gray-400" />}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* ─ Order flow diagram ─ */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-1 flex items-center gap-2">
                  <ArrowRight className="w-5 h-5 text-orange-600" />Luồng thông báo quy trình đơn hàng
                </h2>
                <p className="text-sm text-gray-500 mb-5">Tổng quan các bước gửi thông báo từ khi tạo yêu cầu báo giá đến khi nhận phản hồi khách hàng. Admin luôn nhận thông báo ở mọi bước.</p>

                <div className="space-y-2">
                  {ORDER_FLOW_STEPS.map((step, idx) => {
                    const rule = notifSettings.routingRules[step.event];
                    const isExpanded = expandedRule === step.event;
                    return (
                      <div key={step.event} className="border border-gray-200 rounded-lg overflow-hidden">
                        <div
                          className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-50 ${step.color}`}
                          onClick={() => setExpandedRule(isExpanded ? null : step.event)}
                        >
                          <span className="w-6 h-6 rounded-full bg-white/70 flex items-center justify-center text-xs font-bold flex-shrink-0">
                            {step.step}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{step.label}</p>
                            <p className="text-xs opacity-70">Người thực hiện: {step.actor}</p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-xs bg-white/60 px-2 py-0.5 rounded-full hidden sm:block">
                              → {step.recipients}
                            </span>
                            {rule && (
                              <button
                                onClick={(e) => { e.stopPropagation(); toggleRuleEnabled(step.event, !rule.enabled); }}
                                title={rule.enabled ? 'Tắt thông báo bước này' : 'Bật thông báo bước này'}
                              >
                                {rule.enabled
                                  ? <ToggleRight className="w-6 h-6" />
                                  : <ToggleLeft className="w-6 h-6 opacity-50" />}
                              </button>
                            )}
                            <ChevronRight className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                          </div>
                        </div>

                        {isExpanded && rule && (
                          <div className="p-4 bg-white border-t border-gray-100">
                            <div className="flex items-start gap-2 mb-3">
                              <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                              <p className="text-xs text-gray-600">
                                Sự kiện: <code className="bg-gray-100 px-1 rounded">{step.event}</code>
                                <span className="ml-2">• Trạng thái: </span>
                                <span className={rule.enabled ? 'text-green-600 font-medium' : 'text-red-500 font-medium'}>
                                  {rule.enabled ? 'Đang bật' : 'Đang tắt'}
                                </span>
                              </p>
                            </div>
                            <div>
                              <p className="text-xs font-medium text-gray-700 mb-2 flex items-center gap-1">
                                <Users className="w-3.5 h-3.5" /> Người nhận hiện tại:
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {rule.recipients.map((r) => (
                                  <span key={r.id} className="text-xs bg-blue-50 border border-blue-200 text-blue-700 px-2 py-1 rounded-full">
                                    {r.label}
                                  </span>
                                ))}
                                {rule.recipients.length === 0 && (
                                  <span className="text-xs text-gray-400 italic">Chưa cấu hình người nhận</span>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        {idx < ORDER_FLOW_STEPS.length - 1 && (
                          <div className="flex justify-center -my-1 relative z-10">
                            <div className="w-0.5 h-4 bg-gray-300" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end">
                <SaveButton onClick={handleSaveNotifications} saving={savingNotif} saved={savedNotif} />
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default SystemSettingsPage;

