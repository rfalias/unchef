import client from "./client";
import type { Aisle, Store, StoreListItem } from "../types";

export const getStores = async (): Promise<StoreListItem[]> => {
  const { data } = await client.get("/stores");
  return data;
};

export const getStore = async (id: number): Promise<Store> => {
  const { data } = await client.get(`/stores/${id}`);
  return data;
};

export const createStore = async (body: { name: string; description?: string }): Promise<Store> => {
  const { data } = await client.post("/stores", body);
  return data;
};

export const updateStore = async (id: number, body: { name?: string; description?: string }): Promise<Store> => {
  const { data } = await client.put(`/stores/${id}`, body);
  return data;
};

export const deleteStore = async (id: number): Promise<void> => {
  await client.delete(`/stores/${id}`);
};

export const createAisle = async (
  storeId: number,
  body: { name: string; keywords: string[]; position?: number }
): Promise<Aisle> => {
  const { data } = await client.post(`/stores/${storeId}/aisles`, body);
  return data;
};

export const updateAisle = async (
  storeId: number,
  aisleId: number,
  body: { name?: string; keywords?: string[]; position?: number }
): Promise<Aisle> => {
  const { data } = await client.put(`/stores/${storeId}/aisles/${aisleId}`, body);
  return data;
};

export const deleteAisle = async (storeId: number, aisleId: number): Promise<void> => {
  await client.delete(`/stores/${storeId}/aisles/${aisleId}`);
};

export const reorderAisles = async (
  storeId: number,
  items: { id: number; position: number }[]
): Promise<Aisle[]> => {
  const { data } = await client.put(`/stores/${storeId}/aisles/reorder`, items);
  return data;
};
