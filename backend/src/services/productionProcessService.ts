import { PrismaClient } from '@prisma/client';
import { NotFoundError } from '../utils/errors';

const prisma = new PrismaClient();

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

