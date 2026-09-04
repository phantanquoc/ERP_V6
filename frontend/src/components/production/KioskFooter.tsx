import React from 'react';
import koolaLogo from '@assets/koola-logo.png';

/**
 * Chữ ký "Powered by Koola" dùng chung cho các trang nhập liệu tablet (kiosk).
 * Đồng bộ với footer ở Sidebar.
 */
const KioskFooter: React.FC = () => (
  <div className="mt-auto border-t border-gray-200 bg-white/60 py-3">
    <a
      href="https://koola.vn"
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-center gap-2 opacity-60 hover:opacity-100 transition-opacity"
      title="Powered by Koola"
    >
      <span className="text-[11px] text-gray-500">Powered by</span>
      <img src={koolaLogo} alt="Koola" className="h-4 object-contain" />
      <span className="text-[11px] font-semibold text-gray-400">KOOLA</span>
    </a>
  </div>
);

export default KioskFooter;