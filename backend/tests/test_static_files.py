"""Static-file / clean-URL fallback tests.

The frontend is statically exported by Next.js, which produces `<route>.html`
files at the top of `out/` (e.g. `signin.html`, `documents.html`) rather than
`<route>/index.html` directories. Starlette's `StaticFiles(html=True)` only
serves `<route>/index.html` — so without our custom `SpaStaticFiles` subclass,
`GET /signin` returns 404.

These tests pin the behavior in place.
"""
from pathlib import Path

import pytest

from app.main import SpaStaticFiles


@pytest.fixture
def static_root(tmp_path: Path) -> Path:
    """Build a minimal fake out/ with a couple of `.html` prerenders + an asset."""
    (tmp_path / "index.html").write_text("<html>root</html>")
    (tmp_path / "signin.html").write_text("<html>signin</html>")
    (tmp_path / "documents.html").write_text("<html>documents</html>")
    (tmp_path / "favicon.ico").write_bytes(b"\x00\x00\x01\x00")
    (tmp_path / "_next").mkdir()
    (tmp_path / "_next" / "static").mkdir()
    (tmp_path / "_next" / "static" / "chunks").mkdir()
    (tmp_path / "_next" / "static" / "chunks" / "app.js").write_text("// js")
    return tmp_path


@pytest.fixture
def mounted_app(static_root):
    """A FastAPI app with only the static mount, pointed at the fake out/."""
    from fastapi import FastAPI

    from app.main import SpaStaticFiles as _Spa

    test_app = FastAPI()
    test_app.mount("/", _Spa(directory=str(static_root), html=True), name="static")
    return test_app


def test_serves_clean_url(mounted_app):
    from fastapi.testclient import TestClient

    client = TestClient(mounted_app)
    r = client.get("/signin")
    assert r.status_code == 200
    assert "signin" in r.text


def test_serves_documents_clean_url(mounted_app):
    from fastapi.testclient import TestClient

    client = TestClient(mounted_app)
    r = client.get("/documents")
    assert r.status_code == 200
    assert "documents" in r.text


def test_serves_root(mounted_app):
    from fastapi.testclient import TestClient

    client = TestClient(mounted_app)
    r = client.get("/")
    assert r.status_code == 200
    assert "root" in r.text


def test_serves_real_asset_files(mounted_app):
    from fastapi.testclient import TestClient

    client = TestClient(mounted_app)
    r = client.get("/_next/static/chunks/app.js")
    assert r.status_code == 200
    assert r.text == "// js"


def test_serves_favicon(mounted_app):
    from fastapi.testclient import TestClient

    client = TestClient(mounted_app)
    r = client.get("/favicon.ico")
    assert r.status_code == 200
    assert r.content == b"\x00\x00\x01\x00"


def test_missing_route_still_404s(mounted_app):
    """Fallback should NOT catch asset 404s and shouldn't invent pages."""
    from fastapi.testclient import TestClient

    client = TestClient(mounted_app)
    r = client.get("/missing-page")
    assert r.status_code == 404


def test_missing_asset_still_404s(mounted_app):
    from fastapi.testclient import TestClient

    client = TestClient(mounted_app)
    r = client.get("/_next/static/chunks/missing.js")
    assert r.status_code == 404
