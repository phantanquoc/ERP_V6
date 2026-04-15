import { execSync } from 'child_process';
import path from 'path';
import prisma from '@config/database';

jest.setTimeout(120000);

const seededProductCodes = ['SP-101', 'SP-102', 'SP-103', 'SP-104', 'SP-105', 'SP-106', 'SP-107'];
const seededReceiptCodes = ['PN202604150001', 'PN202604150002', 'PN202604150003'];
const seededIssueCodes = ['PX-20260415-0001', 'PX-20260415-0002', 'PX-20260415-0003'];
const seededLotNames = ['Lô NVL-0426-A', 'Lô NVL-DP-01', 'Lô BB-0426-A', 'Lô BB-DP-01', 'Lô TB-0426-A'];

describe('warehouse demo seed baseline', () => {
  beforeAll(async () => {
    const backendRoot = path.resolve(__dirname, '../..');
    const env = {
      ...process.env,
      DATABASE_URL:
        process.env.DATABASE_URL ||
        'postgresql://erp_user:erp_password_change_me@localhost:5432/erp_database?schema=public&connection_limit=30',
      JWT_SECRET: process.env.JWT_SECRET || 'your_super_secret_jwt_key_change_me',
    };

    execSync('npm run prisma:seed', { cwd: backendRoot, env, stdio: 'pipe' });
    execSync('npm run prisma:seed', { cwd: backendRoot, env, stdio: 'pipe' });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('creates the canonical seeded warehouse products', async () => {
    const products = await prisma.internationalProduct.findMany({
      where: {
        maSanPham: {
          in: seededProductCodes,
        },
      },
      orderBy: {
        maSanPham: 'asc',
      },
    });

    expect(products.map((product) => product.maSanPham)).toEqual(seededProductCodes);
  });

  it('creates deterministic warehouse documents without duplicates after reseed', async () => {
    const [receipts, issues] = await Promise.all([
      prisma.warehouseReceipt.findMany({
        where: {
          maPhieuNhap: {
            in: seededReceiptCodes,
          },
        },
        orderBy: {
          maPhieuNhap: 'asc',
        },
      }),
      prisma.warehouseIssue.findMany({
        where: {
          maPhieuXuat: {
            in: seededIssueCodes,
          },
        },
        orderBy: {
          maPhieuXuat: 'asc',
        },
      }),
    ]);

    expect(receipts.map((receipt) => receipt.maPhieuNhap)).toEqual(seededReceiptCodes);
    expect(issues.map((issue) => issue.maPhieuXuat)).toEqual(seededIssueCodes);
    expect(receipts.map((receipt) => receipt.ngayNhap.toISOString())).toEqual([
      '2026-04-15T08:00:00.000Z',
      '2026-04-15T09:15:00.000Z',
      '2026-04-15T10:30:00.000Z',
    ]);
    expect(issues.map((issue) => issue.ngayXuat.toISOString())).toEqual([
      '2026-04-15T11:00:00.000Z',
      '2026-04-15T13:30:00.000Z',
      '2026-04-15T15:00:00.000Z',
    ]);
  });

  it('recreates the canonical demo lots with coherent stock records', async () => {
    const lots = await prisma.lot.findMany({
      where: {
        tenLo: {
          in: seededLotNames,
        },
      },
      include: {
        lotProducts: {
          include: {
            internationalProduct: true,
          },
        },
        warehouse: true,
      },
      orderBy: {
        tenLo: 'asc',
      },
    });

    expect(lots).toHaveLength(5);

    const packagingLot = lots.find((lot) => lot.tenLo === 'Lô BB-0426-A');
    const materialLot = lots.find((lot) => lot.tenLo === 'Lô NVL-0426-A');
    const equipmentLot = lots.find((lot) => lot.tenLo === 'Lô TB-0426-A');
    const emptyReserveLots = lots.filter((lot) => ['Lô NVL-DP-01', 'Lô BB-DP-01'].includes(lot.tenLo));

    expect(packagingLot?.lotProducts.map((item) => item.internationalProduct.maSanPham).sort()).toEqual(['SP-102', 'SP-103', 'SP-104']);
    expect(materialLot?.lotProducts.map((item) => item.internationalProduct.maSanPham).sort()).toEqual(['SP-101', 'SP-105']);
    expect(equipmentLot?.lotProducts.map((item) => item.internationalProduct.maSanPham).sort()).toEqual(['SP-106', 'SP-107']);
    expect(emptyReserveLots.every((lot) => lot.lotProducts.length === 0)).toBe(true);
  });
});
