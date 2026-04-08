import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import themeService, { CreateThemeInput } from '../services/themeService';

export const themeKeys = {
  all: ['themes'] as const,
  lists: () => [...themeKeys.all, 'list'] as const,
  active: () => [...themeKeys.all, 'active'] as const,
  detail: (id: string) => [...themeKeys.all, 'detail', id] as const,
};

/** Lấy tất cả themes active */
export const useThemes = () => {
  return useQuery({
    queryKey: themeKeys.lists(),
    queryFn: () => themeService.getAllThemes(),
    staleTime: 5 * 60 * 1000,
  });
};

/** Lấy theme đang áp dụng hôm nay */
export const useActiveTheme = () => {
  return useQuery({
    queryKey: themeKeys.active(),
    queryFn: () => themeService.getActiveTheme(),
    staleTime: 5 * 60 * 1000,
  });
};

/** Lấy theme theo ID */
export const useTheme = (id: string) => {
  return useQuery({
    queryKey: themeKeys.detail(id),
    queryFn: () => themeService.getThemeById(id),
    enabled: !!id,
  });
};

/** Tạo theme mới (Admin only) */
export const useCreateTheme = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateThemeInput) => themeService.createTheme(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: themeKeys.lists() });
    },
  });
};

/** Cập nhật theme (Admin only) */
export const useUpdateTheme = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateThemeInput> }) =>
      themeService.updateTheme(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: themeKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: themeKeys.lists() });
      queryClient.invalidateQueries({ queryKey: themeKeys.active() });
    },
  });
};

/** Xoá theme (Admin only) */
export const useDeleteTheme = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => themeService.deleteTheme(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: themeKeys.lists() });
      queryClient.invalidateQueries({ queryKey: themeKeys.active() });
    },
  });
};
