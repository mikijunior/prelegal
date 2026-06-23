# Stage 1: Build Next.js static frontend
FROM node:22-alpine AS frontend-builder

WORKDIR /frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: Python FastAPI backend
FROM python:3.12-slim

WORKDIR /app

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

# Install Python dependencies
RUN uv pip install --system --no-cache \
    "fastapi>=0.115.0" \
    "uvicorn[standard]>=0.30.0" \
    "sqlalchemy>=2.0.0" \
    "passlib[bcrypt]>=1.7.4" \
    "python-jose[cryptography]>=3.3.0" \
    "python-multipart>=0.0.9" \
    "pydantic>=2.0.0" \
    "pydantic-settings>=2.0.0" \
    "aiofiles>=23.0.0" \
    "email-validator>=2.0.0"

# Copy backend app
COPY backend/app ./app

# Copy built static frontend
COPY --from=frontend-builder /frontend/out ./static

# Create data directory for SQLite
RUN mkdir -p /data

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
