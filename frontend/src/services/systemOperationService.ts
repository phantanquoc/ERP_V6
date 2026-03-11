 import apiClient from './apiClient';

export interface GiaiDoan {
  thoiGian: number;
  nhietDo: number;
  apSuat: number;
}

export interface SystemOperation {
  id: string;
  maChien: string;
  tenMay: string;
  thoiGianChien: string;
  khoiLuongDauVao?: number;
  giaiDoan1: GiaiDoan;
  giaiDoan2: GiaiDoan;
  giaiDoan3: GiaiDoan;
  giaiDoan4: GiaiDoan;
  tongThoiGianSay: number;
  trangThai: 'DANG_HOAT_DONG' | 'BAO_TRI' | 'NGUNG_HOAT_DONG';
  ghiChu?: string;
  nguoiThucHien: string;
  materialEvaluationId?: string;
  createdAt?: string;
  updatedAt?: string;
}

class SystemOperationService {
  async getAllSystemOperations(page: number = 1, limit: number = 10, tenMay?: string): Promise<{ data: SystemOperation[], pagination: any }> {
    try {
      const params: any = { page, limit };
      if (tenMay) params.tenMay = tenMay;

       const response = await apiClient.get('/system-operations', {
        params,
      });
      return {
         data: (response.data as any[]).map(this.transformFromAPI),
         pagination: (response as any).pagination,
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getSystemOperationById(id: string): Promise<SystemOperation> {
    try {
       const response = await apiClient.get(`/system-operations/${id}`);
       return this.transformFromAPI(response.data);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async createBulkSystemOperations(maChien: string, thoiGianChien: string): Promise<SystemOperation[]> {
    try {
       const response = await apiClient.post('/system-operations/bulk', { maChien, thoiGianChien });
       return (response.data as any[]).map(this.transformFromAPI);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getSystemOperationsByMaChien(maChien: string): Promise<SystemOperation[]> {
    try {
       const response = await apiClient.get(`/system-operations/ma-chien/${maChien}`);
       return (response.data as any[]).map(this.transformFromAPI);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async createSystemOperation(data: Partial<SystemOperation>): Promise<SystemOperation> {
    try {
      const apiData = this.transformToAPI(data);
       const response = await apiClient.post('/system-operations', apiData);
       return this.transformFromAPI(response.data);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async updateSystemOperation(id: string, data: Partial<SystemOperation>): Promise<SystemOperation> {
    try {
      const apiData = this.transformToAPI(data);
       const response = await apiClient.patch(`/system-operations/${id}`, apiData);
       return this.transformFromAPI(response.data);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async deleteSystemOperation(id: string): Promise<void> {
    try {
       await apiClient.delete(`/system-operations/${id}`);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Transform from API format to frontend format
  private transformFromAPI(data: any): SystemOperation {
    return {
      id: data.id,
      maChien: data.maChien,
      tenMay: data.tenMay,
      thoiGianChien: data.thoiGianChien,
      khoiLuongDauVao: data.khoiLuongDauVao,
      giaiDoan1: {
        thoiGian: data.giaiDoan1ThoiGian,
        nhietDo: data.giaiDoan1NhietDo,
        apSuat: data.giaiDoan1ApSuat,
      },
      giaiDoan2: {
        thoiGian: data.giaiDoan2ThoiGian,
        nhietDo: data.giaiDoan2NhietDo,
        apSuat: data.giaiDoan2ApSuat,
      },
      giaiDoan3: {
        thoiGian: data.giaiDoan3ThoiGian,
        nhietDo: data.giaiDoan3NhietDo,
        apSuat: data.giaiDoan3ApSuat,
      },
      giaiDoan4: {
        thoiGian: data.giaiDoan4ThoiGian,
        nhietDo: data.giaiDoan4NhietDo,
        apSuat: data.giaiDoan4ApSuat,
      },
      tongThoiGianSay: data.tongThoiGianSay,
      trangThai: data.trangThai,
      ghiChu: data.ghiChu,
      nguoiThucHien: data.nguoiThucHien,
      materialEvaluationId: data.materialEvaluationId,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  }

  // Transform from frontend format to API format
  private transformToAPI(data: Partial<SystemOperation>): any {
    return {
      maChien: data.maChien,
      tenMay: data.tenMay,
      thoiGianChien: data.thoiGianChien,
      khoiLuongDauVao: data.khoiLuongDauVao,
      giaiDoan1ThoiGian: data.giaiDoan1?.thoiGian,
      giaiDoan1NhietDo: data.giaiDoan1?.nhietDo,
      giaiDoan1ApSuat: data.giaiDoan1?.apSuat,
      giaiDoan2ThoiGian: data.giaiDoan2?.thoiGian,
      giaiDoan2NhietDo: data.giaiDoan2?.nhietDo,
      giaiDoan2ApSuat: data.giaiDoan2?.apSuat,
      giaiDoan3ThoiGian: data.giaiDoan3?.thoiGian,
      giaiDoan3NhietDo: data.giaiDoan3?.nhietDo,
      giaiDoan3ApSuat: data.giaiDoan3?.apSuat,
      giaiDoan4ThoiGian: data.giaiDoan4?.thoiGian,
      giaiDoan4NhietDo: data.giaiDoan4?.nhietDo,
      giaiDoan4ApSuat: data.giaiDoan4?.apSuat,
      trangThai: data.trangThai,
      ghiChu: data.ghiChu,
      nguoiThucHien: data.nguoiThucHien,
      materialEvaluationId: data.materialEvaluationId,
    };
  }

  private handleError(error: any): Error {
     if (error instanceof Error) {
       const message = error.message;
      return new Error(message);
    }
    return error;
  }
}

export default new SystemOperationService();
