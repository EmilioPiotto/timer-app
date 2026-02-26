# Macro Timer — Design & Architecture

## Project Guidelines
- Keep it as simple as possible at every layer
- Python backend (FastAPI); TypeScript frontend (React + Vite)
- Local-first: get it running locally before touching AWS
- No over-engineering: no auth, no orgs, no realtime sync
- SPEAK step: deferred

---

## Concept

A **Timer** is a workout session of X total minutes. It is composed of an ordered list of **Macros**. Each Macro is a reusable, independently-managed pattern of beep and wait steps that runs inside a Timer with specific loop settings. Macros live in a shared library and can appear in multiple Timers.

---

## Architecture

### Local (dev)
```
Browser
  ├── React + Vite (localhost:5173)
  │     └── /api/* proxied → localhost:8000
  ├── FastAPI + Uvicorn (localhost:8000)
  └── DynamoDB Local (localhost:8001, Docker)
```

### Production (AWS)
```
Browser
  ├── CloudFront → S3 (static frontend build)
  └── API Gateway → Lambda (FastAPI + Mangum)
                         └── DynamoDB (on-demand)

IaC:  AWS CDK (Python)   infra/
CICD: GitHub Actions     .github/workflows/
```

---

## Data Model

### Macro (shared library entity)
```
id          uuid    (partition key in DynamoDB)
name        string
steps       Step[]  (free-form, any order)
createdAt   ISO 8601
updatedAt   ISO 8601
```

### Step (discriminated union on `type`)
```
BEEP: { type: "BEEP", soundId: "beep1"|"beep2"|"bell", volume: 0..1 }
WAIT: { type: "WAIT", seconds: int (1–3600) }
```

### MacroSlot (embedded in Timer, not a separate entity)
```
macroId     uuid     (reference to Macro)
loopMode    "FIXED_CYCLES" | "FIXED_MINUTES" | "AUTO"
loopCycles  int | null   (set when FIXED_CYCLES)
loopMinutes float | null (set when FIXED_MINUTES)
```
`AUTO` slots receive evenly distributed remaining minutes at runtime.

### Timer
```
id            uuid
name          string
totalMinutes  int
slots         MacroSlot[]   (ordered list)
createdAt     ISO 8601
updatedAt     ISO 8601
```

### Time distribution (AUTO slots)
```
usedMinutes = sum(FIXED_MINUTES slots) + sum(FIXED_CYCLES slots × cycle_duration)
autoCount   = number of AUTO slots
autoMinutes = (totalMinutes - usedMinutes) / autoCount
```

### Macro end behavior
When a macro's allocated time is reached (FIXED_MINUTES or AUTO), the current cycle finishes before the macro ends. Slight overrun is acceptable.

---

## API Contract

All routes prefixed `/api`.

### Macros
| Method | Path | Description |
|---|---|---|
| GET | /health | `{"status":"ok"}` |
| GET | /macros | List all macros |
| POST | /macros | Create macro |
| GET | /macros/{id} | Full macro with steps |
| PUT | /macros/{id} | Replace macro |
| DELETE | /macros/{id} | Delete macro |

### Timers
| Method | Path | Description |
|---|---|---|
| GET | /timers | List all timers |
| POST | /timers | Create timer |
| GET | /timers/{id} | Full timer (slots include expanded macro) |
| PUT | /timers/{id} | Replace timer |
| DELETE | /timers/{id} | Delete timer |

### Templates
| Method | Path | Description |
|---|---|---|
| GET | /templates/macros | 3 default macro templates |
| GET | /templates/timers | 3 default timer templates |

---

## Navigation & Pages

```
Header: [Timers]  [Macros]

/                     → HomePage (Timer list + templates)
/timers/new           → Timer editor (blank)
/timers/:id           → Timer editor (existing)
/timers/:id/run       → Timer runner
/macros               → Macro library
/macros/new           → Macro builder (blank)
/macros/:id           → Macro builder (existing)
```

