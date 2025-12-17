// src/features/menu/hooks/useMenuApi.ts
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api';
import type {
  MenuByLocationResponse,
  MenuFiltersResponse,
  AdminMenuResponse,
  MenuFilterParams,
  FullMenuCatalogResponse,
  SingleMenuItemResponse,
  MenuMutationResponse,
  MenuDeleteResponse,
  MenuByAreaResponse,
  CreateMenuItemPayload,
  UpdateMenuItemPayload,
  MenuItem,
} from '../types/menu.types';

// ==================== PUBLIC HOOKS ====================

export function useMenuByArea(areaId: string | undefined) {
  return useQuery({
    queryKey: ['menu', 'area', areaId],
    enabled: !!areaId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const response = await apiClient.get<MenuByAreaResponse>(`/menu/area/${areaId}`);
      return response;
    },
  });
}

export function useMenuByLocation(lat: number | null, lng: number | null) {
  return useQuery({
    queryKey: ['menu', 'location', lat, lng],
    enabled: lat !== null && lng !== null && !isNaN(lat) && !isNaN(lng),
    staleTime: 10 * 60 * 1000,
    retry: 1,
    queryFn: async () => {
      const response = await apiClient.get<MenuByLocationResponse>('/menu/location', {
        params: { lat, lng },
      });
      return response;
    },
  });
}

export function useFullMenuCatalog() {
  return useQuery({
    queryKey: ['menu', 'catalog'],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const response = await apiClient.get<FullMenuCatalogResponse>('/menu/all');
      return response;
    },
  });
}

export function useMenuItem(id: string | undefined) {
  return useQuery({
    queryKey: ['menu', 'item', id],
    enabled: !!id,
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const response = await apiClient.get<SingleMenuItemResponse>(`/menu/${id}`);
      return response;
    },
  });
}

export function useMenuFilters(params: MenuFilterParams = {}) {
  return useInfiniteQuery({
    queryKey: ['menu', 'filters', params],
    queryFn: async ({ pageParam = 1 }) => {
      const response = await apiClient.get<MenuFiltersResponse>('/menu/filters', {
        params: {
          page: pageParam,
          limit: params.limit ?? 20,
          category: params.category,
          isVeg: params.isVeg,
          isSpicy: params.isSpicy,
          minPrice: params.minPrice,
          maxPrice: params.maxPrice,
          search: params.search?.trim() || undefined,
          sort: params.sort || 'category_asc',
          availableOnly: params.availableOnly !== false ? 'true' : undefined,
        },
      });
      return response;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.hasNext ? lastPage.pagination.page + 1 : undefined,
    staleTime: 2 * 60 * 1000,
  });
}

// ==================== ADMIN HOOKS ====================

export function useAdminMenuItems() {
  return useQuery({
    queryKey: ['menu', 'admin', 'all'],
    staleTime: 60 * 1000,
    queryFn: async () => {
      const response = await apiClient.get<AdminMenuResponse>('/menu/admin/all');
      return response;
    },
  });
}

export function useCreateMenuItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateMenuItemPayload) => {
      const fd = new FormData();
      fd.append('name', payload.name.trim());
      fd.append('price', String(payload.price));
      fd.append('category', payload.category);
      if (payload.description?.trim()) fd.append('description', payload.description.trim());
      if (payload.isVeg) fd.append('isVeg', 'true');
      if (payload.isSpicy) fd.append('isSpicy', 'true');

      const areas = payload.availableInAreas || [];
      if (areas.length > 0) {
        fd.append('availableInAreas', JSON.stringify(areas));
      }

      fd.append('image', payload.image);

      const response = await apiClient.post<MenuMutationResponse>('/menu', fd);
      return response;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['menu'] });
      qc.invalidateQueries({ queryKey: ['menu', 'admin', 'all'] });
      toast.success('Menu item created successfully!');
    },
    onError: (err: any) => {
      const message = (err as any)?.response?.data?.message || 'Failed to create menu item';
      toast.error(message);
    },
  });
}


