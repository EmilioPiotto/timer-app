# Phase 6 — Timer Runner Engine

## Goal

Implement `useTimerEngine.ts` — the core timing logic for running a timer. Handles the full state machine: idle → running macro → 3-second transition → next macro → completed. Drives beep sounds, manages pause/resume with accurate elapsed time, and exposes clean state to the UI.

**Done condition:** Create a 2-macro timer, press Start, hear beeps fire, see 3-second transition overlay trigger, second macro starts, timer completes.

---

## File Created

```
frontend/src/hooks/useTimerEngine.ts    new
```

---

## API

```ts
const { state, slotDurations, start, pause, resume, stop } = useTimerEngine(timer, playSound)
```

| Member | Description |
|---|---|
| `state: EngineState` | Full state snapshot, updated every rAF frame |
| `slotDurations: number[]` | Computed slot durations in ms (set at `start()`) |
| `start()` | Compute AUTO durations, enter first slot's first step |
| `pause()` | Cancel rAF, store remaining times |
| `resume()` | Restore absolute end times, restart rAF |
| `stop()` | Cancel rAF, reset to IDLE |

---

## State Shape

```ts
interface EngineState {
  phase: 'IDLE' | 'RUNNING' | 'PAUSED' | 'TRANSITIONING' | 'COMPLETED'
  slotIndex: number        // current slot (RUNNING/PAUSED/TRANSITIONING)
  loopIteration: number    // 0-indexed cycle count within slot (RUNNING/PAUSED)
  stepIndex: number        // current step within macro (RUNNING/PAUSED)
  remainingStepMs: number  // ms until current WAIT ends (updated every frame)
  nextSlotIndex: number    // slot index to start after transition (TRANSITIONING)
  countdown: number        // 3 / 2 / 1 during transition (TRANSITIONING)
  elapsedMs: number        // total elapsed since start (all active phases)
}
```

---

## State Machine

```
IDLE
  ↓ start()
RUNNING ──── step complete ──→ next step in loop
    │        loop complete ──→ same slot (not done) → loop again from step 0
    │        slot done ──────→ TRANSITIONING (3s) → RUNNING (next slot)
    │        last slot done →  COMPLETED
    ↓ pause()
PAUSED
    ↓ resume()
RUNNING
    ↓ stop()
IDLE
```

---

## Key Design Decisions

### All timing via `performance.now()` + rAF
The step end time and slot end time are stored as absolute `performance.now()` values. Each rAF frame checks `now >= stepEndMs`. This guarantees no timer drift even across long-running sessions. `setInterval` is never used.

### `stateRef` as ground truth; `setState` for re-renders
React state updates are asynchronous. The rAF tick uses `stateRef.current` as the synchronous ground truth for decisions, then calls `setState(next)` purely to trigger re-renders. This avoids stale closure bugs.

### BEEP steps advance in the next tick
When entering a BEEP step, `stepEndMsRef.current = 0`. Since `performance.now()` is always positive, `now >= 0` fires on the very next tick, advancing to the next step. The sound plays immediately via `playSoundRef.current()` inside `enterStep()`.

### `playSoundRef` for sound side effects
`playSound` is called directly inside `enterStep()` (called from the rAF tick), not via `useEffect`. Using a ref (`playSoundRef`) ensures the tick callback always calls the latest `playSound` function without needing it in the dependency array.

### Pause/Resume stores remaining durations
On pause: `pausedStepRemRef = stepEndMs - now` and `pausedSlotRemRef = slotEndMs - now`.
On resume: `stepEndMs = now + pausedStepRemRef` and `slotEndMs = now + pausedSlotRemRef`.
`elapsedBeforeRef` accumulates elapsed time across segments so the total elapsed is always correct.

### Slot end condition depends on loopMode
- `FIXED_CYCLES`: slot ends when `loopIteration >= loopCycles`. `slotEndMs = Infinity`.
- `FIXED_MINUTES` / `AUTO`: slot ends when `now >= slotEndMs`. Checked only at loop boundaries — the current cycle always finishes (slight overrun acceptable per design).

### AUTO slot durations computed at `start()`
`computeSlotDurations()` calculates all slot budgets: fixed slots use their specified value, AUTO slots split the remaining time equally. This is done once at `start()` so the computation never happens during the rAF loop.

### `tick` is a stable `useCallback([], [])`
`tick` only uses refs internally (never state or props directly), so it can have empty deps and maintain a stable reference across renders. This is critical for `cancelAnimationFrame` / `requestAnimationFrame(tick)` to work correctly.

---

## Acceptance Checks

| Check | Result |
|---|---|
| `npm run build` — TypeScript clean, no errors | ✅ |
| BEEP steps play immediately when step is entered | ✅ |
| WAIT steps count down correctly via rAF | ✅ |
| Slot completes → 3s TRANSITIONING with countdown 3→2→1 | ✅ |
| Next slot starts after transition | ✅ |
| All slots done → COMPLETED with correct elapsedMs | ✅ |
| Pause → resume → elapsed time continues from where it left off | ✅ |
| Stop → resets to IDLE | ✅ |
