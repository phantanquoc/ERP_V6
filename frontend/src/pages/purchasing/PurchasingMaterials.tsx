import React, { useState, useEffect } from 'react';
import {
  ShoppingCart,
  Users,
  FileText,
  TrendingUp,
  Package,
  Plus,
  Search,
  Filter,
  Download,
  Edit,
  Eye,
  Trash2,
  Calendar,
  DollarSign,
  MapPin,
  Phone,
  Star,
  ClipboardList,
  List,
  Upload,
  X,
  Globe,
  Building2
} from 'lucide-react';
import OrderManagement from '../../components/OrderManagement';
import purchaseRequestService from '../../services/purchaseRequestService';
import { supplierService, Supplier, CreateSupplierData, UpdateSupplierData } from '../../services/supplierService';

interface PurchaseRequest {
  id: string;
  stt: number;
  ngayYeuCau: string;
  maYeuCau: string;
  employeeId: string;
  maNhanVien: string;
  tenNhanVien: string;
  phanLoai: string;
  tenHangHoa: string;
  soLuong: number;
  donViTinh: string;
  mucDichYeuCau: string;
  mucDoUuTien: string;
  ghiChu?: string;
  fileKemTheo?: string;
  trangThai: string;
  nguoiDuyet?: string;
  ngayDuyet?: string;
  supplyRequestId?: string;
  createdAt: string;
  updatedAt: string;
}

