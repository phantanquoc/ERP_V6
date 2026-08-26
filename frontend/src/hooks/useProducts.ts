import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import internationalProductService from '../services/internationalProductService';
import type { CreateProductData, UpdateProductData } from '../services/internationalProductService';

export const productKeys = {
  all: ['products'] as const,
  lists: () => [...productKeys.all, 'list'] as const,
  list: (filters: Record<string, any>) => [...productKeys.lists(), filters] as const,
  details: () => [...productKeys.all, 'detail'] as const,
  detail: (id: string) => [...productKeys.details(), id] as const,
};

/** Columns the list can be sorted by. Mirrors the backend whitelist. */
export const PRODUCT_SORT_FIELDS = [
  'maSanPham',
  'tenSanPham',
  'loaiSanPham',
  'donViTinh',
  'moTaSanPham',
  'giaThanh',
  'createdAt',
] as const;

export type ProductSortField = (typeof PRODUCT_SORT_FIELDS)[number];

export interface ProductFilters {
  page?: number;
  limit?: number;
  search?: string;
  loaiSanPham?: string;
  maSanPham?: string;
  tenSanPham?: string;
  donViTinh?: string;
  sortBy?: ProductSortField;
  sortOrder?: 'asc' | 'desc';
}

export function useProducts(filters: ProductFilters = {}) {
  const {
    page = 1, limit = 10, search, loaiSanPham,
    maSanPham, tenSanPham, donViTinh, sortBy, sortOrder,
  } = filters;

  // Sort and column filters are part of the query key: changing either has to refetch,
  // since both are applied by the server across the whole result set, not on the page.
  return useQuery({
    queryKey: productKeys.list({
      page, limit, search, loaiSanPham, maSanPham, tenSanPham, donViTinh, sortBy, sortOrder,
    }),
    queryFn: () => internationalProductService.getAllProducts(page, limit, search, loaiSanPham, {
      maSanPham, tenSanPham, donViTinh, sortBy, sortOrder,
    }),
  });
}

export function useProduct(id: string | undefined | null) {
  return useQuery({
    queryKey: productKeys.detail(id as string),
    queryFn: () => internationalProductService.getProductById(id as string),
    enabled: !!id,
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateProductData) => internationalProductService.createProduct(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.lists() });
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateProductData }) =>
      internationalProductService.updateProduct(id, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: productKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: productKeys.lists() });
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => internationalProductService.deleteProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.lists() });
    },
  });
}

