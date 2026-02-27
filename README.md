# Timer App

A workout timer builder. Create reusable sound+wait sequences (Macros), compose them into Timers, and run them with audio cues.

## Prerequisites

- Docker Desktop (WSL2 backend)
- Python 3.12 + [uv](https://github.com/astral-sh/uv)
- Node.js via nvm

## Running locally

Open four terminal tabs from the project root.

**Tab 1 — DynamoDB Local**
```bash
sudo docker compose up -d
```
Data is in-memory only — lost when the container stops. Tables are recreated automatically on backend startup.

**Tab 2 — Backend**
```bash
source timervenv/bin/activate
uvicorn backend.main:app --reload --port 8000
```

**Tab 3 — Frontend**
```bash
cd frontend
npm run dev
```
If `npm` is not found: `export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh"`

**Tab 4 — DynamoDB Admin UI (optional)**
```bash
DYNAMO_ENDPOINT=http://localhost:8001 npx dynamodb-admin --port 8002
```

## URLs

| Service | URL |
|---|---|
| App | http://localhost:5173 |
| API docs | http://localhost:8000/docs |
| DynamoDB Admin | http://localhost:8002 |

## Known limitations

- Data does not persist across Docker restarts (in-memory DynamoDB)
- No user accounts — all timers/macros are shared in the local instance
- SPEAK step type is defined in the model but not yet implemented in the runner
- No AWS deployment wired up yet (CDK in `infra/` is a stub)