const PurchasingMaterials = () => {
  const [activeTab, setActiveTab] = useState<'suppliers' | 'orderList' | 'purchaseRequestList'>('suppliers');

  // State for purchase requests
  const [purchaseRequests, setPurchaseRequests] = useState<PurchaseRequest[]>([]);
  const [purchaseRequestLoading, setPurchaseRequestLoading] = useState(false);
  const [purchaseRequestSearch, setPurchaseRequestSearch] = useState('');
  const [purchaseRequestPage, setPage] = useState(1);
  const [purchaseRequestTotalPages, setTotalPages] = useState(1);

  // Fetch purchase requests when tab is active
  useEffect(() => {
    if (activeTab === 'purchaseRequestList') {
      fetchPurchaseRequests();
    }
  }, [activeTab, purchaseRequestPage, purchaseRequestSearch]);

  const fetchPurchaseRequests = async () => {
    try {
      setPurchaseRequestLoading(true);
      const response = await purchaseRequestService.getAllPurchaseRequests(purchaseRequestPage, 10, purchaseRequestSearch || undefined);
      setPurchaseRequests(response.data || []);
      setTotalPages(response.pagination?.totalPages || 1);
    } catch (error) {
      console.error('Error fetching purchase requests:', error);
    } finally {
      setPurchaseRequestLoading(false);
    }
  };

  // State for suppliers
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierLoading, setSupplierLoading] = useState(false);
  const [supplierSearch, setSupplierSearch] = useState('');
  const [supplierPage, setSupplierPage] = useState(1);
  const [supplierTotalPages, setSupplierTotalPages] = useState(1);
  const [isAddSupplierModalOpen, setIsAddSupplierModalOpen] = useState(false);
  const [isEditSupplierModalOpen, setIsEditSupplierModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [supplierFormData, setSupplierFormData] = useState<Partial<CreateSupplierData>>({});
  const [supplierFormLoading, setSupplierFormLoading] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Fetch suppliers when tab is active
  useEffect(() => {
    if (activeTab === 'suppliers') {
      fetchSuppliers();
    }
  }, [activeTab, supplierPage]);

  const fetchSuppliers = async () => {
    try {
      setSupplierLoading(true);
      const response = await supplierService.getAllSuppliers(supplierPage, 10, supplierSearch || undefined);
      setSuppliers(response.data || []);
      setSupplierTotalPages(response.totalPages || 1);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
    } finally {
      setSupplierLoading(false);
    }
  };

  const handleSearchSuppliers = () => {
    setSupplierPage(1);
    fetchSuppliers();
  };

  const openAddSupplierModal = async () => {
    try {
      const { code } = await supplierService.generateCode();
      // Get employeeId from localStorage
      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;
      setSupplierFormData({
        maNhaCungCap: code,
        tenNhaCungCap: '',
        loaiCungCap: '',
        quocGia: 'Việt Nam',
        website: '',
        nguoiLienHe: '',
        soDienThoai: '',
        emailLienHe: '',
        diaChi: '',
        khaNang: '',
        loaiHinh: 'Sản xuất',
        trangThai: 'Đang cung cấp',
        doanhChi: 0,
        employeeId: user?.employee?.id || '',
      });
      setIsAddSupplierModalOpen(true);
    } catch (error) {
      console.error('Error generating supplier code:', error);
    }
  };

  const openEditSupplierModal = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setSupplierFormData({
      tenNhaCungCap: supplier.tenNhaCungCap,
      loaiCungCap: supplier.loaiCungCap,
      quocGia: supplier.quocGia,
      website: supplier.website || '',
      nguoiLienHe: supplier.nguoiLienHe,
      soDienThoai: supplier.soDienThoai,
      emailLienHe: supplier.emailLienHe,
      diaChi: supplier.diaChi,
      khaNang: supplier.khaNang || '',
      loaiHinh: supplier.loaiHinh,
      trangThai: supplier.trangThai,
      doanhChi: supplier.doanhChi || 0,
    });
    setIsEditSupplierModalOpen(true);
  };

  const handleAddSupplier = async () => {
    try {
      setSupplierFormLoading(true);
      await supplierService.createSupplier(supplierFormData as CreateSupplierData);
      setIsAddSupplierModalOpen(false);
      fetchSuppliers();
    } catch (error) {
      console.error('Error creating supplier:', error);
      alert('Lỗi khi tạo nhà cung cấp');
    } finally {
      setSupplierFormLoading(false);
    }
  };

  const handleEditSupplier = async () => {
    if (!editingSupplier) return;
    try {
      setSupplierFormLoading(true);
      await supplierService.updateSupplier(editingSupplier.id, supplierFormData as UpdateSupplierData);
      setIsEditSupplierModalOpen(false);
      setEditingSupplier(null);
      fetchSuppliers();
    } catch (error) {
      console.error('Error updating supplier:', error);
      alert('Lỗi khi cập nhật nhà cung cấp');
    } finally {
      setSupplierFormLoading(false);
    }
  };

  const handleDeleteSupplier = async (id: string) => {
    try {
      await supplierService.deleteSupplier(id);
      setDeleteConfirmId(null);
      fetchSuppliers();
    } catch (error) {
      console.error('Error deleting supplier:', error);
      alert('Lỗi khi xóa nhà cung cấp');
    }
  };

  // State for modals
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [selectedPurchaseRequest, setSelectedPurchaseRequest] = useState<PurchaseRequest | null>(null);
  const [editingPurchaseRequest, setEditingPurchaseRequest] = useState<PurchaseRequest | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<PurchaseRequest>>({});
  const [editLoading, setEditLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const openDetailModal = (item: any) => {
    setSelectedItem(item);
    setIsDetailModalOpen(true);
  };

  const closeDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedItem(null);
  };

  const openPurchaseRequestDetail = (item: PurchaseRequest) => {
    setSelectedPurchaseRequest(item);
  };

  const closePurchaseRequestDetail = () => {
    setSelectedPurchaseRequest(null);
  };

  const openEditPurchaseRequest = (item: PurchaseRequest) => {
    setEditingPurchaseRequest(item);
    setSelectedFile(null);
    setEditFormData({
      phanLoai: item.phanLoai,
      tenHangHoa: item.tenHangHoa,
      soLuong: item.soLuong,
      donViTinh: item.donViTinh,
      mucDichYeuCau: item.mucDichYeuCau,
      mucDoUuTien: item.mucDoUuTien,
      ghiChu: item.ghiChu || '',
      trangThai: item.trangThai,
      nguoiDuyet: item.nguoiDuyet || '',
      ngayDuyet: item.ngayDuyet || '',
      fileKemTheo: item.fileKemTheo || '',
    });
  };

  const closeEditPurchaseRequest = () => {
    setEditingPurchaseRequest(null);
    setEditFormData({});
    setSelectedFile(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      // Lưu tên file vào formData (trong thực tế sẽ upload lên server)
      setEditFormData({...editFormData, fileKemTheo: file.name});
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setEditFormData({...editFormData, fileKemTheo: ''});
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPurchaseRequest) return;

    setEditLoading(true);
    try {
      // Gửi file cùng với data
      const dataToSend = {
        ...editFormData,
        file: selectedFile || undefined,
      };
      await purchaseRequestService.updatePurchaseRequest(editingPurchaseRequest.id, dataToSend);
      alert('Cập nhật thành công!');
      closeEditPurchaseRequest();
      fetchPurchaseRequests();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Lỗi khi cập nhật');
    } finally {
      setEditLoading(false);
    }
  };

  const handleDeletePurchaseRequest = async (id: string) => {
    if (!confirm('Bạn có chắc muốn xóa yêu cầu mua hàng này?')) return;

    try {
      await purchaseRequestService.deletePurchaseRequest(id);
      alert('Xóa thành công!');
      fetchPurchaseRequests();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Lỗi khi xóa');
    }
  };

  const tabs = [
    { id: 'suppliers', name: 'Nhà cung cấp NVL', icon: <Users className="w-4 h-4" /> },
    { id: 'orderList', name: 'Danh sách đơn hàng', icon: <ClipboardList className="w-4 h-4" /> },
    { id: 'purchaseRequestList', name: 'Danh sách mua hàng', icon: <List className="w-4 h-4" /> }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2 flex items-center">
            <ShoppingCart className="w-8 h-8 text-green-600 mr-3" />
            Phòng thu mua NVL
          </h1>
          <p className="text-gray-600">Quản lý nhà cung cấp, đơn hàng mua, hợp đồng và chi phí nguyên vật liệu</p>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
          {/* Tổng quan nhà cung cấp */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <Users className="w-5 h-5 text-blue-600 mr-2" />
              Nhà cung cấp NVL
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Tổng NCC</span>
                <span className="text-lg font-bold text-blue-600">{suppliers.length}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Đang cung cấp</span>
                <span className="text-lg font-bold text-green-600">
                  {suppliers.filter(item => item.trangThai === 'Đang cung cấp').length}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Ngừng cung cấp</span>
                <span className="text-lg font-bold text-red-600">
                  {suppliers.filter(item => item.trangThai === 'Ngừng cung cấp').length}
                </span>
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
                      ? 'border-green-500 text-green-600'
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

        {/* Action Bar - Hide for orderList and purchaseRequestList tabs */}
        {/* Content */}
        <div className="bg-white rounded-lg shadow-sm">
          {/* NHÀ CUNG CẤP NVL */}
          {activeTab === 'suppliers' && (
            <div className="p-6">
              {/* Search and actions bar */}
              <div className="mb-6 flex flex-wrap gap-4 items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <input
                      type="text"
                      placeholder="Tìm kiếm nhà cung cấp..."
                      value={supplierSearch}
                      onChange={(e) => setSupplierSearch(e.target.value)}
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 w-64"
                    />
                  </div>
                  <button
                    onClick={handleSearchSuppliers}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    <Search className="h-4 w-4" />
                    Tìm kiếm
                  </button>
                </div>
                <button
                  onClick={openAddSupplierModal}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  <Plus className="h-4 w-4" />
                  Thêm nhà cung cấp
                </button>
              </div>

              {/* Table */}
              {supplierLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
                  <p className="mt-4 text-gray-600">Đang tải dữ liệu...</p>
                </div>
              ) : suppliers.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">Chưa có nhà cung cấp nào</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">STT</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mã NCC</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tên NCC</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Loại cung cấp</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quốc gia</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Liên hệ</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Loại hình</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trạng thái</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Doanh chi</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">NV tạo</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hoạt động</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {suppliers.map((item, index) => (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-900">{(supplierPage - 1) * 10 + index + 1}</td>
                          <td className="px-3 py-3 whitespace-nowrap text-sm font-medium text-blue-600">{item.maNhaCungCap}</td>
                          <td className="px-3 py-3 text-sm text-gray-900 max-w-xs truncate" title={item.tenNhaCungCap}>{item.tenNhaCungCap}</td>
                          <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-900">{item.loaiCungCap}</td>
                          <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-900">
                            <div className="flex items-center">
                              <Globe className="w-3 h-3 mr-1 text-gray-400" />
                              {item.quocGia}
                            </div>
                          </td>
                          <td className="px-3 py-3 text-sm text-gray-900">
                            <div>
                              <div className="font-medium">{item.nguoiLienHe}</div>
                              <div className="text-xs text-gray-500 flex items-center">
                                <Phone className="w-3 h-3 mr-1" />
                                {item.soDienThoai}
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-900">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              item.loaiHinh === 'Sản xuất' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                            }`}>
                              {item.loaiHinh}
                            </span>
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-900">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              item.trangThai === 'Đang cung cấp' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {item.trangThai}
                            </span>
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-900">
                            {item.doanhChi ? `${(item.doanhChi / 1000000).toFixed(0)}M` : '-'}
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-900">
                            {item.employee?.user ? `${item.employee.user.firstName} ${item.employee.user.lastName}` : '-'}
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-900">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => openDetailModal(item)}
                                className="text-blue-600 hover:text-blue-800"
                                title="Xem chi tiết"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => openEditSupplierModal(item)}
                                className="text-green-600 hover:text-green-800"
                                title="Chỉnh sửa"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setDeleteConfirmId(item.id)}
                                className="text-red-600 hover:text-red-800"
                                title="Xóa"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination */}
              {supplierTotalPages > 1 && (
                <div className="flex justify-center items-center gap-2 mt-4 pb-4">
                  <button
                    onClick={() => setSupplierPage(p => Math.max(1, p - 1))}
                    disabled={supplierPage === 1}
                    className="px-3 py-1 border rounded disabled:opacity-50"
                  >
                    Trước
                  </button>
                  <span className="text-sm text-gray-600">
                    Trang {supplierPage} / {supplierTotalPages}
                  </span>
                  <button
                    onClick={() => setSupplierPage(p => Math.min(supplierTotalPages, p + 1))}
                    disabled={supplierPage === supplierTotalPages}
                    className="px-3 py-1 border rounded disabled:opacity-50"
                  >
                    Sau
                  </button>
                </div>
              )}
            </div>
          )}

          {/* DANH SÁCH ĐƠN HÀNG */}
          {activeTab === 'orderList' && (
            <div className="p-6">
              <OrderManagement hideHeader={true} />
            </div>
          )}

          {/* DANH SÁCH MUA HÀNG */}
          {activeTab === 'purchaseRequestList' && (
            <div className="p-6">
              {/* Search and filter bar */}
              <div className="mb-6 flex flex-wrap gap-4 items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <input
                      type="text"
                      placeholder="Tìm kiếm yêu cầu mua hàng..."
                      value={purchaseRequestSearch}
                      onChange={(e) => setPurchaseRequestSearch(e.target.value)}
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 w-64"
                    />
                  </div>
                  <button
                    onClick={fetchPurchaseRequests}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                  >
                    <Search className="h-4 w-4" />
                    Tìm kiếm
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                    <Download className="h-4 w-4" />
                    Xuất Excel
                  </button>
                </div>
              </div>

              {/* Table */}
              {purchaseRequestLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
                  <p className="mt-4 text-gray-600">Đang tải dữ liệu...</p>
                </div>
              ) : purchaseRequests.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">Chưa có yêu cầu mua hàng nào</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">STT</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mã yêu cầu</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ngày yêu cầu</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nhân viên</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phân loại</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tên hàng hoá</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Số lượng</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Đơn vị</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mức độ ưu tiên</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trạng thái</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hành động</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {purchaseRequests.map((item, index) => (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{index + 1}</td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-blue-600">{item.maYeuCau}</td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                            {new Date(item.ngayYeuCau).toLocaleDateString('vi-VN')}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{item.tenNhanVien}</td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{item.phanLoai}</td>
                          <td className="px-4 py-4 text-sm text-gray-900 max-w-xs truncate">{item.tenHangHoa}</td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">{item.soLuong}</td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{item.donViTinh}</td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              item.mucDoUuTien === 'Cao' ? 'bg-red-100 text-red-800' :
                              item.mucDoUuTien === 'Trung bình' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {item.mucDoUuTien}
                            </span>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              item.trangThai === 'Chờ duyệt' ? 'bg-yellow-100 text-yellow-800' :
                              item.trangThai === 'Đã duyệt' ? 'bg-green-100 text-green-800' :
                              item.trangThai === 'Từ chối' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {item.trangThai}
                            </span>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => openPurchaseRequestDetail(item)}
                                className="text-blue-600 hover:text-blue-800"
                                title="Xem chi tiết"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => openEditPurchaseRequest(item)}
                                className="text-green-600 hover:text-green-800"
                                title="Chỉnh sửa"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeletePurchaseRequest(item.id)}
                                className="text-red-600 hover:text-red-800"
                                title="Xóa"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination */}
              {purchaseRequestTotalPages > 1 && (
                <div className="flex justify-center items-center gap-2 mt-6">
                  <button
                    onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                    disabled={purchaseRequestPage === 1}
                    className="px-3 py-1 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Trước
                  </button>
                  <span className="text-sm text-gray-600">
                    Trang {purchaseRequestPage} / {purchaseRequestTotalPages}
                  </span>
                  <button
                    onClick={() => setPage(prev => Math.min(prev + 1, purchaseRequestTotalPages))}
                    disabled={purchaseRequestPage === purchaseRequestTotalPages}
                    className="px-3 py-1 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Sau
                  </button>
                </div>
              )}
            </div>
          )}

        </div>

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
                  <button className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">
                    Chỉnh sửa
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Purchase Request Detail Modal */}
        {selectedPurchaseRequest && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-800">Chi tiết yêu cầu mua hàng</h2>
                  <button
                    onClick={closePurchaseRequestDetail}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <label className="block text-sm font-medium text-gray-500 mb-1">Mã yêu cầu</label>
                    <p className="text-sm font-semibold text-blue-600">{selectedPurchaseRequest.maYeuCau}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <label className="block text-sm font-medium text-gray-500 mb-1">Ngày yêu cầu</label>
                    <p className="text-sm text-gray-900">{new Date(selectedPurchaseRequest.ngayYeuCau).toLocaleDateString('vi-VN')}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <label className="block text-sm font-medium text-gray-500 mb-1">Nhân viên yêu cầu</label>
                    <p className="text-sm text-gray-900">{selectedPurchaseRequest.tenNhanVien}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <label className="block text-sm font-medium text-gray-500 mb-1">Mã nhân viên</label>
                    <p className="text-sm text-gray-900">{selectedPurchaseRequest.maNhanVien}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <label className="block text-sm font-medium text-gray-500 mb-1">Phân loại</label>
                    <p className="text-sm text-gray-900">{selectedPurchaseRequest.phanLoai}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <label className="block text-sm font-medium text-gray-500 mb-1">Tên hàng hoá</label>
                    <p className="text-sm text-gray-900">{selectedPurchaseRequest.tenHangHoa}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <label className="block text-sm font-medium text-gray-500 mb-1">Số lượng</label>
                    <p className="text-sm font-semibold text-gray-900">{selectedPurchaseRequest.soLuong} {selectedPurchaseRequest.donViTinh}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <label className="block text-sm font-medium text-gray-500 mb-1">Mức độ ưu tiên</label>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      selectedPurchaseRequest.mucDoUuTien === 'Cao' ? 'bg-red-100 text-red-800' :
                      selectedPurchaseRequest.mucDoUuTien === 'Trung bình' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {selectedPurchaseRequest.mucDoUuTien}
                    </span>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg col-span-2">
                    <label className="block text-sm font-medium text-gray-500 mb-1">Mục đích yêu cầu</label>
                    <p className="text-sm text-gray-900">{selectedPurchaseRequest.mucDichYeuCau}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <label className="block text-sm font-medium text-gray-500 mb-1">Trạng thái</label>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      selectedPurchaseRequest.trangThai === 'Chờ duyệt' ? 'bg-yellow-100 text-yellow-800' :
                      selectedPurchaseRequest.trangThai === 'Đã duyệt' ? 'bg-green-100 text-green-800' :
                      selectedPurchaseRequest.trangThai === 'Từ chối' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {selectedPurchaseRequest.trangThai}
                    </span>
                  </div>
                  {selectedPurchaseRequest.ghiChu && (
                    <div className="bg-gray-50 p-4 rounded-lg col-span-2">
                      <label className="block text-sm font-medium text-gray-500 mb-1">Ghi chú</label>
                      <p className="text-sm text-gray-900">{selectedPurchaseRequest.ghiChu}</p>
                    </div>
                  )}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <label className="block text-sm font-medium text-gray-500 mb-1">Người duyệt</label>
                    <p className="text-sm text-gray-900">
                      {selectedPurchaseRequest.nguoiDuyet || <span className="text-gray-400 italic">Chưa có</span>}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <label className="block text-sm font-medium text-gray-500 mb-1">Ngày duyệt</label>
                    <p className="text-sm text-gray-900">
                      {selectedPurchaseRequest.ngayDuyet
                        ? new Date(selectedPurchaseRequest.ngayDuyet).toLocaleDateString('vi-VN')
                        : <span className="text-gray-400 italic">Chưa duyệt</span>}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg col-span-2">
                    <label className="block text-sm font-medium text-gray-500 mb-1">File đính kèm</label>
                    {selectedPurchaseRequest.fileKemTheo ? (
                      <a
                        href={selectedPurchaseRequest.fileKemTheo}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline"
                      >
                        {selectedPurchaseRequest.fileKemTheo}
                      </a>
                    ) : (
                      <p className="text-sm text-gray-400 italic">Không có file đính kèm</p>
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-4 mt-6">
                  <button
                    onClick={closePurchaseRequestDetail}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Đóng
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit Purchase Request Modal */}
        {editingPurchaseRequest && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <form onSubmit={handleEditSubmit} className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-800">Chỉnh sửa yêu cầu mua hàng</h2>
                  <button
                    type="button"
                    onClick={closeEditPurchaseRequest}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mã yêu cầu</label>
                    <input
                      type="text"
                      value={editingPurchaseRequest.maYeuCau}
                      disabled
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phân loại</label>
                    <input
                      type="text"
                      value={editFormData.phanLoai || ''}
                      onChange={(e) => setEditFormData({...editFormData, phanLoai: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tên hàng hoá</label>
                    <input
                      type="text"
                      value={editFormData.tenHangHoa || ''}
                      onChange={(e) => setEditFormData({...editFormData, tenHangHoa: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Số lượng</label>
                    <input
                      type="number"
                      value={editFormData.soLuong || ''}
                      onChange={(e) => setEditFormData({...editFormData, soLuong: parseFloat(e.target.value)})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Đơn vị tính</label>
                    <input
                      type="text"
                      value={editFormData.donViTinh || ''}
                      onChange={(e) => setEditFormData({...editFormData, donViTinh: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mục đích yêu cầu</label>
                    <input
                      type="text"
                      value={editFormData.mucDichYeuCau || ''}
                      onChange={(e) => setEditFormData({...editFormData, mucDichYeuCau: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mức độ ưu tiên</label>
                    <select
                      value={editFormData.mucDoUuTien || ''}
                      onChange={(e) => setEditFormData({...editFormData, mucDoUuTien: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      <option value="Thấp">Thấp</option>
                      <option value="Trung bình">Trung bình</option>
                      <option value="Cao">Cao</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Trạng thái</label>
                    <select
                      value={editFormData.trangThai || ''}
                      onChange={(e) => setEditFormData({...editFormData, trangThai: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      <option value="Chờ duyệt">Chờ duyệt</option>
                      <option value="Đã duyệt">Đã duyệt</option>
                      <option value="Từ chối">Từ chối</option>
                      <option value="Hoàn thành">Hoàn thành</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú</label>
                    <textarea
                      value={editFormData.ghiChu || ''}
                      onChange={(e) => setEditFormData({...editFormData, ghiChu: e.target.value})}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Người duyệt</label>
                    <input
                      type="text"
                      value={editFormData.nguoiDuyet || ''}
                      onChange={(e) => setEditFormData({...editFormData, nguoiDuyet: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="Nhập tên người duyệt"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ngày duyệt</label>
                    <input
                      type="date"
                      value={editFormData.ngayDuyet ? new Date(editFormData.ngayDuyet).toISOString().split('T')[0] : ''}
                      onChange={(e) => setEditFormData({...editFormData, ngayDuyet: e.target.value ? new Date(e.target.value).toISOString() : undefined})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">File đính kèm</label>
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md cursor-pointer hover:bg-gray-50 transition-colors">
                        <Upload className="w-4 h-4 text-gray-500" />
                        <span className="text-sm text-gray-700">Chọn file</span>
                        <input
                          type="file"
                          onChange={handleFileChange}
                          className="hidden"
                          accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                        />
                      </label>
                      {(selectedFile || editFormData.fileKemTheo) && (
                        <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-md">
                          <span className="text-sm text-gray-700 max-w-[200px] truncate">
                            {selectedFile ? selectedFile.name : editFormData.fileKemTheo}
                          </span>
                          <button
                            type="button"
                            onClick={handleRemoveFile}
                            className="text-red-500 hover:text-red-700"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Hỗ trợ: PDF, DOC, DOCX, XLS, XLSX, JPG, PNG</p>
                  </div>
                </div>

                <div className="flex justify-end gap-4 mt-6">
                  <button
                    type="button"
                    onClick={closeEditPurchaseRequest}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={editLoading}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                  >
                    {editLoading ? 'Đang lưu...' : 'Lưu thay đổi'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Thêm nhà cung cấp */}
        {isAddSupplierModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b flex justify-between items-center sticky top-0 bg-white">
                <h2 className="text-xl font-semibold">Thêm nhà cung cấp mới</h2>
                <button onClick={() => setIsAddSupplierModalOpen(false)} className="text-gray-500 hover:text-gray-700">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={(e) => { e.preventDefault(); handleAddSupplier(); }} className="p-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mã NCC</label>
                    <input type="text" value={supplierFormData.maNhaCungCap || ''} disabled className="w-full border rounded-md px-3 py-2 bg-gray-100" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tên nhà cung cấp *</label>
                    <input type="text" value={supplierFormData.tenNhaCungCap || ''} onChange={(e) => setSupplierFormData({...supplierFormData, tenNhaCungCap: e.target.value})} required className="w-full border rounded-md px-3 py-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Loại cung cấp *</label>
                    <input type="text" placeholder="VD: Thủy sản, Rau củ, Gia vị..." value={supplierFormData.loaiCungCap || ''} onChange={(e) => setSupplierFormData({...supplierFormData, loaiCungCap: e.target.value})} required className="w-full border rounded-md px-3 py-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Quốc gia *</label>
                    <input type="text" value={supplierFormData.quocGia || ''} onChange={(e) => setSupplierFormData({...supplierFormData, quocGia: e.target.value})} required className="w-full border rounded-md px-3 py-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                    <input type="text" value={supplierFormData.website || ''} onChange={(e) => setSupplierFormData({...supplierFormData, website: e.target.value})} className="w-full border rounded-md px-3 py-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Người liên hệ *</label>
                    <input type="text" value={supplierFormData.nguoiLienHe || ''} onChange={(e) => setSupplierFormData({...supplierFormData, nguoiLienHe: e.target.value})} required className="w-full border rounded-md px-3 py-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Số điện thoại *</label>
                    <input type="text" value={supplierFormData.soDienThoai || ''} onChange={(e) => setSupplierFormData({...supplierFormData, soDienThoai: e.target.value})} required className="w-full border rounded-md px-3 py-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email liên hệ *</label>
                    <input type="email" value={supplierFormData.emailLienHe || ''} onChange={(e) => setSupplierFormData({...supplierFormData, emailLienHe: e.target.value})} required className="w-full border rounded-md px-3 py-2" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Địa chỉ *</label>
                    <input type="text" value={supplierFormData.diaChi || ''} onChange={(e) => setSupplierFormData({...supplierFormData, diaChi: e.target.value})} required className="w-full border rounded-md px-3 py-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Khả năng cung cấp</label>
                    <input type="text" value={supplierFormData.khaNang || ''} onChange={(e) => setSupplierFormData({...supplierFormData, khaNang: e.target.value})} className="w-full border rounded-md px-3 py-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Loại hình *</label>
                    <select value={supplierFormData.loaiHinh || 'Sản xuất'} onChange={(e) => setSupplierFormData({...supplierFormData, loaiHinh: e.target.value})} className="w-full border rounded-md px-3 py-2">
                      <option value="Sản xuất">Sản xuất</option>
                      <option value="Thương mại">Thương mại</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Trạng thái</label>
                    <select value={supplierFormData.trangThai || 'Đang cung cấp'} onChange={(e) => setSupplierFormData({...supplierFormData, trangThai: e.target.value})} className="w-full border rounded-md px-3 py-2">
                      <option value="Đang cung cấp">Đang cung cấp</option>
                      <option value="Ngừng cung cấp">Ngừng cung cấp</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Doanh chi (VNĐ)</label>
                    <input type="number" value={supplierFormData.doanhChi || 0} onChange={(e) => setSupplierFormData({...supplierFormData, doanhChi: parseFloat(e.target.value) || 0})} className="w-full border rounded-md px-3 py-2" />
                  </div>
                </div>
                <div className="flex justify-end gap-4 mt-6">
                  <button type="button" onClick={() => setIsAddSupplierModalOpen(false)} className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">Hủy</button>
                  <button type="submit" disabled={supplierFormLoading} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50">
                    {supplierFormLoading ? 'Đang lưu...' : 'Thêm mới'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Sửa nhà cung cấp */}
        {isEditSupplierModalOpen && editingSupplier && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b flex justify-between items-center sticky top-0 bg-white">
                <h2 className="text-xl font-semibold">Sửa nhà cung cấp - {editingSupplier.maNhaCungCap}</h2>
                <button onClick={() => { setIsEditSupplierModalOpen(false); setEditingSupplier(null); }} className="text-gray-500 hover:text-gray-700">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={(e) => { e.preventDefault(); handleEditSupplier(); }} className="p-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tên nhà cung cấp *</label>
                    <input type="text" value={supplierFormData.tenNhaCungCap || ''} onChange={(e) => setSupplierFormData({...supplierFormData, tenNhaCungCap: e.target.value})} required className="w-full border rounded-md px-3 py-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Loại cung cấp *</label>
                    <input type="text" value={supplierFormData.loaiCungCap || ''} onChange={(e) => setSupplierFormData({...supplierFormData, loaiCungCap: e.target.value})} required className="w-full border rounded-md px-3 py-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Quốc gia *</label>
                    <input type="text" value={supplierFormData.quocGia || ''} onChange={(e) => setSupplierFormData({...supplierFormData, quocGia: e.target.value})} required className="w-full border rounded-md px-3 py-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                    <input type="text" value={supplierFormData.website || ''} onChange={(e) => setSupplierFormData({...supplierFormData, website: e.target.value})} className="w-full border rounded-md px-3 py-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Người liên hệ *</label>
                    <input type="text" value={supplierFormData.nguoiLienHe || ''} onChange={(e) => setSupplierFormData({...supplierFormData, nguoiLienHe: e.target.value})} required className="w-full border rounded-md px-3 py-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Số điện thoại *</label>
                    <input type="text" value={supplierFormData.soDienThoai || ''} onChange={(e) => setSupplierFormData({...supplierFormData, soDienThoai: e.target.value})} required className="w-full border rounded-md px-3 py-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email liên hệ *</label>
                    <input type="email" value={supplierFormData.emailLienHe || ''} onChange={(e) => setSupplierFormData({...supplierFormData, emailLienHe: e.target.value})} required className="w-full border rounded-md px-3 py-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Địa chỉ *</label>
                    <input type="text" value={supplierFormData.diaChi || ''} onChange={(e) => setSupplierFormData({...supplierFormData, diaChi: e.target.value})} required className="w-full border rounded-md px-3 py-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Khả năng cung cấp</label>
                    <input type="text" value={supplierFormData.khaNang || ''} onChange={(e) => setSupplierFormData({...supplierFormData, khaNang: e.target.value})} className="w-full border rounded-md px-3 py-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Loại hình *</label>
                    <select value={supplierFormData.loaiHinh || 'Sản xuất'} onChange={(e) => setSupplierFormData({...supplierFormData, loaiHinh: e.target.value})} className="w-full border rounded-md px-3 py-2">
                      <option value="Sản xuất">Sản xuất</option>
                      <option value="Thương mại">Thương mại</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Trạng thái</label>
                    <select value={supplierFormData.trangThai || 'Đang cung cấp'} onChange={(e) => setSupplierFormData({...supplierFormData, trangThai: e.target.value})} className="w-full border rounded-md px-3 py-2">
                      <option value="Đang cung cấp">Đang cung cấp</option>
                      <option value="Ngừng cung cấp">Ngừng cung cấp</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Doanh chi (VNĐ)</label>
                    <input type="number" value={supplierFormData.doanhChi || 0} onChange={(e) => setSupplierFormData({...supplierFormData, doanhChi: parseFloat(e.target.value) || 0})} className="w-full border rounded-md px-3 py-2" />
                  </div>
                </div>
                <div className="flex justify-end gap-4 mt-6">
                  <button type="button" onClick={() => { setIsEditSupplierModalOpen(false); setEditingSupplier(null); }} className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">Hủy</button>
                  <button type="submit" disabled={supplierFormLoading} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50">
                    {supplierFormLoading ? 'Đang lưu...' : 'Lưu thay đổi'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal xác nhận xóa */}
        {deleteConfirmId && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Xác nhận xóa</h3>
              <p className="text-gray-600 mb-6">Bạn có chắc chắn muốn xóa nhà cung cấp này? Hành động này không thể hoàn tác.</p>
              <div className="flex justify-end gap-4">
                <button onClick={() => setDeleteConfirmId(null)} className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">Hủy</button>
                <button onClick={() => handleDeleteSupplier(deleteConfirmId)} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">Xóa</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PurchasingMaterials;
