import os
import stat
from contextlib import asynccontextmanager
from pathlib import Path

import anyio.to_thread
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.responses import FileResponse

from app.database import init_db
from app.routers import auth, chat, documents

STATIC_DIR = Path("/app/static")


class SpaStaticFiles(StaticFiles):
    """StaticFiles that also serves clean URLs for prerendered Next.js pages.

    Next.js' `output: "export"` produces `<route>.html` at the top of `out/`
    (e.g. `signin.html`, `documents.html`), not `<route>/index.html`. Starlette's
    built-in `StaticFiles(html=True)` only resolves `<route>/index.html`, so
    requesting `/signin` returns 404.

    This subclass additionally looks for `<path>.html` when a direct file match
    is missing. Real files (CSS/JS/PNG/...) fall through to the default lookup,
    and `/_next/...` chunks are unaffected.
    """

    async def get_response(self, path, scope):
        # Clean URLs: if `/signin` was requested and `static/signin.html`
        # exists, serve it. We do this BEFORE the default handler because the
        # default treats a same-named directory (`static/signin/`) as a
        # directory and looks for `static/signin/index.html`, which Next.js'
        # static export doesn't produce.
        name = Path(path).name
        if name and "." not in name and not path.endswith("/"):
            html_path = f"{path}.html"
            full_path, stat_result = await anyio.to_thread.run_sync(self.lookup_path, html_path)
            if stat_result is not None and stat.S_ISREG(stat_result.st_mode):
                return FileResponse(full_path, stat_result=stat_result)

        return await super().get_response(path, scope)


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(title="PreLegal API", lifespan=lifespan)

_cors_origins = os.environ.get("CORS_ORIGINS", "http://localhost:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api")
app.include_router(chat.router, prefix="/api")
app.include_router(documents.router, prefix="/api")


@app.get("/api/health")
def health():
    return {"status": "ok"}


# Static files must be mounted last — StaticFiles at "/" is a catch-all that
# shadows any route registered after it.
if STATIC_DIR.exists():
    app.mount("/", SpaStaticFiles(directory=STATIC_DIR, html=True), name="static")
