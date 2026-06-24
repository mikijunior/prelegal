from datetime import datetime, timezone
from sqlalchemy import (
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )


class Document(Base):
    """A single in-progress (or completed) draft per (user, document_type).

    Persisted automatically by the chat endpoint on every successful field-gathering
    turn. The unique constraint on (user_id, document_type) is what makes
    "one draft per (user, doc type)" a database-level invariant.
    """

    __tablename__ = "documents"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    document_type: Mapped[str] = mapped_column(String(50), index=True)
    fields_json: Mapped[str] = mapped_column(Text, default="{}")
    # Pre-computed completion stats, refreshed on every save. Stored on the row
    # so the list endpoint doesn't have to walk the document registry per call.
    required_filled: Mapped[int] = mapped_column(Integer, default=0)
    required_total: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    __table_args__ = (
        UniqueConstraint("user_id", "document_type", name="uq_user_doc_type"),
    )
