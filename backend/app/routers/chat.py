import json
import os

from fastapi import APIRouter, HTTPException
from litellm import acompletion
from pydantic import ValidationError

from app.schemas import ChatLLMResponse, ChatRequest, NDAFields

MODEL = "openrouter/openai/gpt-oss-120b"
EXTRA_BODY = {"provider": {"order": ["cerebras"]}}

FIELD_DESCRIPTIONS = {
    "party1Company": "First party's company name",
    "party1Name": "First party signatory's full name",
    "party1Title": "First party signatory's job title",
    "party1Address": "First party's notice address (email or postal)",
    "party1Date": "First party's signing date (YYYY-MM-DD format)",
    "party2Company": "Second party's company name",
    "party2Name": "Second party signatory's full name",
    "party2Title": "Second party signatory's job title",
    "party2Address": "Second party's notice address (email or postal)",
    "party2Date": "Second party's signing date (YYYY-MM-DD format)",
    "purpose": "Purpose of the NDA — how confidential information may be used",
    "effectiveDate": "Agreement effective date (YYYY-MM-DD format)",
    "mndaTermType": "'expires' (fixed term) or 'continues' (until terminated)",
    "mndaTermYears": "Number of years (only when mndaTermType is 'expires')",
    "confidentialityTermType": "'period' (fixed years) or 'perpetuity' (forever)",
    "confidentialityTermYears": "Number of years (only when confidentialityTermType is 'period')",
    "governingLaw": "Governing state law (e.g., 'Delaware')",
    "jurisdiction": "Court jurisdiction (e.g., 'New Castle, DE')",
    "modifications": "Any modifications to standard MNDA terms (empty string if none)",
}

router = APIRouter()

# modifications is optional — empty string is a valid answer ("no modifications")
_OPTIONAL_FIELDS = {"modifications"}


def _build_system_prompt(current_fields: NDAFields) -> str:
    fields_dict = current_fields.model_dump()
    filled = {k: v for k, v in fields_dict.items() if v not in (None, "")}
    unfilled = [
        k for k, v in fields_dict.items()
        if v in (None, "") and k not in _OPTIONAL_FIELDS
    ]

    fields_list = "\n".join(f"  - {k}: {desc}" for k, desc in FIELD_DESCRIPTIONS.items())

    if filled:
        already = f"\nALREADY GATHERED:\n{json.dumps(filled, indent=2)}\n"
    else:
        already = ""

    if unfilled:
        needed = f"\nSTILL NEEDED: {', '.join(unfilled)}"
    else:
        needed = "\nAll fields gathered — help the user review and download."

    return f"""You are a friendly AI legal assistant helping users create a Mutual Non-Disclosure Agreement (MNDA).

Have a natural, efficient conversation to gather all required information. Group related questions (e.g. ask for both party names in one message). For dates, accept natural language and convert to YYYY-MM-DD in your response.

FIELDS TO GATHER:
{fields_list}
{already}{needed}

In the "reply" field, write your conversational response to the user.
In the "fields" object, populate ONLY fields you learned new information about in THIS turn — set everything else to null. Use an empty string for modifications when the user confirms there are none.
When all fields are gathered, congratulate the user and tell them to click "Download PDF"."""


@router.post("/chat")
async def chat(body: ChatRequest):
    if not os.environ.get("OPENROUTER_API_KEY"):
        raise HTTPException(status_code=500, detail="OPENROUTER_API_KEY not configured")

    system_prompt = _build_system_prompt(body.current_fields)
    llm_messages = [{"role": "system", "content": system_prompt}]
    for msg in body.messages:
        llm_messages.append({"role": msg.role, "content": msg.content})

    try:
        response = await acompletion(
            model=MODEL,
            messages=llm_messages,
            response_format=ChatLLMResponse,
            reasoning_effort="low",
            extra_body=EXTRA_BODY,
        )
        raw = response.choices[0].message.content
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"LLM error: {exc}") from exc

    try:
        parsed = ChatLLMResponse.model_validate_json(raw)
    except ValidationError as exc:
        raise HTTPException(status_code=502, detail="LLM returned unexpected format") from exc

    extracted = {k: v for k, v in parsed.fields.model_dump().items() if v is not None}
    return {"reply": parsed.reply, "extracted_fields": extracted}
