import { useQuery } from '@tanstack/react-query';
import employeeService, { Employee } from '../services/employeeService';

export interface ProductionEmployeeOption {
  id: string;
  name: string;
  employeeCode: string;
  maNhanVien?: string;
  positionName?: string;
}

export const productionEmployeeKeys = {
  all: ['production-employees'] as const,
  list: () => [...productionEmployeeKeys.all, 'list'] as const,
};

const toFullName = (employee: Employee): string => {
  const lastName = employee.user?.lastName || '';
  const firstName = employee.user?.firstName || '';
  return `${lastName} ${firstName}`.trim();
};

export const useProductionEmployees = () => {
  return useQuery({
    queryKey: productionEmployeeKeys.list(),
    queryFn: async (): Promise<ProductionEmployeeOption[]> => {
      const result = await employeeService.getEmployeesForAssignment({
        page: 1,
        limit: 500,
        positionName: 'Nhân viên sản xuất',
      });

      return result.data
        .filter(employee => employee.user)
        .map(employee => ({
          id: employee.id,
          name: toFullName(employee),
          employeeCode: employee.employeeCode,
        }))
        .filter(employee => employee.name);
    },
    staleTime: 5 * 60 * 1000,
  });
};
