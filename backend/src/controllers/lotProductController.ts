import { Request, Response, NextFunction } from 'express';
import lotProductService from '@services/lotProductService';

export class LotProductController {
  async getAllLotProducts(req: Request, res: Response, next: NextFunction) {
    try {
      const page = req.query.page ? parseInt(req.query.page as string) : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;

      const result = await lotProductService.getAll(page, limit);
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  async addProductToLot(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { lotId, internationalProductId, soLuong, donViTinh } = req.body;

      if (!lotId || !internationalProductId || soLuong === undefined || soLuong === null || !donViTinh) {
        res.status(400).json({ success: false, message: 'Thiếu thông tin bắt buộc' });
        return;
      }

      const lotProduct = await lotProductService.addProduct({ lotId, internationalProductId, soLuong, donViTinh });
      res.status(201).json({ success: true, data: lotProduct, message: 'Thêm sản phẩm vào lô thành công' });
    } catch (error: any) {
      if (error.status === 400) {
        res.status(400).json({ success: false, message: error.message });
        return;
      }
      next(error);
    }
  }

  async removeProductFromLot(req: Request, res: Response, next: NextFunction) {
    try {
      await lotProductService.remove(req.params.id);
      res.json({ success: true, message: 'Xóa sản phẩm khỏi lô thành công' });
    } catch (error) {
      next(error);
    }
  }

  async moveProductBetweenLots(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { lotProductId, targetLotId } = req.body;

      if (!lotProductId || !targetLotId) {
        res.status(400).json({ success: false, message: 'Thiếu thông tin bắt buộc' });
        return;
      }

      const result = await lotProductService.moveBetweenLots(lotProductId, targetLotId);
      res.json({ success: true, ...result });
    } catch (error: any) {
      if (error.status === 404) {
        res.status(404).json({ success: false, message: error.message });
        return;
      }
      next(error);
    }
  }

  async updateProductQuantity(req: Request, res: Response, next: NextFunction) {
    try {
      const { maKien, soLuong, donViTinh, giaThanh, slotId } = req.body;
      const lotProduct = await lotProductService.updateLotProduct(req.params.id, { maKien, soLuong, donViTinh, giaThanh, slotId });
      res.json({ success: true, data: lotProduct, message: 'Cập nhật kiện thành công' });
    } catch (error) {
      next(error);
    }
  }

  async getLotsByProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const internationalProductId = req.query.internationalProductId as string;

      if (!internationalProductId) {
        res.status(400).json({ success: false, message: 'internationalProductId là bắt buộc' });
        return;
      }

      const data = await lotProductService.getLotsByProduct(internationalProductId);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getKienByProductAndLot(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const internationalProductId = req.query.internationalProductId as string;
      const lotId = req.query.lotId as string;

      if (!internationalProductId || !lotId) {
        res.status(400).json({ success: false, message: 'internationalProductId và lotId là bắt buộc' });
        return;
      }

      const data = await lotProductService.getKienByProductAndLot(internationalProductId, lotId);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async checkStockByNames(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rawBody = req.body?.names;
      const rawQuery = req.query.names as string | undefined;
      let names: string[] = [];
      if (Array.isArray(rawBody)) {
        names = rawBody;
      } else if (typeof rawBody === 'string' && rawBody.trim()) {
        names = [rawBody.trim()];
      } else if (typeof rawQuery === 'string' && rawQuery.trim()) {
        names = rawQuery.split(',').map((s) => s.trim()).filter(Boolean);
      }
      const clean = names.map((s) => String(s).trim()).filter(Boolean);
      if (clean.length === 0) {
        res.json({ success: true, data: [] });
        return;
      }
      if (clean.length > 200) {
        res.status(400).json({ success: false, message: 'Tối đa 200 tên sản phẩm' });
        return;
      }
      const data = await lotProductService.checkStockByNames(clean);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

}

export default new LotProductController();
