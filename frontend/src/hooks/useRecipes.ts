import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as api from "../api/recipes";
import type { RecipeCreate } from "../types";

export const useRecipes = (q?: string) =>
  useQuery({ queryKey: ["recipes", q], queryFn: () => api.getRecipes(q) });

export const useRecipe = (id: number) =>
  useQuery({ queryKey: ["recipe", id], queryFn: () => api.getRecipe(id), enabled: !!id });

export const useImportRecipe = () =>
  useMutation({ mutationFn: (url: string) => api.importRecipe(url) });

export const useCreateRecipe = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: RecipeCreate) => api.createRecipe(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["recipes"] }),
  });
};

export const useUpdateRecipe = (id: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<RecipeCreate>) => api.updateRecipe(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["recipes"] });
      qc.invalidateQueries({ queryKey: ["recipe", id] });
    },
  });
};

export const useDeleteRecipe = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.deleteRecipe(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["recipes"] }),
  });
};
