import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface CreateCustomerFeedbackData {
  customerId: string;
  loaiPhanHoi: string;
  mucDoNghiemTrong: string;
  noiDungPhanHoi: string;
  sanPhamLienQuan?: string;
  donHangLienQuan?: string;
  nguoiTiepNhan?: string;
  ghiChu?: string;
}

interface UpdateCustomerFeedbackData {
  loaiPhanHoi?: string;
  mucDoNghiemTrong?: string;
  noiDungPhanHoi?: string;
  sanPhamLienQuan?: string;
  donHangLienQuan?: string;
  nguoiTiepNhan?: string;
  trangThaiXuLy?: string;
  bienPhapXuLy?: string;
  ketQuaXuLy?: string;
  ngayXuLyXong?: Date;
  mucDoHaiLong?: string;
  ghiChu?: string;
}

interface GetAllFilters {
  trangThaiXuLy?: string;
  loaiPhanHoi?: string;
  mucDoNghiemTrong?: string;
  search?: string;
}

export const customerFeedbackService = {
  // Create new feedback
  async createFeedback(data: CreateCustomerFeedbackData) {
    try {
      const feedback = await prisma.customerFeedback.create({
        data: {
          ...data,
          ngayPhanHoi: new Date(),
        },
        include: {
          customer: true,
        },
      });
      return feedback;
    } catch (error) {
      throw error;
    }
  },

  // Get all feedbacks with filters
  async getAllFeedbacks(filters: GetAllFilters) {
    try {
      const where: any = {};

      if (filters.trangThaiXuLy) {
        where.trangThaiXuLy = filters.trangThaiXuLy;
      }

      if (filters.loaiPhanHoi) {
        where.loaiPhanHoi = filters.loaiPhanHoi;
      }

      if (filters.mucDoNghiemTrong) {
        where.mucDoNghiemTrong = filters.mucDoNghiemTrong;
      }

      if (filters.search) {
        where.OR = [
          { noiDungPhanHoi: { contains: filters.search, mode: 'insensitive' } },
          { sanPhamLienQuan: { contains: filters.search, mode: 'insensitive' } },
          { donHangLienQuan: { contains: filters.search, mode: 'insensitive' } },
          { customer: { tenCongTy: { contains: filters.search, mode: 'insensitive' } } },
        ];
      }

      const feedbacks = await prisma.customerFeedback.findMany({
        where,
        include: {
          customer: true,
        },
        orderBy: {
          ngayPhanHoi: 'desc',
        },
      });

      return feedbacks;
    } catch (error) {
      throw error;
    }
  },

  // Get feedback by ID
  async getFeedbackById(id: string) {
    try {
      const feedback = await prisma.customerFeedback.findUnique({
        where: { id },
        include: {
          customer: true,
        },
      });

      if (!feedback) {
        throw new Error('Feedback not found');
      }

      return feedback;
    } catch (error) {
      throw error;
    }
  },

  // Update feedback
  async updateFeedback(id: string, data: UpdateCustomerFeedbackData) {
    try {
      const feedback = await prisma.customerFeedback.findUnique({
        where: { id },
      });

      if (!feedback) {
        throw new Error('Feedback not found');
      }

      // If status changed to "Đã xử lý" and no ngayXuLyXong, set it
      if (data.trangThaiXuLy === 'Đã xử lý' && !feedback.ngayXuLyXong) {
        data.ngayXuLyXong = new Date();
      }

      const updated = await prisma.customerFeedback.update({
        where: { id },
        data,
        include: {
          customer: true,
        },
      });

      return updated;
    } catch (error) {
      throw error;
    }
  },

  // Delete feedback
  async deleteFeedback(id: string) {
    try {
      const feedback = await prisma.customerFeedback.findUnique({
        where: { id },
      });

      if (!feedback) {
        throw new Error('Feedback not found');
      }

      await prisma.customerFeedback.delete({
        where: { id },
      });

      return { message: 'Feedback deleted successfully' };
    } catch (error) {
      throw error;
    }
  },

  // Get statistics
  async getStatistics() {
    try {
      const total = await prisma.customerFeedback.count();

      const byStatus = await prisma.customerFeedback.groupBy({
        by: ['trangThaiXuLy'],
        _count: true,
      });

      const byType = await prisma.customerFeedback.groupBy({
        by: ['loaiPhanHoi'],
        _count: true,
      });

      const byPriority = await prisma.customerFeedback.groupBy({
        by: ['mucDoNghiemTrong'],
        _count: true,
      });

      return {
        total,
        byStatus,
        byType,
        byPriority,
      };
    } catch (error) {
      throw error;
    }
  },
};

export default customerFeedbackService;

