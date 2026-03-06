import prisma from '@config/database';
import { NotFoundError, ValidationError } from '@utils/errors';
import { getPaginationParams, calculateTotalPages } from '@utils/helpers';
import type { PaginatedResponse } from '@types';
import ExcelJS from 'exceljs';

export class ProcessService {
  /**
   * Generate process code
   * Format: QT-{SEQUENCE}
   * Example: QT-001, QT-002
   */
  async generateProcessCode(): Promise<string> {
    const lastProcess = await prisma.process.findFirst({
      where: {
        maQuyTrinh: {
          startsWith: 'QT-',
        },
      },
      orderBy: {
        maQuyTrinh: 'desc',
      },
    });

    let sequence = 1;
    if (lastProcess) {
      const lastCode = lastProcess.maQuyTrinh;
      const sequenceStr = lastCode.replace('QT-', '');
      if (sequenceStr) {
        sequence = parseInt(sequenceStr, 10) + 1;
      }
    }

    return `QT-${String(sequence).padStart(3, '0')}`;
  }

  async getAllProcesses(
    page: number = 1,
    limit: number = 10,
    search?: string
  ): Promise<PaginatedResponse<any>> {
    const { skip } = getPaginationParams(page, limit);

    const where = search
      ? {
          OR: [
            { maQuyTrinh: { contains: search, mode: 'insensitive' as const } },
            { tenQuyTrinh: { contains: search, mode: 'insensitive' as const } },
            { tenNhanVien: { contains: search, mode: 'insensitive' as const } },
            { msnv: { contains: search, mode: 'insensitive' as const } },
            { loaiQuyTrinh: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [processes, total] = await Promise.all([
      prisma.process.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.process.count({ where }),
    ]);

    return {
      data: processes,
      total,
      page,
      limit,
      totalPages: calculateTotalPages(total, limit),
    };
  }

  async getProcessById(id: string): Promise<any> {
    const process = await prisma.process.findUnique({
      where: { id },
      include: {
        flowchart: {
          include: {
            sections: {
              include: {
                costs: true,
              },
              orderBy: {
                stt: 'asc',
              },
            },
          },
        },
      },
    });

    if (!process) {
      throw new NotFoundError('Process not found');
    }

    return process;
  }

  async createProcess(data: {
    msnv: string;
    tenNhanVien: string;
    tenQuyTrinh: string;
    loaiQuyTrinh: string;
  }): Promise<any> {
    // Validate required fields
    if (!data.msnv || !data.tenNhanVien || !data.tenQuyTrinh || !data.loaiQuyTrinh) {
      throw new ValidationError('Missing required fields');
    }

    // Generate process code
    const maQuyTrinh = await this.generateProcessCode();

    const process = await prisma.process.create({
      data: {
        maQuyTrinh,
        msnv: data.msnv,
        tenNhanVien: data.tenNhanVien,
        tenQuyTrinh: data.tenQuyTrinh,
        loaiQuyTrinh: data.loaiQuyTrinh,
      },
    });

    return process;
  }

  async updateProcess(
    id: string,
    data: {
      msnv?: string;
      tenNhanVien?: string;
      tenQuyTrinh?: string;
      loaiQuyTrinh?: string;
    }
  ): Promise<any> {
    const existingProcess = await this.getProcessById(id);

    const updatedProcess = await prisma.process.update({
      where: { id },
      data: {
        msnv: data.msnv ?? existingProcess.msnv,
        tenNhanVien: data.tenNhanVien ?? existingProcess.tenNhanVien,
        tenQuyTrinh: data.tenQuyTrinh ?? existingProcess.tenQuyTrinh,
        loaiQuyTrinh: data.loaiQuyTrinh ?? existingProcess.loaiQuyTrinh,
      },
    });

    return updatedProcess;
  }

  async deleteProcess(id: string): Promise<void> {
    await this.getProcessById(id);
    await prisma.process.delete({
      where: { id },
    });
  }

  async exportToExcel(_filters?: any): Promise<Buffer> {
    const data = await prisma.process.findMany({
      orderBy: { createdAt: 'desc' },
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Danh sách quy trình');

    worksheet.columns = [
      { header: 'STT', key: 'stt', width: 8 },
      { header: 'Mã quy trình', key: 'maQuyTrinh', width: 18 },
      { header: 'MSNV', key: 'msnv', width: 15 },
      { header: 'Tên nhân viên', key: 'tenNhanVien', width: 25 },
      { header: 'Tên quy trình', key: 'tenQuyTrinh', width: 30 },
      { header: 'Loại quy trình', key: 'loaiQuyTrinh', width: 20 },
      { header: 'Ngày tạo', key: 'createdAt', width: 15 },
    ];

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    data.forEach((item, index) => {
      worksheet.addRow({
        stt: index + 1,
        maQuyTrinh: item.maQuyTrinh,
        msnv: item.msnv,
        tenNhanVien: item.tenNhanVien,
        tenQuyTrinh: item.tenQuyTrinh,
        loaiQuyTrinh: item.loaiQuyTrinh,
        createdAt: new Date(item.createdAt).toLocaleDateString('vi-VN'),
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return buffer as any;
  }

  // ==================== FLOWCHART OPERATIONS ====================

  async getFlowchartByProcessId(processId: string) {
    const flowchart = await prisma.processFlowchart.findUnique({
      where: { processId },
      include: {
        sections: {
          include: {
            costs: true,
          },
          orderBy: {
            stt: 'asc',
          },
        },
      },
    });

    return flowchart;
  }

  async createFlowchart(processId: string, sections: any[]) {
    // Check if process exists
    const process = await prisma.process.findUnique({
      where: { id: processId },
    });

    if (!process) {
      throw new NotFoundError('Process not found');
    }

    // Check if flowchart already exists
    const existingFlowchart = await prisma.processFlowchart.findUnique({
      where: { processId },
    });

    if (existingFlowchart) {
      throw new ValidationError('Flowchart already exists for this process');
    }

    // Create flowchart with sections and costs
    const flowchart = await prisma.processFlowchart.create({
      data: {
        processId,
        sections: {
          create: sections.map((section, index) => ({
            phanDoan: section.phanDoan,
            tenPhanDoan: section.tenPhanDoan,
            noiDungCongViec: section.noiDungCongViec,
            fileUrl: section.fileUrl,
            stt: index + 1,
            costs: {
              create: section.costs?.map((cost: any) => ({
                loaiChiPhi: cost.loaiChiPhi,
                tenChiPhi: cost.tenChiPhi,
                donVi: cost.donVi,
                dinhMucLaoDong: cost.dinhMucLaoDong,
                donViDinhMucLaoDong: cost.donViDinhMucLaoDong,
                soLuongNguyenLieu: cost.soLuongNguyenLieu,
                soPhutThucHien: cost.soPhutThucHien,
                soLuongKeHoach: cost.soLuongKeHoach,
                soLuongThucTe: cost.soLuongThucTe,
                giaKeHoach: cost.giaKeHoach,
                thanhTienKeHoach: cost.thanhTienKeHoach,
                giaThucTe: cost.giaThucTe,
                thanhTienThucTe: cost.thanhTienThucTe,
              })) || [],
            },
          })),
        },
      },
      include: {
        sections: {
          include: {
            costs: true,
          },
        },
      },
    });

    return flowchart;
  }

  async updateFlowchart(processId: string, sections: any[]) {
    // Check if flowchart exists
    const existingFlowchart = await prisma.processFlowchart.findUnique({
      where: { processId },
      include: {
        sections: {
          include: {
            costs: true,
          },
        },
      },
    });

    if (!existingFlowchart) {
      throw new NotFoundError('Flowchart not found');
    }

    // Delete all existing sections and costs (cascade will handle costs)
    await prisma.processFlowchartSection.deleteMany({
      where: { flowchartId: existingFlowchart.id },
    });

    // Create new sections with costs
    const updatedFlowchart = await prisma.processFlowchart.update({
      where: { id: existingFlowchart.id },
      data: {
        sections: {
          create: sections.map((section, index) => ({
            phanDoan: section.phanDoan,
            tenPhanDoan: section.tenPhanDoan,
            noiDungCongViec: section.noiDungCongViec,
            fileUrl: section.fileUrl,
            stt: index + 1,
            costs: {
              create: section.costs?.map((cost: any) => ({
                loaiChiPhi: cost.loaiChiPhi,
                tenChiPhi: cost.tenChiPhi,
                donVi: cost.donVi,
                dinhMucLaoDong: cost.dinhMucLaoDong,
                donViDinhMucLaoDong: cost.donViDinhMucLaoDong,
                soLuongNguyenLieu: cost.soLuongNguyenLieu,
                soPhutThucHien: cost.soPhutThucHien,
                soLuongKeHoach: cost.soLuongKeHoach,
                soLuongThucTe: cost.soLuongThucTe,
                giaKeHoach: cost.giaKeHoach,
                thanhTienKeHoach: cost.thanhTienKeHoach,
                giaThucTe: cost.giaThucTe,
                thanhTienThucTe: cost.thanhTienThucTe,
              })) || [],
            },
          })),
        },
      },
      include: {
        sections: {
          include: {
            costs: true,
          },
          orderBy: {
            stt: 'asc',
          },
        },
      },
    });

    return updatedFlowchart;
  }

  async deleteFlowchart(processId: string): Promise<void> {
    const flowchart = await prisma.processFlowchart.findUnique({
      where: { processId },
    });

    if (!flowchart) {
      throw new NotFoundError('Flowchart not found');
    }

    await prisma.processFlowchart.delete({
      where: { id: flowchart.id },
    });
  }
}

export default new ProcessService();

