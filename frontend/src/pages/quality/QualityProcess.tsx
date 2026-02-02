import React, { useState, useEffect } from 'react';
import {
  Settings,
  FileText,
  CheckCircle,
  Plus,
  Search,
  Filter,
  Download,
  Edit,
  Eye,
  Trash2,
  Target,
  X,
  ClipboardList,
  Package
} from 'lucide-react';
import ProcessManagement from '../../components/ProcessManagement';
import OrderManagement from '../../components/OrderManagement';
import { processService } from '../../services/processService';
import { internationalProductService } from '../../services/internationalProductService';

interface CostItem {
  id: string;
  loaiChiPhi: 'Nhân công' | 'Vật tư';
  tenChiPhi: string;
  dvt: string;
  donViTinh: string;
}

interface ProcessSection {
  id: string;
  tenPhanDoan: string;
  noiDungCongViec: string;
  costs: CostItem[];
}

interface ProcessDetail {
  id: number;
  stt: number;
  luuDo: string;
  noiDungCongViec: string;
  loaiChiPhi: string;
  tenChiPhi: string;
  dvt: string;
  donViTinh: string;
  tenNhanVien: string;
  tenQuyTrinh: string;
  loaiQuyTrinh: string;
  sections: ProcessSection[];
}

interface Process {
  id: number;
  stt: number;
  luuDo: string;
  noiDungCongViec: string;
  loaiChiPhi: string;
  tenChiPhi: string;
  dvt: string;
}

