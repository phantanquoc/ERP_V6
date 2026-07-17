import React, { useState, useEffect } from 'react';
import { Settings, Palette, Type, Save, Check, Server, ExternalLink, Terminal, Copy, User, AlertTriangle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useSystemSettings } from '../contexts/SystemSettingsContext';
import { isAdmin } from '../utils/permissions';
import systemSettingsService from '../services/systemSettingsService';
import NotificationPreferencesSection from '../components/NotificationPreferencesSection';
import DeviceManagementSection from '../components/DeviceManagementSection';

const THEMES = [
  {
    id: 'DEFAULT',
    name: 'Mặc định',
    description: 'Giao diện xanh dương chuyên nghiệp',
    gradient: 'from-blue-700 via-blue-600 to-indigo-700',
    preview: 'bg-gradient-to-r from-blue-600 to-indigo-600',
  },
  {
    id: 'TET',
    name: 'Tết Nguyên Đán',
    description: 'Giao diện đỏ với hoa mai',
    gradient: 'from-red-700 via-red-600 to-red-700',
    preview: 'bg-gradient-to-r from-red-600 to-red-700',
  },
  {
    id: 'APR30',
    name: '30/4 - 1/5',
    description: 'Ngày Giải phóng & Quốc tế Lao động',
    gradient: 'from-red-700 via-red-600 to-red-700',
    preview: 'bg-gradient-to-r from-red-600 to-yellow-500',
  },
];

type ActiveTab = 'personal' | 'system';

