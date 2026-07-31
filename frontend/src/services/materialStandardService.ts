import apiClient from './apiClient';

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/** Sản phẩm đã link từ danh mục — dùng để suy loại định mức và hiển thị loại hàng hóa. */
export interface LinkedProduct {
  id: string;
  tenSanPham: string;
  loaiSanPham: string | null;
}

export interface MaterialStandardItem {
  id?: string;
  tenThanhPham: string;
  tiLe: number;
  internationalProductId?: string | null;
  internationalProduct?: LinkedProduct | null;
}

export interface MaterialStandardInputItem {
  id?: string;
  tenNguyenLieu: string;
  tiLe: number;
  internationalProductId?: string | null;
  internationalProduct?: LinkedProduct | null;
}

export interface MaterialStandard {
  id: string;
  maDinhMuc: string;
  /** Tên thành phẩm đầu ra */
  tenDinhMuc: string;
  /** Sinh tự động ở backend, vd "Nguyên liệu → Thành phẩm" */
  loaiDinhMuc?: string | null;
  /** Số kg nguyên liệu cần để tạo ra 1 kg thành phẩm */
  kgNguyenLieuTren1KgThanhPham?: number | null;
  ghiChu?: string;
  createdAt: string;
  updatedAt: string;
  items?: MaterialStandardItem[];
  inputItems?: MaterialStandardInputItem[];
}

interface CreateMaterialStandardRequest {
  maDinhMuc: string;
  tenDinhMuc: string;
  kgNguyenLieuTren1KgThanhPham?: number;
  ghiChu?: string;
  items?: MaterialStandardItem[];
  inputItems?: MaterialStandardInputItem[];
}

interface UpdateMaterialStandardRequest {
  tenDinhMuc?: string;
  kgNguyenLieuTren1KgThanhPham?: number | null;
  ghiChu?: string;
  items?: MaterialStandardItem[];
  inputItems?: MaterialStandardInputItem[];
}

class MaterialStandardService {
  async getAllMaterialStandards(page: number = 1, limit: number = 10): Promise<PaginatedResponse<MaterialStandard>> {
    try {
      const response = await apiClient.get<PaginatedResponse<MaterialStandard>>('/material-standards', { params: { page, limit } });
      return response as unknown as PaginatedResponse<MaterialStandard>;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getMaterialStandardById(id: string): Promise<MaterialStandard> {
    try {
      const response = await apiClient.get<MaterialStandard>(`/material-standards/${id}`);
      return response.data as MaterialStandard;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async createMaterialStandard(data: CreateMaterialStandardRequest): Promise<MaterialStandard> {
    try {
      const response = await apiClient.post<MaterialStandard>('/material-standards', data as Record<string, any>);
      return response.data as MaterialStandard;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async updateMaterialStandard(id: string, data: UpdateMaterialStandardRequest): Promise<MaterialStandard> {
    try {
      const response = await apiClient.patch<MaterialStandard>(`/material-standards/${id}`, data as Record<string, any>);
      return response.data as MaterialStandard;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async deleteMaterialStandard(id: string): Promise<void> {
    try {
      await apiClient.delete(`/material-standards/${id}`);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async generateMaterialStandardCode(): Promise<string> {
    try {
      const response = await apiClient.post<any>('/material-standards/generate-code', {});
      return (response.data as any).code;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  private handleError(error: any): Error {
    if (error instanceof Error) {
      return error;
    }
    return new Error('An unexpected error occurred');
  }
}

export default new MaterialStandardService();
export type { CreateMaterialStandardRequest, UpdateMaterialStandardRequest };

