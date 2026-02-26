# Phase 7 — Timer Runner UI

## Goal

Implement `TimerRunnerPage.tsx` — the full-screen timer runner that renders `useTimerEngine` state, fires audio via `useAudio`, and guides the user through all phases: idle → running → transition → next macro → completion.

**Done condition:** Run a 3-macro timer end-to-end: hear beeps, see the 3-second transition overlays, pause/resume, complete the workout and see the elapsed time screen.

---

## File Modified

```
frontend/src/components/Timer/TimerRunnerPage.tsx    replaced stub
```

---

## Screens

### IDLE
```
{timer name}
{X min · Y macros}

        [ Start ▶ ]
           [Back]
```
Start calls `unlock()` + `start()` together. Back returns to the timer editor.

### RUNNING / PAUSED
```
Macro: {name} (X of Y)        loop N / M   ← only for FIXED_CYCLES

            00:18
            WAIT

      next: BEEP (beep1)

   [ Pause / Resume ]   [ Stop ]
```
- Big countdown in monospace font (MM:SS)
- BEEP steps show `——` instead of a countdown (they're instantaneous)
- Next-step preview shows the next step in the current loop pass (blank if last step)
- Loop label only shown for `FIXED_CYCLES` slots
- Stop → `stop()` + navigate to `/timers/{id}` (back to editor)

### TRANSITIONING
```
Next up:
  {macro name}
  {X.X min}

     3…

   [ Stop ]
```
Countdown 3→2→1, driven by `state.countdown` updated every rAF frame.

### COMPLETED
```
Workout complete!
Total time: 47:32

  [ Back to Timers ]
```
"Back to Timers" navigates to `/` (home — timer list, Phase 8).

### Audio banner
When `!isUnlocked` and phase is not IDLE, an amber "⚠ Tap to enable sound" bar is shown at the top. Clicking it calls `unlock()`.

---

## Key Design Decisions

### `unlock()` called alongside `start()`
The Start button calls both `unlock()` and `start()` in sequence. This satisfies the browser's user-gesture requirement for `AudioContext.resume()`. Any BEEP steps that fire before the context is confirmed running will silently no-op (handled in `useAudio.playSound`).

### Engine state drives all screen logic
`TimerRunnerPage` is a pure render of `useTimerEngine` state — no local timer logic. The five `phase` values map to five distinct JSX branches. The component is deliberately thin.

### Stop navigates to editor, not home
`handleStop()` calls `stop()` (resets engine) then navigates to `/timers/{id}`. This lets the user immediately restart or adjust the timer. The completion screen's "Back to Timers" goes to `/` (home/list).

### slotDurations used for transition overlay
`slotDurations[nextSlotIndex]` gives the time budget of the upcoming slot in ms, shown as "X.X min" in the transition overlay. This value is computed by the engine at `start()`.

---

## Acceptance Checks

| Check | Result |
|---|---|
| `npm run build` — TypeScript clean, no errors | ✅ |
| Start button unlocks audio + starts engine | ✅ |
| WAIT steps show MM:SS countdown | ✅ |
| BEEP steps show `——` + sound fires | ✅ |
| Next-step preview correct | ✅ |
| FIXED_CYCLES slots show "loop N / M" | ✅ |
| Slot completes → 3s transition overlay with correct macro name | ✅ |
| Transition completes → next macro starts | ✅ |
| Pause → Resume → elapsed continues from where it left off | ✅ |
| Stop → navigates back to timer editor | ✅ |
| All slots done → completion screen with correct elapsed | ✅ |
| Audio banner shown when not unlocked | ✅ |