export function useUpdateMenuItem() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateMenuItemPayload }) => {
      const fd = new FormData();

      if (data.name !== undefined) {
        fd.append('name', data.name.trim());
      }

      // Only append description if it has actual content
      if (data.description !== undefined) {
        const trimmed = data.description.trim();
        if (trimmed) {
          fd.append('description', trimmed);
        }
        // If empty or only spaces → do NOT send the field (backend keeps existing value)
      }

      if (data.price !== undefined) {
        fd.append('price', String(data.price));
      }

      if (data.category !== undefined) {
        fd.append('category', data.category);
      }

      // Send booleans as lowercase 'true'/'false' strings
      if (data.isVeg !== undefined) {
        fd.append('isVeg', data.isVeg ? 'true' : 'false');
      }
      if (data.isSpicy !== undefined) {
        fd.append('isSpicy', data.isSpicy ? 'true' : 'false');
      }
      if (data.isAvailable !== undefined) {
        fd.append('isAvailable', data.isAvailable ? 'true' : 'false');
      }

      // Handle availableInAreas: send '[]' for "everywhere", otherwise JSON string
      if (data.availableInAreas !== undefined) {
        fd.append(
          'availableInAreas',
          data.availableInAreas.length === 0 ? '[]' : JSON.stringify(data.availableInAreas)
        );
      }

      if (data.image) {
        fd.append('image', data.image);
      }

      const response = await apiClient.put<MenuMutationResponse>(`/menu/${id}`, fd);
      return response;
    },

    // Optimistic update — instantly reflects changes in the admin table
    onMutate: async ({ id, data }) => {
      await qc.cancelQueries({ queryKey: ['menu', 'admin', 'all'] });

      const previousAdmin = qc.getQueryData<AdminMenuResponse>(['menu', 'admin', 'all']);

      if (previousAdmin) {
        qc.setQueryData<AdminMenuResponse>(['menu', 'admin', 'all'], {
          ...previousAdmin,
          items: previousAdmin.items.map((item: MenuItem) =>
            item._id === id
              ? {
                  ...item,
                  ...(data.name !== undefined && { name: data.name.trim() }),
                  // Only override description if new value is provided and non-empty
                  ...(data.description !== undefined &&
                    (data.description.trim()
                      ? { description: data.description.trim() }
                      : { description: '' })), // cleared → empty string in UI
                  ...(data.price !== undefined && { price: data.price }),
                  ...(data.category !== undefined && { category: data.category }),
                  ...(data.isVeg !== undefined && { isVeg: data.isVeg }),
                  ...(data.isSpicy !== undefined && { isSpicy: data.isSpicy }),
                  ...(data.isAvailable !== undefined && { isAvailable: data.isAvailable }),
                  ...(data.availableInAreas !== undefined && {
                    availableInAreas: data.availableInAreas,
                  }),
                }
              : item
          ),
        });
      }

      return { previousAdmin };
    },

    // Rollback on error
    onError: (err: any, variables, context) => {
      if (context?.previousAdmin) {
        qc.setQueryData(['menu', 'admin', 'all'], context.previousAdmin);
      }
      const message = (err as any)?.response?.data?.message || 'Failed to update menu item';
      toast.error(message);
    },

    // IMPORTANT: Do NOT invalidate the admin list — we already updated it perfectly
    // Only invalidate single item query if used elsewhere (e.g., public pages)
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['menu', 'item'] });
      // Removed: qc.invalidateQueries({ queryKey: ['menu', 'admin', 'all'] });
    },

    onSuccess: () => {
      toast.success('Menu item updated successfully!');
    },
  });
}

export function useDeleteMenuItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.delete<MenuDeleteResponse>(`/menu/${id}`);
      return response;
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ['menu', 'admin', 'all'] });
      const previous = qc.getQueryData<AdminMenuResponse>(['menu', 'admin', 'all']);
      if (previous) {
        qc.setQueryData<AdminMenuResponse>(['menu', 'admin', 'all'], {
          ...previous,
          items: previous.items.filter((item) => item._id !== id),
        });
      }
      return { previous };
    },
    onError: (err: any, id, context) => {
      if (context?.previous) {
        qc.setQueryData(['menu', 'admin', 'all'], context.previous);
      }
      toast.error('Failed to delete menu item');
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['menu', 'admin', 'all'] });
    },
    onSuccess: () => {
      toast.success('Menu item deleted successfully');
    },
  });
}

export function useToggleMenuAvailability() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, isAvailable }: { id: string; isAvailable: boolean }) => {
      const response = await apiClient.patch<MenuMutationResponse>(`/menu/${id}/toggle`, { isAvailable });
      return response;
    },
    onMutate: async ({ id, isAvailable }) => {
      await qc.cancelQueries({ queryKey: ['menu', 'admin', 'all'] });
      const previous = qc.getQueryData<AdminMenuResponse>(['menu', 'admin', 'all']);
      if (previous) {
        qc.setQueryData<AdminMenuResponse>(['menu', 'admin', 'all'], {
          ...previous,
          items: previous.items.map((item) =>
            item._id === id ? { ...item, isAvailable } : item
          ),
        });
      }
      return { previous };
    },
    onError: (err: any, variables, context) => {
      if (context?.previous) {
        qc.setQueryData(['menu', 'admin', 'all'], context.previous);
      }
      toast.error('Failed to update availability');
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['menu', 'admin', 'all'] });
    },
    onSuccess: () => {
      toast.success('Availability updated');
    },
  });
}

export function useAvailableAreas() {
  return useQuery({
    queryKey: ['areas', 'active'],
    staleTime: 15 * 60 * 1000,
    queryFn: async () => {
      const response = await apiClient.get<{ areas: { _id: string; name: string; city: string }[] }>('/areas');
      return response;
    },
  });
}