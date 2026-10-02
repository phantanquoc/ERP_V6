/**
 * Supply request (YCCC) multi-file attachments — mirrors YCKT a5e683d:
 * create slices to SUPPLY_MAX_FILES, update is append-only and rejects totals > 4,
 * and stored names follow the request code (YC-CC-2026-001-N.ext).
 */

const mockTx: any = {
  supplyRequestItem: { deleteMany: jest.fn(), createMany: jest.fn() },
  supplyRequest: {
    findFirst: jest.fn().mockResolvedValue(null),
    create: jest.fn(),
    update: jest.fn(),
    findUnique: jest.fn(),
  },
};

jest.mock('@config/database', () => ({
  __esModule: true,
  default: {
    supplyRequest: { findUnique: jest.fn(), update: jest.fn(), findFirst: jest.fn() },
    supplyRequestItem: { deleteMany: jest.fn(), createMany: jest.fn() },
    internationalProduct: { findFirst: jest.fn() },
    employee: { findUnique: jest.fn(), findMany: jest.fn() },
    $transaction: jest.fn((fn: any) => fn(mockTx)),
  },
}));

jest.mock('@utils/errors', () => {
  class ValidationError extends Error { statusCode = 400; constructor(m: string) { super(m); this.name = 'ValidationError'; } }
  class NotFoundError extends Error { statusCode = 404; constructor(m: string) { super(m); this.name = 'NotFoundError'; } }
  class ConflictError extends Error { statusCode = 409; constructor(m: string) { super(m); this.name = 'ConflictError'; } }
  return { ValidationError, NotFoundError, ConflictError, AppError: Error };
});

jest.mock('@services/notificationService', () => ({
  __esModule: true,
  default: { notify: jest.fn().mockResolvedValue(undefined) },
}));

// The rename helper touches the real FS — mirror multer's random names through it
// so assertions see what production would store, without touching disk.
const mockRename = jest.fn(
  (_folder: string, code: string, urls: string[], startIndex = 1): string[] =>
    urls.map((u, i) => {
      const ext = u.slice(u.lastIndexOf('.'));
      return `/uploads/supply-requests/${code}-${startIndex + i}${ext}`;
    }),
);
jest.mock('@middlewares/upload', () => ({
  __esModule: true,
  getFileUrl: (folder: string, filename: string) => `/uploads/${folder}/${filename}`,
  renameAttachmentsByCode: (...args: unknown[]) => mockRename(...(args as [string, string, string[], number])),
  deleteUploadedFile: jest.fn(),
}));

import prisma from '@config/database';
import supplyRequestService, { SUPPLY_MAX_FILES } from '@services/supplyRequestService';

const prismaMock = prisma as jest.Mocked<typeof prisma>;

const multerName = (tag: string) => `/uploads/supply-requests/giay-${tag}.pdf`;

beforeEach(() => {
  // clearAllMocks (not resetAllMocks): the latter would wipe mockRename's
  // implementation, making every rename return undefined.
  jest.clearAllMocks();
  (prismaMock.$transaction as jest.Mock).mockImplementation((fn: any) => fn(mockTx));
  (prismaMock.employee as any).findMany.mockResolvedValue([]);
  mockTx.supplyRequest.create.mockImplementation(({ data }: any) => Promise.resolve({ id: 'sr-1', maYeuCau: 'YC-CC-2026-001', ...data }));
  // The post-create re-read returns the just-created row, including its files.
  mockTx.supplyRequest.findUnique.mockImplementation(() => {
    const lastCreate = mockTx.supplyRequest.create.mock.calls.at(-1)?.[0]?.data;
    return Promise.resolve({ id: 'sr-1', maYeuCau: 'YC-CC-2026-001', tepDinhKem: lastCreate?.tepDinhKem ?? [] });
  });
});

