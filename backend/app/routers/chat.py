import logging
import os

from fastapi import APIRouter, Depends, HTTPException
from litellm import acompletion
from pydantic import ValidationError
from sqlalchemy.orm import Session

from app.auth import require_current_user
from app.database import get_db
from app.document_registry import (
    REGISTRY,
    build_pre_selection_prompt,
    build_system_prompt,
)
from app.models import User
from app.schemas import ChatRequest, PreSelectionLLMResponse
from app.services.documents import upsert_draft

logger = logging.getLogger(__name__)

MODEL = "openrouter/openai/gpt-oss-120b"
EXTRA_BODY = {"provider": {"order": ["cerebras"]}}

router = APIRouter()


def _require_api_key() -> None:
    if not os.environ.get("OPENROUTER_API_KEY"):
        raise HTTPException(status_code=500, detail="OPENROUTER_API_KEY not configured")


async def _call_llm(system_prompt: str, messages: list, response_format: type) -> str:
    llm_messages = [{"role": "system", "content": system_prompt}]
    for msg in messages:
        llm_messages.append({"role": msg.role, "content": msg.content})
    try:
        response = await acompletion(
            model=MODEL,
            messages=llm_messages,
            response_format=response_format,
            reasoning_effort="low",
            extra_body=EXTRA_BODY,
        )
        return response.choices[0].message.content
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"LLM error: {exc}") from exc


@router.post("/chat")
async def chat(
    body: ChatRequest,
    current_user: User = Depends(require_current_user),
    db: Session = Depends(get_db),
):
    _require_api_key()

    # ── Pre-selection phase: no document type yet ────────────────────────────
    if body.document_type is None:
        system_prompt = build_pre_selection_prompt()
        raw = await _call_llm(system_prompt, body.messages, PreSelectionLLMResponse)
        try:
            parsed = PreSelectionLLMResponse.model_validate_json(raw)
        except ValidationError as exc:
            raise HTTPException(status_code=502, detail="LLM returned unexpected format") from exc
        return {
            "reply": parsed.reply,
            "document_type": parsed.document_type,
            "extracted_fields": None,
            "document_id": None,
            "updated_at": None,
        }

    # ── Field-gathering phase: document type is known ────────────────────────
    config = REGISTRY[body.document_type]

    # Parse current_fields dict into the appropriate Pydantic model. A
    # `ValidationError` means the client sent field names the registry no
    # longer recognises (e.g. a stale frontend); fall back to an empty model
    # so the LLM gets a clean state and we don't drop the whole turn.
    try:
        current_fields = config.fields_class(**body.current_fields)
    except ValidationError:
        current_fields = config.fields_class()

    system_prompt = build_system_prompt(body.document_type, current_fields)
    raw = await _call_llm(system_prompt, body.messages, config.llm_response_class)

    try:
        parsed = config.llm_response_class.model_validate_json(raw)
    except ValidationError as exc:
        raise HTTPException(status_code=502, detail="LLM returned unexpected format") from exc

    extracted = {k: v for k, v in parsed.fields.model_dump().items() if v is not None}

    # Auto-save: upsert the user's draft for this document type. If the save
    # fails for any reason, log it and continue — we don't want a transient DB
    # hiccup to drop the chat reply, but we DO want to know about it.
    document_id: int | None = None
    updated_at_iso: str | None = None
    if extracted:
        try:
            saved = upsert_draft(
                db,
                user_id=current_user.id,
                doc_type=body.document_type,
                incoming_fields=extracted,
            )
            document_id = saved.id
            updated_at_iso = saved.updated_at.isoformat()
        except Exception:
            logger.exception(
                "Failed to upsert draft for user_id=%s doc_type=%s",
                current_user.id,
                body.document_type,
            )
            document_id = None
            updated_at_iso = None

    return {
        "reply": parsed.reply,
        "document_type": None,
        "extracted_fields": extracted,
        "document_id": document_id,
        "updated_at": updated_at_iso,
    }
