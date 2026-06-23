"""Documents service: own the merge / upsert / progress logic.

Used by `routers/chat.py` to save drafts on every successful field-gathering
turn, and by `routers/documents.py` to expose read endpoints.
"""
import json
from typing import Any

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.document_registry import REGISTRY, required_field_names
from app.models import Document
from app.schemas import DocumentType


def upsert_draft(
    db: Session,
    *,
    user_id: int,
    doc_type: DocumentType,
    incoming_fields: dict,
) -> Document:
    """Merge `incoming_fields` with the existing draft for (user, doc_type).

    - Pulls the existing row (if any), parses its JSON.
    - Drops any keys that aren't valid for the doc type's Pydantic model.
    - Merges: incoming wins on conflict, nulls are already filtered upstream
      by `routers/chat.py`, so this is a straight union.
    - Recomputes `required_filled` / `required_total` from the registry.
    - Commits. On `IntegrityError` (parallel writes for the same (user, type))
      it retries as an update.
    """
    valid_keys = set(REGISTRY[doc_type].fields_class.model_fields.keys())
    clean = {k: v for k, v in incoming_fields.items() if k in valid_keys}

    existing = _find(db, user_id, doc_type)
    if existing is None:
        existing = _create_empty(db, user_id, doc_type)
        db.add(existing)
        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            existing = _find(db, user_id, doc_type)
            if existing is None:
                # Extremely unlikely race; let it propagate.
                raise

    base = json.loads(existing.fields_json or "{}")
    merged = {**base, **clean}
    filled, total = _compute_progress(merged, doc_type)

    existing.fields_json = json.dumps(merged)
    existing.required_filled = filled
    existing.required_total = total
    db.commit()
    db.refresh(existing)
    return existing


def _find(db: Session, user_id: int, doc_type: DocumentType) -> Document | None:
    return (
        db.query(Document)
        .filter(
            Document.user_id == user_id,
            Document.document_type == doc_type.value,
        )
        .first()
    )


def _create_empty(db: Session, user_id: int, doc_type: DocumentType) -> Document:
    return Document(
        user_id=user_id,
        document_type=doc_type.value,
        fields_json="{}",
        required_filled=0,
        required_total=len(required_field_names(doc_type)),
    )


def _compute_progress(fields: dict, doc_type: DocumentType) -> tuple[int, int]:
    """(filled, total) over the doc type's *required* (non-optional) fields."""
    required = required_field_names(doc_type)
    filled = sum(
        1
        for name in required
        if fields.get(name) not in (None, "")
    )
    return filled, len(required)
