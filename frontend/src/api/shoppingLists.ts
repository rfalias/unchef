import client from "./client";
import type { ShoppingList, ShoppingListItem, ShoppingListSummary } from "../types";

export const getShoppingLists = async (archived = false): Promise<ShoppingListSummary[]> => {
  const { data } = await client.get("/shopping-lists", { params: { archived } });
  return data;
};

export const getShoppingList = async (id: number): Promise<ShoppingList> => {
  const { data } = await client.get(`/shopping-lists/${id}`);
  return data;
};

export const createShoppingList = async (body: {
  name: string;
  store_id?: number | null;
  recipe_ids: number[];
  extra_items?: { name: string; amount?: string; unit?: string }[];
}): Promise<ShoppingList> => {
  const { data } = await client.post("/shopping-lists", body);
  return data;
};

export const updateShoppingList = async (id: number, body: { name?: string }): Promise<ShoppingList> => {
  const { data } = await client.patch(`/shopping-lists/${id}`, body);
  return data;
};

export const deleteShoppingList = async (id: number): Promise<void> => {
  await client.delete(`/shopping-lists/${id}`);
};

export const archiveShoppingList = async (id: number): Promise<ShoppingList> => {
  const { data } = await client.patch(`/shopping-lists/${id}/archive`);
  return data;
};

export const patchItem = async (
  listId: number,
  itemId: number,
  body: { is_checked?: boolean; aisle_override_id?: number | null; name?: string; amount?: string; unit?: string }
): Promise<ShoppingListItem> => {
  const { data } = await client.patch(`/shopping-lists/${listId}/items/${itemId}`, body);
  return data;
};

export const addItem = async (
  listId: number,
  body: { name: string; amount?: string; unit?: string; notes?: string }
): Promise<ShoppingListItem> => {
  const { data } = await client.post(`/shopping-lists/${listId}/items`, body);
  return data;
};

export const deleteItem = async (listId: number, itemId: number): Promise<void> => {
  await client.delete(`/shopping-lists/${listId}/items/${itemId}`);
};

export const addRecipes = async (listId: number, recipeIds: number[]): Promise<ShoppingList> => {
  const { data } = await client.post(`/shopping-lists/${listId}/add-recipes`, { recipe_ids: recipeIds });
  return data;
};