describe('supply attachments', () => {
  it(`create slices tepDinhKem to ${SUPPLY_MAX_FILES} and renames by code`, async () => {
    (prismaMock.employee as any).findUnique.mockResolvedValue({
      id: 'emp-1',
      employeeCode: 'NV-1',
      user: { firstName: 'A', lastName: 'Nguyen' },
    });
    (prismaMock as any).internationalProduct.findFirst.mockResolvedValue(null);
    await supplyRequestService.createSupplyRequest({
      employeeId: 'emp-1',
      maNhanVien: 'NV-1',
      tenNhanVien: 'Nguyen A',
      boPhan: 'Kho',
      items: [{ phanLoai: 'Khác', tenGoi: 'Giay', soLuong: 1, donViTinh: 'cái' }],
      mucDichYeuCau: 'Test',
      mucDoUuTien: 'Trung bình',
      tepDinhKem: ['a', 'b', 'c', 'd', 'e'].map((t) => multerName(t)),
    } as never);
    const createdData = mockTx.supplyRequest.create.mock.calls[0][0].data;
    expect(createdData.tepDinhKem).toHaveLength(SUPPLY_MAX_FILES);
    // DB persists the renamed URLs (YC-CC-2026-001-{1..4}.pdf)
    const persisted = (prismaMock.supplyRequest.update as jest.Mock).mock.calls[0][0].data.tepDinhKem;
    expect(persisted).toEqual([
      '/uploads/supply-requests/YC-CC-2026-001-1.pdf',
      '/uploads/supply-requests/YC-CC-2026-001-2.pdf',
      '/uploads/supply-requests/YC-CC-2026-001-3.pdf',
      '/uploads/supply-requests/YC-CC-2026-001-4.pdf',
    ]);
  });

  // The real edit form only sends files without items through this branch.
  it('update appends new files to existing ones, continuing the numbering', async () => {
    (prismaMock.supplyRequest.findUnique as jest.Mock)
      .mockResolvedValueOnce({ id: 'sr-1', maYeuCau: 'YC-CC-2026-001', trangThai: 'Chưa cung cấp' })
      .mockResolvedValueOnce({ tepDinhKem: ['/uploads/supply-requests/YC-CC-2026-001-1.pdf'] })
      .mockResolvedValue({ id: 'sr-1' });
    await supplyRequestService.updateSupplyRequest('sr-1', {
      tepDinhKem: [multerName('new')],
    } as never);
    expect(mockRename).toHaveBeenCalledWith(
      'supply-requests',
      'YC-CC-2026-001',
      [multerName('new')],
      2,
    );
    expect(prismaMock.supplyRequest.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'sr-1' },
        data: expect.objectContaining({
          tepDinhKem: [
            '/uploads/supply-requests/YC-CC-2026-001-1.pdf',
            '/uploads/supply-requests/YC-CC-2026-001-2.pdf',
          ],
        }),
      }),
    );
  });

  // The real edit form always sends items alongside files, which takes the
  // transaction branch rather than the header-only one.
  it('update with items appends files inside the transaction', async () => {
    (prismaMock.supplyRequest.findUnique as jest.Mock)
      .mockResolvedValueOnce({ id: 'sr-1', maYeuCau: 'YC-CC-2026-001', trangThai: 'Chưa cung cấp' })
      .mockResolvedValueOnce({
        trangThai: 'Chưa cung cấp',
        items: [{ id: 'it-1', phanLoai: 'Khác', tenGoi: 'Giay', donViTinh: 'cái', soLuong: 1, isNewProduct: false, fulfilledQty: 0, fulfillmentStatus: 'Chờ xử lý' }],
      })
      .mockResolvedValueOnce({ tepDinhKem: ['/uploads/supply-requests/YC-CC-2026-001-1.pdf'] })
      .mockResolvedValue({ id: 'sr-1' });

    await supplyRequestService.updateSupplyRequest('sr-1', {
      items: [{ id: 'it-1', phanLoai: 'Khác', tenGoi: 'Giay', soLuong: 2, donViTinh: 'cái' }],
      ghiChu: 'sua',
      tepDinhKem: [multerName('new')],
    } as never);

    expect(mockTx.supplyRequest.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'sr-1' },
        data: expect.objectContaining({
          ghiChu: 'sua',
          tepDinhKem: [
            '/uploads/supply-requests/YC-CC-2026-001-1.pdf',
            '/uploads/supply-requests/YC-CC-2026-001-2.pdf',
          ],
        }),
      }),
    );
  });

  it('update rejects when total exceeds max files', async () => {
    (prismaMock.supplyRequest.findUnique as jest.Mock)
      .mockResolvedValueOnce({ id: 'sr-1', maYeuCau: 'YC-CC-2026-001', trangThai: 'Chưa cung cấp' })
      .mockResolvedValueOnce({
        tepDinhKem: [
          '/uploads/supply-requests/YC-CC-2026-001-1.pdf',
          '/uploads/supply-requests/YC-CC-2026-001-2.pdf',
          '/uploads/supply-requests/YC-CC-2026-001-3.pdf',
        ],
      });
    await expect(
      supplyRequestService.updateSupplyRequest('sr-1', {
        tepDinhKem: [multerName('d'), multerName('e')],
      } as never),
    ).rejects.toThrow('tối đa 4 tệp');
    expect(mockRename).not.toHaveBeenCalled();
    expect(prismaMock.supplyRequest.update).not.toHaveBeenCalled();
  });
});
