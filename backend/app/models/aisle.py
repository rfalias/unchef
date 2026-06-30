from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Integer, JSON, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.store import Store
    from app.models.shopping_list_item import ShoppingListItem


class Aisle(Base, TimestampMixin):
    __tablename__ = "aisles"

    id: Mapped[int] = mapped_column(primary_key=True)
    store_id: Mapped[int] = mapped_column(
        ForeignKey("stores.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    position: Mapped[int] = mapped_column(Integer, nullable=False)
    keywords: Mapped[list] = mapped_column(JSON, default=list)

    store: Mapped["Store"] = relationship("Store", back_populates="aisles")
    items: Mapped[list["ShoppingListItem"]] = relationship(
        "ShoppingListItem",
        foreign_keys="ShoppingListItem.aisle_id",
        back_populates="aisle",
    )
    overridden_items: Mapped[list["ShoppingListItem"]] = relationship(
        "ShoppingListItem",
        foreign_keys="ShoppingListItem.aisle_override_id",
        back_populates="aisle_override",
    )
