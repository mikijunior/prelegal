"""Documents endpoint tests: list, get-by-type, get-by-id, user isolation, progress."""


def test_list_documents_empty(client, auth_headers):
    res = client.get("/api/documents", headers=auth_headers)
    assert res.status_code == 200
    assert res.json() == []


def test_get_document_by_type_404_when_none(client, auth_headers):
    res = client.get("/api/documents/by-type/baa", headers=auth_headers)
    assert res.status_code == 404


def test_chat_saves_document_and_lists_it(client, auth_headers, monkeypatch):
    """A successful chat turn persists a draft the list endpoint can return."""
    import json as json_lib
    from unittest.mock import MagicMock, patch

    monkeypatch.setenv("OPENROUTER_API_KEY", "test-key")

    mock_response = json_lib.dumps({
        "reply": "Got it.",
        "fields": {
            "provider": "HealthTech Inc.",
            "company": "Hospital Corp.",
            "baaEffectiveDate": None,
            "agreement": None,
            "breachNotificationPeriod": None,
            "limitations": None,
        },
    })
    choice = MagicMock(); choice.message.content = mock_response
    completion = MagicMock(); completion.choices = [choice]

    with patch("app.routers.chat.acompletion", return_value=completion):
        chat_res = client.post(
            "/api/chat",
            headers=auth_headers,
            json={
                "messages": [{"role": "user", "content": "BAA between them"}],
                "document_type": "baa",
                "current_fields": {},
            },
        )
    assert chat_res.status_code == 200
    body = chat_res.json()
    assert body["document_id"] is not None
    assert body["updated_at"] is not None

    # The list endpoint should now return one row.
    list_res = client.get("/api/documents", headers=auth_headers)
    assert list_res.status_code == 200
    rows = list_res.json()
    assert len(rows) == 1
    assert rows[0]["document_type"] == "baa"
    assert rows[0]["display_name"] == "Business Associate Agreement"
    # BAA has 5 required fields (provider, company, baaEffectiveDate, agreement,
    # breachNotificationPeriod); we filled 2.
    assert rows[0]["progress"] == {"required_filled": 2, "required_total": 5}


def test_get_document_by_type_returns_saved_fields(client, auth_headers, monkeypatch):
    import json as json_lib
    from unittest.mock import MagicMock, patch

    monkeypatch.setenv("OPENROUTER_API_KEY", "test-key")
    mock_response = json_lib.dumps({
        "reply": "Ok.",
        "fields": {
            "provider": "Acme",
            "company": "Beta",
            "baaEffectiveDate": None,
            "agreement": None,
            "breachNotificationPeriod": None,
            "limitations": None,
        },
    })
    choice = MagicMock(); choice.message.content = mock_response
    completion = MagicMock(); completion.choices = [choice]
    with patch("app.routers.chat.acompletion", return_value=completion):
        client.post(
            "/api/chat",
            headers=auth_headers,
            json={
                "messages": [{"role": "user", "content": "go"}],
                "document_type": "baa",
                "current_fields": {},
            },
        )

    res = client.get("/api/documents/by-type/baa", headers=auth_headers)
    assert res.status_code == 200
    body = res.json()
    assert body["document_type"] == "baa"
    assert body["fields"] == {"provider": "Acme", "company": "Beta"}
    assert body["progress"]["required_filled"] == 2


def test_documents_isolated_per_user(client, db_session, monkeypatch):
    """User A's draft is invisible to user B."""
    import json as json_lib
    from unittest.mock import MagicMock, patch

    from app.auth import create_access_token, hash_password
    from app.models import User

    user_a = User(email="a@example.com", hashed_password=hash_password("Password123!"))
    user_b = User(email="b@example.com", hashed_password=hash_password("Password123!"))
    db_session.add_all([user_a, user_b]); db_session.commit()
    db_session.refresh(user_a); db_session.refresh(user_b)

    headers_a = {"Authorization": f"Bearer {create_access_token({'sub': user_a.email})}"}
    headers_b = {"Authorization": f"Bearer {create_access_token({'sub': user_b.email})}"}

    monkeypatch.setenv("OPENROUTER_API_KEY", "test-key")
    mock_response = json_lib.dumps({
        "reply": "Ok.",
        "fields": {
            "provider": "P", "company": "C",
            "baaEffectiveDate": None, "agreement": None,
            "breachNotificationPeriod": None, "limitations": None,
        },
    })
    choice = MagicMock(); choice.message.content = mock_response
    completion = MagicMock(); completion.choices = [choice]
    with patch("app.routers.chat.acompletion", return_value=completion):
        client.post(
            "/api/chat",
            headers=headers_a,
            json={
                "messages": [{"role": "user", "content": "go"}],
                "document_type": "baa",
                "current_fields": {},
            },
        )

    # User A has 1 document; user B has none.
    assert len(client.get("/api/documents", headers=headers_a).json()) == 1
    assert client.get("/api/documents", headers=headers_b).json() == []

    # User B can't fetch user A's draft by type.
    assert client.get("/api/documents/by-type/baa", headers=headers_b).status_code == 404
