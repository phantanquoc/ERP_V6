import { useQuery } from '@tanstack/react-query';
import employeeService, { Employee } from '../services/employeeService';

export interface EmployeeOption {
  id: string;
  name: string;
  employeeCode: string;
  department?: string;
}

export interface EmployeeAssignmentFull {
  _id: string;
  userId: string;
  firstName: string;
  lastName: string;
  employeeCode: string;
  department: string;
  status: string;
}

export const employeeAssignmentKeys = {
  all: ['employees-for-assignment'] as const,
  list: (search?: string) => [...employeeAssignmentKeys.all, { search }] as const,
  full: () => [...employeeAssignmentKeys.all, 'full'] as const,
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

export const useAllEmployeesForAssignment = () => {
  return useQuery({
    queryKey: employeeAssignmentKeys.full(),
    queryFn: async (): Promise<{ employees: EmployeeAssignmentFull[]; departments: string[] }> => {
      const result = await employeeService.getEmployeesForAssignment({ limit: 1000 });

      const employees = result.data
        .filter((emp) => emp.user)
        .map((emp) => ({
          _id: emp.id,
          userId: emp.userId,
          firstName: emp.user?.firstName || '',
          lastName: emp.user?.lastName || '',
          employeeCode: emp.employeeCode,
          department: (emp as any).departmentName || (emp as any).subDepartmentName || emp.subDepartment?.name || 'Chưa xác định',
          status: (emp as any).status || '',
        }))
        .filter((emp) => emp.status === 'ACTIVE')
        .filter((emp) => !emp.department.toLowerCase().includes('admin'));

      const departments = Array.from(new Set(employees.map((e) => e.department).filter(Boolean)));

      return { employees, departments };
    },
    staleTime: 5 * 60 * 1000,
  });
};

