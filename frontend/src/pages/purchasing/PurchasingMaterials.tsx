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
  X,
  Globe,
  Building2,
  CheckCircle
} from 'lucide-react';
import FileUpload from '../../components/FileUpload';
import OrderManagement from '../../components/OrderManagement';
import purchaseRequestService from '../../services/purchaseRequestService';
import { supplierService, Supplier, CreateSupplierData, UpdateSupplierData } from '../../services/supplierService';
import { parseNumberInput } from '../../utils/numberInput';
import { useAuth } from '../../contexts/AuthContext';
import { useSearchParams } from 'react-router-dom';

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
  ghiChuMuaHang?: string;
  fileKemTheo?: string;
  trangThai: string;
  nguoiDuyet?: string;
  ngayDuyet?: string;
  nhaCungCapId?: string;
  giaDuKien?: number;
  supplyRequestId?: string;
  createdAt: string;
  updatedAt: string;
  items?: { id: string; tenHangHoa: string; soLuong: number; donViTinh: string; phanLoai: string; giaDuKien?: number }[];
}

const VALID_TABS = ['suppliers', 'orderList', 'purchaseRequestList'] as const;
type TabType = typeof VALID_TABS[number];

const PurchasingMaterials = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    const tabParam = searchParams.get('tab') as TabType;
    return VALID_TABS.includes(tabParam) ? tabParam : 'suppliers';
  });

  useEffect(() => {
    const currentTab = searchParams.get('tab');
    if (currentTab !== activeTab) {
      const params: Record<string, string> = { tab: activeTab };
      const prId = searchParams.get('purchaseRequestId');
      if (prId) params.purchaseRequestId = prId;
      setSearchParams(params, { replace: true });
    }
  }, [activeTab]);

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

  // Open specific purchase request detail from URL param (e.g. from notification)
  useEffect(() => {
    const prId = searchParams.get('purchaseRequestId');
    if (prId) {
      setActiveTab('purchaseRequestList');
      purchaseRequestService.getPurchaseRequestById(prId).then((res) => {
        if (res.data) {
          setSelectedPurchaseRequest(res.data);
        }
      }).catch((err) => {
        console.error('Error loading purchase request from URL:', err);
      });
    }
  }, [searchParams]);

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
      const response = await supplierService.getAllSuppliers(supplierPage, 10, supplierSearch || undefined, 'NVL');
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
      const { code } = await supplierService.generateCode('NVL');
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
        phanLoaiNCC: 'NVL',
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
  const [editFormErrors, setEditFormErrors] = useState<{ nguoiDuyet?: string; ngayDuyet?: string; api?: string }>({});
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
    const currentUserName = user ? `${user.firstName} ${user.lastName}`.trim() : '';
    const today = new Date().toISOString();
    setEditingPurchaseRequest(item);
    setSelectedFile(null);
    setEditFormData({
      trangThai: item.trangThai,
      nhaCungCapId: item.nhaCungCapId || '',
      giaDuKien: item.giaDuKien,
      ghiChuMuaHang: item.ghiChuMuaHang || '',
      fileKemTheo: item.fileKemTheo || '',
      // Auto-fill người duyệt và ngày duyệt
      nguoiDuyet: item.nguoiDuyet || currentUserName,
      ngayDuyet: item.ngayDuyet || today,
    });
  };

  const closeEditPurchaseRequest = () => {
    setEditingPurchaseRequest(null);
    setEditFormData({});
    setSelectedFile(null);
    setEditFormErrors({});
  };



  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPurchaseRequest) return;
    setEditFormErrors({});
    setEditLoading(true);
    try {
      const dataToSend = {
        ...editFormData,
        file: selectedFile || undefined,
      };
      await purchaseRequestService.updatePurchaseRequest(editingPurchaseRequest.id, dataToSend);
      alert('Cập nhật thành công!');
      closeEditPurchaseRequest();
      fetchPurchaseRequests();
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'Lỗi hệ thống, vui lòng thử lại';
      setEditFormErrors({ api: message });
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

  const handleCompletePurchaseRequest = async (item: any) => {
    if (item.trangThai === 'Hoàn thành') {
      alert('Yêu cầu mua hàng này đã hoàn thành');
      return;
    }
    if (!window.confirm('Xác nhận đã mua hàng xong? Hệ thống sẽ thông báo cho kho chuẩn bị nhập hàng.')) {
      return;
    }
    try {
      await purchaseRequestService.updatePurchaseRequest(item.id, { trangThai: 'Hoàn thành' });
      alert('Đã hoàn thành! Kho đã được thông báo chuẩn bị nhập hàng.');
      fetchPurchaseRequests();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Lỗi khi cập nhật trạng thái');
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

        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 overflow-x-auto">
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
                <div className="flex items-center gap-2">
                  <button
                    onClick={async () => {
                      try {
                        await supplierService.exportToExcel({ search: supplierSearch || undefined, phanLoaiNCC: 'NVL' });
                      } catch (error) {
                        console.error('Error exporting to Excel:', error);
                        alert('Lỗi khi xuất Excel');
                      }
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                  >
                    <Download className="h-4 w-4" />
                    Xuất Excel
                  </button>
                  <button
                    onClick={openAddSupplierModal}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    <Plus className="h-4 w-4" />
                    Thêm nhà cung cấp
                  </button>
                </div>
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
                  <button
                    onClick={async () => {
                      try {
                        await purchaseRequestService.exportToExcel({ search: purchaseRequestSearch || undefined });
                      } catch (error) {
                        console.error('Error exporting to Excel:', error);
                        alert('Lỗi khi xuất Excel');
                      }
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                  >
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
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sản phẩm</th>
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
                          <td className="px-4 py-4 text-sm text-gray-900 max-w-xs">
                            {item.items && item.items.length > 0 ? (
                              <div className="space-y-0.5">
                                {item.items.map((subItem: any, i: number) => (
                                  <div key={i} className="text-xs">
                                    <span className="font-medium">{subItem.tenHangHoa}</span>
                                    <span className="text-gray-400 ml-1">x{subItem.soLuong} {subItem.donViTinh}</span>
                                    {subItem.giaDuKien && <span className="text-green-600 ml-1">{Number(subItem.giaDuKien).toLocaleString('vi-VN')}đ</span>}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-gray-400">{item.tenHangHoa || '-'}</span>
                            )}
                          </td>
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
                              item.trangThai === 'Hoàn thành' ? 'bg-emerald-100 text-emerald-800' :
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
                              {item.trangThai === 'Đã duyệt' && (
                                <button
                                  onClick={() => handleCompletePurchaseRequest(item)}
                                  className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-700 rounded hover:bg-emerald-100 border border-emerald-200 text-xs font-medium"
                                  title="Đã mua hàng xong - Thông báo kho nhập hàng"
                                >
                                  <CheckCircle className="w-3.5 h-3.5" />
                                  Đã mua xong
                                </button>
                              )}
                              {item.trangThai === 'Hoàn thành' && (
                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-50 text-gray-500 rounded text-xs">
                                  <CheckCircle className="w-3.5 h-3.5" />
                                  Đã hoàn thành
                                </span>
                              )}
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
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
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
                    <p className="text-sm text-gray-900">{selectedPurchaseRequest.phanLoai || '-'}</p>
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

                  {/* Items table */}
                  {selectedPurchaseRequest.items && selectedPurchaseRequest.items.length > 0 && (
                    <div className="bg-gray-50 p-4 rounded-lg col-span-2">
                      <label className="block text-sm font-medium text-gray-500 mb-2">Danh sách sản phẩm</label>
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="text-left py-2 px-2 font-medium text-gray-600">STT</th>
                            <th className="text-left py-2 px-2 font-medium text-gray-600">Phân loại</th>
                            <th className="text-left py-2 px-2 font-medium text-gray-600">Tên hàng hoá</th>
                            <th className="text-right py-2 px-2 font-medium text-gray-600">Số lượng</th>
                            <th className="text-left py-2 px-2 font-medium text-gray-600">ĐVT</th>
                            <th className="text-left py-2 px-2 font-medium text-gray-600">Nhà cung cấp</th>
                            <th className="text-right py-2 px-2 font-medium text-gray-600">Giá dự kiến</th>
                            <th className="text-right py-2 px-2 font-medium text-gray-600">Thành tiền</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedPurchaseRequest.items.map((item: any, i: number) => (
                            <tr key={i} className="border-b border-gray-100">
                              <td className="py-2 px-2">{i + 1}</td>
                              <td className="py-2 px-2">{item.phanLoai}</td>
                              <td className="py-2 px-2 font-medium">{item.tenHangHoa}</td>
                              <td className="py-2 px-2 text-right">{item.soLuong}</td>
                              <td className="py-2 px-2">{item.donViTinh}</td>
                              <td className="py-2 px-2 text-blue-600">{item.supplier?.tenNCC || '-'}</td>
                              <td className="py-2 px-2 text-right">{item.giaDuKien ? Number(item.giaDuKien).toLocaleString('vi-VN') + 'đ' : '-'}</td>
                              <td className="py-2 px-2 text-right font-medium">{item.giaDuKien ? (Number(item.giaDuKien) * item.soLuong).toLocaleString('vi-VN') + 'đ' : '-'}</td>
                            </tr>
                          ))}
                          <tr className="bg-gray-100 font-bold">
                            <td colSpan={7} className="py-2 px-2 text-right">Tổng cộng:</td>
                            <td className="py-2 px-2 text-right text-green-700">
                              {selectedPurchaseRequest.items.reduce((sum: number, item: any) => sum + (item.giaDuKien ? Number(item.giaDuKien) * item.soLuong : 0), 0).toLocaleString('vi-VN')}đ
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}
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

        {/* Xử lý yêu cầu mua hàng Modal */}
        {editingPurchaseRequest && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <form onSubmit={handleEditSubmit} className="p-6">
                {/* Header */}
                <div className="flex justify-between items-center mb-5">
                  <div>
                    <h2 className="text-xl font-bold text-gray-800">Xử lý yêu cầu mua hàng</h2>
                    <p className="text-sm text-gray-500 mt-0.5">{editingPurchaseRequest.maYeuCau}</p>
                  </div>
                  <button type="button" onClick={closeEditPurchaseRequest} className="text-gray-400 hover:text-gray-600">
                    <X className="w-6 h-6" />
                  </button>
                </div>

                {/* API error banner */}
                {editFormErrors.api && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-300 rounded-md flex items-start gap-2">
                    <svg className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-sm text-red-700">{editFormErrors.api}</p>
                  </div>
                )}

                {/* Section 1: Thông tin yêu cầu (read-only) */}
                <div className="bg-gray-50 rounded-lg p-4 mb-5">
                  <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">Thông tin yêu cầu</h3>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                    <div className="flex gap-2">
                      <span className="text-gray-500 flex-shrink-0">Người yêu cầu:</span>
                      <span className="font-medium text-gray-800">
                        {editingPurchaseRequest.tenNhanVien}
                        {editingPurchaseRequest.maNhanVien && (
                          <span className="text-gray-400 ml-1">({editingPurchaseRequest.maNhanVien})</span>
                        )}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-gray-500 flex-shrink-0">Ngày yêu cầu:</span>
                      <span className="font-medium text-gray-800">
                        {new Date(editingPurchaseRequest.ngayYeuCau).toLocaleDateString('vi-VN')}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-gray-500 flex-shrink-0">Mức độ ưu tiên:</span>
                      <span className={`font-medium ${
                        editingPurchaseRequest.mucDoUuTien === 'Cao' ? 'text-red-600' :
                        editingPurchaseRequest.mucDoUuTien === 'Trung bình' ? 'text-yellow-600' : 'text-green-600'
                      }`}>{editingPurchaseRequest.mucDoUuTien}</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-gray-500 flex-shrink-0">Phân loại:</span>
                      <span className="font-medium text-gray-800">{editingPurchaseRequest.phanLoai || '—'}</span>
                    </div>

                    {/* Hàng hóa: single item hoặc multi-item */}
                    {editingPurchaseRequest.items && editingPurchaseRequest.items.length > 0 ? (
                      <div className="col-span-2">
                        <span className="text-gray-500">Danh sách hàng hóa:</span>
                        <div className="mt-1 space-y-1">
                          {editingPurchaseRequest.items.map((item, i) => (
                            <div key={i} className="flex items-center gap-2 bg-white border border-gray-200 rounded px-3 py-1.5 text-xs">
                              <span className="font-medium text-gray-800">{item.tenHangHoa}</span>
                              <span className="text-gray-400">·</span>
                              <span className="text-gray-600">{item.soLuong} {item.donViTinh}</span>
                              {item.phanLoai && <><span className="text-gray-400">·</span><span className="text-gray-500">{item.phanLoai}</span></>}
                              {item.giaDuKien && <><span className="text-gray-400">·</span><span className="text-green-700">{Number(item.giaDuKien).toLocaleString('vi-VN')}đ</span></>}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="col-span-2 flex gap-2">
                          <span className="text-gray-500 flex-shrink-0">Hàng hóa:</span>
                          <span className="font-medium text-gray-800">
                            {editingPurchaseRequest.tenHangHoa || '—'}
                          </span>
                        </div>
                        {(editingPurchaseRequest.soLuong || editingPurchaseRequest.donViTinh) && (
                          <div className="flex gap-2">
                            <span className="text-gray-500 flex-shrink-0">Số lượng:</span>
                            <span className="font-medium text-gray-800">
                              {editingPurchaseRequest.soLuong} {editingPurchaseRequest.donViTinh}
                            </span>
                          </div>
                        )}
                      </>
                    )}

                    {editingPurchaseRequest.mucDichYeuCau && (
                      <div className="col-span-2 flex gap-2">
                        <span className="text-gray-500 flex-shrink-0">Mục đích:</span>
                        <span className="text-gray-700">{editingPurchaseRequest.mucDichYeuCau}</span>
                      </div>
                    )}
                    {editingPurchaseRequest.ghiChu && (
                      <div className="col-span-2 flex gap-2">
                        <span className="text-gray-500 flex-shrink-0">Ghi chú YC:</span>
                        <span className="text-gray-700 italic">{editingPurchaseRequest.ghiChu}</span>
                      </div>
                    )}

                    {/* Nhà cung cấp đã chọn trước đó */}
                    {editingPurchaseRequest.nhaCungCapId && (() => {
                      const sup = suppliers.find(s => s.id === editingPurchaseRequest.nhaCungCapId);
                      return sup ? (
                        <div className="flex gap-2">
                          <span className="text-gray-500 flex-shrink-0">NCC đã chọn:</span>
                          <span className="font-medium text-gray-800">{sup.tenNhaCungCap}</span>
                        </div>
                      ) : null;
                    })()}

                    {/* Giá dự kiến đã nhập */}
                    {editingPurchaseRequest.giaDuKien != null && (
                      <div className="flex gap-2">
                        <span className="text-gray-500 flex-shrink-0">Giá dự kiến:</span>
                        <span className="font-medium text-green-700">
                          {Number(editingPurchaseRequest.giaDuKien).toLocaleString('vi-VN')}đ
                        </span>
                      </div>
                    )}

                    {/* Ghi chú mua hàng đã nhập */}
                    {editingPurchaseRequest.ghiChuMuaHang && (
                      <div className="col-span-2 flex gap-2">
                        <span className="text-gray-500 flex-shrink-0">Ghi chú MH:</span>
                        <span className="text-gray-700 italic">{editingPurchaseRequest.ghiChuMuaHang}</span>
                      </div>
                    )}

                    {/* File đính kèm */}
                    {editingPurchaseRequest.fileKemTheo && (
                      <div className="col-span-2 flex gap-2">
                        <span className="text-gray-500 flex-shrink-0">File đính kèm:</span>
                        <a
                          href={editingPurchaseRequest.fileKemTheo}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline truncate text-xs"
                        >
                          {editingPurchaseRequest.fileKemTheo.split('/').pop()}
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                {/* Section 2: Xử lý thu mua (editable) */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Xử lý thu mua</h3>

                  {/* Trạng thái */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Trạng thái</label>
                    <select
                      value={editFormData.trangThai || ''}
                      onChange={(e) => {
                        const newStatus = e.target.value;
                        const currentUserName = user ? `${user.firstName} ${user.lastName}`.trim() : '';
                        setEditFormData(prev => ({
                          ...prev,
                          trangThai: newStatus,
                          nguoiDuyet: newStatus === 'Đã duyệt' ? (prev.nguoiDuyet || currentUserName) : prev.nguoiDuyet,
                          ngayDuyet: newStatus === 'Đã duyệt' ? (prev.ngayDuyet || new Date().toISOString()) : prev.ngayDuyet,
                        }));
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      <option value="Chờ duyệt">Chờ duyệt</option>
                      <option value="Đã duyệt">Đã duyệt</option>
                      <option value="Từ chối">Từ chối</option>
                      <option value="Hoàn thành">Hoàn thành</option>
                    </select>
                  </div>

                  {/* Thông tin duyệt — chỉ hiện khi chọn "Đã duyệt" */}
                  {editFormData.trangThai === 'Đã duyệt' && (
                    <div className="grid grid-cols-2 gap-4 bg-green-50 border border-green-200 rounded-md p-3">
                      <div>
                        <label className="block text-xs font-medium text-green-800 mb-1">Người duyệt</label>
                        <input
                          type="text"
                          value={editFormData.nguoiDuyet || ''}
                          readOnly
                          className="w-full px-3 py-2 border border-green-200 rounded-md bg-white text-sm text-gray-700 cursor-default"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-green-800 mb-1">Ngày duyệt</label>
                        <input
                          type="date"
                          value={editFormData.ngayDuyet ? new Date(editFormData.ngayDuyet).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]}
                          onChange={(e) => setEditFormData(prev => ({
                            ...prev,
                            ngayDuyet: e.target.value ? new Date(e.target.value).toISOString() : new Date().toISOString(),
                          }))}
                          className="w-full px-3 py-2 border border-green-200 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                        />
                      </div>
                    </div>
                  )}

                  {/* Nhà cung cấp */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nhà cung cấp</label>
                    <select
                      value={editFormData.nhaCungCapId || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, nhaCungCapId: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      <option value="">— Chưa chọn nhà cung cấp —</option>
                      {suppliers.map((s) => (
                        <option key={s.id} value={s.id}>{s.tenNhaCungCap}</option>
                      ))}
                    </select>
                  </div>

                  {/* Giá dự kiến */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Giá dự kiến (VNĐ)</label>
                    <input
                      type="number"
                      min={0}
                      value={editFormData.giaDuKien ?? ''}
                      onChange={(e) => setEditFormData({ ...editFormData, giaDuKien: e.target.value ? parseFloat(e.target.value) : undefined })}
                      placeholder="Nhập giá dự kiến..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>

                  {/* Ghi chú mua hàng */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú mua hàng</label>
                    <textarea
                      value={editFormData.ghiChuMuaHang || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, ghiChuMuaHang: e.target.value })}
                      rows={3}
                      placeholder="Ghi chú nội bộ của phòng thu mua..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>

                  {/* File đính kèm */}
                  <FileUpload
                    label="File đính kèm"
                    files={selectedFile ? [selectedFile] : []}
                    onChange={(files) => setSelectedFile(files[0] || null)}
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                    existingFileName={!selectedFile && editFormData.fileKemTheo ? editFormData.fileKemTheo : undefined}
                    existingFileUrl={!selectedFile && editFormData.fileKemTheo ? editFormData.fileKemTheo : undefined}
                    onRemoveExisting={() => setEditFormData({ ...editFormData, fileKemTheo: '' })}
                  />
                </div>

                <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
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
                    {editLoading ? 'Đang lưu...' : 'Lưu cập nhật'}
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
                    <input type="number" value={supplierFormData.doanhChi || 0} onChange={(e) => setSupplierFormData({...supplierFormData, doanhChi: parseNumberInput(e.target.value)})} className="w-full border rounded-md px-3 py-2" />
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
                    <input type="number" value={supplierFormData.doanhChi || 0} onChange={(e) => setSupplierFormData({...supplierFormData, doanhChi: parseNumberInput(e.target.value)})} className="w-full border rounded-md px-3 py-2" />
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
