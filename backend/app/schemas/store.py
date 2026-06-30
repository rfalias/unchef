from datetime import datetime

from pydantic import BaseModel


class AisleBase(BaseModel):
    name: str
    keywords: list[str] = []
    position: int | None = None


class AisleCreate(AisleBase):
    pass


class AisleUpdate(BaseModel):
    name: str | None = None
    keywords: list[str] | None = None
    position: int | None = None


class AisleRead(AisleBase):
    id: int
    store_id: int
    position: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class AisleReorderItem(BaseModel):
    id: int
    position: int


class StoreBase(BaseModel):
    name: str
    description: str | None = None


class StoreCreate(StoreBase):
    pass


class StoreUpdate(BaseModel):
    name: str | None = None
    description: str | None = None


class StoreRead(StoreBase):
    id: int
    aisles: list[AisleRead] = []
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class StoreListItem(StoreBase):
    id: int
    aisle_count: int = 0
    created_at: datetime

    model_config = {"from_attributes": True}