---

## Page Designs

### HomePage (`/`)
```
+-----------------------------------+
|  My Timers          [+ New Timer] |
+-----------------------------------+
|  My Workout  60min  [Run] [Edit]  |
|  Tabata Mix  20min  [Run] [Edit]  |
+-----------------------------------+
|  Templates                        |
|  Full Body 45min         [Use]    |
|  Quick HIIT 20min        [Use]    |
+-----------------------------------+
```

### Timer Editor (`/timers/:id`)
```
Name: ____________   Total: [60] min

+----------------------------------------------+
| #  Macro              Loop         Duration  |
|----------------------------------------------|
| 1  Warm-up      ↑↓   5 min   [↗]  5 min     |
| 2  Tabata       ↑↓   8 cycles [↗] ~4 min    |
| 3  EMOM         ↑↓   auto    [↗]  auto      |
| 4  Cool-down    ↑↓   auto    [↗]  auto      |
+----------------------------------------------+
  Auto slots share: 51 min ÷ 2 = 25.5 min each

[ + Add Macro ]    [ Save ]    [ Run ▶ ]
```

- **[+ Add Macro]** → modal: pick from library or "Create new", then set loop mode for this slot
- **[↗]** → navigate to `/macros/:id`; browser back returns to timer editor
- **↑↓** → reorder slots

### Macro Library (`/macros`)
```
My Macros                       [+ New Macro]
+---------------------------------------+
| Tabata   [🔔20s🔔10s]         [Edit] |
| EMOM     [🔔60s]               [Edit] |
+---------------------------------------+
Template Macros
+---------------------------------------+
| Intervals  [🔔15s🔔45s]        [Use]  |
+---------------------------------------+
```

### Macro Builder (`/macros/:id`)
```
Name: ____________    [Back]

  [beep1▼|🔊--O] (+) [10s] (+) [beep2▼|🔊--O] (+) [20s] (+)

  (+) = click to insert a Beep or Wait block at that position
  Blocks are inline-editable (no popover):
    BEEP: soundId dropdown + volume slider
    WAIT: seconds input

[ Save ]   [ Delete ]
```

### Timer Runner (`/timers/:id/run`)
```
Macro: Tabata (2 of 4)   loop 3/8

         00:18
          WAIT

    next: BEEP (beep1)

[ Pause ]          [ Stop ]
```

Macro transition (3-second overlay between macros):
```
Next up:
  EMOM 10 min

  3... 2... 1...
```

Timer completion screen:
```
  Workout complete!
  Total time: 47:32

  [ Back to Timers ]
```

---

## Builder UX Rules

- **Step sequence:** Free-form. Any combination of BEEP and WAIT in any order.
- **Add step:** Click `(+)` between blocks; small menu picks Beep or Wait, inserted at that position.
- **Inline edit:** BEEP block shows soundId dropdown + volume slider. WAIT block shows seconds input. No popover.
- **Reordering (timer slots):** ↑↓ buttons. No drag-and-drop.
- **Load behavior:** Confirm "Discard changes?" if form has unsaved edits before loading or navigating away.
- **Validation:** On Save only. Rules: name not empty, ≥1 step, WAIT seconds ≥1, loopCycles ≥1 if FIXED_CYCLES, loopMinutes ≥0.5 if FIXED_MINUTES, totalMinutes ≥1, sum of fixed durations ≤ totalMinutes.
- **Draft saving:** Auto-saved to `localStorage` on every change.

---

## Runner UX Rules

- **Audio unlock:** Start button calls `audioCtx.unlock()`. Show "Tap screen to enable sound" banner if blocked.
- **Timer source of truth:** `performance.now()` + `requestAnimationFrame`. Never `setInterval`.
- **Pause/Resume:** Store `remainingMs` on pause; recompute `endTimeMs = now + remainingMs` on resume.
- **Macro transition:** Automatic 3-second "Next up" overlay, then next macro starts.
- **Runner view:** Focused — current macro only. No full-timer progress bar.
- **Timer end:** Completion screen with elapsed time + "Back to Timers".

