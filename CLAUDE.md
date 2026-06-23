# Prelegal Project

## Overview

This is a SaaS product to allow users to draft legal agreements based on templates in the templates directory.
The user can carry out AI chat in order to establish what document they want and how to fill in the fields.
The available documents are covered in the catalog.json file in the project root, included here:

@catalog.json

The current implementation is a static Next.js frontend with a Mutual NDA form prototype. AI chat, full document support, and user-facing authentication are not yet implemented.

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

### Not yet implemented
- AI chat and LLM integration
- Document generation and persistence
- Authentication UI (sign up / sign in pages in the frontend)
- Support for document types beyond the Mutual NDA prototype
