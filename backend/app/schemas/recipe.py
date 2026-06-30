from datetime import datetime

from pydantic import BaseModel, HttpUrl


class IngredientItem(BaseModel):
    name: str
    amount: str | None = None
    unit: str | None = None
    notes: str | None = None


class RecipeBase(BaseModel):
    title: str
    description: str | None = None
    source_url: str | None = None
    image_url: str | None = None
    servings: int | None = None
    prep_time_minutes: int | None = None
    cook_time_minutes: int | None = None
    instructions: list[str] = []
    ingredients: list[IngredientItem] = []
    tags: list[str] = []


class RecipeCreate(RecipeBase):
    pass


class RecipeUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    source_url: str | None = None
    image_url: str | None = None
    servings: int | None = None
    prep_time_minutes: int | None = None
    cook_time_minutes: int | None = None
    instructions: list[str] | None = None
    ingredients: list[IngredientItem] | None = None
    tags: list[str] | None = None


class RecipeRead(RecipeBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class RecipeListResponse(BaseModel):
    items: list[RecipeRead]
    total: int
    skip: int
    limit: int


class RecipeImportRequest(BaseModel):
    url: str