---

## Audio

Web Audio API oscillators — no audio files.

| Sound | Frequency | Duration | Character |
|---|---|---|---|
| beep1 | 880 Hz sine | 80 ms | Short high beep |
| beep2 | 440 Hz sine | 80 ms | Short low beep |
| bell | 660 + 880 Hz sine | 600 ms | Soft bell with decay |

All use `exponentialRampToValueAtTime(0.001, t+duration)` to avoid click artifacts.

`useAudio.ts` exposes: `{ isUnlocked, unlock, playSound(soundId, volume) }`

---

## Tech Stack

| Layer | Local | AWS |
|---|---|---|
| Frontend | Vite dev server (port 5173) | S3 + CloudFront |
| Backend | Uvicorn (port 8000) | Lambda + API Gateway HTTP API |
| Storage | DynamoDB Local (Docker, port 8001) | DynamoDB on-demand |
| IaC | — | AWS CDK (Python) |
| CI/CD | — | GitHub Actions |

---

## Environment Variables

```bash
# .env.local (git-ignored)
DYNAMODB_ENDPOINT_URL=http://localhost:8001
DYNAMODB_TABLE_MACROS=macros
DYNAMODB_TABLE_TIMERS=timers
AWS_DEFAULT_REGION=us-east-1
AWS_ACCESS_KEY_ID=local
AWS_SECRET_ACCESS_KEY=local

# Production (set via CDK on Lambda)
DYNAMODB_TABLE_MACROS=macros-prod
DYNAMODB_TABLE_TIMERS=timers-prod
AWS_DEFAULT_REGION=us-east-1
# Omit DYNAMODB_ENDPOINT_URL → boto3 uses real AWS
```

---

## File Structure

```
timer_app/
├── documentation/
│   ├── DESIGN.md             # this file
│   └── DEV_GUIDE.md          # how to run locally, URLs, curl reference
├── docker-compose.yml        # DynamoDB Local (port 8001, inMemory)
├── .env.local                # git-ignored
├── .env.example
├── .gitignore
├── timervenv/                # Python 3.12 venv (managed via uv)
│
├── backend/
│   ├── __init__.py           # makes backend/ a package (enables relative imports)
│   ├── requirements.txt      # fastapi uvicorn boto3 mangum pydantic python-dotenv
│   ├── main.py               # FastAPI app, CORS, lifespan, all routes
│   ├── database.py           # boto3 DynamoDB client, init_tables()
│   ├── models.py             # Pydantic v2: Macro, Timer, Step, MacroSlot
│   ├── crud_macros.py        # CRUD for macros table
│   ├── crud_timers.py        # CRUD for timers table
│   └── templates.py          # hardcoded default macro + timer templates
│
├── frontend/
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts        # proxy /api → localhost:8000
│   ├── index.html
│   └── src/
│       ├── main.tsx
│       ├── App.tsx            # React Router routes
│       ├── types.ts           # all shared TypeScript types
│       ├── api.ts             # all fetch() wrappers
│       ├── hooks/
│       │   ├── useTimerEngine.ts    # Timer runner: macro sequence + transitions
│       │   └── useAudio.ts          # AudioContext + oscillator sounds
│       ├── components/
│       │   ├── Home/
│       │   │   └── HomePage.tsx
│       │   ├── Timer/
│       │   │   ├── TimerEditorPage.tsx
│       │   │   ├── MacroSlotRow.tsx
│       │   │   ├── AddMacroModal.tsx
│       │   │   └── TimerRunnerPage.tsx
│       │   ├── Macro/
│       │   │   ├── MacroLibraryPage.tsx
│       │   │   ├── MacroBuilderPage.tsx
│       │   │   ├── StepSequence.tsx
│       │   │   ├── BeepBlock.tsx
│       │   │   └── WaitBlock.tsx
│       │   └── shared/
│       │       ├── Header.tsx
│       │       └── ConfirmModal.tsx
│       └── styles/
│           └── global.css
│
└── infra/                    # AWS CDK — added in Phase 9
    ├── app.py
    ├── requirements.txt
    └── stacks/
        └── timer_stack.py
```

