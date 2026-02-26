# Local Development Guide

## Prerequisites

- Docker Desktop (WSL2 backend)
- Node.js (via nvm)
- Python 3.12 venv at `timervenv/`

---

## Starting Everything

Open **three terminal tabs** from the project root (`~/wsl_repos/timer_app`).

### Tab 1 — DynamoDB Local

```bash
sudo docker compose up -d
```

> **Note:** DynamoDB runs in `-inMemory` mode — data is lost when the container stops.
> Tables are recreated automatically on every backend startup, so this is fine for local dev.

Verify it's up:
```bash
curl http://localhost:8001
# → {"__type":"...MissingAuthenticationToken",...}  ← means it's running
```

### Tab 2 — Backend (FastAPI)

```bash
source timervenv/bin/activate
uvicorn backend.main:app --reload --port 8000
```

On startup, `init_tables()` creates the `macros` and `timers` DynamoDB tables automatically.

### Tab 3 — DynamoDB Admin UI (optional)

```bash
DYNAMO_ENDPOINT=http://localhost:8001 npx dynamodb-admin --port 8002
```

---

## URLs

| Service | URL | Notes |
|---|---|---|
| Backend API | http://localhost:8000/api | All routes prefixed `/api` |
| FastAPI interactive docs | http://localhost:8000/docs | Try all endpoints from the browser |
| FastAPI schema | http://localhost:8000/redoc | Alternative docs view |
| DynamoDB Admin UI | http://localhost:8002 | Browse tables and items |
| DynamoDB Local (raw) | http://localhost:8001 | boto3 endpoint, not for browser use |

---

## API Quick Reference

### Health
```bash
curl http://localhost:8000/api/health
```

### Macros
```bash
# List
curl http://localhost:8000/api/macros

# Create
curl -X POST http://localhost:8000/api/macros \
  -H "Content-Type: application/json" \
  -d '{"name":"Tabata","steps":[{"type":"BEEP","soundId":"beep1","volume":0.8},{"type":"WAIT","seconds":20}]}'

# Get / Update / Delete
curl http://localhost:8000/api/macros/{id}
curl -X PUT http://localhost:8000/api/macros/{id} -H "Content-Type: application/json" -d '{...}'
curl -X DELETE http://localhost:8000/api/macros/{id}
```

### Timers
```bash
# List (lightweight — no slot expansion)
curl http://localhost:8000/api/timers

# Create
curl -X POST http://localhost:8000/api/timers \
  -H "Content-Type: application/json" \
  -d '{"name":"My Timer","totalMinutes":20,"slots":[{"macroId":"<id>","loopMode":"FIXED_MINUTES","loopMinutes":20.0}]}'

# Get (slots include full expanded macro)
curl http://localhost:8000/api/timers/{id} | python3 -m json.tool

# Update / Delete
curl -X PUT http://localhost:8000/api/timers/{id} -H "Content-Type: application/json" -d '{...}'
curl -X DELETE http://localhost:8000/api/timers/{id}
```

### Templates (read-only, hardcoded)
```bash
curl http://localhost:8000/api/templates/macros | python3 -m json.tool
curl http://localhost:8000/api/templates/timers | python3 -m json.tool
```

---

## Venv Notes

If the venv ever loses its Linux binaries (WSL2 issue), recreate it:

```bash
uv venv timervenv --python 3.12 --clear
uv pip install --python timervenv/bin/python -r backend/requirements.txt
```

---

## Stopping Everything

```bash
# Stop backend: Ctrl+C in Tab 2
# Stop dynamodb-admin: Ctrl+C in Tab 3
# Stop DynamoDB container:
sudo docker compose down
```
