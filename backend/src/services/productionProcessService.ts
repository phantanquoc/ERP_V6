import prisma from '@config/database';
import { NotFoundError } from '../utils/errors';
import ExcelJS from 'exceljs';

interface CreateProductionProcessData {
  processId: string; // Template process ID
  msnv: string;
  tenNhanVien: string;
  tenQuyTrinhSanXuat?: string;
  maNVSanXuat?: string;
  tenNVSanXuat?: string;
  khoiLuong?: number;
  thoiGian?: number;
  materialStandardId?: string; // Định mức NVL
  sanPhamDauRa?: string; // Sản phẩm đầu ra
  tongNguyenLieuCanSanXuat?: number; // Tổng nguyên liệu cần sản xuất
  soGioLamTrong1Ngay?: number; // Số giờ làm trong 1 ngày
  flowchart: {
    sections: Array<{
      phanDoan: string;
      tenPhanDoan?: string;
      noiDungCongViec?: string;
      fileUrl?: string;
      stt: number;
      costs: Array<{
        loaiChiPhi: string;
        tenChiPhi?: string;
        donVi?: string;
        dinhMucLaoDong?: number;
        donViDinhMucLaoDong?: string;
        soLuongNguyenLieu?: number;
        soPhutThucHien?: number;
        soLuongKeHoach?: number;
        soLuongThucTe?: number;
      }>;
    }>;
  };
}

