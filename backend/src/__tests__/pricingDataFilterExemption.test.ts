/**
 * Pricing approver data-filter exemption (REQ-RBAC-008 carve-out):
 * a pricing approver (e.g. Phòng giá thành secondary) must see purchase and
 * supply requests from EVERY department to review them — like warehouse/admin.
 * RBAC (requireRule READ) still gates the endpoint; this only lifts the
 * department data-permission filter.
 */

jest.mock('@config/database', () => ({
  __esModule: true,
  default: {
    department: { findMany: jest.fn() },
    subDepartment: { findFirst: jest.fn() },
    employee: { findUnique: jest.fn() },
    supplyRequest: { findUnique: jest.fn() },
    user: { findUnique: jest.fn() },
    userSecondaryDepartment: { findMany: jest.fn() },
  },
}));

jest.mock('@services/supplyRequestService', () => ({
  __esModule: true,
  default: {
    getAllSupplyRequests: jest.fn().mockResolvedValue({ data: [], pagination: {} }),
    createSupplyRequest: jest.fn(),
    updateSupplyRequest: jest.fn(),
  },
}));

jest.mock('@services/purchaseRequestService', () => ({
  __esModule: true,
  default: { getAllPurchaseRequests: jest.fn().mockResolvedValue({ data: [], pagination: {} }) },
}));

jest.mock('@utils/isPricingApprover', () => ({
  __esModule: true,
  isPricingApprover: jest.fn(),
}));

import prisma from '@config/database';
import supplyRequestController from '@controllers/supplyRequestController';
import purchaseRequestController from '@controllers/purchaseRequestController';
import supplyRequestService from '@services/supplyRequestService';
import purchaseRequestService from '@services/purchaseRequestService';
import { isPricingApprover } from '@utils/isPricingApprover';

const prismaMock = prisma as unknown as {
  department: { findMany: jest.Mock };
  subDepartment: { findFirst: jest.Mock };
};
const isPricingMock = isPricingApprover as jest.Mock;

const techDeptId = 'dept-tech';
const generalDeptId = 'dept-general';
const pricingUser = {
  id: 'u-pricing',
  role: 'EMPLOYEE',
  departmentId: techDeptId,
  subDepartmentId: null,
  secondaryDepartments: [{ departmentId: generalDeptId, subDepartmentId: 'sub-pricing', role: 'EMPLOYEE' }],
};

function mockRes() {
  const res: any = { json: jest.fn().mockReturnThis(), status: jest.fn().mockReturnThis() };
  return res;
}
const next = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  (supplyRequestService.getAllSupplyRequests as jest.Mock).mockResolvedValue({ data: [], pagination: {} });
  (purchaseRequestService.getAllPurchaseRequests as jest.Mock).mockResolvedValue({ data: [], pagination: {} });
  prismaMock.department.findMany.mockResolvedValue([{ code: 'DEPT_TECHNICAL' }, { code: 'DEPT_GENERAL' }]);
  prismaMock.subDepartment.findFirst.mockResolvedValue(null);
});

describe('pricing approver sees cross-department lists', () => {
  it('purchase list passes no dept filter for a pricing approver', async () => {
    isPricingMock.mockResolvedValue(true);
    const req: any = { user: pricingUser, query: {} };
    await purchaseRequestController.getAllPurchaseRequests(req, mockRes(), next);
    const departmentIds = (purchaseRequestService.getAllPurchaseRequests as jest.Mock).mock.calls[0][3];
    expect(departmentIds).toBeUndefined();
  });

  it('purchase list keeps the dept filter for a non-pricing, non-purchasing user', async () => {
    isPricingMock.mockResolvedValue(false);
    const req: any = { user: pricingUser, query: {} };
    await purchaseRequestController.getAllPurchaseRequests(req, mockRes(), next);
    const departmentIds = (purchaseRequestService.getAllPurchaseRequests as jest.Mock).mock.calls[0][3];
    expect(departmentIds).toEqual(expect.arrayContaining([techDeptId, generalDeptId]));
  });

  it('supply list passes no dept/subdept filter for a pricing approver', async () => {
    isPricingMock.mockResolvedValue(true);
    const req: any = {
      user: pricingUser,
      query: {},
      userDepartmentIds: [techDeptId, generalDeptId],
      userSubDepartmentId: null,
    };
    await supplyRequestController.getAllSupplyRequests(req, mockRes(), next);
    const args = (supplyRequestService.getAllSupplyRequests as jest.Mock).mock.calls[0];
    expect(args[3]).toBeUndefined(); // departmentIds
    expect(args[4]).toBeUndefined(); // subDepartmentIds
  });

  it('supply list keeps filters for a non-pricing user', async () => {
    isPricingMock.mockResolvedValue(false);
    const req: any = {
      user: pricingUser,
      query: {},
      userDepartmentIds: [techDeptId, generalDeptId],
      userSubDepartmentId: null,
    };
    await supplyRequestController.getAllSupplyRequests(req, mockRes(), next);
    const args = (supplyRequestService.getAllSupplyRequests as jest.Mock).mock.calls[0];
    expect(args[3]).toEqual([techDeptId, generalDeptId]);
  });
});
