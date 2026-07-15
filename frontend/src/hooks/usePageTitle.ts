import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/common': 'Chung',
  '/general': 'Bộ phận tổng hợp',
  '/general/pricing': 'Phòng giá thành',
  '/general/partners': 'Phòng chăm sóc',
  '/quality': 'Bộ phận chất lượng',
  '/quality/personnel': 'CL Nhân sự',
  '/quality/process': 'CL Quy trình',
  '/business': 'Bộ phận kinh doanh',
  '/business/international': 'KD Quốc Tế',
  '/business/domestic': 'KD Nội Địa',
  '/accounting': 'Bộ phận kế toán',
  '/accounting/admin': 'KT Hành chính',
  '/accounting/tax': 'KT Thuế',
  '/purchasing': 'Bộ phận thu mua',
  '/purchasing/materials': 'Thu mua NVL',
  '/purchasing/equipment': 'Mua thiết bị',
  '/production': 'Bộ phận sản xuất',
  '/production/management': 'Quản lý SX',
  '/production/data': 'Dữ liệu SX',
  '/production/nhap-lieu-danh-gia': 'Nhập liệu đánh giá',
  '/production/warehouse': 'Quản lý kho',
  '/technical': 'Bộ phận kỹ thuật',
  '/technical/quality': 'Đảm bảo & Cải tiến',
  '/technical/mechanical': 'Đảm bảo & Cải tiến',
  '/technical/projects': 'Phòng phát triển',
  '/huong-dan': 'Hướng dẫn',
  '/system-settings': 'Cài đặt hệ thống',
  '/diemdanh/admin': 'Chấm công khuôn mặt',
  '/login': 'Đăng nhập',
};

export function usePageTitle() {
  const { pathname } = useLocation();

  useEffect(() => {
    const title = PAGE_TITLES[pathname];
    document.title = title ? `${title} | ABF ERP` : 'ABF ERP';
  }, [pathname]);
}
