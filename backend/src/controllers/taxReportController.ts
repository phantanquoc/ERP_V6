import { Request, Response, NextFunction } from 'express';
import taxReportService from '../services/taxReportService';
import { getFileUrl } from '../middlewares/upload';

interface RequestWithFile extends Request {
  file?: Express.Multer.File;
}

export class TaxReportController {
  // Get all tax reports
  async getAllTaxReports(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = req.query.search as string;
      const month = req.query.month ? parseInt(req.query.month as string) : undefined;
      const year = req.query.year ? parseInt(req.query.year as string) : undefined;

      const result = await taxReportService.getAllTaxReports(page, limit, search, month, year);

      return res.json({
        success: true,
        message: 'Tax reports retrieved successfully',
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error) {
      return next(error);
    }
  }

  // Get tax report by ID
  async getTaxReportById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const taxReport = await taxReportService.getTaxReportById(id);

      if (!taxReport) {
        return res.status(404).json({
          success: false,
          message: 'Tax report not found',
        });
      }

      return res.json({
        success: true,
        message: 'Tax report retrieved successfully',
        data: taxReport,
      });
    } catch (error) {
      return next(error);
    }
  }

  // Get tax report by order ID
  async getTaxReportByOrderId(req: Request, res: Response, next: NextFunction) {
    try {
      const orderId = req.params.orderId as string;
      const taxReport = await taxReportService.getTaxReportByOrderId(orderId);

      if (!taxReport) {
        return res.status(404).json({
          success: false,
          message: 'Tax report not found for this order',
        });
      }

      return res.json({
        success: true,
        message: 'Tax report retrieved successfully',
        data: taxReport,
      });
    } catch (error) {
      return next(error);
    }
  }

  // Create tax report from order
  async createTaxReportFromOrder(req: RequestWithFile, res: Response, next: NextFunction) {
    try {
      const orderId = req.params.orderId as string;
      const input = req.body;

      // Handle file upload
      if (req.file) {
        input.fileUrl = getFileUrl('tax-reports', req.file.filename);
      }

      const taxReport = await taxReportService.createTaxReportFromOrder(orderId, input);

      return res.status(201).json({
        success: true,
        message: 'Tax report created successfully',
        data: taxReport,
      });
    } catch (error) {
      return next(error);
    }
  }

  // Update tax report
  async updateTaxReport(req: RequestWithFile, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const input = req.body;

      // Handle file upload
      if (req.file) {
        input.fileUrl = getFileUrl('tax-reports', req.file.filename);
      }

      const taxReport = await taxReportService.updateTaxReport(id, input);

      return res.json({
        success: true,
        message: 'Tax report updated successfully',
        data: taxReport,
      });
    } catch (error) {
      return next(error);
    }
  }

  // Delete tax report
  async deleteTaxReport(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;

      await taxReportService.deleteTaxReport(id);

      return res.json({
        success: true,
        message: 'Tax report deleted successfully',
      });
    } catch (error) {
      return next(error);
    }
  }

  // Export tax reports to Excel
  async exportTaxReportsToExcel(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const filters: any = {};
      if (req.query.search) filters.search = req.query.search as string;
      const buffer = await taxReportService.exportToExcel(filters);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=bao-cao-thue-${Date.now()}.xlsx`);
      res.send(buffer);
    } catch (error) {
      next(error);
    }
  }
}

export default new TaxReportController();