---

## Implementation Phases

### Phase 0 — Environment Setup ✅
- [x] Install Node.js via nvm (`nvm install --lts`)
- [x] Install Python deps into timervenv via uv
- [x] Write `backend/requirements.txt`
- [x] Write `docker-compose.yml` (DynamoDB Local on port 8001, `-inMemory` mode)
- [x] Write `.env.example` and `.env.local`
- [x] Write `.gitignore`
- [x] **Done:** `sudo docker compose up -d` starts; DynamoDB Local responds on port 8001

### Phase 1 — Backend Core ✅
- [x] `database.py`: boto3 client (reads `DYNAMODB_ENDPOINT_URL`), `init_tables()` creates macros + timers tables
- [x] `models.py`: Pydantic `BeepStep`, `WaitStep`, `Step` union, `MacroSlot`, `MacroCreate`, `MacroResponse`, `TimerCreate`, `TimerResponse`
- [x] `crud_macros.py`: list, get, create, update, delete
- [x] `crud_timers.py`: list, get, create, update, delete; GET timer expands each slot with full macro
- [x] `templates.py`: 3 macro templates + 3 timer templates as Python dicts
- [x] `main.py`: FastAPI app, CORS (`localhost:5173`), lifespan → `init_tables()`, all 12 routes
- [x] **Done:** POST macro → POST timer referencing it → GET timer returns expanded slots

### Phase 2 — Frontend Scaffold ✅
- [x] `npm create vite@latest frontend -- --template react-ts`
- [x] `npm install react-router-dom`
- [x] `vite.config.ts` with `/api` proxy to `http://localhost:8000`
- [x] `types.ts`: all TypeScript types mirroring backend models
- [x] `api.ts`: fetch wrappers for all 12 endpoints + 2 template endpoints
- [x] `App.tsx`: 7 routes
- [x] Stub page components (return `<div>Page name</div>`)
- [x] **Done:** production build succeeds; TypeScript clean; proxy configured

### Phase 3 — Macro Library + Builder ✅
- [x] `BeepBlock.tsx`: inline soundId dropdown + volume slider
- [x] `WaitBlock.tsx`: inline seconds input
- [x] `StepSequence.tsx`: horizontal layout, `(+)` insertion, renders Beep/Wait blocks
- [x] `MacroBuilderPage.tsx`: name, StepSequence, Save/Delete, Back; draft to localStorage
- [x] `MacroLibraryPage.tsx`: list macros + template macros, Use/Edit actions
- [x] **Done:** create 4-step macro, save, reload, edit, verify persistence

### Phase 4 — Timer Editor ✅
- [x] `MacroSlotRow.tsx`: macro name, ↑↓, loop mode selector, computed duration, [↗]
- [x] `AddMacroModal.tsx`: pick from library + templates; "Create new"; loop mode picker
- [x] `TimerEditorPage.tsx`: name + totalMinutes, slot list, auto-distribution summary, Save, Run; draft to localStorage
- [x] Validation: warn if fixed durations exceed totalMinutes
- [x] **Done:** timer with 3 macros (one AUTO), verify distribution math, save, reload

### Phase 5 — Audio Hook ✅
- [x] `useAudio.ts`: AudioContext singleton, `unlock()`, `playSound()` for all 3 sounds
- [x] **Done:** console test `playSound('bell', 0.8)` after clicking

