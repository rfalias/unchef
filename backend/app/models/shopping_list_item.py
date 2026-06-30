from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, ForeignKey, JSON, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.aisle import Aisle
    from app.models.shopping_list import ShoppingList


class ShoppingListItem(Base):
    __tablename__ = "shopping_list_items"

    id: Mapped[int] = mapped_column(primary_key=True)
    shopping_list_id: Mapped[int] = mapped_column(
        ForeignKey("shopping_lists.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(500), nullable=False)
    amount: Mapped[str | None] = mapped_column(String(100))
    unit: Mapped[str | None] = mapped_column(String(100))
    notes: Mapped[str | None] = mapped_column(Text)
    is_checked: Mapped[bool] = mapped_column(Boolean, default=False)
    aisle_id: Mapped[int | None] = mapped_column(
        ForeignKey("aisles.id", ondelete="SET NULL")
    )
    aisle_override_id: Mapped[int | None] = mapped_column(
        ForeignKey("aisles.id", ondelete="SET NULL")
    )
    source_recipe_ids: Mapped[list] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )

    shopping_list: Mapped["ShoppingList"] = relationship(
        "ShoppingList", back_populates="items"
    )
    aisle: Mapped["Aisle | None"] = relationship(
        "Aisle", foreign_keys=[aisle_id], back_populates="items"
    )
    aisle_override: Mapped["Aisle | None"] = relationship(
        "Aisle", foreign_keys=[aisle_override_id], back_populates="overridden_items"
    )

    @property
    def effective_aisle(self) -> "Aisle | None":
        return self.aisle_override or self.aisle
