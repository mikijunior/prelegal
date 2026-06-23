"""Auth endpoint tests: signup, signin, /api/me, error paths."""


def test_signup_creates_user_and_returns_token(client):
    res = client.post(
        "/api/auth/signup",
        json={"email": "new@example.com", "password": "Password123!"},
    )
    assert res.status_code == 201
    body = res.json()
    assert body["token_type"] == "bearer"
    assert isinstance(body["access_token"], str) and body["access_token"]


def test_signup_duplicate_email_returns_400(client):
    body = {"email": "dup@example.com", "password": "Password123!"}
    assert client.post("/api/auth/signup", json=body).status_code == 201
    res = client.post("/api/auth/signup", json=body)
    assert res.status_code == 400
    assert "already registered" in res.json()["detail"]


def test_signup_password_too_short_returns_422(client):
    res = client.post(
        "/api/auth/signup",
        json={"email": "short@example.com", "password": "short"},
    )
    assert res.status_code == 422


def test_signin_returns_token(client):
    client.post(
        "/api/auth/signup",
        json={"email": "signin@example.com", "password": "Password123!"},
    )
    res = client.post(
        "/api/auth/signin",
        json={"email": "signin@example.com", "password": "Password123!"},
    )
    assert res.status_code == 200
    assert res.json()["access_token"]


def test_signin_bad_password_returns_401(client):
    client.post(
        "/api/auth/signup",
        json={"email": "bad@example.com", "password": "Password123!"},
    )
    res = client.post(
        "/api/auth/signin",
        json={"email": "bad@example.com", "password": "WrongPassword"},
    )
    assert res.status_code == 401
    assert "Invalid credentials" in res.json()["detail"]


def test_me_returns_user_when_authed(client, auth_headers, test_user):
    res = client.get("/api/me", headers=auth_headers)
    assert res.status_code == 200
    assert res.json() == {"id": test_user.id, "email": test_user.email}


def test_me_without_token_returns_401(client):
    res = client.get("/api/me")
    assert res.status_code == 401
    assert "Not authenticated" in res.json()["detail"]


def test_me_with_bad_token_returns_401(client):
    res = client.get("/api/me", headers={"Authorization": "Bearer not-a-jwt"})
    assert res.status_code == 401
