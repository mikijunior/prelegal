import json
from unittest.mock import MagicMock, patch

import pytest

from app.document_registry import build_system_prompt, build_pre_selection_prompt
from app.schemas import NDAFields, BAAFields, DocumentType


# ── Unit tests: NDA system prompt builder ────────────────────────────────────


def test_system_prompt_lists_unfilled_fields():
    fields = NDAFields()
    prompt = build_system_prompt(DocumentType.mutual_nda, fields)
    assert "party1Company" in prompt
    assert "STILL NEEDED" in prompt


def test_system_prompt_shows_filled_fields():
    fields = NDAFields(party1Company="Acme Inc.", party2Company="Beta Corp.")
    prompt = build_system_prompt(DocumentType.mutual_nda, fields)
    assert "Acme Inc." in prompt
    assert "ALREADY GATHERED" in prompt


def test_system_prompt_all_filled():
    fields = NDAFields(
        party1Company="Acme",
        party1Name="Jane",
        party1Title="CEO",
        party1Address="jane@acme.com",
        party1Date="2024-01-01",
        party2Company="Beta",
        party2Name="John",
        party2Title="CTO",
        party2Address="john@beta.com",
        party2Date="2024-01-01",
        purpose="Evaluating a partnership",
        effectiveDate="2024-01-01",
        mndaTermType="expires",
        mndaTermYears="1",
        confidentialityTermType="period",
        confidentialityTermYears="2",
        governingLaw="Delaware",
        jurisdiction="New Castle, DE",
        modifications="",
    )
    prompt = build_system_prompt(DocumentType.mutual_nda, fields)
    assert "All fields gathered" in prompt


def test_system_prompt_baa():
    fields = BAAFields()
    prompt = build_system_prompt(DocumentType.baa, fields)
    assert "Business Associate Agreement" in prompt
    assert "provider" in prompt
    assert "breachNotificationPeriod" in prompt


def test_pre_selection_prompt_lists_all_types():
    prompt = build_pre_selection_prompt()
    for doc_type in ["mutual_nda", "baa", "csa", "dpa", "partnership",
                     "pilot", "psa", "sla", "software_license",
                     "ai_addendum", "design_partner"]:
        assert doc_type in prompt


# ── Integration tests: POST /api/chat ──────────────────────────────────────


MOCK_NDA_LLM_RESPONSE = json.dumps({
    "reply": "Great! What are the signatories' names and titles?",
    "fields": {
        "party1Company": "Acme Inc.",
        "party2Company": "Beta Corp.",
        "party1Name": None,
        "party1Title": None,
        "party1Address": None,
        "party1Date": None,
        "party2Name": None,
        "party2Title": None,
        "party2Address": None,
        "party2Date": None,
        "purpose": None,
        "effectiveDate": None,
        "mndaTermType": None,
        "mndaTermYears": None,
        "confidentialityTermType": None,
        "confidentialityTermYears": None,
        "governingLaw": None,
        "jurisdiction": None,
        "modifications": None,
    },
})

MOCK_BAA_LLM_RESPONSE = json.dumps({
    "reply": "Got it. What is the BAA effective date?",
    "fields": {
        "provider": "HealthTech Inc.",
        "company": "Hospital Corp.",
        "baaEffectiveDate": None,
        "agreement": None,
        "breachNotificationPeriod": None,
        "limitations": None,
    },
})

MOCK_PRE_SELECTION_RESPONSE = json.dumps({
    "reply": "You need a BAA — let me help you with that.",
    "document_type": "baa",
})

MOCK_PRE_SELECTION_NO_TYPE = json.dumps({
    "reply": "I can help with several documents. Could you clarify?",
    "document_type": None,
})


def _make_mock_completion(content: str):
    mock_choice = MagicMock()
    mock_choice.message.content = content
    mock_response = MagicMock()
    mock_response.choices = [mock_choice]
    return mock_response


# ── NDA field-gathering tests ─────────────────────────────────────────────────


def test_chat_nda_returns_reply_and_extracted_fields(client, auth_headers, monkeypatch):
    monkeypatch.setenv("OPENROUTER_API_KEY", "test-key")

    with patch("app.routers.chat.acompletion",
               return_value=_make_mock_completion(MOCK_NDA_LLM_RESPONSE)):
        res = client.post(
            "/api/chat",
            headers=auth_headers,
            json={
                "messages": [{"role": "user", "content": "Acme Inc. and Beta Corp."}],
                "document_type": "mutual_nda",
                "current_fields": {},
            },
        )

    assert res.status_code == 200
    data = res.json()
    assert data["reply"] == "Great! What are the signatories' names and titles?"
    assert data["extracted_fields"]["party1Company"] == "Acme Inc."
    assert data["extracted_fields"]["party2Company"] == "Beta Corp."
    assert data["document_type"] is None
    # NDA save path: 2 of the 17 required fields were filled, so the row exists.
    assert data["document_id"] is not None


def test_chat_nda_excludes_null_fields(client, auth_headers, monkeypatch):
    monkeypatch.setenv("OPENROUTER_API_KEY", "test-key")

    with patch("app.routers.chat.acompletion",
               return_value=_make_mock_completion(MOCK_NDA_LLM_RESPONSE)):
        res = client.post(
            "/api/chat",
            headers=auth_headers,
            json={
                "messages": [{"role": "user", "content": "Acme and Beta"}],
                "document_type": "mutual_nda",
                "current_fields": {},
            },
        )

    data = res.json()
    assert "party1Name" not in data["extracted_fields"]
    assert "governingLaw" not in data["extracted_fields"]


# ── Pre-selection tests ───────────────────────────────────────────────────────


