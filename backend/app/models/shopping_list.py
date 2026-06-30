from typing import TYPE_CHECKING

from sqlalchemy import Boolean, Column, ForeignKey, String, Table
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.recipe import Recipe
    from app.models.store import Store
    from app.models.shopping_list_item import ShoppingListItem


shopping_list_recipes = Table(
    "shopping_list_recipes",
    Base.metadata,
    Column(
        "shopping_list_id",
        ForeignKey("shopping_lists.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    Column(
        "recipe_id",
        ForeignKey("recipes.id", ondelete="CASCADE"),
        primary_key=True,
    ),
)


class ShoppingList(Base, TimestampMixin):
    __tablename__ = "shopping_lists"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    store_id: Mapped[int | None] = mapped_column(
        ForeignKey("stores.id", ondelete="SET NULL")
    )
    is_archived: Mapped[bool] = mapped_column(Boolean, default=False)

    store: Mapped["Store | None"] = relationship("Store", back_populates="shopping_lists")
    items: Mapped[list["ShoppingListItem"]] = relationship(
        "ShoppingListItem", back_populates="shopping_list", cascade="all, delete-orphan"
    )
    recipes: Mapped[list["Recipe"]] = relationship(
        "Recipe", secondary=shopping_list_recipes
    )
