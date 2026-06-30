import client from "./client";
import type { Recipe, RecipeCreate, RecipeListResponse } from "../types";

export const getRecipes = async (q?: string, skip = 0, limit = 50): Promise<RecipeListResponse> => {
  const params: Record<string, string | number> = { skip, limit };
  if (q) params.q = q;
  const { data } = await client.get("/recipes", { params });
  return data;
};

export const getRecipe = async (id: number): Promise<Recipe> => {
  const { data } = await client.get(`/recipes/${id}`);
  return data;
};

export const createRecipe = async (body: RecipeCreate): Promise<Recipe> => {
  const { data } = await client.post("/recipes", body);
  return data;
};

export const updateRecipe = async (id: number, body: Partial<RecipeCreate>): Promise<Recipe> => {
  const { data } = await client.put(`/recipes/${id}`, body);
  return data;
};

export const deleteRecipe = async (id: number): Promise<void> => {
  await client.delete(`/recipes/${id}`);
};

export const importRecipe = async (url: string): Promise<Recipe> => {
  const { data } = await client.post("/recipes/import", { url });
  return data;
};
