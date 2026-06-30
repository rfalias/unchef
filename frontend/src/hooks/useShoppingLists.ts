import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as api from "../api/shoppingLists";

export const useShoppingLists = (archived = false) =>
  useQuery({ queryKey: ["shopping-lists", archived], queryFn: () => api.getShoppingLists(archived) });

export const useShoppingList = (id: number) =>
  useQuery({ queryKey: ["shopping-list", id], queryFn: () => api.getShoppingList(id), enabled: !!id });

export const useCreateShoppingList = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.createShoppingList,
    onSuccess: (data) => {
      qc.setQueryData(["shopping-list", data.id], data);
      qc.invalidateQueries({ queryKey: ["shopping-lists"] });
    },
  });
};

export const useUpdateShoppingList = (id: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { name?: string }) => api.updateShoppingList(id, body),
    onSuccess: (data) => {
      qc.setQueryData(["shopping-list", id], data);
      qc.invalidateQueries({ queryKey: ["shopping-lists"] });
    },
  });
};

export const useDeleteShoppingList = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.deleteShoppingList,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["shopping-lists"] }),
  });
};

export const useArchiveShoppingList = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.archiveShoppingList,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shopping-lists"] });
    },
  });
};

export const usePatchItem = (listId: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, body }: {
      itemId: number;
      body: { is_checked?: boolean; aisle_override_id?: number | null };
    }) => api.patchItem(listId, itemId, body),
    onMutate: async ({ itemId, body }) => {
      await qc.cancelQueries({ queryKey: ["shopping-list", listId] });
      const prev = qc.getQueryData(["shopping-list", listId]);
      if (body.is_checked !== undefined) {
        qc.setQueryData(["shopping-list", listId], (old: any) => {
          if (!old) return old;
          return {
            ...old,
            aisle_groups: old.aisle_groups.map((g: any) => ({
              ...g,
              items: g.items.map((i: any) =>
                i.id === itemId ? { ...i, is_checked: body.is_checked } : i
              ),
            })),
          };
        });
      }
      return { prev };
    },
    onError: (_err, _vars, ctx: any) => {
      if (ctx?.prev) qc.setQueryData(["shopping-list", listId], ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["shopping-list", listId] }),
  });
};

export const useAddItem = (listId: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { name: string; amount?: string; unit?: string; notes?: string }) =>
      api.addItem(listId, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["shopping-list", listId] }),
  });
};

export const useDeleteItem = (listId: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (itemId: number) => api.deleteItem(listId, itemId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["shopping-list", listId] }),
  });
};

export const useAddRecipes = (listId: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (recipeIds: number[]) => api.addRecipes(listId, recipeIds),
    onSuccess: (data) => qc.setQueryData(["shopping-list", listId], data),
  });
};
