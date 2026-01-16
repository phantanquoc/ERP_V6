import api from './apiClient';

export interface CustomerFeedback {
  id: string;
  customerId: string;
  ngayPhanHoi: string;
  loaiPhanHoi: string;
  mucDoNghiemTrong: string;
  noiDungPhanHoi: string;
  sanPhamLienQuan?: string;
  donHangLienQuan?: string;
  nguoiTiepNhan?: string;
  trangThaiXuLy: string;
  bienPhapXuLy?: string;
  ketQuaXuLy?: string;
  ngayXuLyXong?: string;
  mucDoHaiLong?: string;
  ghiChu?: string;
  createdAt?: string;
  updatedAt?: string;
  customer?: {
    id: string;
    tenCongTy: string;
    quocGia: string;
  };
}

class CustomerFeedbackService {
  async getAllFeedbacks(filters?: {
    trangThaiXuLy?: string;
    loaiPhanHoi?: string;
    mucDoNghiemTrong?: string;
    search?: string;
  }): Promise<CustomerFeedback[]> {
    const params = new URLSearchParams();
    if (filters?.trangThaiXuLy) params.append('trangThaiXuLy', filters.trangThaiXuLy);
    if (filters?.loaiPhanHoi) params.append('loaiPhanHoi', filters.loaiPhanHoi);
    if (filters?.mucDoNghiemTrong) params.append('mucDoNghiemTrong', filters.mucDoNghiemTrong);
    if (filters?.search) params.append('search', filters.search);

    const response = await api.get<CustomerFeedback[]>(`/customer-feedbacks?${params.toString()}`);
    return response.data || [];
  }

  async getFeedbackById(id: string): Promise<CustomerFeedback> {
    const response = await api.get<CustomerFeedback>(`/customer-feedbacks/${id}`);
    return response.data!;
  }

  async createFeedback(data: Partial<CustomerFeedback>): Promise<CustomerFeedback> {
    const response = await api.post<CustomerFeedback>('/customer-feedbacks', data);
    return response.data!;
  }

  async updateFeedback(id: string, data: Partial<CustomerFeedback>): Promise<CustomerFeedback> {
    const response = await api.put<CustomerFeedback>(`/customer-feedbacks/${id}`, data);
    return response.data!;
  }

  async deleteFeedback(id: string): Promise<void> {
    await api.delete(`/customer-feedbacks/${id}`);
  }

  async getStatistics(): Promise<any> {
    const response = await api.get<any>('/customer-feedbacks/statistics/summary');
    return response.data;
  }
}

export default new CustomerFeedbackService();

