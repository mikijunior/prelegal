# Prelegal Project

## Overview

This is a SaaS product to allow users to draft legal agreements based on templates in the templates directory.
The user can carry out AI chat in order to establish what document they want and how to fill in the fields.
The available documents are covered in the catalog.json file in the project root, included here:

@catalog.json

The current implementation is a static Next.js frontend with an AI chat interface for Mutual NDA creation. Full document support and user-facing authentication are not yet implemented.

## Development process

When instructed to build a feature:
1. Use your Atlassian tools to read the feature instructions from Jira
2. Develop the feature - do not skip any step from the feature-dev 7 step process
3. Thoroughly test the feature with unit tests and integration tests and fix any issues
4. Submit a PR using your github tools

## AI design

When writing code to make calls to LLMs, use your Cerebras skill to use LiteLLM via OpenRouter to the `openrouter/openai/gpt-oss-120b` model with Cerebras as the inference provider. You should use Structured Outputs so that you can interpret the results and populate fields in the legal document.

There is an OPENROUTER_API_KEY in the .env file in the project root.

## Technical design

The entire project should be packaged into a Docker container.  
The backend should be in backend/ and be a uv project, using FastAPI.  
The frontend should be in frontend/  
The database uses SQLite at `/data/prelegal.db` (persisted via a Docker volume), with a `users` table for sign up and sign in. The database schema is created on container startup if it doesn't exist.  
The frontend is statically exported (`next build` with `output: "export"`) and served by FastAPI from `/app/static`.  
Scripts exist in scripts/ for:  
```bash
# Mac
scripts/start-mac.sh    # Start
scripts/stop-mac.sh     # Stop

# Linux
scripts/start-linux.sh
scripts/stop-linux.sh

# Windows
scripts/start-windows.ps1
scripts/stop-windows.ps1
```
Backend available at http://localhost:8000

## Implementation status

### PL-4 — V1 foundation (done)
- `backend/` — FastAPI uv project with SQLite auth
  - `POST /api/auth/signup` — create account, returns JWT
  - `POST /api/auth/signin` — sign in, returns JWT
  - `GET /api/me` — returns current user (Bearer token required)
  - `GET /api/health` — health check
- `frontend/next.config.ts` — `output: "export"` for static build
- `Dockerfile` — multi-stage: Node.js builds frontend, Python serves everything
- `docker-compose.yml` — single container, `prelegal_data` volume for SQLite
- `scripts/` — start/stop for Mac, Linux, Windows
- `SECRET_KEY` loaded from env; falls back to dev default if not set

### PL-5 — AI chat for Mutual NDA (done)
- `frontend/components/ChatPanel.tsx` — replaces the static form; AI gathers NDA fields conversationally and updates the live preview in real time
- `backend/app/routers/chat.py` — async `POST /api/chat` endpoint (unauthenticated); calls `openrouter/openai/gpt-oss-120b` via LiteLLM + Cerebras with Structured Outputs
- `backend/app/schemas.py` — `NDAFields`, `ChatMessage`, `ChatRequest`, `ChatLLMResponse` Pydantic schemas with input length limits
- CORS origins configurable via `CORS_ORIGINS` env var (defaults to `http://localhost:3000` for dev)
- `OPENROUTER_API_KEY` now passed from `.env` into the Docker container via `docker-compose.yml`
- `litellm` added to `pyproject.toml` and `Dockerfile`
- `backend/tests/` — 11 pytest tests for the chat endpoint
- `frontend/.env.local` (gitignored) — set `NEXT_PUBLIC_API_URL=http://localhost:8000` for local dev with `npm run dev`

### PL-6 — Multi-document support (done)
- 11 additional legal document types now supported: BAA, CSA, DPA, Partnership, Pilot, PSA, SLA, Software License, AI Addendum, Design Partner (Mutual NDA continues to use its dedicated preview)
- AI-asks-at-start flow: `POST /api/chat` first runs a pre-selection phase (no `document_type`) to identify which document the user needs; once identified, subsequent turns gather the relevant fields
- `backend/app/document_registry.py` — per-document config registry with field descriptions, optional fields, and system prompt builder
- `backend/app/schemas.py` — `DocumentType` enum plus one `*Fields` schema and one `*LLMResponse` schema per document type; Pydantic `Literal` types enforce enum values
- `frontend/lib/document-types.ts` — shared TypeScript `DocumentType` union, `DEFAULT_FORM_DATA`, `TEMPLATE_PATHS`, and `VARIABLE_MAPS` (span name → field key)
- `frontend/components/TemplateRenderer.tsx` — generic renderer for the 10 new doc types: fetches template markdown from `frontend/public/templates/`, parses `<span class="keyterms_link|coverpage_link|orderform_link|businessterms_link">Variable</span>` and substitutes `<Fill>` components with the gathered value
- `frontend/components/DocumentPreview.tsx` — routes between `NDAPreview` (NDA) and `TemplateRenderer` (all others)
- `frontend/public/templates/*.md` — copies of the Common Paper templates for client-side rendering
- Chat conversation resets once a document type is selected so pre-selection turns do not pollute field-gathering context

### PL-7 — Multi-user & final polish (done)
- **Auth**: `POST /api/auth/signup`, `POST /api/auth/signin`, `GET /api/me`. Chat endpoint now requires `Bearer` token.
- **Persistence**: `backend/app/models.py` adds `Document` (FK to `users`, JSON `fields_json`, denormalized `required_filled` / `required_total`, `UniqueConstraint(user_id, document_type)`). Auto-saves on every successful field-gathering chat turn. `idempotent` `create_all` creates the `documents` table on first launch; existing `users` rows preserved.
- **Read API**: `GET /api/documents` (list, ordered by `updated_at DESC`), `GET /api/documents/by-type/{type}` (single), `GET /api/documents/{id}`. User isolation enforced — every query is `WHERE user_id = current_user.id`.
- **Progress math** lives in `backend/app/services/documents.py`: `required_field_names(doc_type)` from the registry, `(filled, total)` stored on the row so list endpoint is a thin wrapper.
- **Frontend**: `lib/api.ts` typed fetch wrapper with bearer-injection and 401 redirect, `lib/auth-context.tsx` (`AuthProvider` + `useAuth`), `components/RequireAuth.tsx`. Token in `localStorage`.
- **Pages**: route groups `(auth)` and `(app)`. Public `/signin` and `/signup` pages with a centered `Card`. Protected `/` (chat + preview, supports `?doc=<type>` hydration) and `/documents` (My Documents list with progress bars and Continue buttons).
- **Polish**: `components/ui/{Button,TextField,Card}` primitives. `<TopNav>` with user menu and sign-out. Persistent `<DisclaimerFooter>` on every page. Prominent amber `<DisclaimerBanner>` above the document preview.
- **Tests**: 69 backend pytest tests (auth, chat, documents, document registry, services), 117 frontend jest tests (api, auth-context, TemplateRenderer, document-types, ChatPanel, NDAPreview, NDAForm, DocumentsList, Button, nda-data).

### Not yet implemented
- Document deletion endpoint
- Email verification, password reset, OAuth
- Multi-device real-time sync
- Document versioning / audit trail
