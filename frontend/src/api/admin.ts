import client from "./client";

export interface AdminUser {
  id: number;
  email: string;
  role: string;
  is_active: boolean;
}

export const listUsers = async (): Promise<AdminUser[]> => {
  const { data } = await client.get("/admin/users");
  return data;
};

export const patchUser = async (
  id: number,
  body: { role?: string; is_active?: boolean }
): Promise<AdminUser> => {
  const { data } = await client.patch(`/admin/users/${id}`, body);
  return data;
};

export const deleteUser = async (id: number): Promise<void> => {
  await client.delete(`/admin/users/${id}`);
};

export const adminResetPassword = async (id: number, newPassword: string): Promise<void> => {
  await client.post(`/admin/users/${id}/reset-password`, { new_password: newPassword });
};

export const adminCreateUser = async (
  username: string,
  password: string,
  role: "user" | "admin"
): Promise<AdminUser> => {
  const { data } = await client.post("/admin/users", { username, password, role });
  return data;
};

export interface ParseInspectResult {
  url: string;
  fetch: {
    ok: boolean;
    status_code?: number;
    final_url?: string;
    content_type?: string;
    content_length_kb?: number;
    is_text?: boolean;
    looks_binary?: boolean;
    error?: string | null;
  };
  json_ld: {
    scripts_found: number;
    all_types: string[];
    recipe_found: boolean;
    recipe_name?: string | null;
    recipe_keys: string[];
    has_ingredients: boolean;
    has_instructions: boolean;
  };
  scraper: {
    ok: boolean;
    title?: string | null;
    ingredients_count: number;
    instructions_count: number;
    error?: string | null;
  };
  ai: {
    ran: boolean;
    ok?: boolean;
    content_source?: string;
    title?: string | null;
    ingredients_count?: number;
    instructions_count?: number;
    error?: string | null;
  } | null;
  outcome: string;
}

export const parseInspect = async (url: string, useAi: boolean): Promise<ParseInspectResult> => {
  const { data } = await client.post("/admin/parse-inspect", { url, use_ai: useAi });
  return data;
};
