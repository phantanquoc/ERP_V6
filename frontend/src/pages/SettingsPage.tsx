/**
 * SettingsPage — Trang cài đặt hệ thống (chỉ ADMIN)
 * Cho phép admin thay đổi banner toàn hệ thống với live preview
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types/auth';
import HolidayBanner, { HolidayType, detectHoliday } from '../components/HolidayBanner';
import { API_BASE_URL } from '../config/api';
import AuthService from '../services/authService';

interface BannerOption {
  value: HolidayType | 'auto';
  label: string;
  description: string;
  emoji: string;
}

const BANNER_OPTIONS: BannerOption[] = [
  { value: 'auto',       emoji: '🤖', label: 'Tự động',         description: 'Tự chọn theo ngày (Tết: 23/1–20/2 · 30/4: 23–30/4)' },
  { value: 'default',    emoji: '🌿', label: 'Mặc định',        description: 'Banner xanh doanh nghiệp' },
  { value: 'tet',        emoji: '🏮', label: 'Tết Nguyên Đán',  description: 'Hoa mai, đèn lồng đỏ' },
  { value: 'liberation', emoji: '🎆', label: '30/4 Giải phóng', description: 'Cờ đỏ sao vàng, pháo hoa' },
  { value: 'labor',      emoji: '✊', label: '1/5 Lao động',    description: 'Tông đỏ vàng, ngày lao động' },
];

// Mock user cho preview banner
const PREVIEW_USER = {
  firstName: 'Nguyễn Văn A',
  position: 'Nhân viên',
  employeeCode: 'EMP-001',
};

async function fetchBanner(): Promise<HolidayType | 'auto'> {
  const res = await fetch(`${API_BASE_URL}/system-settings/banner`);
  const json = await res.json();
  return json?.data?.value ?? 'auto';
}

async function saveBannerToServer(value: HolidayType | 'auto'): Promise<void> {
  const token = AuthService.getAccessToken();
  await fetch(`${API_BASE_URL}/system-settings/banner`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ value }),
  });
}

const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [selected, setSelected] = useState<HolidayType | 'auto'>('auto');
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBanner().then(val => {
      setSelected(val);
      setLoading(false);
    });
  }, []);

  // Redirect nếu không phải admin
  if (!user || user.role !== UserRole.ADMIN) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-6xl mb-4">🚫</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Không có quyền truy cập</h2>
          <p className="text-gray-500 mb-6">Trang này chỉ dành cho Admin</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Về Dashboard
          </button>
        </div>
      </div>
    );
  }

  const resolvedPreview: HolidayType = selected === 'auto' ? detectHoliday() : selected;

  const handleSave = async () => {
    await saveBannerToServer(selected);
    setSaved(true);
    // Reset saved indicator sau 3s
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="min-h-full bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">

        {/* Header */}
        <div className="mb-8 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center shadow-lg">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Cài đặt hệ thống</h1>
            <p className="text-sm text-gray-500">Quản lý giao diện toàn hệ thống</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* ── Left: Banner Picker ── */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-800">🎨 Banner toàn hệ thống</h2>
              <p className="text-xs text-gray-500 mt-0.5">Thay đổi cập nhật realtime cho tất cả người dùng</p>
            </div>

            {loading ? (
              <div className="p-8 flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
              </div>
            ) : (
              <div className="p-4 space-y-2">
                {BANNER_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => { setSelected(opt.value); setSaved(false); }}
                    className={`w-full text-left rounded-xl border-2 p-4 transition-all duration-150 ${
                      selected === opt.value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-100 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{opt.emoji}</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-semibold ${selected === opt.value ? 'text-blue-700' : 'text-gray-800'}`}>
                            {opt.label}
                          </span>
                          {selected === opt.value && (
                            <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">Đang chọn</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">{opt.description}</p>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                        selected === opt.value ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                      }`}>
                        {selected === opt.value && (
                          <svg className="w-3 h-3" fill="none" stroke="white" viewBox="0 0 12 12">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2 6l3 3 5-5"/>
                          </svg>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            <div className="px-4 pb-4">
              <button
                onClick={handleSave}
                disabled={saved || loading}
                className={`w-full py-3 rounded-xl font-semibold text-sm transition-all duration-200 ${
                  saved
                    ? 'bg-emerald-500 text-white cursor-default'
                    : 'bg-gray-900 text-white hover:bg-gray-700 active:scale-[0.98] shadow-md disabled:opacity-50'
                }`}
              >
                {saved ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
                    </svg>
                    Đã lưu — đang cập nhật realtime!
                  </span>
                ) : 'Lưu & áp dụng toàn hệ thống'}
              </button>
            </div>
          </div>

          {/* ── Right: Preview ── */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-800">👁 Preview</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {selected === 'auto'
                  ? `Tự động → hiện tại: ${BANNER_OPTIONS.find(o => o.value === resolvedPreview)?.label}`
                  : BANNER_OPTIONS.find(o => o.value === selected)?.label}
              </p>
            </div>
            <div className="p-4">
              <div className="rounded-xl overflow-hidden" style={{ transform: 'scale(0.92)', transformOrigin: 'top center', marginBottom: '-8%' }}>
                <HolidayBanner
                  user={PREVIEW_USER}
                  departmentName="Phòng Quản trị"
                  forceHoliday={resolvedPreview}
                />
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
