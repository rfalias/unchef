import client from "./client";
import type { IngredientItem, Recipe } from "../types";

export const setApiKey = async (claude_api_key: string): Promise<{ has_claude_key: boolean }> => {
  const { data } = await client.put("/ai/api-key", { claude_api_key });
  return data;
};

export const removeApiKey = async (): Promise<{ has_claude_key: boolean }> => {
  const { data } = await client.delete("/ai/api-key");
  return data;
};

export const aiParseRecipe = async (url: string): Promise<Partial<Recipe>> => {
  const { data } = await client.post("/ai/parse-recipe", { url });
  return data;
};

export const aiParseIngredients = async (text: string): Promise<IngredientItem[]> => {
  const { data } = await client.post("/ai/parse-ingredients", { text });
  return data;
};

export const aiSuggestKeywords = async (aisle_name: string, store_name?: string): Promise<string[]> => {
  const { data } = await client.post("/ai/suggest-keywords", { aisle_name, store_name });
  return data;
};