### Phase 6 — Timer Runner Engine
- [ ] `useTimerEngine.ts`:
  - State: `IDLE | TRANSITIONING{nextIndex, countdown} | RUNNING_MACRO{slotIndex, stepIndex, endTimeMs, loopIteration, elapsedMs} | COMPLETED`
  - `start()`: compute AUTO durations, start first macro
  - Inner tick: `performance.now()` + rAF, advance steps within macro
  - On macro complete: TRANSITIONING (3s), then next macro
  - `pause()` / `resume()` / `stop()`
  - Side effects: `playSound` for BEEP steps via `useEffect` on step index change
- [ ] **Done:** 2-macro timer; beeps fire; 3s transition; second macro starts

### Phase 7 — Timer Runner UI
- [ ] `TimerRunnerPage.tsx`: big countdown, step type, macro name + slot index, loop progress, next step
- [ ] Transition overlay: "Next up: [name] — 3...2...1..."
- [ ] Completion screen: elapsed + "Back to Timers"
- [ ] Audio banner if not unlocked
- [ ] **Done:** end-to-end 3-macro timer with beeps, pause/resume, completion screen

### Phase 8 — Home Page & Polish
- [ ] `HomePage.tsx`: timer list + template timers
- [ ] `Header.tsx`: [Timers] [Macros] nav
- [ ] `ConfirmModal.tsx`: reusable confirm dialog
- [ ] Wire unsaved-changes confirm on editor navigation
- [ ] `global.css`: minimal reset, dark runner, readable builder
- [ ] `README.md`: how to run locally, known limitations
- [ ] **Done:** full flow from clone to completing a workout

### Phase 9 — AWS & CI/CD (future)
- [ ] `infra/` CDK app: DynamoDB tables, Lambda, API GW HTTP API, S3, CloudFront
- [ ] Add Mangum handler to `main.py`
- [ ] `VITE_API_URL` env var for production API Gateway URL
- [ ] GitHub Actions `deploy.yml`: cdk deploy + s3 sync on push to main
- [ ] CORS: allow CloudFront origin (read from env var)

---

## Default Templates

### Macro Templates (3)
```
"Tabata interval": [beep1][20s][beep2][10s]
"EMOM minute":     [bell][60s]
"Work/Rest 15/45": [beep1][15s][beep2][45s]
```

### Timer Templates (3)
```
"Quick Tabata 20min":
  Warm-up macro      FIXED_MINUTES 2
  Tabata interval    FIXED_MINUTES 16
  Cool-down macro    FIXED_MINUTES 2

"EMOM 30min":
  EMOM minute        FIXED_CYCLES 30

"Custom 45min":
  Work/Rest 15/45    FIXED_MINUTES 20
  EMOM minute        AUTO          ← shares 25min with next
  Work/Rest 15/45    AUTO          ← shares 25min
```

---

## Key Design Decisions

| Decision | Choice | Reason |
|---|---|---|
| Macro reusability | Shared library | Same macro composable into multiple Timers |
| Loop settings | On the TimerSlot | Same macro can have different duration per Timer |
| AUTO distribution | Even split of remaining time | Simple and predictable |
| Macro end on time boundary | Finish current cycle (may slightly overrun) | No abrupt mid-cycle cut |
| Timer source of truth | `performance.now()` + rAF | No drift; auto-pauses when tab hidden |
| Audio | Web Audio API oscillators | No audio files, works offline |
| Storage | DynamoDB via boto3 | Identical code for local (Docker) and AWS |
| Lambda adapter | Mangum | Zero changes to FastAPI code for serverless |
| IaC | AWS CDK (Python) | Same language as backend; first-class AWS |
| CI/CD | GitHub Actions | Standard; free for public repos |

---

## Deferred / Out of Scope
- SPEAK step (Text-to-Speech via Web Speech API)
- Login / auth / user accounts
- Sharing timers with other users
- Mobile lock screen / background timer support
- Push notifications
