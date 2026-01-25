import axios from 'axios';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1');

// Get auth token from localStorage
const getAuthToken = () => {
  return localStorage.getItem('accessToken');
};

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
    const token = getAuthToken();
    const response = await axios.get(`${API_URL}/generate-code`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  }

  // Create order from quotation
  async createOrderFromQuotation(quotationId: string) {
    const token = getAuthToken();
    const response = await axios.post(
      `${API_URL}/from-quotation`,
      { quotationId },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  }

  // Get all orders
  async getAllOrders(page: number = 1, limit: number = 10, search?: string, customerType?: string) {
    const token = getAuthToken();
    const params: any = { page, limit };
    if (search) params.search = search;
    if (customerType) params.customerType = customerType;

    const response = await axios.get(API_URL, {
      params,
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  }

  // Get order by ID
  async getOrderById(id: string) {
    const token = getAuthToken();
    const response = await axios.get(`${API_URL}/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  }

  // Update order
  async updateOrder(id: string, data: Partial<Order>) {
    const token = getAuthToken();
    const response = await axios.patch(`${API_URL}/${id}`, data, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  }

  // Update order item
  async updateOrderItem(itemId: string, data: { loaiHangHoa?: string }) {
    const token = getAuthToken();
    const response = await axios.patch(`${API_URL}/items/${itemId}`, data, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  }

  // Delete order
  async deleteOrder(id: string) {
    const token = getAuthToken();
    const response = await axios.delete(`${API_URL}/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  }
}

export const orderService = new OrderService();

