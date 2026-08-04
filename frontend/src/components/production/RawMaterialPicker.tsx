import React, { useState, useMemo } from 'react';
import { Search, X, ChevronDown, PackageSearch, Loader2 } from 'lucide-react';
import type { RawMaterial } from '../../services/internationalProductService';

// ─── Helpers ───────────────────────────────────────────────────────────────

/** 8549 → "8.549" — thousands separator only, stock is always whole Kg in practice. */
const formatStock = (value: number): string =>
  new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(value);

// ─── Component ─────────────────────────────────────────────────────────────

interface RawMaterialPickerProps {
  products: RawMaterial[];
  value: string;
  onChange: (productId: string) => void;
  loading?: boolean;
  disabled?: boolean;
  /** True when the fetch failed, so the overlay can say so instead of showing an empty list. */
  isError?: boolean;
  onRetry?: () => void;
}

const RawMaterialPicker: React.FC<RawMaterialPickerProps> = ({
  products,
  value,
  onChange,
  loading,
  disabled,
  isError,
  onRetry,
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  // Stock-only is the default on every open: most materials in the catalogue hold
  // no stock, and picking one of those is a dead end the worker only discovers a
  // step later. The reveal control stays available for material that has arrived
  // before the warehouse issued its receipt.
  const [showAll, setShowAll] = useState(false);

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === value),
    [products, value],
  );

  const inStockCount = useMemo(
    () => products.filter((p) => p.tongTonKho > 0).length,
    [products],
  );
  const hiddenCount = products.length - inStockCount;

  // Distinct categories for chip filter, scoped to whatever the stock toggle shows
  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const p of products) {
      if (!showAll && p.tongTonKho <= 0) continue;
      if (p.loaiSanPham) set.add(p.loaiSanPham);
    }
    return Array.from(set).sort();
  }, [products, showAll]);

  // Filter by stock, then by search term OR category chip (chips hidden when searching)
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const byStock = showAll ? products : products.filter((p) => p.tongTonKho > 0);

    const matched = byStock.filter((p) => {
      if (term) {
        return (
          p.maSanPham.toLowerCase().includes(term) ||
          p.tenSanPham.toLowerCase().includes(term) ||
          (p.loaiSanPham || '').toLowerCase().includes(term)
        );
      }
      if (categoryFilter) {
        return p.loaiSanPham === categoryFilter;
      }
      return true;
    });

    // When revealing everything, keep the usable options on top.
    if (!showAll) return matched;
    return [...matched].sort((a, b) => {
      const aHas = a.tongTonKho > 0 ? 0 : 1;
      const bHas = b.tongTonKho > 0 ? 0 : 1;
      return aHas - bHas || a.maSanPham.localeCompare(b.maSanPham);
    });
  }, [products, search, categoryFilter, showAll]);

  const handlePick = (productId: string) => {
    onChange(productId);
    setOpen(false);
    setSearch('');
    setCategoryFilter(null);
    setShowAll(false);
  };

  const handleClose = () => {
    setOpen(false);
    setSearch('');
    setCategoryFilter(null);
    setShowAll(false);
  };

  const handleToggleStock = (next: boolean) => {
    setShowAll(next);
    // The previous category may not exist in the newly-scoped list.
    setCategoryFilter(null);
  };

  return (
    <div>
      {/* Trigger button */}
      <button
        type="button"
        disabled={disabled || loading}
        onClick={() => setOpen(true)}
        className="w-full min-h-[52px] px-3 py-2 border border-gray-300 rounded-lg text-lg text-left flex items-center justify-between gap-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-400"
      >
        <span className={selectedProduct ? 'text-gray-900 truncate' : 'text-gray-400'}>
          {selectedProduct
            ? `${selectedProduct.maSanPham} – ${selectedProduct.tenSanPham}`
            : loading
              ? 'Đang tải...'
              : '-- Chọn sản phẩm --'}
        </span>
        <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
      </button>

      {/* Overlay panel */}
      {open && (
        <div className="fixed inset-0 z-50 flex flex-col bg-white">
          {/* Header: search + close */}
          <div className="sticky top-0 bg-white border-b px-4 py-3 space-y-3">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  autoFocus
                  type="text"
                  inputMode="search"
                  placeholder="Tìm theo mã, tên hoặc loại..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full min-h-[44px] pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200"
                aria-label="Đóng"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Stock filter — always shown so the worker knows a filter is active */}
            {!loading && !isError && products.length > 0 && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleToggleStock(false)}
                  className={`px-4 min-h-[44px] rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                    !showAll ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Có hàng ({inStockCount})
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleStock(true)}
                  className={`px-4 min-h-[44px] rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                    showAll ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Tất cả ({products.length})
                </button>
                {!showAll && hiddenCount > 0 && (
                  <span className="text-xs text-gray-500">Đang ẩn {hiddenCount} mục hết hàng</span>
                )}
              </div>
            )}

            {/* Category chips — hidden while searching, shown only when > 1 category */}
            {!search.trim() && categories.length > 1 && (
              <div className="flex items-center gap-2 overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setCategoryFilter(null)}
                  className={`px-4 min-h-[44px] rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                    categoryFilter === null
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Tất cả loại
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategoryFilter(cat)}
                    className={`px-4 min-h-[44px] rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                      categoryFilter === cat
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <Loader2 className="w-10 h-10 mb-2 animate-spin" />
                <p className="text-sm">Đang tải danh sách nguyên liệu...</p>
              </div>
            ) : isError ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                <PackageSearch className="w-10 h-10 mb-2 text-red-400" />
                <p className="text-sm mb-3">Không tải được danh sách nguyên liệu</p>
                {onRetry && (
                  <button
                    type="button"
                    onClick={onRetry}
                    className="px-5 min-h-[44px] rounded-lg bg-blue-600 text-white text-sm font-medium"
                  >
                    Thử lại
                  </button>
                )}
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <PackageSearch className="w-10 h-10 mb-2" />
                {search.trim() ? (
                  <p className="text-sm">Không tìm thấy sản phẩm phù hợp</p>
                ) : !showAll && hiddenCount > 0 ? (
                  <>
                    <p className="text-sm mb-3">Không có nguyên liệu nào còn hàng trong kho</p>
                    <button
                      type="button"
                      onClick={() => handleToggleStock(true)}
                      className="px-5 min-h-[44px] rounded-lg bg-blue-600 text-white text-sm font-medium"
                    >
                      Xem tất cả {products.length} nguyên liệu
                    </button>
                  </>
                ) : (
                  <p className="text-sm">Chưa có nguyên liệu nào trong danh mục</p>
                )}
              </div>
            ) : (
              filtered.map((p) => {
                const active = p.id === value;
                const outOfStock = p.tongTonKho <= 0;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handlePick(p.id)}
                    className={`w-full text-left rounded-xl border px-4 py-3 min-h-[60px] transition-colors ${
                      active
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-lg font-semibold text-gray-900">{p.maSanPham}</span>
                      <span
                        className={`text-sm font-medium shrink-0 ${
                          outOfStock ? 'text-gray-400' : 'text-green-700'
                        }`}
                      >
                        {outOfStock
                          ? 'Hết hàng'
                          : `${formatStock(p.tongTonKho)} ${p.donViTinh || 'Kg'}`}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-sm text-gray-500 truncate">{p.tenSanPham}</span>
                      {p.loaiSanPham && (
                        <span className="text-xs text-gray-500 shrink-0">– {p.loaiSanPham}</span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default RawMaterialPicker;
