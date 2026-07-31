import React, { useState, useMemo } from 'react';
import { Search, X, ChevronDown, PackageSearch } from 'lucide-react';
import type { InternationalProduct } from '../../services/internationalProductService';

// ─── Component ─────────────────────────────────────────────────────────────

interface RawMaterialPickerProps {
  products: InternationalProduct[];
  value: string;
  onChange: (productId: string) => void;
  loading?: boolean;
  disabled?: boolean;
}

const RawMaterialPicker: React.FC<RawMaterialPickerProps> = ({
  products,
  value,
  onChange,
  loading,
  disabled,
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === value),
    [products, value],
  );

  // Distinct categories for chip filter
  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const p of products) {
      if (p.loaiSanPham) set.add(p.loaiSanPham);
    }
    return Array.from(set).sort();
  }, [products]);

  // Filter by search term OR category chip (chips hidden when searching)
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return products.filter((p) => {
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
  }, [products, search, categoryFilter]);

  const handlePick = (productId: string) => {
    onChange(productId);
    setOpen(false);
    setSearch('');
    setCategoryFilter(null);
  };

  const handleClose = () => {
    setOpen(false);
    setSearch('');
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
                  Tất cả
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
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <PackageSearch className="w-10 h-10 mb-2" />
                <p className="text-sm">Không tìm thấy sản phẩm phù hợp</p>
              </div>
            ) : (
              filtered.map((p) => {
                const active = p.id === value;
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
                    <span className="text-lg font-semibold text-gray-900">{p.maSanPham}</span>
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
