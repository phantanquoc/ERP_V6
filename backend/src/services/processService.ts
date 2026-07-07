import prisma from '@config/database';
import { NotFoundError, ValidationError } from '@utils/errors';
import { getPaginationParams, calculateTotalPages } from '@utils/helpers';
import { nextStaticCode, staticCodeWhere } from '@utils/codeGenerator';
import type { PaginatedResponse } from '@types';
import ExcelJS from 'exceljs';

export class ProcessService {
  async generateProcessCode(): Promise<string> {
    const last = await prisma.process.findFirst({
      where: { maQuyTrinh: staticCodeWhere('QT') },
      orderBy: { maQuyTrinh: 'desc' },
      select: { maQuyTrinh: true },
    });
    return nextStaticCode(last?.maQuyTrinh ?? null, 'QT');
  }

  async getAllProcesses(
    page: number = 1,
    limit: number = 10,
    search?: string,
    hienThiTrongChung?: boolean
  ): Promise<PaginatedResponse<any>> {
    const { skip } = getPaginationParams(page, limit);

    const where: any = {};

    if (search) {
      where.OR = [
        { maQuyTrinh: { contains: search, mode: 'insensitive' as const } },
        { tenQuyTrinh: { contains: search, mode: 'insensitive' as const } },
        { tenNhanVien: { contains: search, mode: 'insensitive' as const } },
        { msnv: { contains: search, mode: 'insensitive' as const } },
        { loaiQuyTrinh: { contains: search, mode: 'insensitive' as const } },
      ];
    }

    if (hienThiTrongChung !== undefined) {
      where.hienThiTrongChung = hienThiTrongChung;
    }

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
                files: { orderBy: { order: 'asc' } },
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
    files?: string[];
  }): Promise<any> {
    if (!data.msnv || !data.tenNhanVien || !data.tenQuyTrinh || !data.loaiQuyTrinh) {
      throw new ValidationError('Missing required fields');
    }

    const maQuyTrinh = await this.generateProcessCode();

    const process = await prisma.process.create({
      data: {
        maQuyTrinh,
        msnv: data.msnv,
        tenNhanVien: data.tenNhanVien,
        tenQuyTrinh: data.tenQuyTrinh,
        loaiQuyTrinh: data.loaiQuyTrinh,
        files: data.files || [],
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
      files?: string[];
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
        ...(data.files !== undefined && { files: data.files }),
      },
    });

    return updatedProcess;
  }

  async toggleHienThiTrongChung(id: string): Promise<any> {
    const existing = await this.getProcessById(id);
    return prisma.process.update({
      where: { id },
      data: { hienThiTrongChung: !existing.hienThiTrongChung } as any,
    });
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
            files: { orderBy: { order: 'asc' } },
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
            files: {
              create: section.files?.map((file: any, fileIndex: number) => ({
                url: file.url,
                fileName: file.fileName,
                description: file.description,
                order: fileIndex,
                uploadedById: file.uploadedById || null,
                uploadedAt: file.uploadedAt ? new Date(file.uploadedAt) : new Date(),
              })) || [],
            },
          })),
        },
      },
      include: {
        sections: {
          include: {
            costs: true,
            files: { orderBy: { order: 'asc' } },
          },
        },
      },
    });

    return flowchart;
  }

  async updateFlowchart(processId: string, sections: any[], uploadedById?: string) {
    // Check if flowchart exists
    const existingFlowchart = await prisma.processFlowchart.findUnique({
      where: { processId },
      include: {
        sections: {
          include: {
            costs: true,
            files: true,
          },
        },
      },
    });

    if (!existingFlowchart) {
      throw new NotFoundError('Flowchart not found');
    }

    // Build map of old files by id to preserve uploadedById/uploadedAt
    const oldFilesMap = new Map<string, { uploadedById: string | null; uploadedAt: Date }>();
    for (const section of existingFlowchart.sections) {
      for (const file of section.files) {
        oldFilesMap.set(file.id, { uploadedById: file.uploadedById, uploadedAt: file.uploadedAt });
      }
    }

    // Delete all existing sections and costs (cascade will handle costs + files)
    await prisma.processFlowchartSection.deleteMany({
      where: { flowchartId: existingFlowchart.id },
    });

    // Create new sections with costs and files
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
            files: {
              create: section.files?.map((file: any, fileIndex: number) => {
                const oldMeta = file.id ? oldFilesMap.get(file.id) : null;
                return {
                  url: file.url,
                  fileName: file.fileName,
                  description: file.description,
                  order: fileIndex,
                  uploadedById: oldMeta ? oldMeta.uploadedById : (uploadedById || null),
                  uploadedAt: oldMeta ? oldMeta.uploadedAt : new Date(),
                };
              }) || [],
            },
          })),
        },
      },
      include: {
        sections: {
          include: {
            costs: true,
            files: { orderBy: { order: 'asc' } },
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

