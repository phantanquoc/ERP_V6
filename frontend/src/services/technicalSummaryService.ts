import apiClient, { ApiResponse } from './apiClient';
import type { MachineSystemDetailType } from './machineSystemService';

export interface CountByStatus {
  trangThai: string;
  total: number;
}

export interface MachineDetailTypeCount {
  loaiChiTiet: MachineSystemDetailType;
  total: number;
}

export interface TechnicalSummary {
  qlhtm: {
    machineSystems: {
      total: number;
      active: number;
    };
    machineDetails: {
      total: number;
      active: number;
      byType: MachineDetailTypeCount[];
    };
  };
  coDien: {
    activeFaultTemplates: number;
    faultRecordsByStatus: CountByStatus[];
    faultRecordTotal: number;
  };
  repairHandovers: {
    repairRequestsByStatus: CountByStatus[];
    repairRequestTotal: number;
    acceptanceHandovers: number;
  };
  projects: {
    projectsByStatus: CountByStatus[];
    phasesByStatus: CountByStatus[];
    activeProjects: number;
    unphasedTasks: number;
  };
  spareParts: {
    total: number;
    lowStock: number;
    outOfStock: number;
  };
}

class TechnicalSummaryService {
  async getSummary(): Promise<ApiResponse<TechnicalSummary>> {
    return apiClient.get<TechnicalSummary>('/technical-summary');
  }
}

export default new TechnicalSummaryService();
