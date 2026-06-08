import prisma from '@config/database';

class TechnicalSummaryService {
  async getSummary() {
    const [
      machineSystemCount,
      activeMachineSystemCount,
      machineDetailCount,
      activeMachineDetailCount,
      machineDetailTypeCounts,
      activeFaultTemplateCount,
      faultRecordStatusCounts,
      faultRecordTotalCount,
      repairRequestStatusCounts,
      repairRequestTotalCount,
      acceptanceHandoverCount,
      projectStatusCounts,
      projectPhaseStatusCounts,
      projectActiveCount,
      unphasedTaskCount,
      sparePartTotalCount,
      sparePartLowStockCount,
      sparePartOutOfStockCount,
    ] = await Promise.all([
      prisma.machineSystem.count(),
      prisma.machineSystem.count({ where: { hoatDong: true } }),
      prisma.machineSystemDetail.count(),
      prisma.machineSystemDetail.count({ where: { hoatDong: true } }),
      prisma.machineSystemDetail.groupBy({ by: ['loaiChiTiet'], _count: { _all: true } }),
      prisma.faultTemplate.count({ where: { hoatDong: true } }),
      prisma.faultRecord.groupBy({ by: ['trangThai'], _count: { _all: true } }),
      prisma.faultRecord.count(),
      prisma.repairRequest.groupBy({ by: ['trangThai'], _count: { _all: true } }),
      prisma.repairRequest.count(),
      prisma.acceptanceHandover.count(),
      prisma.project.groupBy({ by: ['trangThai'], _count: { _all: true } }),
      prisma.projectPhase.groupBy({ by: ['trangThai'], _count: { _all: true } }),
      prisma.project.count({ where: { trangThai: 'Đang thực hiện' } }),
      prisma.projectTask.count({ where: { projectPhaseId: null } }),
      prisma.sparePart.count(),
      prisma.sparePart.count({ where: { soLuongTon: { lte: 5 }, trangThai: { not: 'Hết hàng' } } }),
      prisma.sparePart.count({ where: { trangThai: 'Hết hàng' } }),
    ]);

    return {
      qlhtm: {
        machineSystems: {
          total: machineSystemCount,
          active: activeMachineSystemCount,
        },
        machineDetails: {
          total: machineDetailCount,
          active: activeMachineDetailCount,
          byType: machineDetailTypeCounts.map((item) => ({
            loaiChiTiet: item.loaiChiTiet,
            total: item._count._all,
          })),
        },
      },
      coDien: {
        activeFaultTemplates: activeFaultTemplateCount,
        faultRecordsByStatus: faultRecordStatusCounts.map((item) => ({
          trangThai: item.trangThai,
          total: item._count._all,
        })),
        faultRecordTotal: faultRecordTotalCount,
      },
      repairHandovers: {
        repairRequestsByStatus: repairRequestStatusCounts.map((item) => ({
          trangThai: item.trangThai,
          total: item._count._all,
        })),
        repairRequestTotal: repairRequestTotalCount,
        acceptanceHandovers: acceptanceHandoverCount,
      },
      projects: {
        projectsByStatus: projectStatusCounts.map((item) => ({
          trangThai: item.trangThai,
          total: item._count._all,
        })),
        phasesByStatus: projectPhaseStatusCounts.map((item) => ({
          trangThai: item.trangThai,
          total: item._count._all,
        })),
        activeProjects: projectActiveCount,
        unphasedTasks: unphasedTaskCount,
      },
      spareParts: {
        total: sparePartTotalCount,
        lowStock: sparePartLowStockCount,
        outOfStock: sparePartOutOfStockCount,
      },
    };
  }
}

export default new TechnicalSummaryService();
