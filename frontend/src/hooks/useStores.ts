import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as api from "../api/stores";

export const useStores = () =>
  useQuery({ queryKey: ["stores"], queryFn: api.getStores });

export const useStore = (id: number) =>
  useQuery({ queryKey: ["store", id], queryFn: () => api.getStore(id), enabled: !!id });

export const useCreateStore = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.createStore,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["stores"] }),
  });
};

export const useUpdateStore = (id: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { name?: string; description?: string }) => api.updateStore(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stores"] });
      qc.invalidateQueries({ queryKey: ["store", id] });
    },
  });
};

export const useDeleteStore = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.deleteStore,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["stores"] }),
  });
};

export const useCreateAisle = (storeId: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { name: string; keywords: string[]; position?: number }) =>
      api.createAisle(storeId, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["store", storeId] }),
  });
};

export const useUpdateAisle = (storeId: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ aisleId, body }: { aisleId: number; body: { name?: string; keywords?: string[]; position?: number } }) =>
      api.updateAisle(storeId, aisleId, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["store", storeId] }),
  });
};

export const useDeleteAisle = (storeId: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (aisleId: number) => api.deleteAisle(storeId, aisleId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["store", storeId] }),
  });
};

export const useReorderAisles = (storeId: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (items: { id: number; position: number }[]) => api.reorderAisles(storeId, items),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["store", storeId] }),
  });
};
