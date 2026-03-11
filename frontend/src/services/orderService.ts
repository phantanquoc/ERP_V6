import apiClient from './apiClient';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export interface OrderItem {
  id: string;
  productId: string;
  maSanPham: string;
  tenHangHoa: string;
  yeuCauHangHoa?: string;
  loaiHangHoa?: string;
  dongGoi?: string;
  soLuong: number;
  donVi: string;
}

export interface Order {
  id: string;
  maDonHang: string;
  ngayDatHang: string;
  quotationId: string;
  maBaoGia: string;
  quotationRequestId: string;
  maYeuCauBaoGia: string;
  customerId: string;
  maKhachHang: string;
  tenKhachHang: string;
  employeeId?: string;
  tenNhanVien?: string;
  giaTriDonHangUSD?: number;
  giaTriDonHangVND?: number;
  xuatKhauDot1USD?: number;
  noiDiaDot1VND?: number;
  ngayThanhToanDot1?: string;
  xuatKhauDot2USD?: number;
  noiDiaDot2VND?: number;
  ngayThanhToanDot2?: string;
  ngayBatDauSanXuatKeHoach?: string;
  ngayHoanThanhSanXuatKeHoach?: string;
  ngayHoanThanhThucTe?: string;
  ngayGiaoHang?: string;
  trangThaiSanXuat?: string;
  trangThaiThanhToan?: string;
  ghiChu?: string;
  fileDinhKem?: string;
  items: OrderItem[];
  createdAt: string;
  updatedAt: string;
}

class OrderService {
  // Generate order code
  async generateOrderCode() {
    const response = await apiClient.get('/orders/generate-code');
    return response;
  }

  // Create order from quotation
  async createOrderFromQuotation(quotationId: string, file?: File) {
    if (file) {
      const formData = new FormData();
      formData.append('quotationId', quotationId);
      formData.append('file', file);
      const response = await apiClient.post('/orders/from-quotation', formData);
      return response;
    }
    const response = await apiClient.post('/orders/from-quotation', { quotationId });
    return response;
  }

  // Get all orders
  async getAllOrders(page: number = 1, limit: number = 10, search?: string, customerType?: string) {
    const params: any = { page, limit };
    if (search) params.search = search;
    if (customerType) params.customerType = customerType;

    const response = await apiClient.get('/orders', { params });
    return response;
  }

  // Get order by ID
  async getOrderById(id: string) {
    const response = await apiClient.get(`/orders/${id}`);
    return response;
  }

  // Update order
  async updateOrder(id: string, data: Partial<Order>, file?: File) {
    if (file) {
      const formData = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== null && key !== 'items') {
          formData.append(key, typeof value === 'object' ? JSON.stringify(value) : value.toString());
        }
      });
      formData.append('file', file);
      const response = await apiClient.patch(`/orders/${id}`, formData);
      return response;
    }
    const response = await apiClient.patch(`/orders/${id}`, data);
    return response;
  }

  // Update order item
  async updateOrderItem(itemId: string, data: { loaiHangHoa?: string }) {
    const response = await apiClient.patch(`/orders/items/${itemId}`, data);
    return response;
  }

  // Delete order
  async deleteOrder(id: string) {
    const response = await apiClient.delete(`/orders/${id}`);
    return response;
  }

  // Export orders to Excel
  async exportToExcel(filters?: { search?: string }): Promise<void> {
    const token = localStorage.getItem('accessToken');
    const params = new URLSearchParams();
    if (filters?.search) params.append('search', filters.search);
    const url = `${API_BASE_URL}/orders/export/excel${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error('Failed to export to Excel');
    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `danh-sach-don-hang-${Date.now()}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  }
}

export const orderService = new OrderService();

