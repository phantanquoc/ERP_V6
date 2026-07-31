import { deriveMaterialStandardType } from '@services/materialStandardService';

/**
 * Loại định mức sinh từ loaiSanPham của item đầu vào → đầu ra.
 * Hàm thuần, không đụng DB — item đã được service include sẵn internationalProduct.
 */

type Item = {
  tiLe: number;
  internationalProduct?: { loaiSanPham: string | null } | null;
};

const item = (tiLe: number, loaiSanPham?: string | null): Item => ({
  tiLe,
  internationalProduct: loaiSanPham === undefined ? null : { loaiSanPham },
});

describe('deriveMaterialStandardType', () => {
  it('ghép một loại đầu vào với một loại đầu ra', () => {
    const result = deriveMaterialStandardType(
      [item(100, 'Nguyên liệu')],
      [item(83, 'Thành phẩm'), item(12.5, 'Thành phẩm')]
    );
    expect(result).toBe('Nguyên liệu → Thành phẩm');
  });

  it('ghép nhiều loại đầu ra khác biệt theo thứ tự tiLe giảm dần', () => {
    const result = deriveMaterialStandardType(
      [item(100, 'Nguyên liệu trái')],
      [item(20, 'Nguyên liệu đông'), item(75, 'Thành phẩm')]
    );
    expect(result).toBe('Nguyên liệu trái → Thành phẩm + Nguyên liệu đông');
  });

  it('bỏ qua item không link được sản phẩm khi phía đó còn item khác đã link', () => {
    const result = deriveMaterialStandardType(
      [item(100, 'Nguyên liệu')],
      [item(83, 'Thành phẩm'), item(12.5)]
    );
    expect(result).toBe('Nguyên liệu → Thành phẩm');
  });

  it('trả "Chưa xác định" cho phía không có item nào link được sản phẩm', () => {
    const result = deriveMaterialStandardType(
      [item(100, 'Nguyên liệu')],
      [item(83), item(12.5)]
    );
    expect(result).toBe('Nguyên liệu → Chưa xác định');
  });

  it('trả null khi một phía không có item nào', () => {
    expect(deriveMaterialStandardType([], [item(100, 'Thành phẩm')])).toBeNull();
    expect(deriveMaterialStandardType([item(100, 'Nguyên liệu')], [])).toBeNull();
  });
});
