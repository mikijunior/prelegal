"""Documents persistence router.

The list and detail endpoints are read-only; writes happen in the chat router
via `services.documents.upsert_draft` (see `app/services/documents.py`).
"""
import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth import require_current_user
from app.database import get_db
from app.document_registry import display_name_for
from app.models import Document, User
from app.schemas import (
    DocumentListItem,
    DocumentResponse,
    DocumentType,
    ProgressInfo,
)

router = APIRouter(prefix="/documents", tags=["documents"])


@router.get("", response_model=list[DocumentListItem])
def list_documents(
    current_user: User = Depends(require_current_user),
    db: Session = Depends(get_db),
):
    rows = (
        db.query(Document)
        .filter(Document.user_id == current_user.id)
        .order_by(Document.updated_at.desc())
        .all()
    )
    return [
        DocumentListItem(
            id=r.id,
            document_type=DocumentType(r.document_type),
            display_name=display_name_for(DocumentType(r.document_type)),
            progress=ProgressInfo(
                required_filled=r.required_filled,
                required_total=r.required_total,
            ),
            updated_at=r.updated_at,
        )
        for r in rows
    ]


@router.get("/by-type/{doc_type}", response_model=DocumentResponse)
def get_document_by_type(
    doc_type: DocumentType,
    current_user: User = Depends(require_current_user),
    db: Session = Depends(get_db),
):
    row = (
        db.query(Document)
        .filter(
            Document.user_id == current_user.id,
            Document.document_type == doc_type.value,
        )
        .first()
    )
    if row is None:
        raise HTTPException(status_code=404, detail="No draft for this document type")
    return _to_response(row)


@router.get("/{document_id}", response_model=DocumentResponse)
def get_document_by_id(
    document_id: int,
    current_user: User = Depends(require_current_user),
    db: Session = Depends(get_db),
):
    row = (
        db.query(Document)
        .filter(Document.id == document_id, Document.user_id == current_user.id)
        .first()
    )
    if row is None:
        raise HTTPException(status_code=404, detail="Document not found")
    return _to_response(row)


def _to_response(row: Document) -> DocumentResponse:
    try:
        fields = json.loads(row.fields_json or "{}")
    except json.JSONDecodeError:
        fields = {}
    return DocumentResponse(
        id=row.id,
        document_type=DocumentType(row.document_type),
        fields=fields,
        progress=ProgressInfo(
            required_filled=row.required_filled,
            required_total=row.required_total,
        ),
        created_at=row.created_at,
        updated_at=row.updated_at,
    )