const QualityProcess = () => {
  const [activeTab, setActiveTab] = useState<'processList' | 'orderList'>('processList');

  // Dữ liệu mẫu cho TIÊU CHUẨN CHẤT LƯỢNG
  const standardData = [
    {
      id: 1,
      maTieuChuan: 'TC001',
      tenTieuChuan: 'Tiêu chuẩn HACCP cho sản xuất thực phẩm',
      loaiTieuChuan: 'An toàn thực phẩm',
      phienBan: 'v2.1',
      ngayBanHanh: '2024-01-15',
      ngayHieuLuc: '2024-02-01',
      nguoiPhuTrach: 'Trần Thị Bình',
      phongBanApDung: 'Sản xuất, QC',
      trangThai: 'Đang áp dụng',
      mucDoUuTien: 'Cao',
      moTa: 'Hệ thống phân tích mối nguy và điểm kiểm soát tới hạn',
      yeuCauTuanThu: 'Bắt buộc cho tất cả sản phẩm thực phẩm',
      taiLieuLienQuan: 'ISO 22000, FDA Guidelines',
      ghiChu: 'Cập nhật theo quy định mới nhất'
    },
    {
      id: 2,
      maTieuChuan: 'TC002',
      tenTieuChuan: 'Tiêu chuẩn ISO 9001:2015',
      loaiTieuChuan: 'Hệ thống quản lý chất lượng',
      phienBan: 'v1.0',
      ngayBanHanh: '2023-12-01',
      ngayHieuLuc: '2024-01-01',
      nguoiPhuTrach: 'Lê Văn Cường',
      phongBanApDung: 'Toàn công ty',
      trangThai: 'Đang áp dụng',
      mucDoUuTien: 'Cao',
      moTa: 'Hệ thống quản lý chất lượng theo tiêu chuẩn quốc tế',
      yeuCauTuanThu: 'Áp dụng cho tất cả quy trình',
      taiLieuLienQuan: 'ISO 9001:2015 Standard',
      ghiChu: 'Đánh giá định kỳ 6 tháng/lần'
    }
  ];

  // Dữ liệu mẫu cho DANH SÁCH SẢN PHẨM
  const productData = [
    {
      id: 1,
      stt: 1,
      maSanPham: 'SP001',
      moTaSanPham: 'Khoai tây chiên đông lạnh',
      loaiSanPham: 'Tươi đông lạnh',
      nhanVienTaoThongTin: 'Nguyễn Văn A',
      nguoiDuyetThongTin: 'Trần Thị B',
      maNguoiDuyetThongTin: 'NV002',
      chinhSuaLan: 'Ban hành lần đầu',
      tinhTrang: 'Đã ban hành'
    },
    {
      id: 2,
      stt: 2,
      maSanPham: 'SP002',
      moTaSanPham: 'Cà rốt xay nhuyễn',
      loaiSanPham: 'Xay nhuyễn',
      nhanVienTaoThongTin: 'Lê Văn C',
      nguoiDuyetThongTin: 'Phạm Thị D',
      maNguoiDuyetThongTin: 'NV003',
      chinhSuaLan: 'Chỉnh sửa lần 1',
      tinhTrang: 'Chờ xét duyệt lần'
    },
    {
      id: 3,
      stt: 3,
      maSanPham: 'SP003',
      moTaSanPham: 'Nước ép cam tươi',
      loaiSanPham: 'Nước ép',
      nhanVienTaoThongTin: 'Hoàng Văn E',
      nguoiDuyetThongTin: 'Ngô Thị F',
      maNguoiDuyetThongTin: 'NV004',
      chinhSuaLan: 'Ban hành lần đầu',
      tinhTrang: 'Chờ xét duyệt lần'
    },
    {
      id: 4,
      stt: 4,
      maSanPham: 'SP004',
      moTaSanPham: 'Cà chua chiên chần không',
      loaiSanPham: 'Chiên chần không',
      nhanVienTaoThongTin: 'Võ Văn G',
      nguoiDuyetThongTin: 'Đặng Thị H',
      maNguoiDuyetThongTin: 'NV005',
      chinhSuaLan: 'Chỉnh sửa lần 1',
      tinhTrang: 'Chờ xét duyệt lần Chính sửa'
    },
    {
      id: 5,
      stt: 5,
      maSanPham: 'SP005',
      moTaSanPham: 'Xoài sấy dẻo',
      loaiSanPham: 'Sấy dẻo',
      nhanVienTaoThongTin: 'Trương Văn I',
      nguoiDuyetThongTin: 'Bùi Thị J',
      maNguoiDuyetThongTin: 'NV006',
      chinhSuaLan: 'Ban hành lần đầu',
      tinhTrang: 'Đã ban hành'
    },
    {
      id: 6,
      stt: 6,
      maSanPham: 'SP006',
      moTaSanPham: 'Cà rốt sấy dòng khô',
      loaiSanPham: 'Sấy dòng khô',
      nhanVienTaoThongTin: 'Phan Văn K',
      nguoiDuyetThongTin: 'Vũ Thị L',
      maNguoiDuyetThongTin: 'NV007',
      chinhSuaLan: 'Chỉnh sửa lần 1',
      tinhTrang: 'Chờ xét duyệt lần'
    },
    {
      id: 7,
      stt: 7,
      maSanPham: 'SP007',
      moTaSanPham: 'Hành khô không đầu',
      loaiSanPham: 'Sấy khô không đầu',
      nhanVienTaoThongTin: 'Dương Văn M',
      nguoiDuyetThongTin: 'Tô Thị N',
      maNguoiDuyetThongTin: 'NV008',
      chinhSuaLan: 'Ban hành lần đầu',
      tinhTrang: 'Đã ban hành'
    }
  ];

  // Dữ liệu mẫu cho QUY TRÌNH KIỂM SOÁT
  const procedureData = [
    {
      id: 1,
      maQuyTrinh: 'QT001',
      tenQuyTrinh: 'Quy trình kiểm tra nguyên liệu đầu vào',
      loaiQuyTrinh: 'Kiểm tra chất lượng',
      buocThucHien: '5 bước',
      thoiGianThucHien: '30 phút',
      nguoiThucHien: 'Nhân viên QC',
      tanSuatKiemTra: 'Mỗi lô hàng',
      trangThai: 'Đang áp dụng',
      mucDoRuiRo: 'Cao',
      ngayTao: '2024-01-10',
      nguoiTao: 'Trần Thị Bình',
      lanCapNhatCuoi: '2024-03-15',
      moTa: 'Kiểm tra chất lượng, xuất xứ và tính an toàn của nguyên liệu',
      tieuChiDanhGia: 'Màu sắc, mùi vị, độ ẩm, tạp chất',
      ghiChu: 'Cần cập nhật theo tiêu chuẩn mới'
    },
    {
      id: 2,
      maQuyTrinh: 'QT002',
      tenQuyTrinh: 'Quy trình kiểm soát nhiệt độ sản xuất',
      loaiQuyTrinh: 'Kiểm soát quy trình',
      buocThucHien: '3 bước',
      thoiGianThucHien: '15 phút',
      nguoiThucHien: 'Nhân viên sản xuất',
      tanSuatKiemTra: 'Mỗi 2 giờ',
      trangThai: 'Đang áp dụng',
      mucDoRuiRo: 'Trung bình',
      ngayTao: '2024-02-01',
      nguoiTao: 'Nguyễn Văn An',
      lanCapNhatCuoi: '2024-03-20',
      moTa: 'Giám sát và kiểm soát nhiệt độ trong quá trình sản xuất',
      tieuChiDanhGia: 'Nhiệt độ trong khoảng 65-75°C',
      ghiChu: 'Thiết bị đo cần hiệu chuẩn định kỳ'
    }
  ];

  // Dữ liệu mẫu cho KIỂM TRA CHẤT LƯỢNG
  const inspectionData = [
    {
      id: 1,
      stt: 1,
      maKiemTra: 'KT001',
      ngayKiemTra: '2024-03-15',
      ngayLoKyHan: '2024-04-15',
      loaiKiemTra: 'Kiểm tra cuối cùng',
      noiDungKiemTra: 'Kiểm tra chất lượng sản phẩm hoàn thành',
      soLuongDiemChatLuong: 9.2,
      yKienDuyetKiemTra: 'Đạt',
      tenNguoiKiemTraChatLuong: 'Nguyễn Văn An',
      maNguoiKiemTraChatLuong: 'NV001',
      tinhTrang: 'Hoàn thành',
      cacKiemThuc: 'Chứng khác phác, Dễ khác phác',
      hoatDong: 'Xem, Sửa, Xóa'
    },
    {
      id: 2,
      stt: 2,
      maKiemTra: 'KT002',
      ngayKiemTra: '2024-03-16',
      ngayLoKyHan: '2024-04-16',
      loaiKiemTra: 'Kiểm tra an toàn',
      noiDungKiemTra: 'Kiểm tra vi sinh vật',
      soLuongDiemChatLuong: 9.5,
      yKienDuyetKiemTra: 'Đạt',
      tenNguoiKiemTraChatLuong: 'Trần Thị Bình',
      maNguoiKiemTraChatLuong: 'NV002',
      tinhTrang: 'Hoàn thành',
      cacKiemThuc: 'Chứng khác phác'
    }
  ];

  // Dữ liệu mẫu cho CẢI TIẾN QUY TRÌNH
  const improvementData = [
    {
      id: 1,
      maDeXuat: 'DX001',
      tenDeXuat: 'Cải tiến quy trình đóng gói tự động',
      loaiCaiTien: 'Tự động hóa',
      nguoiDeXuat: 'Lê Văn Cường',
      phongBan: 'Sản xuất',
      ngayDeXuat: '2024-03-01',
      trangThai: 'Đang triển khai',
      mucDoUuTien: 'Cao',
      ngayDuKienHoanThanh: '2024-06-30',
      chiPhiUocTinh: 500000000,
      laiIchMongDoi: 'Tăng 30% năng suất, giảm 50% lỗi đóng gói',
      moTaVanDe: 'Quy trình đóng gói thủ công gây chậm trễ và sai sót',
      giaiPhapDeXuat: 'Lắp đặt dây chuyền đóng gói tự động',
      tienDoThucHien: '60%',
      ghiChu: 'Đang chờ phê duyệt ngân sách bổ sung'
    },
    {
      id: 2,
      maDeXuat: 'DX002',
      tenDeXuat: 'Cải tiến hệ thống theo dõi nhiệt độ',
      loaiCaiTien: 'Công nghệ',
      nguoiDeXuat: 'Nguyễn Văn An',
      phongBan: 'Chất lượng',
      ngayDeXuat: '2024-02-15',
      trangThai: 'Hoàn thành',
      mucDoUuTien: 'Trung bình',
      ngayDuKienHoanThanh: '2024-04-15',
      chiPhiUocTinh: 150000000,
      laiIchMongDoi: 'Giảm 80% thời gian kiểm tra nhiệt độ',
      moTaVanDe: 'Kiểm tra nhiệt độ thủ công mất thời gian và không chính xác',
      giaiPhapDeXuat: 'Lắp đặt cảm biến nhiệt độ tự động với cảnh báo',
      tienDoThucHien: '100%',
      ghiChu: 'Đã triển khai thành công, hiệu quả cao'
    }
  ];

  // State for Process List
  const [processDetails, setProcessDetails] = useState<ProcessDetail[]>([]);
  const [products, setProducts] = useState(productData);

  // State for real data from API
  const [processes, setProcesses] = useState<any[]>([]);
  const [realProducts, setRealProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch real data from API
  useEffect(() => {
    fetchProcessesAndProducts();
  }, []);

  const fetchProcessesAndProducts = async () => {
    try {
      setLoading(true);
      // Fetch all processes (no pagination limit)
      const processResponse = await processService.getAllProcesses(1, 1000);
      setProcesses(processResponse.data);

      // Fetch all products (no pagination limit)
      const productResponse = await internationalProductService.getAllProducts(1, 1000);
      setRealProducts(productResponse.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const [isProcessModalOpen, setIsProcessModalOpen] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [processFormData, setProcessFormData] = useState({
    tenNhanVien: '',
    tenQuyTrinh: '',
    loaiQuyTrinh: '',
    luuDo: '',
    sections: [
      {
        id: '1',
        tenPhanDoan: '',
        noiDungCongViec: '',
        costs: []
      }
    ]
  });

  const [currentSectionCost, setCurrentSectionCost] = useState<{
    sectionId: string;
    loaiChiPhi: 'Nhân công' | 'Vật tư';
    tenChiPhi: string;
    dvt: string;
    donViTinh: string;
  }>({
    sectionId: '1',
    loaiChiPhi: 'Nhân công',
    tenChiPhi: '',
    dvt: '',
    donViTinh: ''
  });

  const [productFormData, setProductFormData] = useState({
    tenNhanVien: '',
    maSanPham: '',
    moTaSanPham: '',
    loaiSanPham: ''
  });

  // State for modals
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);

  // Process List handlers
  const handleOpenProcessModal = () => {
    setProcessFormData({
      tenNhanVien: '',
      tenQuyTrinh: '',
      loaiQuyTrinh: '',
      luuDo: '',
      sections: [
        {
          id: '1',
          tenPhanDoan: '',
          noiDungCongViec: '',
          costs: []
        }
      ]
    });
    setCurrentSectionCost({
      sectionId: '1',
      loaiChiPhi: 'Nhân công',
      tenChiPhi: '',
      dvt: '',
      donViTinh: ''
    });
    setIsProcessModalOpen(true);
  };

  const handleCloseProcessModal = () => {
    setIsProcessModalOpen(false);
  };

  const handleProcessInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setProcessFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSectionInputChange = (sectionId: string, field: string, value: string) => {
    setProcessFormData(prev => ({
      ...prev,
      sections: prev.sections.map(section =>
        section.id === sectionId
          ? { ...section, [field]: value }
          : section
      )
    }));
  };

  const handleAddSection = () => {
    const newSectionId = String(Math.max(...processFormData.sections.map(s => parseInt(s.id)), 0) + 1);
    setProcessFormData(prev => ({
      ...prev,
      sections: [
        ...prev.sections,
        {
          id: newSectionId,
          tenPhanDoan: '',
          noiDungCongViec: '',
          costs: []
        }
      ]
    }));
    setCurrentSectionCost({
      sectionId: newSectionId,
      loaiChiPhi: 'Nhân công',
      tenChiPhi: '',
      dvt: '',
      donViTinh: ''
    });
  };

  const handleRemoveSection = (sectionId: string) => {
    if (processFormData.sections.length > 1) {
      setProcessFormData(prev => ({
        ...prev,
        sections: prev.sections.filter(s => s.id !== sectionId)
      }));
    }
  };

  const handleAddCost = () => {
    if (!currentSectionCost.tenChiPhi || !currentSectionCost.dvt) {
      alert('Vui lòng điền đầy đủ thông tin chi phí');
      return;
    }

    setProcessFormData(prev => {
      const updatedSections = prev.sections.map(section => {
        if (section.id === currentSectionCost.sectionId) {
          // Count existing costs of the same type
          const sameTypeCount = section.costs.filter(c => c.loaiChiPhi === currentSectionCost.loaiChiPhi).length + 1;
          const displayName = `${currentSectionCost.loaiChiPhi} ${sameTypeCount}`;

          return {
            ...section,
            costs: [
              ...section.costs,
              {
                id: String(Date.now()),
                loaiChiPhi: currentSectionCost.loaiChiPhi,
                tenChiPhi: currentSectionCost.tenChiPhi,
                dvt: currentSectionCost.dvt,
                donViTinh: currentSectionCost.donViTinh
              }
            ]
          };
        }
        return section;
      });

      return {
        ...prev,
        sections: updatedSections
      };
    });

    setCurrentSectionCost({
      sectionId: currentSectionCost.sectionId,
      loaiChiPhi: 'Nhân công',
      tenChiPhi: '',
      dvt: '',
      donViTinh: ''
    });
  };

  const handleRemoveCost = (sectionId: string, costId: string) => {
    setProcessFormData(prev => ({
      ...prev,
      sections: prev.sections.map(section =>
        section.id === sectionId
          ? {
              ...section,
              costs: section.costs.filter(c => c.id !== costId)
            }
          : section
      )
    }));
  };

  const handleProcessSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Create a ProcessDetail for each section
    const newProcessDetails = processFormData.sections.map((section, idx) => {
      const newProcessDetail: ProcessDetail = {
        id: Math.max(...processDetails.map(p => p.id), 0) + idx + 1,
        stt: processDetails.length + idx + 1,
        luuDo: processFormData.luuDo,
        noiDungCongViec: section.noiDungCongViec || processFormData.tenQuyTrinh,
        loaiChiPhi: '',
        tenChiPhi: '',
        dvt: '',
        donViTinh: '',
        tenNhanVien: processFormData.tenNhanVien,
        tenQuyTrinh: processFormData.tenQuyTrinh,
        loaiQuyTrinh: processFormData.loaiQuyTrinh,
        sections: [section] // Each ProcessDetail has only one section
      };
      return newProcessDetail;
    });

    setProcessDetails([...processDetails, ...newProcessDetails]);
    handleCloseProcessModal();
  };

  const handleDeleteProcess = (id: number) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa quy trình này?')) {
      setProcessDetails(processDetails.filter(p => p.id !== id).map((p, idx) => ({
        ...p,
        stt: idx + 1
      })));
    }
  };

  const handleOpenProductModal = () => {
    setProductFormData({
      tenNhanVien: '',
      maSanPham: '',
      moTaSanPham: '',
      loaiSanPham: ''
    });
    setIsProductModalOpen(true);
  };

  const handleCloseProductModal = () => {
    setIsProductModalOpen(false);
  };

  const handleProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newProduct = {
      id: Math.max(...products.map(p => p.id), 0) + 1,
      stt: products.length + 1,
      maSanPham: productFormData.maSanPham,
      moTaSanPham: productFormData.moTaSanPham,
      loaiSanPham: productFormData.loaiSanPham,
      nhanVienTaoThongTin: productFormData.tenNhanVien,
      nguoiDuyetThongTin: '',
      maNguoiDuyetThongTin: '',
      chinh_sua_lan: 1,
      tinhTrang: 'Hoạt động'
    };

    setProducts([...products, newProduct]);
    handleCloseProductModal();
  };

  const handleDeleteProduct = (id: number) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa sản phẩm này?')) {
      setProducts(products.filter(p => p.id !== id).map((p, idx) => ({
        ...p,
        stt: idx + 1
      })));
    }
  };

  const openDetailModal = (item: any) => {
    setSelectedItem(item);
    setIsDetailModalOpen(true);
  };

  const closeDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedItem(null);
  };

  const tabs = [
    { id: 'processList', name: 'Danh sách quy trình', icon: <FileText className="w-4 h-4" /> },
    { id: 'orderList', name: 'Danh sách đơn hàng', icon: <ClipboardList className="w-4 h-4" /> }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2 flex items-center">
            <Settings className="w-8 h-8 text-blue-600 mr-3" />
            Quản lý quy trình chất lượng
          </h1>
          <p className="text-gray-600">Quản lý tiêu chuẩn, quy trình, kiểm tra và cải tiến chất lượng</p>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Tổng quan danh sách quy trình */}
          <div className="bg-white rounded-xl shadow-lg p-5 border-2 border-gray-300 hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 hover:border-blue-400">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold flex items-center text-gray-800">
                <FileText className="w-5 h-5 mr-2 text-blue-600" />
                Tổng quan danh sách quy trình
              </h3>
            </div>
            <div className="space-y-3">
              <div className="bg-blue-50 rounded-lg p-3 hover:bg-blue-100 hover:shadow-md hover:scale-105 transition-all duration-200 border-2 border-blue-300 cursor-pointer">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium text-gray-700">Tổng số quy trình</span>
                  <span className="text-2xl font-bold text-blue-600">{loading ? '...' : processes.length}</span>
                </div>
              </div>
              <div className="grid grid-cols-5 gap-2">
                <div className="bg-gray-50 rounded-lg p-2 text-center hover:bg-gray-100 hover:shadow-md hover:scale-110 transition-all duration-200 border-2 border-gray-300 cursor-pointer">
                  <div className="text-xl font-bold text-gray-800">
                    {loading ? '...' : processes.filter(p => p.loaiQuyTrinh === 'Sản xuất').length}
                  </div>
                  <div className="text-xs text-gray-600 mt-0.5">Sản xuất</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-2 text-center hover:bg-gray-100 hover:shadow-md hover:scale-110 transition-all duration-200 border-2 border-gray-300 cursor-pointer">
                  <div className="text-xl font-bold text-gray-800">
                    {loading ? '...' : processes.filter(p => p.loaiQuyTrinh === 'Kiểm tra').length}
                  </div>
                  <div className="text-xs text-gray-600 mt-0.5">Kiểm tra</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-2 text-center hover:bg-gray-100 hover:shadow-md hover:scale-110 transition-all duration-200 border-2 border-gray-300 cursor-pointer">
                  <div className="text-xl font-bold text-gray-800">
                    {loading ? '...' : processes.filter(p => p.loaiQuyTrinh === 'Đóng gói').length}
                  </div>
                  <div className="text-xs text-gray-600 mt-0.5">Đóng gói</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-2 text-center hover:bg-gray-100 hover:shadow-md hover:scale-110 transition-all duration-200 border-2 border-gray-300 cursor-pointer">
                  <div className="text-xl font-bold text-gray-800">
                    {loading ? '...' : processes.filter(p => p.loaiQuyTrinh === 'Vận chuyển').length}
                  </div>
                  <div className="text-xs text-gray-600 mt-0.5">Vận chuyển</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-2 text-center hover:bg-gray-100 hover:shadow-md hover:scale-110 transition-all duration-200 border-2 border-gray-300 cursor-pointer">
                  <div className="text-xl font-bold text-gray-800">
                    {loading ? '...' : processes.filter(p =>
                      p.loaiQuyTrinh !== 'Sản xuất' &&
                      p.loaiQuyTrinh !== 'Kiểm tra' &&
                      p.loaiQuyTrinh !== 'Đóng gói' &&
                      p.loaiQuyTrinh !== 'Vận chuyển'
                    ).length}
                  </div>
                  <div className="text-xs text-gray-600 mt-0.5">Khác</div>
                </div>
              </div>
            </div>
          </div>

          {/* Tổng quan danh sách sản phẩm */}
          <div className="bg-white rounded-xl shadow-lg p-5 border-2 border-gray-300 hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 hover:border-emerald-400">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold flex items-center text-gray-800">
                <Package className="w-5 h-5 mr-2 text-emerald-600" />
                Tổng quan danh sách sản phẩm
              </h3>
            </div>
            <div className="space-y-3">
              <div className="bg-blue-50 rounded-lg p-3 hover:bg-blue-100 hover:shadow-md hover:scale-105 transition-all duration-200 border-2 border-blue-300 cursor-pointer">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium text-gray-700">Tổng sản phẩm</span>
                  <span className="text-2xl font-bold text-blue-600">{loading ? '...' : realProducts.length}</span>
                </div>
              </div>
              <div className="grid grid-cols-5 gap-2">
                <div className="bg-gray-50 rounded-lg p-2 text-center hover:bg-gray-100 hover:shadow-md hover:scale-110 transition-all duration-200 border-2 border-gray-300 cursor-pointer">
                  <div className="text-xl font-bold text-gray-800">
                    {loading ? '...' : realProducts.filter(p => p.loaiSanPham === 'Nguyên liệu tươi').length}
                  </div>
                  <div className="text-xs text-gray-600 mt-0.5">NL tươi</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-2 text-center hover:bg-gray-100 hover:shadow-md hover:scale-110 transition-all duration-200 border-2 border-gray-300 cursor-pointer">
                  <div className="text-xl font-bold text-gray-800">
                    {loading ? '...' : realProducts.filter(p => p.loaiSanPham === 'Nguyên liệu đông').length}
                  </div>
                  <div className="text-xs text-gray-600 mt-0.5">NL đông</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-2 text-center hover:bg-gray-100 hover:shadow-md hover:scale-110 transition-all duration-200 border-2 border-gray-300 cursor-pointer">
                  <div className="text-xl font-bold text-gray-800">
                    {loading ? '...' : realProducts.filter(p => p.loaiSanPham === 'Sản phẩm khô').length}
                  </div>
                  <div className="text-xs text-gray-600 mt-0.5">SP khô</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-2 text-center hover:bg-gray-100 hover:shadow-md hover:scale-110 transition-all duration-200 border-2 border-gray-300 cursor-pointer">
                  <div className="text-xl font-bold text-gray-800">
                    {loading ? '...' : realProducts.filter(p => p.loaiSanPham === 'Sản phẩm đông').length}
                  </div>
                  <div className="text-xs text-gray-600 mt-0.5">SP đông</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-2 text-center hover:bg-gray-100 hover:shadow-md hover:scale-110 transition-all duration-200 border-2 border-gray-300 cursor-pointer">
                  <div className="text-xl font-bold text-gray-800">
                    {loading ? '...' : realProducts.filter(p => p.loaiSanPham === 'Phụ liệu').length}
                  </div>
                  <div className="text-xs text-gray-600 mt-0.5">Phụ liệu</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 px-6 py-3">
            <nav className="flex space-x-8">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-900 hover:text-blue-600 hover:border-gray-300'
                  }`}
                >
                  {tab.icon}
                  {tab.name}
                </button>
              ))}
            </nav>
          </div>
        </div>



        {/* Content */}
        <div className="bg-white rounded-lg shadow-sm">
          {/* DANH SÁCH QUY TRÌNH - SỬ DỤNG ProcessManagement COMPONENT */}
          {activeTab === 'processList' && (
            <div className="p-6">
              <ProcessManagement />
            </div>
          )}

          {/* DANH SÁCH ĐƠN HÀNG */}
          {activeTab === 'orderList' && (
            <div className="p-6">
              <OrderManagement hideHeader={true} />
            </div>
          )}




        </div>

        {/* Process Modal */}
        {isProcessModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full my-8">
              <div className="flex justify-between items-center p-6 border-b border-gray-200 bg-gray-700">
                <h2 className="text-2xl font-bold text-white">TẠO QUY TRÌNH</h2>
                <button
                  onClick={handleCloseProcessModal}
                  className="text-gray-300 hover:text-white"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleProcessSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tên nhân viên:</label>
                    <input
                      type="text"
                      name="tenNhanVien"
                      value={processFormData.tenNhanVien}
                      onChange={handleProcessInputChange}
                      placeholder="Nhập tên nhân viên"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tên quy trình:</label>
                    <input
                      type="text"
                      name="tenQuyTrinh"
                      value={processFormData.tenQuyTrinh}
                      onChange={handleProcessInputChange}
                      placeholder="Nhập tên quy trình"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Loại quy trình:</label>
                    <input
                      type="text"
                      name="loaiQuyTrinh"
                      value={processFormData.loaiQuyTrinh}
                      onChange={handleProcessInputChange}
                      placeholder="Nhập loại quy trình"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Lưu đồ:</label>
                    <input
                      type="text"
                      name="luuDo"
                      value={processFormData.luuDo}
                      onChange={handleProcessInputChange}
                      placeholder="Nhập lưu đồ"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Sections */}
                <div className="space-y-4">
                  {processFormData.sections.map((section, sectionIndex) => (
                    <div key={section.id} className="border border-gray-300 rounded-lg p-4 bg-gray-50">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold text-white bg-green-600 px-4 py-2 rounded w-full">
                          Phân đoạn {sectionIndex + 1}
                        </h3>
                        {processFormData.sections.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveSection(section.id)}
                            className="ml-2 px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                          >
                            Xóa
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Tên phân đoạn:</label>
                          <input
                            type="text"
                            value={section.tenPhanDoan}
                            onChange={(e) => handleSectionInputChange(section.id, 'tenPhanDoan', e.target.value)}
                            placeholder="Nhập tên phân đoạn"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>

                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Nội dung công việc:</label>
                        <textarea
                          value={section.noiDungCongViec}
                          onChange={(e) => handleSectionInputChange(section.id, 'noiDungCongViec', e.target.value)}
                          placeholder="Nhập nội dung công việc"
                          rows={2}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      {/* Costs */}
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Loại chi phí:</label>
                        {section.costs.length > 0 && (
                          <div className="mb-3 overflow-x-auto">
                            <table className="w-full border-collapse border border-gray-300">
                              <tbody>
                                {section.costs.map((cost, costIndex) => {
                                  // Count how many costs of the same type appear before this one
                                  const sameTypeIndex = section.costs.filter(c => c.loaiChiPhi === cost.loaiChiPhi).indexOf(cost) + 1;
                                  const displayLabel = `${cost.loaiChiPhi} ${sameTypeIndex}`;

                                  return (
                                    <tr key={cost.id} className="border-b border-gray-300">
                                      <td className="px-3 py-2 border-r border-gray-300 font-medium text-sm">{displayLabel}</td>
                                      <td className="px-3 py-2 border-r border-gray-300 text-sm">{cost.tenChiPhi}</td>
                                      <td className="px-3 py-2 border-r border-gray-300 text-sm">{cost.dvt}</td>
                                      <td className="px-3 py-2 border-r border-gray-300 text-sm">{cost.donViTinh}</td>
                                      <td className="px-3 py-2 text-center">
                                        <button
                                          type="button"
                                          onClick={() => handleRemoveCost(section.id, cost.id)}
                                          className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm font-medium"
                                        >
                                          Xóa
                                        </button>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}

                        {/* Add Cost Form */}
                        {currentSectionCost.sectionId === section.id && (
                          <div className="bg-gray-50 p-4 rounded border border-gray-300 space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Loại chi phí:</label>
                                <select
                                  value={currentSectionCost.loaiChiPhi}
                                  onChange={(e) => setCurrentSectionCost({
                                    ...currentSectionCost,
                                    loaiChiPhi: e.target.value as 'Nhân công' | 'Vật tư'
                                  })}
                                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                  <option value="Nhân công">Nhân công</option>
                                  <option value="Vật tư">Vật tư</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Tên chi phí:</label>
                                <input
                                  type="text"
                                  value={currentSectionCost.tenChiPhi}
                                  onChange={(e) => setCurrentSectionCost({
                                    ...currentSectionCost,
                                    tenChiPhi: e.target.value
                                  })}
                                  placeholder="Nhập tên chi phí"
                                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">DVT:</label>
                                <input
                                  type="text"
                                  value={currentSectionCost.dvt}
                                  onChange={(e) => setCurrentSectionCost({
                                    ...currentSectionCost,
                                    dvt: e.target.value
                                  })}
                                  placeholder="Nhập DVT"
                                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Người/Cái/Đôi:</label>
                                <input
                                  type="text"
                                  value={currentSectionCost.donViTinh}
                                  onChange={(e) => setCurrentSectionCost({
                                    ...currentSectionCost,
                                    donViTinh: e.target.value
                                  })}
                                  placeholder="Nhập đơn vị"
                                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={handleAddCost}
                              className="w-full px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium"
                            >
                              + Thêm chi phí
                            </button>
                          </div>
                        )}

                        {currentSectionCost.sectionId !== section.id && (
                          <button
                            type="button"
                            onClick={() => setCurrentSectionCost({
                              sectionId: section.id,
                              loaiChiPhi: 'Nhân công',
                              tenChiPhi: '',
                              dvt: '',
                              donViTinh: ''
                            })}
                            className="w-full px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium"
                          >
                            + Thêm (Nhân công/ vật tư)
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add Section Button */}
                <button
                  type="button"
                  onClick={handleAddSection}
                  className="w-full px-4 py-3 bg-gray-700 text-white rounded hover:bg-gray-800 font-medium"
                >
                  + THÊM PHÂN ĐOẠN
                </button>

                {/* Action Buttons */}
                <div className="flex justify-center gap-4 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={handleCloseProcessModal}
                    className="px-8 py-2 bg-green-500 text-white rounded hover:bg-green-600 font-medium"
                  >
                    Duyệt quy trình
                  </button>
                  <button
                    type="button"
                    onClick={handleCloseProcessModal}
                    className="px-8 py-2 bg-green-500 text-white rounded hover:bg-green-600 font-medium"
                  >
                    Chỉnh sửa
                  </button>
                  <button
                    type="submit"
                    className="px-8 py-2 bg-green-500 text-white rounded hover:bg-green-600 font-medium"
                  >
                    Tạo quy trình
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Product Modal */}
        {isProductModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="bg-gradient-to-r from-blue-400 to-blue-500 px-6 py-4 flex justify-between items-center">
                <h2 className="text-2xl font-bold text-white">TẠO THÔNG TIN SẢN PHẨM</h2>
                <button
                  onClick={handleCloseProductModal}
                  className="text-white hover:text-gray-200"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleProductSubmit} className="p-6 space-y-4">
                {/* Tên nhân viên */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tên nhân viên:</label>
                  <input
                    type="text"
                    value={productFormData.tenNhanVien}
                    onChange={(e) => setProductFormData({...productFormData, tenNhanVien: e.target.value})}
                    placeholder="Nhập tên nhân viên"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Mã sản phẩm */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Mã tả sản phẩm:</label>
                  <input
                    type="text"
                    value={productFormData.maSanPham}
                    onChange={(e) => setProductFormData({...productFormData, maSanPham: e.target.value})}
                    placeholder="Nhập mã sản phẩm"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Loại sản phẩm */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Loại sản phẩm:</label>
                  <input
                    type="text"
                    value={productFormData.loaiSanPham}
                    onChange={(e) => setProductFormData({...productFormData, loaiSanPham: e.target.value})}
                    placeholder="Nhập loại sản phẩm"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Mô tả sản phẩm */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Mô tả sản phẩm:</label>
                  <textarea
                    value={productFormData.moTaSanPham}
                    onChange={(e) => setProductFormData({...productFormData, moTaSanPham: e.target.value})}
                    placeholder="Nhập mô tả sản phẩm"
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex justify-center gap-4 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={handleCloseProductModal}
                    className="px-8 py-2 bg-green-500 text-white rounded hover:bg-green-600 font-medium"
                  >
                    Xét duyệt
                  </button>
                  <button
                    type="button"
                    onClick={handleCloseProductModal}
                    className="px-8 py-2 bg-green-500 text-white rounded hover:bg-green-600 font-medium"
                  >
                    Chỉnh sửa
                  </button>
                  <button
                    type="submit"
                    className="px-8 py-2 bg-green-500 text-white rounded hover:bg-green-600 font-medium"
                  >
                    Tạo thông tin
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Detail Modal */}
        {isDetailModalOpen && selectedItem && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-800">Chi tiết thông tin</h2>
                  <button
                    onClick={closeDetailModal}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {Object.entries(selectedItem).map(([key, value]) => (
                    <div key={key} className="bg-gray-50 p-4 rounded-lg">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {key.charAt(0).toUpperCase() + key.slice(1)}
                      </label>
                      <p className="text-sm text-gray-900">{String(value)}</p>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end gap-4 mt-6">
                  <button
                    onClick={closeDetailModal}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Đóng
                  </button>
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                    Chỉnh sửa
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default QualityProcess;