const SystemSettingsPage: React.FC = () => {
  const { user } = useAuth();
  const { settings, refreshSettings } = useSystemSettings();
  const [selectedTheme, setSelectedTheme] = useState('DEFAULT');
  const [slogan, setSlogan] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copiedTunnel, setCopiedTunnel] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('personal');

  const userIsAdmin = user ? isAdmin(user.department) : false;

  const TUNNEL_CMD = 'ssh -f -N -L 9443:localhost:9443 vps-anbinh';

  const handleCopyTunnel = () => {
    navigator.clipboard.writeText(TUNNEL_CMD);
    setCopiedTunnel(true);
    setTimeout(() => setCopiedTunnel(false), 2000);
  };

  useEffect(() => {
    if (settings) {
      setSelectedTheme(settings.activeTheme);
      setSlogan(settings.slogan);
    }
  }, [settings]);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await systemSettingsService.updateSettings({
        activeTheme: selectedTheme,
        slogan,
      });
      await refreshSettings();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      alert('Có lỗi xảy ra khi lưu cài đặt.');
    } finally {
      setSaving(false);
    }
  };

  // Determine page title
  const pageTitle = activeTab === 'system' && userIsAdmin
    ? 'Cài đặt hệ thống'
    : 'Cài đặt cá nhân';

  return (
    <div className="max-w-4xl mx-auto">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
          {activeTab === 'system' && userIsAdmin
            ? <Settings className="w-7 h-7 text-blue-600" />
            : <User className="w-7 h-7 text-blue-600" />}
          {pageTitle}
        </h1>
        <p className="text-gray-500 mt-1">
          {activeTab === 'system' && userIsAdmin
            ? 'Quản lý theme và slogan cho toàn bộ hệ thống'
            : 'Tùy chỉnh trải nghiệm của bạn'}
        </p>
      </div>

      {/* Tab switcher — only for admin */}
      {userIsAdmin && (
        <div className="flex gap-1 border-b border-gray-200 mb-6">
          <button
            type="button"
            onClick={() => setActiveTab('personal')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === 'personal'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <User className="w-4 h-4" />
            Cá nhân
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('system')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === 'system'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Settings className="w-4 h-4" />
            Hệ thống
          </button>
        </div>
      )}

      {/* Personal tab content */}
      {(!userIsAdmin || activeTab === 'personal') && (
        <NotificationPreferencesSection />
      )}

      {/* System tab content — admin only */}
      {userIsAdmin && activeTab === 'system' && (
        <>
          {/* Giao diện & Slogan */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-base font-semibold text-gray-900 mb-5 flex items-center gap-2">
              <Palette className="w-5 h-5 text-purple-600" />
              Giao diện &amp; Slogan
            </h2>

            {/* Theme Selection */}
            <div className="mb-6">
              <p className="text-sm font-medium text-gray-700 mb-3">Theme hệ thống</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {THEMES.map((theme) => (
                  <div
                    key={theme.id}
                    onClick={() => setSelectedTheme(theme.id)}
                    className={`relative cursor-pointer rounded-xl border-2 transition-all duration-200 overflow-hidden ${
                      selectedTheme === theme.id
                        ? 'border-blue-500 shadow-lg scale-[1.02]'
                        : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                    }`}
                  >
                    <div className={`h-20 ${theme.preview} relative flex items-center justify-center`}>
                      {theme.id === 'TET' && <span className="text-3xl">🏮</span>}
                      {theme.id === 'APR30' && <span className="text-3xl">⭐</span>}
                      {theme.id === 'DEFAULT' && <span className="text-3xl text-white/80">ABF</span>}
                    </div>
                    <div className="p-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-gray-900">{theme.name}</h3>
                        {selectedTheme === theme.id && (
                          <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                            <Check className="w-4 h-4 text-white" />
                          </div>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mt-1">{theme.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Slogan */}
            <div className="mb-6">
              <p className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1.5">
                <Type className="w-4 h-4 text-green-600" />
                Slogan hệ thống
              </p>
              <p className="text-xs text-gray-500 mb-3">
                Slogan hiển thị trên thanh header cho tất cả người dùng
              </p>
              <textarea
                value={slogan}
                onChange={(e) => setSlogan(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                rows={3}
                placeholder="Nhập slogan hệ thống..."
                maxLength={500}
              />
              <p className="text-xs text-gray-400 mt-1 text-right">{slogan.length}/500</p>
            </div>

            {/* Save button for theme + slogan */}
            <div className="flex justify-end">
              <button
                onClick={handleSave}
                disabled={saving}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium text-white transition-all duration-200 ${
                  saved
                    ? 'bg-green-500 hover:bg-green-600'
                    : 'bg-blue-600 hover:bg-blue-700'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Đang lưu...
                  </>
                ) : saved ? (
                  <>
                    <Check className="w-4 h-4" />
                    Đã lưu thành công!
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Lưu thay đổi
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Công cụ quản trị */}
          <div className="mb-6">
            <h2 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Server className="w-5 h-5 text-blue-600" />
              Công cụ quản trị
            </h2>

            {/* Warning banner */}
            <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800">
                Khu vực kỹ thuật — chỉ dùng khi cần thiết.
              </p>
            </div>

            {/* Docker Management card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-1 flex items-center gap-2">
                <Server className="w-4 h-4 text-blue-600" />
                Quản lý Docker (Portainer)
              </h3>
              <p className="text-sm text-gray-500 mb-5">
                Giám sát containers, logs và images trên VPS qua giao diện Portainer.
                Cần mở SSH tunnel trước khi truy cập.
              </p>

              {/* Tunnel command */}
              <div className="mb-5">
                <p className="text-xs font-medium text-gray-600 mb-2 flex items-center gap-1">
                  <Terminal className="w-3.5 h-3.5" />
                  SSH tunnel (nếu muốn truy cập từ máy local qua port 9443)
                </p>
                <div className="flex items-center gap-2 bg-gray-900 rounded-lg px-4 py-3">
                  <code className="flex-1 text-sm text-green-400 font-mono select-all">
                    {TUNNEL_CMD}
                  </code>
                  <button
                    onClick={handleCopyTunnel}
                    className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors shrink-0"
                  >
                    {copiedTunnel ? (
                      <><Check className="w-3.5 h-3.5 text-green-400" /><span className="text-green-400">Đã copy</span></>
                    ) : (
                      <><Copy className="w-3.5 h-3.5" />Copy</>
                    )}
                  </button>
                </div>
              </div>

              {/* Open Portainer button */}
              <div>
                <p className="text-xs font-medium text-gray-600 mb-2 flex items-center gap-1">
                  <ExternalLink className="w-3.5 h-3.5" />
                  Mở Portainer Dashboard
                </p>
                <a
                  href="/portainer/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  <Server className="w-4 h-4" />
                  Mở Portainer Dashboard
                  <ExternalLink className="w-3.5 h-3.5 opacity-70" />
                </a>
                <p className="text-xs text-gray-400 mt-2">
                  Truy cập trực tiếp qua <strong>anbinhfoods.net/portainer/</strong> — không cần SSH tunnel.
                </p>
              </div>
            </div>
          </div>

          {/* Device Management */}
          <DeviceManagementSection />
        </>
      )}
    </div>
  );
};

export default SystemSettingsPage;
