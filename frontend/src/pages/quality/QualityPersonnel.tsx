import React, { useState, useEffect } from 'react';
import {
  Users,
  FileText,
  Star,
  DollarSign,
  Plus,
  Search,
  Filter,
  Download,
  Edit,
  Eye,
  Trash2,
  Award,
  Lock,
  Briefcase,
  Calendar
} from 'lucide-react';
import UserManagement from '@components/UserManagement';
import EmployeeManagement from '@components/EmployeeManagement';
import PositionManagement from '@components/PositionManagement';
import ResponsibilityManagement from '@components/ResponsibilityManagement';
import PositionLevelManagement from '@components/PositionLevelManagement';
import EmployeeEvaluationManagement from '@components/EmployeeEvaluationManagement';
import PayrollManagement from '@components/PayrollManagement';
import AttendanceManagement from '@components/AttendanceManagement';
import LeaveRequestManagement from '@components/LeaveRequestManagement';
import DatePicker from '@components/DatePicker';
import employeeService from '@services/employeeService';
import employeeEvaluationService, { EmployeeEvaluation } from '@services/employeeEvaluationService';
import attendanceService, { AttendanceRecord } from '@services/attendanceService';

interface Employee {
  id: string;
  employeeCode: string;
  contractType: string;
  status: string;
  user?: {
    firstName: string;
    lastName: string;
  };
}

