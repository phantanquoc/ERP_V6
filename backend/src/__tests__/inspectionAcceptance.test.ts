/**
 * YCKT conclusion rules + requester-confirmed acceptance:
 *  - ketLuan only CAN_SUA_CHUA | DA_KHAC_PHUC, mucDoHuHong without 'nguy_hiem'
 *  - DA_KHAC_PHUC submit requires tình trạng sau + file → acceptance slip → CHO_NGHIEM_THU
 *  - only the YCKT creator (or ADMIN) confirms; ĐẠT → HOAN_THANH, KHÔNG ĐẠT → DANG_KIEM_TRA
 */

jest.mock('@services/notificationService', () => ({
  __esModule: true,
  default: { notify: jest.fn().mockResolvedValue(undefined) },
}));

const txMock: any = {
  inspectionRequest: { findUnique: jest.fn(), update: jest.fn() },
  inspectionRequestStatusLog: { create: jest.fn() },
  acceptanceHandover: { create: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
};

const mockPrisma: any = {
  $transaction: jest.fn((fn: (tx: any) => unknown) => fn(txMock)),
  inspectionRequest: { findUnique: jest.fn(), update: jest.fn() },
  inspectionRequestStatusLog: { create: jest.fn() },
  acceptanceHandover: { findFirst: jest.fn() },
  user: { findUnique: jest.fn() },
  employee: { findUnique: jest.fn() },
};

jest.mock('@config/database', () => ({ __esModule: true, default: mockPrisma }));

import inspectionRequestService from '@services/inspectionRequestService';
import { InspectionRequestStatus } from '@prisma/client';
import { AuthorizationError, ValidationError } from '@utils/errors';

const tech = { actorId: 'tech-user', actorRole: 'TEAM_LEAD' };
const creator = { actorId: 'yckt-creator', actorRole: 'EMPLOYEE' };

const baseRow = {
  id: 7,
  maYeuCau: 'YC-KT-2026-007',
  trangThai: InspectionRequestStatus.DANG_KIEM_TRA,
  ketQuaKiemTra: 'Lỏng ốc bơm',
  ketLuan: 'DA_KHAC_PHUC',
  createdById: 'yckt-creator',
  createdByName: 'Người tạo YCKT',
  nguoiKiemTra: 'Kỹ thuật A',
  items: [{ tenHeThong: 'Bơm P-01', tinhTrangThietBi: 'Rung', noiDungLoi: 'Lỏng ốc' }],
};

beforeEach(() => {
  jest.clearAllMocks();
  mockPrisma.user.findUnique.mockResolvedValue({ firstName: 'A', lastName: 'Kỹ thuật' });
  mockPrisma.employee.findUnique.mockResolvedValue({ id: 'emp-1' });
  mockPrisma.acceptanceHandover.findFirst.mockResolvedValue(null);
  txMock.acceptanceHandover.create.mockResolvedValue({ id: 'nt-1', maNghiemThu: 'NT-001', maYeuCauSuaChua: 'YC-KT-2026-007', tenHeThongThietBi: 'Bơm P-01' });
  mockPrisma.inspectionRequest.findUnique.mockImplementation((args: { include?: unknown }) =>
    Promise.resolve(args.include ? baseRow : { id: 7, trangThai: baseRow.trangThai }),
  );
});

describe('updateInspectionDetails validation', () => {
  it('rejects removed conclusions (KHONG_CAN / THEO_DOI)', async () => {
    await expect(inspectionRequestService.updateInspectionDetails(7, { ketLuan: 'KHONG_CAN' }, tech)).rejects.toThrow(ValidationError);
    await expect(inspectionRequestService.updateInspectionDetails(7, { ketLuan: 'THEO_DOI' }, tech)).rejects.toThrow(ValidationError);
  });

  it('rejects the removed severity nguy_hiem', async () => {
    await expect(inspectionRequestService.updateInspectionDetails(7, { mucDoHuHong: 'nguy_hiem' }, tech)).rejects.toThrow('Mức độ hư hỏng không hợp lệ');
  });

  it('locks details after submission (non-admin)', async () => {
    mockPrisma.inspectionRequest.findUnique.mockResolvedValue({ id: 7, trangThai: InspectionRequestStatus.CHO_NGHIEM_THU });
    await expect(inspectionRequestService.updateInspectionDetails(7, { ketLuan: 'CAN_SUA_CHUA' }, tech)).rejects.toThrow(ValidationError);
  });
});

describe('submitInspection — Đã khắc phục', () => {
  it('requires tình trạng sau khắc phục', async () => {
    await expect(inspectionRequestService.submitInspection(7, tech, { tinhTrangSau: ' ', fileDinhKem: '/f.pdf' }))
      .rejects.toThrow('Vui lòng nhập tình trạng sau khắc phục');
  });

  it('requires an attached file', async () => {
    await expect(inspectionRequestService.submitInspection(7, tech, { tinhTrangSau: 'Đã siết ốc', fileDinhKem: null }))
      .rejects.toThrow('Vui lòng đính kèm tệp nghiệm thu');
  });

  it('creates an acceptance slip for the YCKT creator and moves to CHO_NGHIEM_THU', async () => {
    await inspectionRequestService.submitInspection(7, tech, { tinhTrangSau: 'Đã siết ốc', fileDinhKem: '/uploads/nt.pdf' });

    expect(txMock.acceptanceHandover.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        inspectionRequestId: 7,
        fileDinhKem: '/uploads/nt.pdf',
        tinhTrangSauSuaChua: 'Đã siết ốc',
        nguoiXacNhanId: 'yckt-creator',
      }),
    });
    expect(txMock.inspectionRequest.update).toHaveBeenCalledWith({ where: { id: 7 }, data: { trangThai: InspectionRequestStatus.CHO_NGHIEM_THU } });
  });

  it('CAN_SUA_CHUA goes to DA_KIEM_TRA without an acceptance slip', async () => {
    const row = { ...baseRow, ketLuan: 'CAN_SUA_CHUA' };
    mockPrisma.inspectionRequest.findUnique.mockResolvedValue(row);
    txMock.inspectionRequest.findUnique.mockResolvedValue({ id: 7, trangThai: InspectionRequestStatus.DANG_KIEM_TRA, maYeuCau: row.maYeuCau });

    await inspectionRequestService.submitInspection(7, tech);
    expect(txMock.acceptanceHandover.create).not.toHaveBeenCalled();
    expect(txMock.inspectionRequest.update).toHaveBeenCalledWith({ where: { id: 7 }, data: { trangThai: InspectionRequestStatus.DA_KIEM_TRA } });
  });
});