class ProductionProcessService {
  // Get all production processes with pagination
  async getAllProductionProcesses(page: number = 1, limit: number = 10): Promise<any> {
    const skip = (page - 1) * limit;

    const [productionProcesses, total] = await Promise.all([
      prisma.productionProcess.findMany({
        skip,
        take: limit,
        include: {
          process: true, // Include template process info
          materialStandard: {
            include: {
              items: true, // Include material standard items
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.productionProcess.count(),
    ]);

    return {
      data: productionProcesses,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Get production process by ID with full flowchart
  async getProductionProcessById(id: string): Promise<any> {
    const productionProcess = await prisma.productionProcess.findUnique({
      where: { id },
      include: {
        process: true,
        materialStandard: {
          include: {
            items: true,
          },
        },
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

    if (!productionProcess) {
      throw new NotFoundError('Production process not found');
    }

    return productionProcess;
  }

  // Generate unique production process code
  private async generateProductionProcessCode(): Promise<string> {
    const lastProcess = await prisma.productionProcess.findFirst({
      orderBy: {
        maQuyTrinhSanXuat: 'desc',
      },
    });

    if (!lastProcess) {
      return 'QTSX-001';
    }

    const lastNumber = parseInt(lastProcess.maQuyTrinhSanXuat.split('-')[1]);
    const newNumber = lastNumber + 1;
    return `QTSX-${newNumber.toString().padStart(3, '0')}`;
  }

  // Create production process from template
  async createProductionProcess(data: CreateProductionProcessData): Promise<any> {
    // Validate template process exists
    const templateProcess = await prisma.process.findUnique({
      where: { id: data.processId },
      include: {
        flowchart: {
          include: {
            sections: {
              include: {
                costs: true,
              },
            },
          },
        },
      },
    });

    if (!templateProcess) {
      throw new NotFoundError('Template process not found');
    }

    // Generate unique code
    const maQuyTrinhSanXuat = await this.generateProductionProcessCode();

    // Create production process with flowchart
    const productionProcess = await prisma.productionProcess.create({
      data: {
        maQuyTrinhSanXuat,
        processId: data.processId,
        msnv: data.msnv,
        tenNhanVien: data.tenNhanVien,
        tenQuyTrinh: templateProcess.tenQuyTrinh,
        loaiQuyTrinh: templateProcess.loaiQuyTrinh,
        tenQuyTrinhSanXuat: data.tenQuyTrinhSanXuat,
        maNVSanXuat: data.maNVSanXuat,
        tenNVSanXuat: data.tenNVSanXuat,
        khoiLuong: data.khoiLuong,
        thoiGian: data.thoiGian,
        materialStandardId: data.materialStandardId,
        sanPhamDauRa: data.sanPhamDauRa,
        tongNguyenLieuCanSanXuat: data.tongNguyenLieuCanSanXuat,
        soGioLamTrong1Ngay: data.soGioLamTrong1Ngay,
        flowchart: {
          create: {
            sections: {
              create: data.flowchart.sections.map((section) => ({
                phanDoan: section.phanDoan,
                tenPhanDoan: section.tenPhanDoan,
                noiDungCongViec: section.noiDungCongViec,
                fileUrl: section.fileUrl,
                stt: section.stt,
                costs: {
                  create: section.costs.map((cost) => ({
                    loaiChiPhi: cost.loaiChiPhi,
                    tenChiPhi: cost.tenChiPhi,
                    donVi: cost.donVi,
                    dinhMucLaoDong: cost.dinhMucLaoDong,
                    donViDinhMucLaoDong: cost.donViDinhMucLaoDong,
                    soLuongNguyenLieu: cost.soLuongNguyenLieu,
                    soPhutThucHien: cost.soPhutThucHien,
                    soLuongKeHoach: cost.soLuongKeHoach,
                    soLuongThucTe: cost.soLuongThucTe,
                  })),
                },
              })),
            },
          },
        },
      },
      include: {
        process: true,
        flowchart: {
          include: {
            sections: {
              include: {
                costs: true,
              },
            },
          },
        },
      },
    });

    return productionProcess;
  }

  // Update production process flowchart data
  async updateProductionProcess(id: string, data: CreateProductionProcessData): Promise<any> {
    const existingProcess = await prisma.productionProcess.findUnique({
      where: { id },
      include: {
        flowchart: true,
      },
    });

    if (!existingProcess) {
      throw new NotFoundError('Production process not found');
    }

    // Delete existing flowchart if exists
    if (existingProcess.flowchart) {
      await prisma.productionFlowchart.delete({
        where: { id: existingProcess.flowchart.id },
      });
    }

    // Create new flowchart
    const updatedProcess = await prisma.productionProcess.update({
      where: { id },
      data: {
        tenQuyTrinhSanXuat: data.tenQuyTrinhSanXuat,
        maNVSanXuat: data.maNVSanXuat,
        tenNVSanXuat: data.tenNVSanXuat,
        khoiLuong: data.khoiLuong,
        thoiGian: data.thoiGian,
        materialStandardId: data.materialStandardId,
        sanPhamDauRa: data.sanPhamDauRa,
        tongNguyenLieuCanSanXuat: data.tongNguyenLieuCanSanXuat,
        soGioLamTrong1Ngay: data.soGioLamTrong1Ngay,
        flowchart: {
          create: {
            sections: {
              create: data.flowchart.sections.map((section) => ({
                phanDoan: section.phanDoan,
                tenPhanDoan: section.tenPhanDoan,
                noiDungCongViec: section.noiDungCongViec,
                fileUrl: section.fileUrl,
                stt: section.stt,
                costs: {
                  create: section.costs.map((cost) => ({
                    loaiChiPhi: cost.loaiChiPhi,
                    tenChiPhi: cost.tenChiPhi,
                    donVi: cost.donVi,
                    dinhMucLaoDong: cost.dinhMucLaoDong,
                    donViDinhMucLaoDong: cost.donViDinhMucLaoDong,
                    soLuongNguyenLieu: cost.soLuongNguyenLieu,
                    soPhutThucHien: cost.soPhutThucHien,
                    soLuongKeHoach: cost.soLuongKeHoach,
                    soLuongThucTe: cost.soLuongThucTe,
                  })),
                },
              })),
            },
          },
        },
      },
      include: {
        process: true,
        flowchart: {
          include: {
            sections: {
              include: {
                costs: true,
              },
            },
          },
        },
      },
    });

    return updatedProcess;
  }

  // Export production process detail to Excel
  async exportToExcel(id: string): Promise<Buffer> {
    const productionProcess = await prisma.productionProcess.findUnique({
      where: { id },
      include: {
        process: true,
        materialStandard: {
          include: { items: true },
        },
        flowchart: {
          include: {
            sections: {
              include: { costs: true },
              orderBy: { stt: 'asc' },
            },
          },
        },
      },
    });

    if (!productionProcess) {
      throw new NotFoundError('Production process not found');
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Chi tiết quy trình sản xuất');

    // === Header info ===
    worksheet.mergeCells('A1:J1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = 'CHI TIẾT QUY TRÌNH SẢN XUẤT';
    titleCell.font = { bold: true, size: 14 };
    titleCell.alignment = { horizontal: 'center' };

    worksheet.mergeCells('A2:J2');
    worksheet.getCell('A2').value = `Mã: ${productionProcess.maQuyTrinhSanXuat} | Tên: ${productionProcess.tenQuyTrinhSanXuat || productionProcess.tenQuyTrinh || ''}`;
    worksheet.getCell('A2').font = { bold: true, size: 11 };

    // Info rows
    const infoData = [
      ['Tên quy trình sản xuất', productionProcess.tenQuyTrinhSanXuat || '', 'Mã NV', productionProcess.maNVSanXuat || productionProcess.msnv || '', 'Tên nhân viên', productionProcess.tenNVSanXuat || productionProcess.tenNhanVien || '', 'Khối lượng (Kg)', productionProcess.khoiLuong || ''],
      ['Định mức NVL', productionProcess.materialStandard?.tenDinhMuc || '-', 'Sản phẩm đầu ra', productionProcess.sanPhamDauRa || '-', 'Tổng nguyên liệu cần SX (Kg)', productionProcess.tongNguyenLieuCanSanXuat || '-', 'Số giờ làm trong 1 ngày', productionProcess.soGioLamTrong1Ngay || ''],
      ['Thời gian (Ngày)', productionProcess.thoiGian || '', '', '', '', '', '', ''],
    ];

    let currentRow = 4;
    infoData.forEach((row) => {
      const excelRow = worksheet.getRow(currentRow);
      row.forEach((val, idx) => {
        const cell = excelRow.getCell(idx + 1);
        cell.value = val as any;
        if (idx % 2 === 0) cell.font = { bold: true };
      });
      currentRow++;
    });

    // === Table header ===
    currentRow += 1;
    const tableHeaderRow = currentRow;
    const headers = ['STT', 'Phân đoạn', 'Nội dung công việc', 'Loại chi phí', 'Tên chi phí', 'ĐVT', 'Định mức lao động', 'Đơn vị', 'Số lượng nguyên liệu (Kg)', 'Số phút thực hiện', 'Số lượng nhân công/vật tư KH', 'Số lượng nhân công/vật tư TT'];

    const headerRow = worksheet.getRow(tableHeaderRow);
    headers.forEach((h, idx) => {
      const cell = headerRow.getCell(idx + 1);
      cell.value = h;
      cell.font = { bold: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = {
        top: { style: 'thin' }, bottom: { style: 'thin' },
        left: { style: 'thin' }, right: { style: 'thin' },
      };
    });

    worksheet.columns = [
      { width: 6 }, { width: 20 }, { width: 25 }, { width: 15 }, { width: 18 },
      { width: 10 }, { width: 18 }, { width: 10 }, { width: 22 }, { width: 18 },
      { width: 22 }, { width: 22 },
    ];

    // === Data rows ===
    currentRow = tableHeaderRow + 1;
    const sections = productionProcess.flowchart?.sections || [];

    sections.forEach((section) => {
      const costs = section.costs || [];
      if (costs.length === 0) {
        const row = worksheet.getRow(currentRow);
        row.getCell(1).value = section.stt;
        row.getCell(2).value = `${section.phanDoan}\n${section.noiDungCongViec || ''}`;
        row.getCell(2).alignment = { wrapText: true };
        for (let i = 1; i <= 12; i++) {
          row.getCell(i).border = {
            top: { style: 'thin' }, bottom: { style: 'thin' },
            left: { style: 'thin' }, right: { style: 'thin' },
          };
        }
        currentRow++;
      } else {
        costs.forEach((cost, costIdx) => {
          const row = worksheet.getRow(currentRow);
          if (costIdx === 0) {
            row.getCell(1).value = section.stt;
            row.getCell(2).value = `${section.phanDoan}\n${section.noiDungCongViec || ''}`;
            row.getCell(2).alignment = { wrapText: true };
          }
          row.getCell(4).value = cost.loaiChiPhi || '';
          row.getCell(5).value = cost.tenChiPhi || '';
          row.getCell(6).value = cost.donVi || '';
          row.getCell(7).value = cost.dinhMucLaoDong || '';
          row.getCell(8).value = cost.donViDinhMucLaoDong || '';
          row.getCell(9).value = cost.soLuongNguyenLieu || '';
          row.getCell(10).value = cost.soPhutThucHien || '';
          row.getCell(11).value = cost.soLuongKeHoach || '';
          row.getCell(12).value = cost.soLuongThucTe || '';

          for (let i = 1; i <= 12; i++) {
            row.getCell(i).border = {
              top: { style: 'thin' }, bottom: { style: 'thin' },
              left: { style: 'thin' }, right: { style: 'thin' },
            };
          }
          currentRow++;
        });

        // Merge STT and Phân đoạn cells if multiple costs
        if (costs.length > 1) {
          const startRow = currentRow - costs.length;
          worksheet.mergeCells(startRow, 1, currentRow - 1, 1);
          worksheet.mergeCells(startRow, 2, currentRow - 1, 2);
          worksheet.mergeCells(startRow, 3, currentRow - 1, 3);
        }
      }
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return buffer as any;
  }

  // Delete production process
  async deleteProductionProcess(id: string): Promise<void> {
    const productionProcess = await prisma.productionProcess.findUnique({
      where: { id },
    });

    if (!productionProcess) {
      throw new NotFoundError('Production process not found');
    }

    await prisma.productionProcess.delete({
      where: { id },
    });
  }

  // Sync production process flowchart from template
  async syncFromTemplate(id: string): Promise<any> {
    // Get existing production process with full flowchart data
    const existingProcess = await prisma.productionProcess.findUnique({
      where: { id },
      include: {
        flowchart: {
          include: {
            sections: {
              include: {
                costs: true,
              },
            },
          },
        },
      },
    });

    if (!existingProcess) {
      throw new NotFoundError('Production process not found');
    }

    // Get template process with flowchart
    const templateProcess = await prisma.process.findUnique({
      where: { id: existingProcess.processId },
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

    if (!templateProcess) {
      throw new NotFoundError('Template process not found');
    }

    // Build a map of existing production data by phanDoan -> loaiChiPhi
    // This allows us to preserve user-entered data when syncing
    const existingDataMap: Map<string, Map<string, {
      soLuongNguyenLieu: number | null;
      soPhutThucHien: number | null;
      soLuongKeHoach: number | null;
      soLuongThucTe: number | null;
    }>> = new Map();

    if (existingProcess.flowchart?.sections) {
      for (const section of existingProcess.flowchart.sections) {
        const costMap = new Map<string, {
          soLuongNguyenLieu: number | null;
          soPhutThucHien: number | null;
          soLuongKeHoach: number | null;
          soLuongThucTe: number | null;
        }>();

        for (const cost of section.costs) {
          costMap.set(cost.loaiChiPhi, {
            soLuongNguyenLieu: cost.soLuongNguyenLieu,
            soPhutThucHien: cost.soPhutThucHien,
            soLuongKeHoach: cost.soLuongKeHoach,
            soLuongThucTe: cost.soLuongThucTe,
          });
        }

        existingDataMap.set(section.phanDoan, costMap);
      }
    }

    // Delete existing flowchart if exists
    if (existingProcess.flowchart) {
      await prisma.productionFlowchart.delete({
        where: { id: existingProcess.flowchart.id },
      });
    }

    // Create new flowchart from template, preserving existing production data
    const sectionsData = templateProcess.flowchart?.sections || [];

    const updatedProcess = await prisma.productionProcess.update({
      where: { id },
      data: {
        tenQuyTrinh: templateProcess.tenQuyTrinh,
        loaiQuyTrinh: templateProcess.loaiQuyTrinh,
        flowchart: {
          create: {
            sections: {
              create: sectionsData.map((section) => {
                // Get existing data for this section if available
                const existingSectionData = existingDataMap.get(section.phanDoan);

                return {
                  phanDoan: section.phanDoan,
                  tenPhanDoan: section.tenPhanDoan,
                  noiDungCongViec: section.noiDungCongViec,
                  fileUrl: section.fileUrl,
                  stt: section.stt,
                  costs: {
                    create: section.costs.map((cost) => {
                      // Get existing cost data if available
                      const existingCostData = existingSectionData?.get(cost.loaiChiPhi);

                      return {
                        loaiChiPhi: cost.loaiChiPhi,
                        tenChiPhi: cost.tenChiPhi,
                        donVi: cost.donVi,
                        dinhMucLaoDong: cost.dinhMucLaoDong,
                        donViDinhMucLaoDong: cost.donViDinhMucLaoDong,
                        // Preserve existing production data or default to 0
                        soLuongNguyenLieu: existingCostData?.soLuongNguyenLieu ?? 0,
                        soPhutThucHien: existingCostData?.soPhutThucHien ?? 0,
                        soLuongKeHoach: existingCostData?.soLuongKeHoach ?? 0,
                        soLuongThucTe: existingCostData?.soLuongThucTe ?? 0,
                      };
                    }),
                  },
                };
              }),
            },
          },
        },
      },
      include: {
        process: true,
        materialStandard: {
          include: {
            items: true,
          },
        },
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

    return updatedProcess;
  }
}

export default new ProductionProcessService();

