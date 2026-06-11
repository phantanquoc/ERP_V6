/**
 * Tests for useAllEmployeesForAssignment hook.
 *
 * Key contract tested:
 * - Employees without a `user` field are filtered out
 * - Returned shape has { employees, departments }
 * - departments is a de-duped list derived from employee.subDepartment.name
 * - useEmployeesForAssignment with search filters the query key correctly
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import {
  useAllEmployeesForAssignment,
  useEmployeesForAssignment,
} from '../../hooks/useEmployeesForAssignment';
import { createTestQueryClient } from '../utils';
import type { Employee } from '../../services/employeeService';

// ── Mock the service module ────────────────────────────────────────────────────

vi.mock('../../services/employeeService', () => {
  const mockService = {
    getEmployeesForAssignment: vi.fn(),
  };
  return { default: mockService };
});

// ── Mock data ──────────────────────────────────────────────────────────────────

const employeeWithUser: Employee = {
  id: 'emp-001',
  userId: 'user-001',
  employeeCode: 'NV001',
  status: 'ACTIVE',
  hireDate: '2023-01-01',
  contractType: 'FULL_TIME',
  baseSalary: 10000000,
  positionId: 'pos-001',
  user: { email: 'a@example.com', firstName: 'An', lastName: 'Nguyễn Văn' },
  subDepartment: { id: 'sub-001', name: 'Phòng QLSX', code: 'SUBDEPT_PRODUCTION_MANAGEMENT' },
};

const anotherEmployeeWithUser: Employee = {
  id: 'emp-002',
  userId: 'user-002',
  employeeCode: 'NV002',
  status: 'ACTIVE',
  hireDate: '2023-03-15',
  contractType: 'FULL_TIME',
  baseSalary: 9000000,
  positionId: 'pos-002',
  user: { email: 'b@example.com', firstName: 'Bình', lastName: 'Trần Thị' },
  subDepartment: { id: 'sub-002', name: 'Quản lý kho', code: 'SUBDEPT_PRODUCTION_WAREHOUSE' },
};

const employeeWithoutUser: Employee = {
  id: 'emp-003',
  userId: 'user-003',
  employeeCode: 'NV003',
  status: 'INACTIVE',
  hireDate: '2022-05-01',
  contractType: 'PART_TIME',
  baseSalary: 5000000,
  positionId: 'pos-003',
  user: undefined,
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeWrapper() {
  const queryClient = createTestQueryClient();
  return {
    queryClient,
    wrapper: ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('useAllEmployeesForAssignment', () => {
  let employeeService: { getEmployeesForAssignment: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    const mod = await import('../../services/employeeService');
    employeeService = mod.default as any;
    vi.clearAllMocks();
  });

  it('fetches and returns employees with user data only', async () => {
    employeeService.getEmployeesForAssignment.mockResolvedValue({
      data: [employeeWithUser, anotherEmployeeWithUser, employeeWithoutUser],
    });

    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useAllEmployeesForAssignment(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const { employees } = result.current.data!;

    // emp-003 has user=undefined and must be filtered out
    expect(employees).toHaveLength(2);
    expect(employees.map((e) => e.employeeCode)).toEqual(
      expect.arrayContaining(['NV001', 'NV002'])
    );
  });

  it('maps employee fields to EmployeeAssignmentFull shape', async () => {
    employeeService.getEmployeesForAssignment.mockResolvedValue({
      data: [employeeWithUser],
    });

    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useAllEmployeesForAssignment(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const emp = result.current.data!.employees[0];

    expect(emp).toMatchObject({
      _id: 'emp-001',
      userId: 'user-001',
      firstName: 'An',
      lastName: 'Nguyễn Văn',
      employeeCode: 'NV001',
    });
  });

  it('returns a de-duplicated departments list', async () => {
    employeeService.getEmployeesForAssignment.mockResolvedValue({
      data: [employeeWithUser, anotherEmployeeWithUser],
    });

    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useAllEmployeesForAssignment(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const { departments } = result.current.data!;

    expect(departments).toHaveLength(2);
    expect(departments).toEqual(
      expect.arrayContaining(['Phòng QLSX', 'Quản lý kho'])
    );
    // No duplicates
    expect(new Set(departments).size).toBe(departments.length);
  });

  it('returns empty arrays when service returns no employees', async () => {
    employeeService.getEmployeesForAssignment.mockResolvedValue({ data: [] });

    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useAllEmployeesForAssignment(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data!.employees).toHaveLength(0);
    expect(result.current.data!.departments).toHaveLength(0);
  });

  it('transitions to error state when the service throws', async () => {
    employeeService.getEmployeesForAssignment.mockRejectedValue(
      new Error('Network error')
    );

    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useAllEmployeesForAssignment(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error?.message).toBe('Network error');
  });
});

describe('useEmployeesForAssignment', () => {
  let employeeService: { getEmployeesForAssignment: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    const mod = await import('../../services/employeeService');
    employeeService = mod.default as any;
    vi.clearAllMocks();
  });

  it('passes search string to the service', async () => {
    employeeService.getEmployeesForAssignment.mockResolvedValue({
      data: [employeeWithUser],
    });

    const { wrapper } = makeWrapper();
    renderHook(() => useEmployeesForAssignment('Nguyễn'), { wrapper });

    await waitFor(() => {
      expect(employeeService.getEmployeesForAssignment).toHaveBeenCalledWith({
        search: 'Nguyễn',
        limit: 100,
      });
    });
  });

  it('maps results to EmployeeOption shape', async () => {
    employeeService.getEmployeesForAssignment.mockResolvedValue({
      data: [employeeWithUser],
    });

    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useEmployeesForAssignment(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data![0]).toMatchObject({
      id: 'emp-001',
      name: 'Nguyễn Văn An',
      employeeCode: 'NV001',
      department: 'Phòng QLSX',
    });
  });

  it('filters out employees without user or name', async () => {
    employeeService.getEmployeesForAssignment.mockResolvedValue({
      data: [employeeWithUser, employeeWithoutUser],
    });

    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useEmployeesForAssignment(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // employeeWithoutUser has no user — filtered out
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data![0].employeeCode).toBe('NV001');
  });
});
