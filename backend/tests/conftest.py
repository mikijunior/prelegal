from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.auth import create_access_token, hash_password
from app.database import Base, get_db
from app.main import app
from app.models import Document, User  # noqa: F401  — registered with Base.metadata

TEST_DB_URL = "sqlite:///:memory:"


@pytest.fixture(scope="session")
def test_engine():
    # StaticPool keeps a single shared connection so every Session sees the
    # same in-memory database (without it, `:memory:` creates a fresh DB per
    # connection and the `users` / `documents` tables created by `create_all`
    # would be invisible to subsequent requests).
    engine = create_engine(
        TEST_DB_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    yield engine
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def db_session(test_engine):
    # Truncate data between tests so function-scoped fixtures (e.g. `test_user`)
    # don't collide on unique constraints. We share the same engine (via
    # StaticPool) so every session sees the same schema, but the data is
    # wiped at the end of each test.
    Base.metadata.drop_all(bind=test_engine)
    Base.metadata.create_all(bind=test_engine)
    Session = sessionmaker(bind=test_engine)
    session = Session()
    try:
        yield session
    finally:
        session.rollback()
        session.close()


@pytest.fixture
def client(db_session):
    def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    # Prevent the lifespan from connecting to /data/prelegal.db during tests
    with patch("app.main.init_db"):
        with TestClient(app) as c:
            yield c

    app.dependency_overrides.clear()


@pytest.fixture
def test_user(db_session):
    user = User(email="alice@example.com", hashed_password=hash_password("Password123!"))
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def auth_headers(test_user):
    token = create_access_token({"sub": test_user.email})
    return {"Authorization": f"Bearer {token}"}
