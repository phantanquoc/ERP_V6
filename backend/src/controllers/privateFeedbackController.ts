import { Request, Response } from 'express';
import { privateFeedbackService } from '../services/privateFeedbackService';
import { FeedbackType, FeedbackStatus } from '@prisma/client';

export const privateFeedbackController = {
  // GET /api/private-feedbacks - Lấy tất cả feedback
  async getAll(req: Request, res: Response) {
    try {
      const {
        page = '1',
        limit = '10',
        search,
        type,
        status,
        userId
      } = req.query;

      const result = await privateFeedbackService.getAll({
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        search: search as string,
        type: type as FeedbackType,
        status: status as FeedbackStatus,
        userId: userId as string
      });

      res.json({
        success: true,
        message: 'Lấy danh sách feedback thành công',
        data: result.data,
        pagination: result.pagination
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy danh sách feedback',
        error: error.message
      });
    }
  },

  // GET /api/private-feedbacks/:id - Lấy feedback theo ID
  async getById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const feedback = await privateFeedbackService.getById(id);

      res.json({
        success: true,
        message: 'Lấy feedback thành công',
        data: feedback
      });
    } catch (error: any) {
      res.status(404).json({
        success: false,
        message: error.message
      });
    }
  },

  // GET /api/private-feedbacks/code/:code - Lấy feedback theo code
  async getByCode(req: Request, res: Response) {
    try {
      const { code } = req.params;
      const feedback = await privateFeedbackService.getByCode(code);

      res.json({
        success: true,
        message: 'Lấy feedback thành công',
        data: feedback
      });
    } catch (error: any) {
      res.status(404).json({
        success: false,
        message: error.message
      });
    }
  },

  // POST /api/private-feedbacks/generate-code - Tạo mã tự động
  async generateCode(req: Request, res: Response): Promise<void> {
    try {
      const { type } = req.body;

      if (!type || !['GOP_Y', 'NEU_KHO_KHAN'].includes(type)) {
        res.status(400).json({
          success: false,
          message: 'Type không hợp lệ. Phải là GOP_Y hoặc NEU_KHO_KHAN'
        });
        return;
      }

      const code = await privateFeedbackService.generateCode(type as FeedbackType);

      res.json({
        success: true,
        message: 'Tạo mã thành công',
        data: { code }
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Lỗi khi tạo mã',
        error: error.message
      });
    }
  },

  // POST /api/private-feedbacks - Tạo feedback mới
  async create(req: Request, res: Response): Promise<void> {
    try {
      const { type, content, notes, purpose, solution } = req.body;
      const userId = (req as any).user.id; // Từ auth middleware

      // Validation
      if (!type || !['GOP_Y', 'NEU_KHO_KHAN'].includes(type)) {
        res.status(400).json({
          success: false,
          message: 'Type không hợp lệ'
        });
        return;
      }

      if (!content) {
        res.status(400).json({
          success: false,
          message: 'Nội dung không được để trống'
        });
        return;
      }

      // Lấy file paths từ uploaded files
      const files = (req as any).files || [];
      const attachments = files.map((file: any) => `/uploads/feedbacks/${file.filename}`);

      const feedback = await privateFeedbackService.create({
        type: type as FeedbackType,
        userId,
        content,
        notes,
        purpose,
        solution,
        attachments
      });

      res.status(201).json({
        success: true,
        message: 'Tạo feedback thành công',
        data: feedback
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Lỗi khi tạo feedback',
        error: error.message
      });
    }
  },

  // PATCH /api/private-feedbacks/:id - Cập nhật feedback
  async update(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { content, notes, purpose, solution, attachments, status, response, respondedBy } = req.body;

      const updateData: any = {
        content,
        notes,
        purpose,
        solution,
        attachments,
        status
      };

      // Nếu có response, thêm thông tin người phản hồi
      if (response) {
        updateData.response = response;
        updateData.respondedBy = respondedBy || (req as any).user.id;
        updateData.respondedAt = new Date();
      }

      const feedback = await privateFeedbackService.update(id, updateData);

      res.json({
        success: true,
        message: 'Cập nhật feedback thành công',
        data: feedback
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Lỗi khi cập nhật feedback',
        error: error.message
      });
    }
  },

  // DELETE /api/private-feedbacks/:id - Xóa feedback
  async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await privateFeedbackService.delete(id);

      res.json({
        success: true,
        message: 'Xóa feedback thành công'
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Lỗi khi xóa feedback',
        error: error.message
      });
    }
  },

  // GET /api/private-feedbacks/stats - Thống kê
  async getStats(req: Request, res: Response) {
    try {
      const { userId } = req.query;
      const stats = await privateFeedbackService.getStats(userId as string);

      res.json({
        success: true,
        message: 'Lấy thống kê thành công',
        data: stats
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy thống kê',
        error: error.message
      });
    }
  }
};