def test_pre_selection_returns_document_type(client, auth_headers, monkeypatch):
    monkeypatch.setenv("OPENROUTER_API_KEY", "test-key")

    with patch("app.routers.chat.acompletion",
               return_value=_make_mock_completion(MOCK_PRE_SELECTION_RESPONSE)):
        res = client.post(
            "/api/chat",
            headers=auth_headers,
            json={
                "messages": [{"role": "user", "content": "I need a business associate agreement"}],
                "document_type": None,
                "current_fields": {},
            },
        )

    assert res.status_code == 200
    data = res.json()
    assert data["reply"] == "You need a BAA — let me help you with that."
    assert data["document_type"] == "baa"
    assert data["extracted_fields"] is None
    # Pre-selection does NOT persist a draft.
    assert data["document_id"] is None


def test_pre_selection_no_type_returns_null(client, auth_headers, monkeypatch):
    monkeypatch.setenv("OPENROUTER_API_KEY", "test-key")

    with patch("app.routers.chat.acompletion",
               return_value=_make_mock_completion(MOCK_PRE_SELECTION_NO_TYPE)):
        res = client.post(
            "/api/chat",
            headers=auth_headers,
            json={
                "messages": [{"role": "user", "content": "I need some legal help"}],
            },
        )

    assert res.status_code == 200
    data = res.json()
    assert data["document_type"] is None
    assert data["extracted_fields"] is None


def test_pre_selection_omitting_document_type_defaults_to_pre_selection(client, auth_headers, monkeypatch):
    monkeypatch.setenv("OPENROUTER_API_KEY", "test-key")

    with patch("app.routers.chat.acompletion",
               return_value=_make_mock_completion(MOCK_PRE_SELECTION_NO_TYPE)):
        res = client.post(
            "/api/chat",
            headers=auth_headers,
            json={
                "messages": [{"role": "user", "content": "Hello"}],
            },
        )

    assert res.status_code == 200


# ── BAA field-gathering tests ─────────────────────────────────────────────────


def test_chat_baa_returns_extracted_fields(client, auth_headers, monkeypatch):
    monkeypatch.setenv("OPENROUTER_API_KEY", "test-key")

    with patch("app.routers.chat.acompletion",
               return_value=_make_mock_completion(MOCK_BAA_LLM_RESPONSE)):
        res = client.post(
            "/api/chat",
            headers=auth_headers,
            json={
                "messages": [{"role": "user", "content": "HealthTech Inc. and Hospital Corp."}],
                "document_type": "baa",
                "current_fields": {},
            },
        )

    assert res.status_code == 200
    data = res.json()
    assert data["extracted_fields"]["provider"] == "HealthTech Inc."
    assert data["extracted_fields"]["company"] == "Hospital Corp."
    assert "baaEffectiveDate" not in data["extracted_fields"]


# ── Error handling tests ──────────────────────────────────────────────────────


def test_chat_requires_authentication(client, monkeypatch):
    """Without auth headers, the chat endpoint must return 401."""
    monkeypatch.setenv("OPENROUTER_API_KEY", "test-key")
    res = client.post(
        "/api/chat",
        json={
            "messages": [{"role": "user", "content": "Hello"}],
            "current_fields": {},
        },
    )
    assert res.status_code == 401


def test_chat_missing_api_key_returns_500(client, auth_headers, monkeypatch):
    monkeypatch.delenv("OPENROUTER_API_KEY", raising=False)

    res = client.post(
        "/api/chat",
        headers=auth_headers,
        json={
            "messages": [{"role": "user", "content": "Hello"}],
            "current_fields": {},
        },
    )

    assert res.status_code == 500
    assert "OPENROUTER_API_KEY" in res.json()["detail"]


def test_chat_llm_error_returns_502(client, auth_headers, monkeypatch):
    monkeypatch.setenv("OPENROUTER_API_KEY", "test-key")

    with patch("app.routers.chat.acompletion", side_effect=RuntimeError("connection failed")):
        res = client.post(
            "/api/chat",
            headers=auth_headers,
            json={
                "messages": [{"role": "user", "content": "Hello"}],
                "current_fields": {},
            },
        )

    assert res.status_code == 502
    assert "LLM error" in res.json()["detail"]


def test_chat_invalid_request_returns_422(client, auth_headers):
    res = client.post("/api/chat", headers=auth_headers, json={"messages": "not-a-list"})
    assert res.status_code == 422


def test_chat_accepts_partial_current_fields(client, auth_headers, monkeypatch):
    monkeypatch.setenv("OPENROUTER_API_KEY", "test-key")

    with patch("app.routers.chat.acompletion",
               return_value=_make_mock_completion(MOCK_NDA_LLM_RESPONSE)):
        res = client.post(
            "/api/chat",
            headers=auth_headers,
            json={
                "messages": [{"role": "user", "content": "Beta Corp."}],
                "document_type": "mutual_nda",
                "current_fields": {"party1Company": "Acme Inc."},
            },
        )

    assert res.status_code == 200


def test_chat_malformed_llm_response_returns_502(client, auth_headers, monkeypatch):
    monkeypatch.setenv("OPENROUTER_API_KEY", "test-key")

    bad_mock = _make_mock_completion('{"not_valid_schema": true}')

    with patch("app.routers.chat.acompletion", return_value=bad_mock):
        res = client.post(
            "/api/chat",
            headers=auth_headers,
            json={
                "messages": [{"role": "user", "content": "Hello"}],
                "document_type": "mutual_nda",
                "current_fields": {},
            },
        )

    assert res.status_code == 502
    assert "unexpected format" in res.json()["detail"]


def test_chat_message_too_long_returns_422(client, auth_headers):
    res = client.post(
        "/api/chat",
        headers=auth_headers,
        json={
            "messages": [{"role": "user", "content": "x" * 4001}],
            "current_fields": {},
        },
    )
    assert res.status_code == 422
