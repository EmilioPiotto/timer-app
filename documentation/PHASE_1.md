# Phase 1 — Backend Core

## Goal

Implement the full Python backend: Pydantic models, DynamoDB CRUD, templates, and a FastAPI app exposing all 12 routes. No frontend.

**Done condition:** POST macro → POST timer → GET timer returns timer with `slots[].macro` fully expanded.

---

## Files Created

```
backend/__init__.py      empty — makes backend/ a Python package for relative imports
backend/database.py      boto3 DynamoDB resource, get_macros_table/get_timers_table, init_tables()
backend/models.py        Pydantic v2 models for all request/response types
backend/crud_macros.py   list, get, create, update, delete for macros table
backend/crud_timers.py   list, get, create, update, delete for timers table (GET expands slots)
backend/templates.py     3 macro templates + 3 timer templates as hardcoded dicts
backend/main.py          FastAPI app, CORS, lifespan, all 12 routes
```

---

## Key Design Decisions

### Serialization
`steps` (on macros) and `slots` (on timers) are stored as **JSON strings** in DynamoDB rather than DynamoDB maps. This avoids boto3's `Decimal` type conversion issues with nested floats and keeps serialization simple.

### Slot expansion (N+1 reads)
`GET /api/timers/{id}` fetches the macro for each slot individually. Acceptable for a personal app with small data sets.

### `init_tables()` is idempotent
Called on every uvicorn startup via the FastAPI lifespan. Catches `ResourceInUseException` silently if tables already exist.

### DynamoDB in-memory mode
`docker-compose.yml` runs DynamoDB Local with `-inMemory`. Data is lost on container restart, but `init_tables()` recreates tables automatically so this is transparent in practice.

---

## Models

```
Step  (discriminated union on `type`)
  BeepStep:  type="BEEP", soundId: "beep1"|"beep2"|"bell", volume: float 0–1
  WaitStep:  type="WAIT", seconds: int 1–3600

MacroSlot
  macroId, loopMode: FIXED_CYCLES|FIXED_MINUTES|AUTO
  loopCycles (required if FIXED_CYCLES), loopMinutes (required if FIXED_MINUTES)
  validated via model_validator(mode="after")

MacroCreate    → name, steps[]
MacroResponse  → id, name, steps[], createdAt, updatedAt

MacroSlotResponse  → all MacroSlot fields + macro: MacroResponse  (expanded)

TimerCreate    → name, totalMinutes, slots[]
TimerResponse  → id, name, totalMinutes, slots: MacroSlotResponse[], createdAt, updatedAt
TimerListItem  → id, name, totalMinutes, createdAt, updatedAt  (no slots — avoids N reads on list)
```

---

## Routes

| Method | Path | Status | Notes |
|---|---|---|---|
| GET | /api/health | 200 | `{"status":"ok"}` |
| GET | /api/macros | 200 | List all macros |
| POST | /api/macros | 201 | Create macro |
| GET | /api/macros/{id} | 200/404 | Full macro with steps |
| PUT | /api/macros/{id} | 200/404 | Full replace, preserves createdAt |
| DELETE | /api/macros/{id} | 204/404 | |
| GET | /api/timers | 200 | Lightweight list (no slot expansion) |
| POST | /api/timers | 201 | Create timer |
| GET | /api/timers/{id} | 200/404/422 | Expanded slots; 422 if a macro is missing |
| PUT | /api/timers/{id} | 200/404/422 | Full replace |
| DELETE | /api/timers/{id} | 204/404 | |
| GET | /api/templates/macros | 200 | Hardcoded, no DB |
| GET | /api/templates/timers | 200 | Hardcoded, no DB |

---

## Templates

### Macro Templates
| ID | Name | Steps |
|---|---|---|
| `tmpl-macro-tabata` | Tabata interval | BEEP(beep1) → WAIT(20s) → BEEP(beep2) → WAIT(10s) |
| `tmpl-macro-emom` | EMOM minute | BEEP(bell) → WAIT(60s) |
| `tmpl-macro-workrest` | Work/Rest 15/45 | BEEP(beep1) → WAIT(15s) → BEEP(beep2) → WAIT(45s) |

### Timer Templates
| ID | Name | Slots |
|---|---|---|
| `tmpl-timer-tabata20` | Quick Tabata 20min | EMOM×FIXED_MINUTES(2) + Tabata×FIXED_MINUTES(16) + EMOM×FIXED_MINUTES(2) |
| `tmpl-timer-emom30` | EMOM 30min | EMOM×FIXED_CYCLES(30) |
| `tmpl-timer-custom45` | Custom 45min | WorkRest×FIXED_MINUTES(20) + EMOM×AUTO + WorkRest×AUTO |

---

## Issues Encountered

### DynamoDB Local hangs on authenticated requests
**Symptom:** uvicorn stalled at "Waiting for application startup"; boto3 read timeout on every request with auth headers.

**Root cause:** DynamoDB Local was running with `-dbPath /data` backed by a named Docker volume. The volume could not be written to in the WSL2 environment, causing the Java process to hang on disk I/O. Unauthenticated requests return immediately (auth check fails before DB access); authenticated requests reach the DB layer and hang.

**Fix:** Switched to `-inMemory` mode in `docker-compose.yml`. No volume needed.

### Wrong Docker command format
**Symptom:** Container exited immediately with `Unrecognized option: -sharedDb`.

**Root cause:** The `amazon/dynamodb-local` image ENTRYPOINT is `java` (not `java -jar DynamoDBLocal.jar`). Passing `["-sharedDb", "-inMemory"]` as the command made Docker run `java -sharedDb -inMemory`, which the JVM rejected.

**Fix:** Command must include `-jar DynamoDBLocal.jar`:
```yaml
command: "-jar DynamoDBLocal.jar -sharedDb -inMemory"
```

---

## Verification

```bash
# Health
curl http://localhost:8000/api/health
# → {"status":"ok"}

# Create macro
curl -X POST http://localhost:8000/api/macros \
  -H "Content-Type: application/json" \
  -d '{"name":"Tabata","steps":[{"type":"BEEP","soundId":"beep1","volume":0.8},{"type":"WAIT","seconds":20}]}'

# Create timer (replace MACRO_ID)
curl -X POST http://localhost:8000/api/timers \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","totalMinutes":10,"slots":[{"macroId":"MACRO_ID","loopMode":"FIXED_MINUTES","loopMinutes":10.0}]}'

# GET timer — slots[0].macro must be fully expanded
curl http://localhost:8000/api/timers/TIMER_ID | python3 -m json.tool

# Templates
curl http://localhost:8000/api/templates/macros | python3 -m json.tool
curl http://localhost:8000/api/templates/timers | python3 -m json.tool
```
