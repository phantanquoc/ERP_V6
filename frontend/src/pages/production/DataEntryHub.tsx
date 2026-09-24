import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { markTab, isKioskTab, hasKioskSession, KIOSK_EXPIRED_EVENT } from '../../utils/kioskSession';
import { Package, Leaf, Gauge, AlertTriangle } from 'lucide-react';
import abfLogo from '@assets/abf-logo.png';
import koolaLogo from '@assets/koola-logo.png';

const NotActivatedScreen: React.FC = () => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
    <div className="bg-white rounded-lg shadow-sm border p-8 max-w-md w-full text-center">
      <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
      <h2 className="text-lg font-semibold text-gray-800 mb-2">Phiên chưa được kích hoạt</h2>
      <p className="text-gray-600">Nhờ admin mở lại trang này từ hệ thống ERP.</p>
    </div>
  </div>
);

const ExpiredScreen: React.FC = () => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
    <div className="bg-white rounded-lg shadow-sm border p-8 max-w-md w-full text-center">
      <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
      <h2 className="text-lg font-semibold text-gray-800 mb-2">Phiên hết hạn</h2>
      <p className="text-gray-600">Nhờ admin mở lại trang này từ hệ thống ERP.</p>
    </div>
  </div>
);

const DataEntryHub: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const position = searchParams.get('position') ?? '';
  const chieu = searchParams.get('chieu') ?? '';
  const ngay = searchParams.get('ngay') ?? '';
  const ca = searchParams.get('ca') ?? '';
  const [kioskExpired, setKioskExpired] = useState(false);

  useEffect(() => {
    markTab();
    const paramKey = searchParams.get('deviceKey');
    if (paramKey) {
      void (async () => {
        const { getDeviceKey, validateAndSetDeviceKey, clearDeviceKey } = await import('../../utils/kioskSession');
        if (!getDeviceKey()) {
          const ok = await validateAndSetDeviceKey(paramKey);
          if (!ok) clearDeviceKey();
        }
      })();
    }
  }, [searchParams]);

  useEffect(() => {
    const handler = () => setKioskExpired(true);
    window.addEventListener(KIOSK_EXPIRED_EVENT, handler);
    return () => window.removeEventListener(KIOSK_EXPIRED_EVENT, handler);
  }, []);

  if (!isKioskTab() && !hasKioskSession()) return <NotActivatedScreen />;
  if (kioskExpired) return <ExpiredScreen />;
  if (isKioskTab() && !hasKioskSession()) return <NotActivatedScreen />;

  const entryTypes: { key: string; title: string; description: string; icon: React.ElementType; route: string; color: string; disabled?: boolean }[] = [
    {
      key: 'material-evaluation',
      title: 'Đánh giá nguyên liệu',
      description: 'Nhập kết quả đánh giá chất lượng nguyên liệu',
      icon: Leaf,
      route: '/production/nhap-lieu-danh-gia',
      color: 'bg-green-500 hover:bg-green-600',
    },
    {
      key: 'system-operation',
      title: 'Thông số vận hành',
      description: 'Nhập thông số nhiệt độ, áp suất, thời gian sấy theo máy',
      icon: Gauge,
      route: '/production/nhap-lieu-van-hanh',
      color: 'bg-orange-500 hover:bg-orange-600',
    },
    {
      key: 'production-output',
      title: 'Sản lượng chiên',
      description: 'Nhập dữ liệu sản lượng thành phẩm',
      icon: Package,
      route: '/production/nhap-lieu',
      color: 'bg-blue-500 hover:bg-blue-600',
    },
  ];

  return (
    <div className="h-screen w-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 sm:p-6 flex flex-col">
      {/* Logo ABF */}
      <div className="flex-shrink-0 flex items-center justify-center py-2">
        <img src={abfLogo} alt="An Binh Foods" className="h-12 sm:h-16 object-contain" />
      </div>

      {/* Cards — chiếm phần lớn màn hình */}
      <div className="grid flex-1 min-h-0 w-full grid-cols-1 gap-4 sm:gap-6 md:grid-cols-3">
        {entryTypes.map((entry) => {
          const Icon = entry.icon;
          return (
            <button
              key={entry.key}
              onClick={() => {
                if (entry.route && !entry.disabled) {
                  const qs = new URLSearchParams();
                  if (position) qs.set('position', position);
                  if (chieu) qs.set('chieu', chieu);
                  if (ngay) qs.set('ngay', ngay);
                  if (ca) qs.set('ca', ca);
                  qs.set('next', '/production/nhap-lieu');
                  const suffix = qs.toString() ? `?${qs.toString()}` : '';
                  navigate(`${entry.route}${suffix}`);
                }
              }}
              disabled={entry.disabled}
              className={`${entry.color} h-full w-full text-white rounded-3xl p-8 shadow-sm transition-all duration-300 transform hover:scale-[1.02] hover:shadow-2xl flex flex-col items-center justify-center text-center ${
                entry.disabled ? 'opacity-50' : ''
              }`}
            >
              <div className="bg-white bg-opacity-20 rounded-full p-8 mb-6">
                <Icon size={96} strokeWidth={1.5} />
              </div>
              <h2 className="text-2xl font-bold mb-3">{entry.title}</h2>
              <p className="text-lg opacity-90">{entry.description}</p>
              {entry.disabled && (
                <span className="mt-5 text-sm bg-white bg-opacity-20 px-4 py-1.5 rounded-full">
                  Đang phát triển
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Powered by Koola */}
      <div className="flex-shrink-0 flex items-center justify-center gap-2 py-2 opacity-60">
        <span className="text-xs text-gray-500">Powered by</span>
        <img src={koolaLogo} alt="Koola" className="h-4 object-contain" />
        <span className="text-xs font-semibold text-gray-400">KOOLA</span>
      </div>
    </div>
  );
};

export default DataEntryHub;
