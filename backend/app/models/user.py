from fastapi_users.db import SQLAlchemyBaseUserTable
from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin


class User(SQLAlchemyBaseUserTable[int], Base, TimestampMixin):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    role: Mapped[str] = mapped_column(String(20), nullable=False, default="user", server_default="user")
    claude_api_key: Mapped[str | None] = mapped_column(Text, nullable=True, default=None)

    @property
    def has_claude_key(self) -> bool:
        return bool(self.claude_api_key)
