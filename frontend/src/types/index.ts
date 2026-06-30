export interface IngredientItem {
  name: string;
  amount: string | null;
  unit: string | null;
  notes: string | null;
  section: string | null;
}

export interface Recipe {
  id: number;
  title: string;
  description: string | null;
  source_url: string | null;
  image_url: string | null;
  servings: number | null;
  prep_time_minutes: number | null;
  cook_time_minutes: number | null;
  instructions: string[];
  ingredients: IngredientItem[];
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface RecipeListResponse {
  items: Recipe[];
  total: number;
  skip: number;
  limit: number;
}

export interface RecipeCreate {
  title: string;
  description?: string | null;
  source_url?: string | null;
  image_url?: string | null;
  servings?: number | null;
  prep_time_minutes?: number | null;
  cook_time_minutes?: number | null;
  instructions: string[];
  ingredients: IngredientItem[];
  tags: string[];
}

export interface Aisle {
  id: number;
  store_id: number;
  name: string;
  position: number;
  keywords: string[];
  created_at: string;
  updated_at: string;
}

export interface Store {
  id: number;
  name: string;
  description: string | null;
  aisles: Aisle[];
  created_at: string;
  updated_at: string;
}

export interface StoreListItem {
  id: number;
  name: string;
  description: string | null;
  aisle_count: number;
  created_at: string;
}

export interface ShoppingListItem {
  id: number;
  name: string;
  amount: string | null;
  unit: string | null;
  notes: string | null;
  is_checked: boolean;
  aisle_id: number | null;
  aisle_override_id: number | null;
  source_recipe_ids: number[];
  created_at: string;
}

export interface AisleGroup {
  aisle: Aisle | null;
  items: ShoppingListItem[];
}

export interface RecipeRef {
  id: number;
  title: string;
}

export interface StoreRef {
  id: number;
  name: string;
}

export interface ShoppingList {
  id: number;
  name: string;
  store: StoreRef | null;
  recipes: RecipeRef[];
  is_archived: boolean;
  total_items: number;
  checked_items: number;
  aisle_groups: AisleGroup[];
  created_at: string;
  updated_at: string;
}

export interface ShoppingListSummary {
  id: number;
  name: string;
  store: StoreRef | null;
  is_archived: boolean;
  total_items: number;
  checked_items: number;
  created_at: string;
  updated_at: string;
}
