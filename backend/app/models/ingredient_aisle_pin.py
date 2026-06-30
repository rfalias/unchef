from sqlalchemy import ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class IngredientAislePin(Base):
    __tablename__ = "ingredient_aisle_pins"
    __table_args__ = (UniqueConstraint("store_id", "canonical_name"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    store_id: Mapped[int] = mapped_column(ForeignKey("stores.id", ondelete="CASCADE"), nullable=False)
    canonical_name: Mapped[str] = mapped_column(String(500), nullable=False)
    aisle_id: Mapped[int | None] = mapped_column(ForeignKey("aisles.id", ondelete="SET NULL"))
