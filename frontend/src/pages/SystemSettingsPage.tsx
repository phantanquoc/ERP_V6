import React, { useState, useEffect } from 'react';
import { Settings, Palette, Type, Save, Check } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useSystemSettings } from '../contexts/SystemSettingsContext';
import { isAdmin } from '../utils/permissions';
import systemSettingsService from '../services/systemSettingsService';

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

const SystemSettingsPage: React.FC = () => {
  const { user } = useAuth();
  const { settings, refreshSettings } = useSystemSettings();
  const [selectedTheme, setSelectedTheme] = useState('DEFAULT');
  const [slogan, setSlogan] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (settings) {
      setSelectedTheme(settings.activeTheme);
      setSlogan(settings.slogan);
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

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
          <Settings className="w-7 h-7 text-blue-600" />
          Cài đặt hệ thống
        </h1>
        <p className="text-gray-500 mt-1">Quản lý theme và slogan cho toàn bộ hệ thống</p>
      </div>

      {/* Theme Selection */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Palette className="w-5 h-5 text-purple-600" />
          Theme hệ thống
        </h2>
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
              {/* Theme preview bar */}
              <div className={`h-20 ${theme.preview} relative flex items-center justify-center`}>
                {theme.id === 'TET' && <span className="text-3xl">🏮</span>}
                {theme.id === 'APR30' && <span className="text-3xl">⭐</span>}
                {theme.id === 'DEFAULT' && <span className="text-3xl text-white/80">ABF</span>}
              </div>

              {/* Theme info */}
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
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Type className="w-5 h-5 text-green-600" />
          Slogan hệ thống
        </h2>
        <p className="text-sm text-gray-500 mb-3">
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

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium text-white transition-all duration-200 ${
            saved
              ? 'bg-green-500 hover:bg-green-600'
              : 'bg-blue-600 hover:bg-blue-700'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {saving ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Đang lưu...
            </>
          ) : saved ? (
            <>
              <Check className="w-5 h-5" />
              Đã lưu thành công!
            </>
          ) : (
            <>
              <Save className="w-5 h-5" />
              Lưu thay đổi
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default SystemSettingsPage;
