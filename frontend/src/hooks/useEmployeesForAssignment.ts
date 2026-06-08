import { useQuery } from '@tanstack/react-query';
import employeeService, { Employee } from '../services/employeeService';

export interface EmployeeOption {
  id: string;
  name: string;
  employeeCode: string;
  department?: string;
}

export const employeeAssignmentKeys = {
  all: ['employees-for-assignment'] as const,
  list: (search?: string) => [...employeeAssignmentKeys.all, { search }] as const,
};

const toFullName = (employee: Employee): string => {
  const lastName = employee.user?.lastName || '';
  const firstName = employee.user?.firstName || '';
  return `${lastName} ${firstName}`.trim();
};

export const useEmployeesForAssignment = (search?: string) => {
  return useQuery({
    queryKey: employeeAssignmentKeys.list(search),
    queryFn: async (): Promise<EmployeeOption[]> => {
      const result = await employeeService.getEmployeesForAssignment({
        search: search || undefined,
        limit: 100,
      });

      return result.data
        .filter((employee) => employee.user)
        .map((employee) => ({
          id: employee.id,
          name: toFullName(employee),
          employeeCode: employee.employeeCode,
          department: employee.subDepartment?.name || '',
        }))
        .filter((employee) => employee.name || employee.employeeCode);
    },
    staleTime: 5 * 60 * 1000,
  });
};