const QualityPersonnel = () => {
  const [activeTab, setActiveTab] = useState<'employees' | 'positions' | 'responsibilities' | 'levels' | 'evaluations' | 'payroll' | 'attendance' | 'leave-requests' | 'users'>('employees');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [evaluations, setEvaluations] = useState<EmployeeEvaluation[]>([]);
  const [attendances, setAttendances] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);

  // Evaluation filters
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());

  // Attendance filter
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    loadEmployees();
  }, []);

  useEffect(() => {
    loadEvaluations();
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    loadAttendances();
  }, [selectedDate]);

  const loadEmployees = async () => {
    try {
      setLoading(true);
      const response = await employeeService.getAllEmployees(1, 1000); // Get all employees
      setEmployees(response.data);
    } catch (error) {
      console.error('Error loading employees:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadEvaluations = async () => {
    try {
      const data = await employeeEvaluationService.getEmployeeEvaluations(selectedMonth, selectedYear);
      setEvaluations(data);
    } catch (error) {
      console.error('Error loading evaluations:', error);
    }
  };

  const loadAttendances = async () => {
    try {
      // Create start and end of day for the selected date
      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(selectedDate);
      endOfDay.setHours(23, 59, 59, 999);

      const data = await attendanceService.getAttendanceByDateRange(
        startOfDay.toISOString(),
        endOfDay.toISOString()
      );
      setAttendances(data);
      console.log('Loaded attendances for', selectedDate, ':', data);
    } catch (error) {
      console.error('Error loading attendances:', error);
    }
  };

  // Dữ liệu mẫu cho DANH SÁCH NHÂN VIÊN
  const employeeData = [
    {
      id: 1,
      maNhanVien: 'NV001',
      hoTen: 'Nguyễn Văn An',
      gioiTinh: 'Nam',
      ngaySinh: '1990-05-15',
      soDienThoai: '0901234567',
      email: 'an.nguyen@company.com',
      diaChi: '123 Nguyễn Văn Linh, Q.7, TP.HCM',
      chucVu: 'Nhân viên QC',
      phongBan: 'Chất lượng',
      ngayVaoLam: '2022-01-15',
      trangThai: 'Đang làm việc',
      loaiHopDong: 'Chính thức',
      mucLuong: 15000000,
      trinhDoHocVan: 'Đại học',
      chuyenMon: 'Kiểm tra chất lượng thực phẩm',
      kiNangDacBiet: 'HACCP, ISO 22000',
      ghiChu: 'Nhân viên tích cực, có kinh nghiệm'
    },
    {
      id: 2,
      maNhanVien: 'NV002',
      hoTen: 'Trần Thị Bình',
      gioiTinh: 'Nữ',
      ngaySinh: '1992-08-20',
      soDienThoai: '0902345678',
      email: 'binh.tran@company.com',
      diaChi: '456 Lê Văn Việt, Q.9, TP.HCM',
      chucVu: 'Trưởng nhóm QC',
      phongBan: 'Chất lượng',
      ngayVaoLam: '2021-03-10',
      trangThai: 'Đang làm việc',
      loaiHopDong: 'Chính thức',
      mucLuong: 20000000,
      trinhDoHocVan: 'Thạc sĩ',
      chuyenMon: 'Quản lý chất lượng',
      kiNangDacBiet: 'Six Sigma, Lean Manufacturing',
      ghiChu: 'Lãnh đạo tốt, có tầm nhìn'
    }
  ];

  // Dữ liệu mẫu cho DANH SÁCH TRÁCH NHIỆM
  const responsibilityData = [
    {
      id: 1,
      stt: 1,
      maTrachNhiem: 'TN01',
      viTri: 'Nhân viên QC',
      tenNhanVienThucHien: 'Nguyễn Văn An',
      ngayThucHien: '2024-01-01',
      ngayChinhSua: '2024-03-15',
      nguoiDuyet: 'Trần Thị Bình',
      hoatDong: 'Tạo mới, Chỉnh sửa, Xem chi tiết'
    },
    {
      id: 2,
      stt: 2,
      maTrachNhiem: 'TN02',
      viTri: 'Trưởng nhóm QC',
      tenNhanVienThucHien: 'Trần Thị Bình',
      ngayThucHien: '2024-01-01',
      ngayChinhSua: '2024-03-20',
      nguoiDuyet: 'Lê Văn Cường',
      hoatDong: 'Tạo mới, Chỉnh sửa, Xem chi tiết'
    },
    {
      id: 3,
      stt: 3,
      maTrachNhiem: 'TN03',
      viTri: 'Nhân viên sản xuất',
      tenNhanVienThucHien: 'Hoàng Văn E',
      ngayThucHien: '2024-02-01',
      ngayChinhSua: '2024-03-10',
      nguoiDuyet: 'Phạm Thị D',
      hoatDong: 'Tạo mới, Chỉnh sửa, Xem chi tiết'
    }
  ];

  // Dữ liệu mẫu cho ĐÁNH GIÁ NHÂN VIÊN
  const evaluationData = [
    {
      id: 1,
      stt: 1,
      trachNhiem: 'Thực hiện đúng chỉ thương của Giám Độc nhà máy quy định',
      tyTrongCongViec: 5,
      mucLuongTheoItTrong: 190000,
      tieuChiDatTheoIi: 100,
      danhGiaHieuQuaCong: 100,
      kpiThucNhanTheoIi: 190000,
      caNhanTuDanhGia: 190000,
      capTren1: '',
      capTren2: ''
    },
    {
      id: 2,
      stt: 2,
      trachNhiem: 'Kiểm soát đảm bảo sản lượng, thông kế và phần bổ sung sản xuất',
      tyTrongCongViec: 40,
      mucLuongTheoItTrong: 1620000,
      tieuChiDatTheoIi: 100,
      danhGiaHieuQuaCong: 20,
      kpiThucNhanTheoIi: 304000,
      caNhanTuDanhGia: 304000,
      capTren1: '',
      capTren2: ''
    },
    {
      id: 3,
      stt: 3,
      trachNhiem: 'Xây dựng định mức nguyên vật liệu dùng trong sản xuất',
      tyTrongCongViec: 20,
      mucLuongTheoItTrong: 760000,
      tieuChiDatTheoIi: 100,
      danhGiaHieuQuaCong: 100,
      kpiThucNhanTheoIi: 760000,
      caNhanTuDanhGia: 760000,
      capTren1: '',
      capTren2: ''
    },
    {
      id: 4,
      stt: 4,
      trachNhiem: 'Xây dựng tiêu liêu kỹ năng theo tác',
      tyTrongCongViec: 15,
      mucLuongTheoItTrong: 570000,
      tieuChiDatTheoIi: 100,
      danhGiaHieuQuaCong: 60,
      kpiThucNhanTheoIi: 342000,
      caNhanTuDanhGia: 342000,
      capTren1: '',
      capTren2: ''
    },
    {
      id: 5,
      stt: 5,
      trachNhiem: 'Xây dựng tiêu liêu năng suất lao động',
      tyTrongCongViec: 15,
      mucLuongTheoItTrong: 570000,
      tieuChiDatTheoIi: 100,
      danhGiaHieuQuaCong: 100,
      kpiThucNhanTheoIi: 570000,
      caNhanTuDanhGia: 570000,
      capTren1: '',
      capTren2: ''
    },
    {
      id: 6,
      stt: 6,
      trachNhiem: 'Theo sát chi đạo của cấp trên',
      tyTrongCongViec: 5,
      mucLuongTheoItTrong: 190000,
      tieuChiDatTheoIi: 100,
      danhGiaHieuQuaCong: 100,
      kpiThucNhanTheoIi: 190000,
      caNhanTuDanhGia: 190000,
      capTren1: 'Xác nhận 1',
      capTren2: 'Xác nhận 2'
    }
  ];

  // Dữ liệu mẫu cho DANH SÁCH KIỂM TRA NỘI BỘ
  const inspectionData = [
    {
      id: 1,
      stt: 1,
      maViPham: 'VP001',
      ngayKiemTra: '2024-03-15',
      maKyHoachKiemTra: 'KH001',
      maNhanVienPhamLoi: 'NV001',
      tenNhanVienPhamLoi: 'Nguyễn Văn An',
      loaiViPham: 'Vi phạm quy định',
      noiDungPhamLoi: 'Vi phạm quy định, Vi phạm về quản lý',
      mucDo: 'Đặc biệt nghiêm trọng, Nghiêm trọng, Trung bình, Nhẹ',
      phamLoiLan: 1,
      nguoiKiemTra: 'Trần Thị Bình',
      maNguoiKiemTraChung: 'NV002',
      nguoiKiemTraChung: 'Lê Văn Cường',
      hoatDong: 'Tạo mới, Xác nhận, Chỉnh sửa, Xem chi tiết'
    }
  ];

  // Dữ liệu mẫu cho BẢNG TÍNH LƯƠNG
  const payrollData = [
    {
      id: 1,
      stt: 1,
      maNhanVien: 'NV001',
      tenNhanVien: 'Nguyễn Văn An',
      chucVu: 'Nhân viên QC',
      thangNam: '03/2024',
      luongCoBan: 15000000,
      phuCapChucVu: 1000000,
      phuCapKhac: 500000,
      thuongKPI: 2000000,
      thuongDuAn: 0,
      tongThuNhap: 18500000,
      baoHiemXaHoi: 1110000,
      baoHiemYTe: 277500,
      baoHiemThatNghiep: 185000,
      thueThuNhapCaNhan: 850000,
      tongKhauTru: 2422500,
      thucLinh: 16077500,
      soNgayLam: 22,
      soNgayNghi: 0,
      soGioLamThem: 8
    },
    {
      id: 2,
      stt: 2,
      maNhanVien: 'NV002',
      tenNhanVien: 'Trần Thị Bình',
      chucVu: 'Trưởng nhóm QC',
      thangNam: '03/2024',
      luongCoBan: 20000000,
      phuCapChucVu: 3000000,
      phuCapKhac: 1000000,
      thuongKPI: 3000000,
      thuongDuAn: 2000000,
      tongThuNhap: 29000000,
      baoHiemXaHoi: 1740000,
      baoHiemYTe: 435000,
      baoHiemThatNghiep: 290000,
      thueThuNhapCaNhan: 2150000,
      tongKhauTru: 4615000,
      thucLinh: 24385000,
      soNgayLam: 22,
      soNgayNghi: 0,
      soGioLamThem: 12
    }
  ];

  // Dữ liệu mẫu cho BẢNG LƯƠNG NHÂN VIÊN (NGHIỆP VỤ)
  const salaryData = [
    {
      id: 1,
      stt: 1,
      viTri: 'Trưởng bộ phận',
      luongCoBan: 12000000,
      kpiCongThem: 0,
      hocViec: 0,
      trungCap: 0,
      nangCao: 20000000,
      lanhNghe: 25000000,
      chuyenNghiep: 0
    },
    {
      id: 2,
      stt: 2,
      viTri: 'Trưởng phòng',
      luongCoBan: 8000000,
      kpiCongThem: 0,
      hocViec: 0,
      trungCap: 0,
      nangCao: 15000000,
      lanhNghe: 19000000,
      chuyenNghiep: 0
    },
    {
      id: 3,
      stt: 3,
      viTri: 'Tó trưởng',
      luongCoBan: 6000000,
      kpiCongThem: 0,
      hocViec: 0,
      trungCap: 0,
      nangCao: 12000000,
      lanhNghe: 14000000,
      chuyenNghiep: 0
    },
    {
      id: 4,
      stt: 4,
      viTri: 'Nhân viên văn phòng',
      luongCoBan: 6000000,
      kpiCongThem: 0,
      hocViec: 5000000,
      trungCap: 6000000,
      nangCao: 8000000,
      lanhNghe: 9000000,
      chuyenNghiep: 11000000
    },
    {
      id: 5,
      stt: 5,
      viTri: 'Nhân viên kỹ thuật',
      luongCoBan: 6000000,
      kpiCongThem: 0,
      hocViec: 6000000,
      trungCap: 8000000,
      nangCao: 9000000,
      lanhNghe: 10000000,
      chuyenNghiep: 12000000
    },
    {
      id: 6,
      stt: 6,
      viTri: 'Nhân viên sản xuất nữ',
      luongCoBan: 3450000,
      kpiCongThem: 0,
      hocViec: 5000000,
      trungCap: 6000000,
      nangCao: 7000000,
      lanhNghe: 8000000,
      chuyenNghiep: 9000000
    },
    {
      id: 7,
      stt: 7,
      viTri: 'Nhân viên sản xuất nam',
      luongCoBan: 3450000,
      kpiCongThem: 0,
      hocViec: 5000000,
      trungCap: 6500000,
      nangCao: 8000000,
      lanhNghe: 9000000,
      chuyenNghiep: 10000000
    },
    {
      id: 8,
      stt: 8,
      viTri: 'Nhân viên vận lô hơi',
      luongCoBan: 3450000,
      kpiCongThem: 0,
      hocViec: 5000000,
      trungCap: 7000000,
      nangCao: 8500000,
      lanhNghe: 9500000,
      chuyenNghiep: 10000000
    },
    {
      id: 9,
      stt: 9,
      viTri: 'Nhân viên vận hành máy chiên',
      luongCoBan: 3450000,
      kpiCongThem: 0,
      hocViec: 5000000,
      trungCap: 7000000,
      nangCao: 9000000,
      lanhNghe: 10000000,
      chuyenNghiep: 11000000
    },
    {
      id: 10,
      stt: 10,
      viTri: 'Nhân viên vận hành máy rửa',
      luongCoBan: 3450000,
      kpiCongThem: 0,
      hocViec: 5000000,
      trungCap: 7000000,
      nangCao: 9000000,
      lanhNghe: 10000000,
      chuyenNghiep: 11000000
    },
    {
      id: 11,
      stt: 11,
      viTri: 'Nhân viên đâm báo vệ sinh',
      luongCoBan: 3450000,
      kpiCongThem: 0,
      hocViec: 0,
      trungCap: 8000000,
      nangCao: 7000000,
      lanhNghe: 8000000,
      chuyenNghiep: 9000000
    }
  ];

  // State for modals
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [isResponsibilityModalOpen, setIsResponsibilityModalOpen] = useState(false);
  const [responsibilityFormData, setResponsibilityFormData] = useState({
    tenNhanVienThucHien: '',
    hienThiKhiDangNhap: '',
    viTri: ''
  });
  const [responsibilityItems, setResponsibilityItems] = useState<Array<{id: number, nhiemVu: string, tyTrong: string}>>([
    { id: 1, nhiemVu: '', tyTrong: '' }
  ]);
  const [nextItemId, setNextItemId] = useState(2);

  const openDetailModal = (item: any) => {
    setSelectedItem(item);
    setIsDetailModalOpen(true);
  };

  const closeDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedItem(null);
  };

  const tabs = [
    { id: 'employees', name: 'Danh sách nhân viên', icon: <Users className="w-4 h-4" /> },
    { id: 'positions', name: 'Quản lý vị trí', icon: <Briefcase className="w-4 h-4" /> },
    { id: 'levels', name: 'Quản lý cấp độ & lương', icon: <DollarSign className="w-4 h-4" /> },
    { id: 'responsibilities', name: 'Danh sách trách nhiệm', icon: <FileText className="w-4 h-4" /> },
    { id: 'evaluations', name: 'Đánh giá nhân viên', icon: <Star className="w-4 h-4" /> },
    { id: 'payroll', name: 'Bảng tính lương', icon: <DollarSign className="w-4 h-4" /> },
    { id: 'attendance', name: 'Bảng điểm danh nhân viên', icon: <FileText className="w-4 h-4" /> },
    { id: 'leave-requests', name: 'Danh sách đơn nghỉ phép', icon: <Calendar className="w-4 h-4" /> },
    { id: 'users', name: 'Quản lý user', icon: <Lock className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2 flex items-center">
            <Users className="w-8 h-8 text-blue-600 mr-3" />
            Phòng chất lượng nhân sự
          </h1>
          <p className="text-gray-600">Quản lý nhân viên, trách nhiệm, đánh giá và lương bổng</p>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Tổng quan nhân viên */}
          <div className="bg-white rounded-xl shadow-lg p-5 border-2 border-gray-300 hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 hover:border-blue-400">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold flex items-center text-gray-800">
                <Users className="w-5 h-5 mr-2 text-blue-600" />
                Tổng quan nhân viên
              </h3>
            </div>
            <div className="space-y-3">
              <div className="bg-blue-50 rounded-lg p-3 hover:bg-blue-100 hover:shadow-md hover:scale-105 transition-all duration-200 border-2 border-blue-300 cursor-pointer">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium text-gray-700">Tổng nhân viên</span>
                  <span className="text-2xl font-bold text-blue-600">{employees.length}</span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-gray-50 rounded-lg p-2 text-center hover:bg-gray-100 hover:shadow-md hover:scale-110 transition-all duration-200 border-2 border-gray-300 cursor-pointer">
                  <div className="text-xl font-bold text-gray-800">{employees.filter(emp => emp.contractType === 'PERMANENT').length}</div>
                  <div className="text-xs text-gray-600 mt-0.5">Chính thức</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-2 text-center hover:bg-gray-100 hover:shadow-md hover:scale-110 transition-all duration-200 border-2 border-gray-300 cursor-pointer">
                  <div className="text-xl font-bold text-gray-800">{employees.filter(emp => emp.contractType === 'PROBATION').length}</div>
                  <div className="text-xs text-gray-600 mt-0.5">Thử việc</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-2 text-center hover:bg-gray-100 hover:shadow-md hover:scale-110 transition-all duration-200 border-2 border-gray-300 cursor-pointer">
                  <div className="text-xl font-bold text-gray-800">{employees.filter(emp => emp.contractType === 'PART_TIME').length}</div>
                  <div className="text-xs text-gray-600 mt-0.5">Bán thời gian</div>
                </div>
              </div>
            </div>
          </div>

          {/* Tổng quan đánh giá */}
          <div className="bg-white rounded-xl shadow-lg p-5 border-2 border-gray-300 hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 hover:border-yellow-400">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold flex items-center text-gray-800">
                <Star className="w-5 h-5 mr-2 text-yellow-500" />
                Tổng quan đánh giá
              </h3>
            </div>

            {/* Month/Year Filter */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div>
                <label className="block text-xs font-medium mb-1 text-gray-700">Tháng</label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="w-full px-2 py-1.5 bg-gray-50 border-2 border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-blue-400 transition-colors"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                    <option key={month} value={month}>{month}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1 text-gray-700">Năm</label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="w-full px-2 py-1.5 bg-gray-50 border-2 border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-blue-400 transition-colors"
                >
                  {Array.from({ length: 5 }, (_, i) => currentDate.getFullYear() - 2 + i).map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-3">
              <div className="bg-blue-50 rounded-lg p-3 hover:bg-blue-100 hover:shadow-md hover:scale-105 transition-all duration-200 border-2 border-blue-300 cursor-pointer">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium text-gray-700">Đã đánh giá</span>
                  <span className="text-2xl font-bold text-blue-600">
                    {evaluations.filter(e => e.supervisorScore2 > 0).length}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-green-50 rounded-lg p-2 text-center hover:bg-green-100 hover:shadow-md hover:scale-110 transition-all duration-200 border-2 border-green-300 cursor-pointer">
                  <div className="text-xl font-bold text-green-600">{evaluations.filter(e => e.supervisorScore2 > 100).length}</div>
                  <div className="text-xs text-gray-600 mt-0.5">Vượt KPI</div>
                </div>
                <div className="bg-blue-50 rounded-lg p-2 text-center hover:bg-blue-100 hover:shadow-md hover:scale-110 transition-all duration-200 border-2 border-blue-300 cursor-pointer">
                  <div className="text-xl font-bold text-blue-600">{evaluations.filter(e => e.supervisorScore2 === 100).length}</div>
                  <div className="text-xs text-gray-600 mt-0.5">Đạt KPI</div>
                </div>
                <div className="bg-red-50 rounded-lg p-2 text-center hover:bg-red-100 hover:shadow-md hover:scale-110 transition-all duration-200 border-2 border-red-300 cursor-pointer">
                  <div className="text-xl font-bold text-red-600">{evaluations.filter(e => e.supervisorScore2 > 0 && e.supervisorScore2 < 100).length}</div>
                  <div className="text-xs text-gray-600 mt-0.5">Chưa đạt</div>
                </div>
              </div>
            </div>
          </div>

          {/* Tổng quan điểm danh */}
          <div className="bg-white rounded-xl shadow-lg p-5 border-2 border-gray-300 hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 hover:border-purple-400">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold flex items-center text-gray-800">
                <Calendar className="w-5 h-5 mr-2 text-purple-600" />
                Tổng quan điểm danh
              </h3>
            </div>

            {/* Date Filter */}
            <div className="mb-3">
              <DatePicker
                label="Ngày"
                value={selectedDate}
                onChange={(date) => setSelectedDate(date)}
                placeholder="Chọn ngày điểm danh"
              />
            </div>

            <div className="space-y-3">
              <div className="bg-blue-50 rounded-lg p-3 hover:bg-blue-100 hover:shadow-md hover:scale-105 transition-all duration-200 border-2 border-blue-300 cursor-pointer">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium text-gray-700">Tổng điểm danh</span>
                  <span className="text-2xl font-bold text-blue-600">{attendances.length}</span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-green-50 rounded-lg p-2 text-center hover:bg-green-100 hover:shadow-md hover:scale-110 transition-all duration-200 border-2 border-green-300 cursor-pointer">
                  <div className="text-xl font-bold text-green-600">{attendances.filter(a => a.checkInTime !== null).length}</div>
                  <div className="text-xs text-gray-600 mt-0.5">Đã vào</div>
                </div>
                <div className="bg-blue-50 rounded-lg p-2 text-center hover:bg-blue-100 hover:shadow-md hover:scale-110 transition-all duration-200 border-2 border-blue-300 cursor-pointer">
                  <div className="text-xl font-bold text-blue-600">{attendances.filter(a => a.checkOutTime !== null).length}</div>
                  <div className="text-xs text-gray-600 mt-0.5">Đã ra</div>
                </div>
                <div className="bg-red-50 rounded-lg p-2 text-center hover:bg-red-100 hover:shadow-md hover:scale-110 transition-all duration-200 border-2 border-red-300 cursor-pointer">
                  <div className="text-xl font-bold text-red-600">{employees.length - attendances.length}</div>
                  <div className="text-xs text-gray-600 mt-0.5">Chưa điểm danh</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
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
        <div>
          {/* DANH SÁCH NHÂN VIÊN */}
          {activeTab === 'employees' && (
            <EmployeeManagement />
          )}

          {/* QUẢN LÝ VỊ TRÍ */}
          {activeTab === 'positions' && (
            <PositionManagement />
          )}

          {/* QUẢN LÝ CẤP ĐỘ & LƯƠNG */}
          {activeTab === 'levels' && (
            <PositionLevelManagement />
          )}

          {/* DANH SÁCH TRÁCH NHIỆM */}
          {activeTab === 'responsibilities' && (
            <ResponsibilityManagement />
          )}

          {/* DANH SÁCH TRÁCH NHIỆM (OLD) */}
          {activeTab === 'responsibilities' && false && (
            <div>
              <div className="p-4 border-b border-gray-200 flex justify-end">
                <button
                  onClick={() => setIsResponsibilityModalOpen(true)}
                  className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  Tạo trách nhiệm
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-400">
                  <thead>
                    <tr className="bg-blue-200 border-b-2 border-gray-400">
                      <th className="px-4 py-3 text-center text-sm font-bold text-gray-800 border-r border-gray-400 w-12">STT</th>
                      <th className="px-4 py-3 text-center text-sm font-bold text-gray-800 border-r border-gray-400 w-20">Mã trách nhiệm</th>
                      <th className="px-4 py-3 text-center text-sm font-bold text-gray-800 border-r border-gray-400 w-24">Vị trí</th>
                      <th className="px-4 py-3 text-center text-sm font-bold text-gray-800 border-r border-gray-400 w-32">Tên nhân viên thực hiện</th>
                      <th className="px-4 py-3 text-center text-sm font-bold text-gray-800 border-r border-gray-400 w-24">Ngày thực hiện</th>
                      <th className="px-4 py-3 text-center text-sm font-bold text-gray-800 border-r border-gray-400 w-24">Ngày chính sửa</th>
                      <th className="px-4 py-3 text-center text-sm font-bold text-gray-800 border-r border-gray-400 w-24">Người duyệt</th>
                      <th className="px-4 py-3 text-center text-sm font-bold text-gray-800 w-20">Hoạt động</th>
                    </tr>
                  </thead>
                  <tbody>
                    {responsibilityData.map((item) => (
                      <tr key={item.id} className="border-b border-gray-400 bg-white hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900 border-r border-gray-400 text-center">{item.stt}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 border-r border-gray-400 text-center font-medium text-blue-600">{item.maTrachNhiem}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 border-r border-gray-400 text-center">{item.viTri}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 border-r border-gray-400">{item.tenNhanVienThucHien}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 border-r border-gray-400 text-center">{item.ngayThucHien}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 border-r border-gray-400 text-center">{item.ngayChinhSua}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 border-r border-gray-400">{item.nguoiDuyet}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => openDetailModal(item)}
                              className="text-blue-600 hover:text-blue-800"
                              title="Xem chi tiết"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button className="text-green-600 hover:text-green-800" title="Chỉnh sửa">
                              <Edit className="w-4 h-4" />
                            </button>
                            <button className="text-red-600 hover:text-red-800" title="Xóa">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ĐÁNH GIÁ NHÂN VIÊN */}
          {activeTab === 'evaluations' && (
            <EmployeeEvaluationManagement />
          )}

          {/* BẢNG TÍNH LƯƠNG */}
          {activeTab === 'payroll' && (
            <PayrollManagement />
          )}

          {/* BẢNG TÍNH LƯƠNG (OLD) */}
          {activeTab === 'payroll' && false && (
            <div className="overflow-x-auto">
              <div className="text-center py-4 bg-blue-100 font-bold text-lg">BẢNG TÍNH LƯƠNG</div>
              <table className="w-full border-collapse border border-gray-400">
                <thead>
                  <tr className="bg-blue-300 border-b-2 border-gray-400">
                    <th className="px-4 py-3 text-center text-sm font-bold text-gray-800 border-r border-gray-400 w-12">STT</th>
                    <th className="px-4 py-3 text-center text-sm font-bold text-gray-800 border-r border-gray-400 w-20">Mã NV</th>
                    <th className="px-4 py-3 text-center text-sm font-bold text-gray-800 border-r border-gray-400 w-32">Tên nhân viên</th>
                    <th className="px-4 py-3 text-center text-sm font-bold text-gray-800 border-r border-gray-400 w-24">Chức vụ</th>
                    <th className="px-4 py-3 text-center text-sm font-bold text-gray-800 border-r border-gray-400 w-20">Tháng/Năm</th>
                    <th className="px-4 py-3 text-center text-sm font-bold text-gray-800 border-r border-gray-400 w-24">Lương cơ bản</th>
                    <th className="px-4 py-3 text-center text-sm font-bold text-gray-800 border-r border-gray-400 w-24">Phụ cấp chức vụ</th>
                    <th className="px-4 py-3 text-center text-sm font-bold text-gray-800 border-r border-gray-400 w-24">Phụ cấp khác</th>
                    <th className="px-4 py-3 text-center text-sm font-bold text-gray-800 border-r border-gray-400 w-24">Thưởng KPI</th>
                    <th className="px-4 py-3 text-center text-sm font-bold text-gray-800 border-r border-gray-400 w-24">Thưởng dự án</th>
                    <th className="px-4 py-3 text-center text-sm font-bold text-gray-800 border-r border-gray-400 bg-green-400 text-white w-24">Tổng thu nhập</th>
                    <th className="px-4 py-3 text-center text-sm font-bold text-gray-800 border-r border-gray-400 w-24">BHXH</th>
                    <th className="px-4 py-3 text-center text-sm font-bold text-gray-800 border-r border-gray-400 w-24">BHYT</th>
                    <th className="px-4 py-3 text-center text-sm font-bold text-gray-800 border-r border-gray-400 w-24">BHTN</th>
                    <th className="px-4 py-3 text-center text-sm font-bold text-gray-800 border-r border-gray-400 w-24">Thuế TNCN</th>
                    <th className="px-4 py-3 text-center text-sm font-bold text-gray-800 border-r border-gray-400 bg-red-500 text-white w-24">Tổng khấu trừ</th>
                    <th className="px-4 py-3 text-center text-sm font-bold text-gray-800 border-r border-gray-400 bg-green-500 text-white w-24">Thực lĩnh</th>
                    <th className="px-4 py-3 text-center text-sm font-bold text-gray-800 border-r border-gray-400 w-20">Số ngày làm</th>
                    <th className="px-4 py-3 text-center text-sm font-bold text-gray-800 border-r border-gray-400 w-20">Số ngày nghỉ</th>
                    <th className="px-4 py-3 text-center text-sm font-bold text-gray-800 w-20">Số giờ làm thêm</th>
                  </tr>
                </thead>
                <tbody>
                  {payrollData.map((item) => (
                    <tr key={item.id} className="border-b border-gray-400 bg-white hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900 border-r border-gray-400 text-center">{item.stt}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 border-r border-gray-400 text-center font-medium text-blue-600">{item.maNhanVien}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 border-r border-gray-400">{item.tenNhanVien}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 border-r border-gray-400 text-center">{item.chucVu}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 border-r border-gray-400 text-center">{item.thangNam}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 border-r border-gray-400 text-right font-medium">
                        {item.luongCoBan.toLocaleString('vi-VN')}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 border-r border-gray-400 text-right font-medium">
                        {item.phuCapChucVu.toLocaleString('vi-VN')}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 border-r border-gray-400 text-right font-medium">
                        {item.phuCapKhac.toLocaleString('vi-VN')}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 border-r border-gray-400 text-right font-medium">
                        {item.thuongKPI.toLocaleString('vi-VN')}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 border-r border-gray-400 text-right font-medium">
                        {item.thuongDuAn.toLocaleString('vi-VN')}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 border-r border-gray-400 text-right font-bold bg-green-100">
                        {item.tongThuNhap.toLocaleString('vi-VN')}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 border-r border-gray-400 text-right font-medium">
                        {item.baoHiemXaHoi.toLocaleString('vi-VN')}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 border-r border-gray-400 text-right font-medium">
                        {item.baoHiemYTe.toLocaleString('vi-VN')}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 border-r border-gray-400 text-right font-medium">
                        {item.baoHiemThatNghiep.toLocaleString('vi-VN')}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 border-r border-gray-400 text-right font-medium">
                        {item.thueThuNhapCaNhan.toLocaleString('vi-VN')}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 border-r border-gray-400 text-right font-bold bg-red-100">
                        {item.tongKhauTru.toLocaleString('vi-VN')}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 border-r border-gray-400 text-right font-bold bg-green-100">
                        {item.thucLinh.toLocaleString('vi-VN')}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 border-r border-gray-400 text-center">{item.soNgayLam}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 border-r border-gray-400 text-center">{item.soNgayNghi}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-center">{item.soGioLamThem}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* BẢNG ĐIỂM DANH NHÂN VIÊN */}
          {activeTab === 'attendance' && (
            <AttendanceManagement />
          )}

          {/* DANH SÁCH ĐƠN NGHỈ PHÉP */}
          {activeTab === 'leave-requests' && (
            <LeaveRequestManagement />
          )}
        </div>

        {/* Responsibility Modal */}
        {isResponsibilityModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="bg-gradient-to-r from-blue-400 to-blue-500 px-6 py-4 flex justify-between items-center sticky top-0">
                <h2 className="text-2xl font-bold text-white">TẠO TRÁCH NHIỆM</h2>
                <button
                  onClick={() => {
                    setIsResponsibilityModalOpen(false);
                    setResponsibilityItems([{ id: 1, nhiemVu: '', tyTrong: '' }]);
                    setNextItemId(2);
                  }}
                  className="text-white hover:text-gray-200"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form className="p-6 space-y-4">
                {/* Row 1 */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tên nhân viên thực hiện:</label>
                    <input
                      type="text"
                      value={responsibilityFormData.tenNhanVienThucHien}
                      onChange={(e) => setResponsibilityFormData({...responsibilityFormData, tenNhanVienThucHien: e.target.value})}
                      placeholder="Nhập tên nhân viên"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Hiển thị khi đăng nhập:</label>
                    <input
                      type="text"
                      value={responsibilityFormData.hienThiKhiDangNhap}
                      onChange={(e) => setResponsibilityFormData({...responsibilityFormData, hienThiKhiDangNhap: e.target.value})}
                      placeholder="Nhập thông tin"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Vị trí */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Vị trí:</label>
                  <input
                    type="text"
                    value={responsibilityFormData.viTri}
                    onChange={(e) => setResponsibilityFormData({...responsibilityFormData, viTri: e.target.value})}
                    placeholder="Nhập vị trí"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Section Header */}
                <div className="bg-gray-600 text-white px-4 py-2 rounded font-medium mt-6">
                  Trách nhiệm/chức năng
                </div>

                {/* Responsibility Items */}
                <div className="space-y-4 border border-gray-300 rounded-lg p-4 bg-gray-50">
                  {responsibilityItems.map((item, index) => (
                    <div key={item.id} className="space-y-3 pb-4 border-b border-gray-300 last:border-b-0 last:pb-0">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-700">Trách nhiệm/chức năng #{index + 1}</span>
                        {responsibilityItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setResponsibilityItems(responsibilityItems.filter(i => i.id !== item.id))}
                            className="text-red-600 hover:text-red-800 text-sm font-medium"
                          >
                            Xóa
                          </button>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Nhiệm vụ:</label>
                        <textarea
                          value={item.nhiemVu}
                          onChange={(e) => {
                            const updated = responsibilityItems.map(i =>
                              i.id === item.id ? {...i, nhiemVu: e.target.value} : i
                            );
                            setResponsibilityItems(updated);
                          }}
                          placeholder="Nhập nhiệm vụ"
                          rows={2}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Tỷ trọng (%):</label>
                        <input
                          type="number"
                          value={item.tyTrong}
                          onChange={(e) => {
                            const updated = responsibilityItems.map(i =>
                              i.id === item.id ? {...i, tyTrong: e.target.value} : i
                            );
                            setResponsibilityItems(updated);
                          }}
                          placeholder="Nhập tỷ trọng"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add more button */}
                <button
                  type="button"
                  onClick={() => {
                    setResponsibilityItems([...responsibilityItems, { id: nextItemId, nhiemVu: '', tyTrong: '' }]);
                    setNextItemId(nextItemId + 1);
                  }}
                  className="text-blue-600 hover:text-blue-800 font-medium text-sm flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  Thêm trách nhiệm/chức năng
                </button>

                {/* Action Buttons */}
                <div className="flex justify-end gap-4 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => {
                      setIsResponsibilityModalOpen(false);
                      setResponsibilityItems([{ id: 1, nhiemVu: '', tyTrong: '' }]);
                      setNextItemId(2);
                    }}
                    className="px-8 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400 font-medium"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="px-8 py-2 bg-green-500 text-white rounded hover:bg-green-600 font-medium"
                  >
                    Tạo trách nhiệm
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

          {/* QUẢN LÝ USER */}
          {activeTab === 'users' && (
            <div className="p-6">
              <UserManagement />
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

export default QualityPersonnel;
