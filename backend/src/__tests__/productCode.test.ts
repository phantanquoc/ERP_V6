import {
  removeDiacritics,
  abbreviateVietnamese,
  categoryAbbr,
  maxSequenceForPrefix,
  suggestProductCode,
  rewriteCodePrefix,
  PRODUCT_CODE_PATTERN,
} from '@utils/productCode';

describe('removeDiacritics', () => {
  it('strips Vietnamese tone marks', () => {
    expect(removeDiacritics('Nguyên liệu trái')).toBe('Nguyen lieu trai');
    expect(removeDiacritics('Mít sấy Lá Bàng')).toBe('Mit say La Bang');
  });

  it('maps đ and Đ, which NFD does not decompose', () => {
    expect(removeDiacritics('đông lạnh')).toBe('dong lanh');
    expect(removeDiacritics('Đường Maltose')).toBe('Duong Maltose');
    expect(removeDiacritics('Đèn côn trùng')).toBe('Den con trung');
  });

  it('handles ư/Ư', () => {
    expect(removeDiacritics('Ưu tiên')).toBe('Uu tien');
  });

  it('tolerates empty input', () => {
    expect(removeDiacritics('')).toBe('');
  });
});

describe('abbreviateVietnamese', () => {
  it('takes the first letter of each word, uppercased and de-accented', () => {
    expect(abbreviateVietnamese('Mít trái lá bàng')).toBe('MTLB');
    expect(abbreviateVietnamese('Nguyên liệu đông lạnh')).toBe('NLDL');
    expect(abbreviateVietnamese('Keo đèn côn trùng')).toBe('KDCT');
  });

  it('keeps digit groups whole because they carry meaning in product names', () => {
    expect(abbreviateVietnamese('Mít sấy lá bàng B 7')).toBe('MSLBB7');
    expect(abbreviateVietnamese('Mít sấy vụn nhỏ 12Kg')).toBe('MSVN12K');
  });

  it('keeps acronyms intact instead of reducing them to an initial', () => {
    // Matches the convention in existing prod codes BB02-TPE60 / BB03-MPE50.
    expect(abbreviateVietnamese('Túi PE 60')).toBe('TPE60');
    expect(abbreviateVietnamese('Màng PE 50cm')).toBe('MPE50C');
  });

  it('splits letter/digit boundaries so a unit suffix does not swallow the number', () => {
    // "50cm" must become 50 + cm; otherwise it is neither number nor acronym and
    // collapses to a bare "5".
    expect(abbreviateVietnamese('Màng PE 50cm')).toContain('50');
  });

  it('treats punctuation and symbols as separators', () => {
    expect(abbreviateVietnamese('Thùng carton 5 lớp 355*275')).toBe('TC5L355275');
    expect(abbreviateVietnamese('Mít sấy vụn mịn ( 10 Kg)')).toBe('MSVM10K');
  });

  it('caps length when maxLen is given', () => {
    expect(abbreviateVietnamese('Mít trái lá bàng', 6)).toBe('MTLB');
    expect(abbreviateVietnamese('Thùng carton 5 lớp không cán', 6)).toBe('TC5LKC');
  });

  it('truncates on a part boundary so numbers are never cut in half', () => {
    // "Túi PE 60*100" -> parts T|PE|60|100; capping at 6 keeps TPE60, never "TPE601".
    expect(abbreviateVietnamese('Túi PE 60*100', 6)).toBe('TPE60');
    expect(abbreviateVietnamese('Bao bạc nhôm 57*87', 6)).toBe('BBN57');
  });

  it('falls back to a hard slice when the very first part exceeds maxLen', () => {
    expect(abbreviateVietnamese('123456789', 4)).toBe('1234');
  });

  it('handles a single word', () => {
    expect(abbreviateVietnamese('Dép')).toBe('D');
    expect(abbreviateVietnamese('Yếm')).toBe('Y');
  });

  it('returns empty for input with no letters or digits', () => {
    expect(abbreviateVietnamese('')).toBe('');
    expect(abbreviateVietnamese('   ')).toBe('');
    expect(abbreviateVietnamese('*** ---')).toBe('');
  });
});

describe('categoryAbbr — the 8 standard categories', () => {
  const cases: Array<[string, string]> = [
    ['Nguyên liệu trái', 'NLT'],
    ['Nguyên liệu đông lạnh', 'NLDL'],
    ['Phụ liệu', 'PL'],
    ['Bao bì', 'BB'],
    ['Công cụ dụng cụ', 'CCDC'],
    ['Thành phẩm sấy', 'TPS'],
    ['Thành phẩm đông lạnh', 'TPDL'],
    ['Nhiên liệu', 'NL'],
  ];

  it.each(cases)('%s -> %s', (name, expected) => {
    expect(categoryAbbr(name)).toBe(expected);
  });

  it('produces no duplicate abbreviations across the eight categories', () => {
    const abbrs = cases.map(([name]) => categoryAbbr(name));
    expect(new Set(abbrs).size).toBe(abbrs.length);
  });

  it('collides when two names share initials — callers must reject this', () => {
    // Documents the known limitation: the service layer blocks it at save time.
    expect(categoryAbbr('Nguyên liệu')).toBe(categoryAbbr('Nhiên liệu'));
  });
});

