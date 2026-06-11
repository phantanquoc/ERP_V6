import { http, HttpResponse } from 'msw';

const BASE_URL = 'http://localhost:5000/api';

export const mockEmployees = [
  {
    id: 'emp-001',
    userId: 'user-001',
    employeeCode: 'NV001',
    status: 'ACTIVE',
    hireDate: '2023-01-01',
    contractType: 'FULL_TIME',
    baseSalary: 10000000,
    positionId: 'pos-001',
    user: {
      email: 'nguyen.van.a@example.com',
      firstName: 'An',
      lastName: 'Nguyễn Văn',
    },
    subDepartment: {
      id: 'sub-001',
      name: 'Phòng QLSX',
      code: 'SUBDEPT_PRODUCTION_MANAGEMENT',
    },
  },
  {
    id: 'emp-002',
    userId: 'user-002',
    employeeCode: 'NV002',
    status: 'ACTIVE',
    hireDate: '2023-03-15',
    contractType: 'FULL_TIME',
    baseSalary: 9000000,
    positionId: 'pos-002',
    user: {
      email: 'tran.thi.b@example.com',
      firstName: 'Bình',
      lastName: 'Trần Thị',
    },
    subDepartment: {
      id: 'sub-002',
      name: 'Quản lý kho',
      code: 'SUBDEPT_PRODUCTION_WAREHOUSE',
    },
  },
  {
    // Employee without user — should be filtered out by hooks
    id: 'emp-003',
    userId: 'user-003',
    employeeCode: 'NV003',
    status: 'INACTIVE',
    hireDate: '2022-05-01',
    contractType: 'PART_TIME',
    baseSalary: 5000000,
    positionId: 'pos-003',
    user: null,
  },
];

export const mockSupplyRequests = [
  {
    id: 'sr-001',
    stt: 1,
    ngayYeuCau: '2026-06-01',
    maYeuCau: 'YC2026-001',
    employeeId: 'emp-001',
    maNhanVien: 'NV001',
    tenNhanVien: 'Nguyễn Văn An',
    boPhan: 'Sản xuất',
    mucDichYeuCau: 'Mua nguyên liệu sản xuất',
    mucDoUuTien: 'Cao',
    trangThai: 'Chưa cung cấp',
    createdAt: '2026-06-01T08:00:00Z',
    updatedAt: '2026-06-01T08:00:00Z',
    items: [
      {
        id: 'item-001',
        supplyRequestId: 'sr-001',
        phanLoai: 'Nguyên liệu',
        tenGoi: 'Xoài tươi',
        soLuong: 100,
        donViTinh: 'Kg',
        createdAt: '2026-06-01T08:00:00Z',
        updatedAt: '2026-06-01T08:00:00Z',
      },
    ],
  },
  {
    id: 'sr-002',
    stt: 2,
    ngayYeuCau: '2026-06-02',
    maYeuCau: 'YC2026-002',
    employeeId: 'emp-002',
    maNhanVien: 'NV002',
    tenNhanVien: 'Trần Thị Bình',
    boPhan: 'Kho',
    mucDichYeuCau: 'Mua thiết bị bảo hộ',
    mucDoUuTien: 'Trung bình',
    trangThai: 'Đang xử lý',
    createdAt: '2026-06-02T09:00:00Z',
    updatedAt: '2026-06-02T09:00:00Z',
    items: [],
  },
];

export const mockCurrentUser = {
  id: 'user-001',
  email: 'nguyen.van.a@example.com',
  firstName: 'An',
  lastName: 'Nguyễn Văn',
  role: 'EMPLOYEE',
  departmentCode: 'DEPT_PRODUCTION',
  departmentName: 'Bộ phận sản xuất',
  subDepartmentCode: 'SUBDEPT_PRODUCTION_MANAGEMENT',
  subDepartmentName: 'Phòng QLSX',
  secondaryDepartments: [],
};

export const mockEmployee = {
  id: 'emp-001',
  employeeCode: 'NV001',
  position: { name: 'Nhân viên sản xuất' },
  positionLevel: { level: 'Cấp 1' },
  gender: 'Nam',
  status: 'ACTIVE',
};

export const handlers = [
  // GET /api/employees/for-assignment
  http.get(`${BASE_URL}/employees/for-assignment`, () => {
    return HttpResponse.json({
      success: true,
      data: mockEmployees,
      pagination: { page: 1, limit: 200, total: 3, totalPages: 1 },
    });
  }),

  // GET /api/employees
  http.get(`${BASE_URL}/employees`, () => {
    return HttpResponse.json({
      success: true,
      data: mockEmployees,
      total: 3,
      page: 1,
      limit: 10,
      totalPages: 1,
    });
  }),

  // GET /api/auth/me
  http.get(`${BASE_URL}/auth/me`, () => {
    return HttpResponse.json({
      success: true,
      data: {
        user: mockCurrentUser,
        employee: mockEmployee,
      },
    });
  }),

  // GET /api/supply-requests
  http.get(`${BASE_URL}/supply-requests`, ({ request }) => {
    const url = new URL(request.url);
    const page = Number(url.searchParams.get('page') ?? 1);
    const limit = Number(url.searchParams.get('limit') ?? 10);
    const search = url.searchParams.get('search') ?? '';

    const filtered = search
      ? mockSupplyRequests.filter(
          (r) =>
            r.maYeuCau.toLowerCase().includes(search.toLowerCase()) ||
            r.tenNhanVien.toLowerCase().includes(search.toLowerCase())
        )
      : mockSupplyRequests;

    return HttpResponse.json({
      success: true,
      data: filtered,
      pagination: {
        page,
        limit,
        total: filtered.length,
        totalPages: Math.ceil(filtered.length / limit),
      },
    });
  }),
];
