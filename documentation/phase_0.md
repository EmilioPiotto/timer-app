# Phase 0 — Environment Setup

## What We Did

Installed all required tooling, created the Python virtual environment, and wrote the configuration files needed to run the project locally.

---

## Tooling Installed

### uv (Python package manager)
Installed via the official installer:
```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```
Binary lives at `~/.local/bin/uv`. Faster than pip. Used to create the venv and install packages.

### Node.js (via nvm)
Installed nvm, then used it to install the latest LTS Node:
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
nvm install --lts
```
Installed version: **Node.js v24.14.0 / npm v11.9.0**

nvm appends itself to `~/.bashrc`, so `node` is available in any normal VS Code terminal. It won't be on PATH in non-interactive shells — this is fine.

### Docker Desktop (WSL integration)
DynamoDB Local runs as a Docker container. Required setup:
1. Install Docker Desktop on Windows
2. Settings → Resources → WSL Integration → enable your Ubuntu distro
3. Add your user to the docker group so you can run Docker without sudo:
   ```bash
   sudo usermod -aG docker $USER
   newgrp docker   # apply immediately in current session (or reopen terminal)
   ```

---

## Python Virtual Environment

The venv lives at `timervenv/` (Python 3.12). Created and populated with uv:

```bash
uv venv timervenv --python 3.12
uv pip install --python timervenv/bin/python fastapi "uvicorn[standard]" boto3 mangum pydantic
```

To activate manually:
```bash
source timervenv/bin/activate
```

Pinned versions are in `backend/requirements.txt`. To recreate the venv from scratch:
```bash
uv venv timervenv --python 3.12
uv pip install --python timervenv/bin/python -r backend/requirements.txt
```

### Packages and their roles
| Package | Role |
|---|---|
| `fastapi` | Web framework for the backend API |
| `uvicorn[standard]` | ASGI server that runs FastAPI locally |
| `boto3` | AWS SDK — talks to DynamoDB (local Docker and real AWS, same code) |
| `pydantic` | Data validation and serialization (also used by FastAPI internally) |
| `mangum` | Wraps FastAPI for AWS Lambda — needed in Phase 9, harmless to install now |
| `python-dotenv` | Loads `.env.local` into environment variables at startup |

---

## Configuration Files

### `docker-compose.yml`
Defines the DynamoDB Local container:
- Image: `amazon/dynamodb-local:latest`
- Exposed on **port 8001** (container internally uses 8000)
- `-sharedDb` flag: all tables stored in a single file, survives restarts
- Data persisted in a named Docker volume (`dynamodb-data`)

### `.env.example`
Committed to git. Shows all required environment variables without real values. Copy to `.env.local` to configure locally.

### `.env.local`
Git-ignored. Actual local values:
```
DYNAMODB_ENDPOINT_URL=http://localhost:8001
DYNAMODB_TABLE_MACROS=macros
DYNAMODB_TABLE_TIMERS=timers
AWS_DEFAULT_REGION=us-east-1
AWS_ACCESS_KEY_ID=local
AWS_SECRET_ACCESS_KEY=local
```
The fake AWS credentials are required because DynamoDB Local checks for their presence even though it doesn't validate them.

### `.gitignore`
Excludes: `timervenv/`, `__pycache__/`, `.env.local`, `frontend/node_modules/`, `frontend/dist/`, CDK output.

---

## Starting the Local Environment

### DynamoDB Local
```bash
docker compose up -d    # start in background
docker compose down     # stop
```
Data persists across restarts via the Docker volume. Verify it's running:
```bash
curl http://localhost:8001
# Expected: {"__type":"...MissingAuthenticationToken"...}  ← means it's up
```

### Backend (Phase 1+)
```bash
source timervenv/bin/activate
uvicorn backend.main:app --reload --port 8000
```

### Frontend (Phase 2+)
```bash
cd frontend
npm run dev   # starts Vite on port 5173
```

---

## Architecture Reminder

The backend and frontend run **directly** (not in Docker) during local development:
- Hot reload works instantly — no rebuild step
- Logs go straight to the terminal
- Docker is only used for DynamoDB Local because it's a third-party service we don't develop

In production: backend → AWS Lambda, frontend → S3 + CloudFront. No Docker involved.

---

## Verification Checklist

- [x] `node --version` → v24.14.0
- [x] `npm --version` → v11.9.0
- [x] `timervenv/bin/python -c "import fastapi, uvicorn, boto3, mangum, pydantic"` → no errors
- [x] `curl http://localhost:8001` → MissingAuthenticationToken response (DynamoDB Local is up)