describe('maxSequenceForPrefix', () => {
  it('reads the highest sequence for the prefix', () => {
    const codes = ['NLT-001-A', 'NLT-007-B', 'NLT-003-C'];
    expect(maxSequenceForPrefix('NLT', codes)).toBe(7);
  });

  it('ignores other prefixes, including ones sharing a leading substring', () => {
    const codes = ['NLT-009-A', 'NLTT-050-B', 'NL-020-C'];
    expect(maxSequenceForPrefix('NL', codes)).toBe(20);
    expect(maxSequenceForPrefix('NLT', codes)).toBe(9);
  });

  it('returns 0 when nothing matches', () => {
    expect(maxSequenceForPrefix('TPS', ['NLT-001-A'])).toBe(0);
    expect(maxSequenceForPrefix('TPS', [])).toBe(0);
  });

  it('skips codes whose sequence segment is not numeric', () => {
    // Legacy two-segment codes such as NLT-TMITL must not poison the counter.
    expect(maxSequenceForPrefix('NLT', ['NLT-TMITL', 'NLT-002-X'])).toBe(2);
  });
});

describe('suggestProductCode', () => {
  it('builds category-sequence-name and counts per category', () => {
    expect(
      suggestProductCode({
        tenSanPham: 'Mít trái lá bàng',
        loaiSanPham: 'Nguyên liệu trái',
        existingCodes: ['NLT-001-TMLB', 'NLT-002-TMSS'],
      })
    ).toBe('NLT-003-MTLB');
  });

  it('starts each category at 001 independently', () => {
    const existing = ['NLT-012-X'];
    expect(
      suggestProductCode({ tenSanPham: 'Bao tay vải', loaiSanPham: 'Bao bì', existingCodes: existing })
    ).toBe('BB-001-BTV');
  });

  it('matches the documented example', () => {
    expect(
      suggestProductCode({
        tenSanPham: 'Mít trái lá bàng',
        loaiSanPham: 'Nguyên liệu trái',
        existingCodes: [],
      })
    ).toBe('NLT-001-MTLB');
  });

  it('keeps the name part long enough to tell similar products apart', () => {
    // At a 6-char cap these two collapsed to the same tail (MSLBLV), which is why the
    // limit is 10. The sequence differs regardless, but the tail should stay meaningful.
    const a = suggestProductCode({
      tenSanPham: 'Mít sấy Lá Bàng loại vụn to',
      loaiSanPham: 'Thành phẩm sấy',
      existingCodes: [],
    });
    const b = suggestProductCode({
      tenSanPham: 'Mít sấy Lá Bàng loại vụn nhỏ',
      loaiSanPham: 'Thành phẩm sấy',
      existingCodes: [],
    });
    const tailOf = (code: string) => code.split('-')[2];
    expect(tailOf(a)).not.toBe(tailOf(b));
  });

  it('returns empty when the category is missing — prefix is not derivable', () => {
    expect(suggestProductCode({ tenSanPham: 'Mít trái', loaiSanPham: null, existingCodes: [] })).toBe('');
    expect(suggestProductCode({ tenSanPham: 'Mít trái', loaiSanPham: '', existingCodes: [] })).toBe('');
  });

  it('still yields a valid code when the name abbreviates to nothing', () => {
    const code = suggestProductCode({ tenSanPham: '***', loaiSanPham: 'Bao bì', existingCodes: [] });
    expect(code).toBe('BB-001-X');
    expect(code).toMatch(PRODUCT_CODE_PATTERN);
  });

  it('produces codes matching the documented pattern', () => {
    const code = suggestProductCode({
      tenSanPham: 'Thùng carton 5 lớp 355*275',
      loaiSanPham: 'Bao bì',
      existingCodes: [],
    });
    expect(code).toMatch(PRODUCT_CODE_PATTERN);
  });
});

describe('regression: the SPNaN bug', () => {
  // The old code filtered `maSanPham: { startsWith: 'SP' }`, which also matched real
  // prod codes like SPK-MSV2 and SPD-XOAIK20. parseInt('K-MSV2') is NaN, so the
  // generated code came out as the literal string 'SPNaN'.
  it('does not produce NaN when codes share a leading substring with the prefix', () => {
    const prodLikeCodes = ['SPK-MSV2', 'SPD-XOAIK20', 'SPK-MIB7'];
    const code = suggestProductCode({
      tenSanPham: 'Mít sấy Lá Bàng loại A 7 kg',
      loaiSanPham: 'Thành phẩm sấy',
      existingCodes: prodLikeCodes,
    });
    expect(code).not.toContain('NaN');
    expect(code).toMatch(PRODUCT_CODE_PATTERN);
    // 'Thành phẩm sấy' -> TPS, which none of the SPK/SPD codes belong to, so it starts at 001.
    expect(code.startsWith('TPS-001-')).toBe(true);
  });

  it('maxSequenceForPrefix ignores codes that merely start with the same letters', () => {
    // 'SP' must not absorb SPK-/SPD- codes.
    expect(maxSequenceForPrefix('SP', ['SPK-MSV2', 'SPD-XOAIK20'])).toBe(0);
  });
});

describe('rewriteCodePrefix', () => {
  it('swaps the category segment and keeps sequence + name', () => {
    expect(rewriteCodePrefix('NLT-001-MTLB', 'NLTT')).toBe('NLTT-001-MTLB');
  });

  it('leaves hand-written codes that are not three segments alone', () => {
    // Pre-cutover prod codes look like this; rewriting them would corrupt them.
    expect(rewriteCodePrefix('NLT-TMITL', 'NLTT')).toBe('NLT-TMITL');
    expect(rewriteCodePrefix('BB01-CT', 'BB')).toBe('BB01-CT');
    expect(rewriteCodePrefix('SPNaN', 'TPS')).toBe('SPNaN');
  });

  it('returns the input unchanged on empty arguments', () => {
    expect(rewriteCodePrefix('', 'NLT')).toBe('');
    expect(rewriteCodePrefix('NLT-001-A', '')).toBe('NLT-001-A');
  });
});
