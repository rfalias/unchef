import client from "./client";

export interface AppBranding {
  app_name: string;
  app_icon: string;
  theme_palette: string;
  theme_accent: string;
  theme_muted: string;
  allow_registration: boolean;
  public_recipes: boolean;
}

export const getBranding = async (): Promise<AppBranding> => {
  const { data } = await client.get("/app-settings");
  return data;
};

export const updateBranding = async (body: Partial<AppBranding>): Promise<AppBranding> => {
  const { data } = await client.put("/app-settings", body);
  return data;
};
