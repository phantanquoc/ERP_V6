import { Request, Response } from 'express';
import taxReportService from '../services/taxReportService';
import { getFileUrl } from '../middlewares/upload';

interface RequestWithFile extends Request {
  file?: Express.Multer.File;
}

// Get all tax reports
export const getAllTaxReports = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string;

    const result = await taxReportService.getAllTaxReports(page, limit, search);

    return res.json({
      success: true,
      message: 'Tax reports retrieved successfully',
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error: any) {
    console.error('Error getting tax reports:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get tax reports',
      error: error.message,
    });
  }
};

// Get tax report by ID
export const getTaxReportById = async (req: Request, res: Response) => {
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
  } catch (error: any) {
    console.error('Error getting tax report:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get tax report',
      error: error.message,
    });
  }
};

// Get tax report by order ID
export const getTaxReportByOrderId = async (req: Request, res: Response) => {
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
  } catch (error: any) {
    console.error('Error getting tax report by order:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get tax report',
      error: error.message,
    });
  }
};

// Create tax report from order
export const createTaxReportFromOrder = async (req: RequestWithFile, res: Response) => {
  try {
    const orderId = req.params.orderId as string;
    const input = req.body;

    // Handle file upload
    if (req.file) {
      input.fileDinhKem = getFileUrl('tax-reports', req.file.filename);
    }

    const taxReport = await taxReportService.createTaxReportFromOrder(orderId, input);

    return res.status(201).json({
      success: true,
      message: 'Tax report created successfully',
      data: taxReport,
    });
  } catch (error: any) {
    console.error('Error creating tax report:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create tax report',
      error: error.message,
    });
  }
};

// Update tax report
export const updateTaxReport = async (req: RequestWithFile, res: Response) => {
  try {
    const id = req.params.id as string;
    const input = req.body;

    // Handle file upload
    if (req.file) {
      input.fileDinhKem = getFileUrl('tax-reports', req.file.filename);
    }

    const taxReport = await taxReportService.updateTaxReport(id, input);

    return res.json({
      success: true,
      message: 'Tax report updated successfully',
      data: taxReport,
    });
  } catch (error: any) {
    console.error('Error updating tax report:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update tax report',
      error: error.message,
    });
  }
};

// Delete tax report
export const deleteTaxReport = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;

    await taxReportService.deleteTaxReport(id);

    return res.json({
      success: true,
      message: 'Tax report deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting tax report:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete tax report',
      error: error.message,
    });
  }
};

