from datetime import datetime

from pydantic import BaseModel

from app.schemas.store import AisleRead


class IngredientItemCreate(BaseModel):
    name: str
    amount: str | None = None
    unit: str | None = None
    notes: str | None = None


class ShoppingListCreate(BaseModel):
    name: str
    store_id: int | None = None
    recipe_ids: list[int] = []
    extra_items: list[IngredientItemCreate] = []


class ShoppingListItemRead(BaseModel):
    id: int
    name: str
    amount: str | None
    unit: str | None
    notes: str | None
    is_checked: bool
    aisle_id: int | None
    aisle_override_id: int | None
    source_recipe_ids: list[int]
    created_at: datetime

    model_config = {"from_attributes": True}


class ShoppingListItemPatch(BaseModel):
    is_checked: bool | None = None
    aisle_override_id: int | None = None
    name: str | None = None
    amount: str | None = None
    unit: str | None = None
    notes: str | None = None


class ShoppingListItemCreate(BaseModel):
    name: str
    amount: str | None = None
    unit: str | None = None
    notes: str | None = None


class AisleGroup(BaseModel):
    aisle: AisleRead | None
    items: list[ShoppingListItemRead]


class RecipeRef(BaseModel):
    id: int
    title: str

    model_config = {"from_attributes": True}


class StoreRef(BaseModel):
    id: int
    name: str

    model_config = {"from_attributes": True}


class ShoppingListRead(BaseModel):
    id: int
    name: str
    store: StoreRef | None
    recipes: list[RecipeRef]
    is_archived: bool
    total_items: int
    checked_items: int
    aisle_groups: list[AisleGroup]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ShoppingListSummary(BaseModel):
    id: int
    name: str
    store: StoreRef | None
    is_archived: bool
    total_items: int
    checked_items: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ShoppingListUpdate(BaseModel):
    name: str | None = None


class AddRecipesRequest(BaseModel):
    recipe_ids: list[int]
