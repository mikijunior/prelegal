import json
from unittest.mock import MagicMock, patch

import pytest

from app.routers.chat import _build_system_prompt
from app.schemas import NDAFields


# ── Unit tests: system prompt builder ──────────────────────────────────────


def test_system_prompt_lists_unfilled_fields():
    fields = NDAFields()
    prompt = _build_system_prompt(fields)
    assert "party1Company" in prompt
    assert "STILL NEEDED" in prompt


def test_system_prompt_shows_filled_fields():
    fields = NDAFields(party1Company="Acme Inc.", party2Company="Beta Corp.")
    prompt = _build_system_prompt(fields)
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
    prompt = _build_system_prompt(fields)
    assert "All fields gathered" in prompt


# ── Integration tests: POST /api/chat ──────────────────────────────────────


MOCK_LLM_RESPONSE = json.dumps({
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


def _make_mock_completion():
    mock_choice = MagicMock()
    mock_choice.message.content = MOCK_LLM_RESPONSE
    mock_response = MagicMock()
    mock_response.choices = [mock_choice]
    return mock_response


def test_chat_returns_reply_and_extracted_fields(client, monkeypatch):
    monkeypatch.setenv("OPENROUTER_API_KEY", "test-key")

    with patch("app.routers.chat.acompletion", return_value=_make_mock_completion()):
        res = client.post(
            "/api/chat",
            json={
                "messages": [{"role": "user", "content": "Acme Inc. and Beta Corp."}],
                "current_fields": {},
            },
        )

    assert res.status_code == 200
    data = res.json()
    assert "reply" in data
    assert data["reply"] == "Great! What are the signatories' names and titles?"
    assert data["extracted_fields"]["party1Company"] == "Acme Inc."
    assert data["extracted_fields"]["party2Company"] == "Beta Corp."


def test_chat_excludes_null_fields_from_extracted(client, monkeypatch):
    monkeypatch.setenv("OPENROUTER_API_KEY", "test-key")

    with patch("app.routers.chat.acompletion", return_value=_make_mock_completion()):
        res = client.post(
            "/api/chat",
            json={
                "messages": [{"role": "user", "content": "Acme and Beta"}],
                "current_fields": {},
            },
        )

    data = res.json()
    # Null fields must not appear in extracted_fields
    assert "party1Name" not in data["extracted_fields"]
    assert "governingLaw" not in data["extracted_fields"]


def test_chat_missing_api_key_returns_500(client, monkeypatch):
    monkeypatch.delenv("OPENROUTER_API_KEY", raising=False)

    res = client.post(
        "/api/chat",
        json={
            "messages": [{"role": "user", "content": "Hello"}],
            "current_fields": {},
        },
    )

    assert res.status_code == 500
    assert "OPENROUTER_API_KEY" in res.json()["detail"]


def test_chat_llm_error_returns_502(client, monkeypatch):
    monkeypatch.setenv("OPENROUTER_API_KEY", "test-key")

    with patch("app.routers.chat.acompletion", side_effect=RuntimeError("connection failed")):
        res = client.post(
            "/api/chat",
            json={
                "messages": [{"role": "user", "content": "Hello"}],
                "current_fields": {},
            },
        )

    assert res.status_code == 502
    assert "LLM error" in res.json()["detail"]


def test_chat_invalid_request_returns_422(client):
    res = client.post("/api/chat", json={"messages": "not-a-list"})
    assert res.status_code == 422


def test_chat_accepts_partial_current_fields(client, monkeypatch):
    monkeypatch.setenv("OPENROUTER_API_KEY", "test-key")

    with patch("app.routers.chat.acompletion", return_value=_make_mock_completion()):
        res = client.post(
            "/api/chat",
            json={
                "messages": [{"role": "user", "content": "Beta Corp."}],
                "current_fields": {"party1Company": "Acme Inc."},
            },
        )

    assert res.status_code == 200


def test_chat_malformed_llm_response_returns_502(client, monkeypatch):
    monkeypatch.setenv("OPENROUTER_API_KEY", "test-key")

    bad_mock = _make_mock_completion()
    bad_mock.choices[0].message.content = '{"not_valid_schema": true}'

    with patch("app.routers.chat.acompletion", return_value=bad_mock):
        res = client.post(
            "/api/chat",
            json={
                "messages": [{"role": "user", "content": "Hello"}],
                "current_fields": {},
            },
        )

    assert res.status_code == 502
    assert "unexpected format" in res.json()["detail"]


def test_chat_message_too_long_returns_422(client):
    res = client.post(
        "/api/chat",
        json={
            "messages": [{"role": "user", "content": "x" * 4001}],
            "current_fields": {},
        },
    )
    assert res.status_code == 422
