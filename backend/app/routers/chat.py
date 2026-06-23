import os

from fastapi import APIRouter, HTTPException
from litellm import acompletion
from pydantic import ValidationError

from app.document_registry import (
    REGISTRY,
    build_pre_selection_prompt,
    build_system_prompt,
)
from app.schemas import ChatRequest, PreSelectionLLMResponse

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
async def chat(body: ChatRequest):
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
        }

    # ── Field-gathering phase: document type is known ────────────────────────
    config = REGISTRY[body.document_type]

    # Parse current_fields dict into the appropriate Pydantic model
    try:
        current_fields = config.fields_class(**body.current_fields)
    except Exception:
        current_fields = config.fields_class()

    system_prompt = build_system_prompt(body.document_type, current_fields)
    raw = await _call_llm(system_prompt, body.messages, config.llm_response_class)

    try:
        parsed = config.llm_response_class.model_validate_json(raw)
    except ValidationError as exc:
        raise HTTPException(status_code=502, detail="LLM returned unexpected format") from exc

    extracted = {k: v for k, v in parsed.fields.model_dump().items() if v is not None}
    return {
        "reply": parsed.reply,
        "document_type": None,
        "extracted_fields": extracted,
    }
