import { Response, NextFunction } from 'express';
import internationalProductService, {
  ProductSortField,
  ProductListFilters,
} from '@services/internationalProductService';
import { AuthenticatedRequest, ApiResponse } from '@types';

export class InternationalProductController {
  async getAllProducts(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = req.query.search as string;
      const loaiSanPham = req.query.loaiSanPham as string;

      const result = await internationalProductService.getAllProducts(page, limit, search, loaiSanPham, {
        maSanPham: req.query.maSanPham as string | undefined,
        tenSanPham: req.query.tenSanPham as string | undefined,
        donViTinh: req.query.donViTinh as string | undefined,
        // Validated against a whitelist in the service, not here.
        sortBy: req.query.sortBy as ProductSortField | undefined,
        sortOrder: req.query.sortOrder as 'asc' | 'desc' | undefined,
      });

      const response: ApiResponse<any> = {
        success: true,
        data: result.data,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages,
        },
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  async getProductById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const product = await internationalProductService.getProductById(id);

      const response: ApiResponse<any> = {
        success: true,
        data: product,
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  async getProductByCode(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const code = req.params.code as string;
      const product = await internationalProductService.getProductByCode(code);

      const response: ApiResponse<any> = {
        success: true,
        data: product,
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  async createProduct(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const product = await internationalProductService.createProduct(req.body);

      const response: ApiResponse<any> = {
        success: true,
        data: product,
        message: 'Product created successfully',
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }

  async updateProduct(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const product = await internationalProductService.updateProduct(id, req.body);

      const response: ApiResponse<any> = {
        success: true,
        data: product,
        message: 'Product updated successfully',
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  async deleteProduct(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      await internationalProductService.deleteProduct(id);

      const response: ApiResponse<any> = {
        success: true,
        message: 'Product deleted successfully',
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  async generateProductCode(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      // Both are query params: the code is derived from the product name and its
      // category, so the client asks for a suggestion as the user fills the form.
      const { tenSanPham, loaiSanPham } = req.query as Record<string, string | undefined>;
      const code = await internationalProductService.generateProductCode(tenSanPham, loaiSanPham);

      const response: ApiResponse<any> = {
        success: true,
        data: { code },
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  async exportToExcel(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      // Same params as the list endpoint, so the export matches the current view.
      const filters: ProductListFilters = {
        search: (req.query.search as string) || undefined,
        loaiSanPham: (req.query.loaiSanPham as string) || undefined,
        maSanPham: (req.query.maSanPham as string) || undefined,
        tenSanPham: (req.query.tenSanPham as string) || undefined,
        donViTinh: (req.query.donViTinh as string) || undefined,
        sortBy: req.query.sortBy as ProductSortField | undefined,
        sortOrder: req.query.sortOrder as 'asc' | 'desc' | undefined,
      };

      const buffer = await internationalProductService.exportToExcel(filters);

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=san-pham-quoc-te-${Date.now()}.xlsx`);
      res.send(buffer);
    } catch (error) {
      next(error);
    }
  }
  async getStockSummary(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const stock = await internationalProductService.getStockSummary(id);

      const response: ApiResponse<any> = {
        success: true,
        data: stock,
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  async getCategories(_req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const categories = await internationalProductService.getCategories();

      res.json({
        success: true,
        data: categories,
      });
    } catch (error) {
      next(error);
    }
  }

  async addCategory(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { name } = req.body;
      const category = await internationalProductService.addCategory(name);

      res.status(201).json({
        success: true,
        data: category,
        message: 'Đã thêm loại hàng hóa',
      });
    } catch (error) {
      next(error);
    }
  }

  /** Preview of what a category rename does to product codes — writes nothing. */
  async previewRenameCategory(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { oldName, newName } = req.body;
      const preview = await internationalProductService.previewRenameCategory(oldName, newName);

      res.json({
        success: true,
        data: preview,
      });
    } catch (error) {
      next(error);
    }
  }

  async renameCategory(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { oldName, newName } = req.body;
      const { count, codesUpdated } = await internationalProductService.renameCategory(oldName, newName);

      const message = codesUpdated > 0
        ? `Đã cập nhật ${count} hàng hóa, trong đó ${codesUpdated} mã được đổi theo tên loại mới`
        : `Đã cập nhật ${count} hàng hóa`;

      res.json({
        success: true,
        data: { count, codesUpdated },
        message,
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteCategory(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { name } = req.body;
      const count = await internationalProductService.deleteCategory(name);

      res.json({
        success: true,
        data: { count },
        message: `Đã xóa loại hàng hóa và cập nhật ${count} sản phẩm`,
      });
    } catch (error) {
      next(error);
    }
  }

  async getRawMaterials(_req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await internationalProductService.getRawMaterials();
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
}

export default new InternationalProductController();

