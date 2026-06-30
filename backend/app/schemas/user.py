from typing import Literal, Optional
from pydantic import BaseModel
from fastapi_users import schemas


class UserRead(schemas.BaseUser[int]):
    role: str = "user"
    has_claude_key: bool = False


class UserCreate(schemas.BaseUserCreate):
    pass


class UserUpdate(schemas.BaseUserUpdate):
    pass


# Admin-facing schemas
class AdminUserRead(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    email: str
    role: str
    is_active: bool


class AdminUserPatch(BaseModel):
    role: Optional[Literal["user", "admin"]] = None
    is_active: Optional[bool] = None


# API key management
class ApiKeySet(BaseModel):
    claude_api_key: str


class ApiKeyStatus(BaseModel):
    has_claude_key: bool
