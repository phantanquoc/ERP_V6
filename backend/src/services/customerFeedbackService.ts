import prisma from '@config/database';
import ExcelJS from 'exceljs';

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
  customerType?: string; // "Quốc tế" hoặc "Nội địa"
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

      // Filter by customerType (Quốc tế / Nội địa)
      if (filters.customerType === 'Quốc tế') {
        where.customer = { quocGia: { not: null } };
      } else if (filters.customerType === 'Nội địa') {
        where.customer = { tinhThanh: { not: null } };
      }

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

  // Export feedbacks to Excel
  async exportToExcel(filters?: any): Promise<Buffer> {
    const where: any = {};

    if (filters?.customerType === 'Quốc tế') {
      where.customer = { quocGia: { not: null } };
    } else if (filters?.customerType === 'Nội địa') {
      where.customer = { tinhThanh: { not: null } };
    }

    if (filters?.trangThaiXuLy) {
      where.trangThaiXuLy = filters.trangThaiXuLy;
    }
    if (filters?.loaiPhanHoi) {
      where.loaiPhanHoi = filters.loaiPhanHoi;
    }
    if (filters?.mucDoNghiemTrong) {
      where.mucDoNghiemTrong = filters.mucDoNghiemTrong;
    }
    if (filters?.search) {
      where.OR = [
        { noiDungPhanHoi: { contains: filters.search, mode: 'insensitive' } },
        { sanPhamLienQuan: { contains: filters.search, mode: 'insensitive' } },
        { donHangLienQuan: { contains: filters.search, mode: 'insensitive' } },
        { customer: { tenCongTy: { contains: filters.search, mode: 'insensitive' } } },
      ];
    }

    const data = await prisma.customerFeedback.findMany({
      where,
      include: {
        customer: true,
      },
      orderBy: {
        ngayPhanHoi: 'desc',
      },
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Danh sách phản hồi khách hàng');

    worksheet.columns = [
      { header: 'Ngày phản hồi', key: 'ngayPhanHoi', width: 15 },
      { header: 'Khách hàng', key: 'tenKhachHang', width: 25 },
      { header: 'Loại phản hồi', key: 'loaiPhanHoi', width: 15 },
      { header: 'Mức độ nghiêm trọng', key: 'mucDoNghiemTrong', width: 20 },
      { header: 'Nội dung phản hồi', key: 'noiDungPhanHoi', width: 40 },
      { header: 'Sản phẩm liên quan', key: 'sanPhamLienQuan', width: 20 },
      { header: 'Trạng thái xử lý', key: 'trangThaiXuLy', width: 15 },
      { header: 'Người tiếp nhận', key: 'nguoiTiepNhan', width: 20 },
    ];

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    data.forEach((item) => {
      worksheet.addRow({
        ngayPhanHoi: item.ngayPhanHoi ? new Date(item.ngayPhanHoi).toLocaleDateString('vi-VN') : '',
        tenKhachHang: item.customer?.tenCongTy || '',
        loaiPhanHoi: item.loaiPhanHoi,
        mucDoNghiemTrong: item.mucDoNghiemTrong,
        noiDungPhanHoi: item.noiDungPhanHoi,
        sanPhamLienQuan: item.sanPhamLienQuan || '',
        trangThaiXuLy: item.trangThaiXuLy,
        nguoiTiepNhan: item.nguoiTiepNhan || '',
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return buffer as any;
  },
};

export default customerFeedbackService;