describe('confirmAcceptance — by YCKT creator', () => {
  beforeEach(() => {
    txMock.inspectionRequest.findUnique.mockResolvedValue({ id: 7, trangThai: InspectionRequestStatus.CHO_NGHIEM_THU });
    txMock.acceptanceHandover.findFirst.mockResolvedValue({ id: 'nt-1', nguoiXacNhanId: 'yckt-creator', nguoiXacNhanTen: 'Người tạo YCKT' });
  });

  it('ĐẠT → HOAN_THANH', async () => {
    await inspectionRequestService.confirmAcceptance(7, creator, 'DAT');
    expect(txMock.inspectionRequest.update).toHaveBeenCalledWith({ where: { id: 7 }, data: { trangThai: InspectionRequestStatus.HOAN_THANH } });
  });

  it('KHÔNG ĐẠT with reason → back to DANG_KIEM_TRA', async () => {
    await inspectionRequestService.confirmAcceptance(7, creator, 'KHONG_DAT', 'Máy vẫn rung');
    expect(txMock.inspectionRequest.update).toHaveBeenCalledWith({ where: { id: 7 }, data: { trangThai: InspectionRequestStatus.DANG_KIEM_TRA } });
  });

  it('technician cannot confirm their own fix', async () => {
    await expect(inspectionRequestService.confirmAcceptance(7, tech, 'DAT')).rejects.toThrow(AuthorizationError);
    expect(txMock.inspectionRequest.update).not.toHaveBeenCalled();
  });

  it('only from CHO_NGHIEM_THU', async () => {
    txMock.inspectionRequest.findUnique.mockResolvedValue({ id: 7, trangThai: InspectionRequestStatus.DANG_KIEM_TRA });
    await expect(inspectionRequestService.confirmAcceptance(7, creator, 'DAT')).rejects.toThrow('Chỉ xác nhận nghiệm thu khi phiếu đang Chờ nghiệm thu');
  });
});

describe('complete', () => {
  it('blocks Đã khắc phục from bypassing confirmation', async () => {
    mockPrisma.inspectionRequest.findUnique.mockResolvedValue({ trangThai: InspectionRequestStatus.CHO_NGHIEM_THU, ketLuan: 'DA_KHAC_PHUC', _count: { repairRequests: 0 } });
    await expect(inspectionRequestService.complete(7, tech)).rejects.toThrow('phải được người tạo yêu cầu xác nhận nghiệm thu');
  });

  it('requires a created YCSC for Cần sửa chữa', async () => {
    mockPrisma.inspectionRequest.findUnique.mockResolvedValue({ trangThai: InspectionRequestStatus.DA_KIEM_TRA, ketLuan: 'CAN_SUA_CHUA', _count: { repairRequests: 0 } });
    await expect(inspectionRequestService.complete(7, tech)).rejects.toThrow('đã tạo yêu cầu sửa chữa');
  });
});
