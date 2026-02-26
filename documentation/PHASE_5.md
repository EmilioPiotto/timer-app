# Phase 5 — Audio Hook

## Goal

Implement `useAudio.ts` — a React hook that wraps the Web Audio API, providing a singleton `AudioContext`, an unlock flow for browser autoplay policy, and a `playSound` function for all three sounds.

**Done condition:** Call `playSound('bell', 0.8)` from the browser console (via the hook in a component) after a user click — bell sound fires.

---

## Files Created

```
frontend/src/hooks/useAudio.ts    new
```

---

## API

```ts
const { isUnlocked, unlock, playSound } = useAudio()
```

| Member | Type | Description |
|---|---|---|
| `isUnlocked` | `boolean` | true when the AudioContext is in `running` state |
| `unlock()` | `() => void` | Creates/resumes the AudioContext; call from a user gesture |
| `playSound(soundId, volume)` | `(SoundId, number) => void` | Fires a sound; no-ops if not unlocked |

---

## Sounds

| soundId | Frequencies | Duration | Implementation |
|---|---|---|---|
| `beep1` | 880 Hz sine | 80 ms | single oscillator |
| `beep2` | 440 Hz sine | 80 ms | single oscillator |
| `bell` | 660 + 880 Hz sine | 600 ms | two parallel oscillators, volume ÷ 2 each |

All sounds use `gain.exponentialRampToValueAtTime(0.001, now + duration)` for a clean fade-out that avoids click artifacts.

---

## Key Design Decisions

### AudioContext created lazily
The `AudioContext` is created on the first call to `unlock()`, not on hook mount. Browsers block `AudioContext` creation before a user gesture on some versions; deferring to `unlock()` (which is called from a button click) is the safest pattern.

### useRef for the AudioContext
`ctxRef` holds the `AudioContext` instance. Using a ref (rather than state) means the context survives re-renders without being recreated, and mutations to it don't trigger re-renders.

### `isUnlocked` reflects ctx.state === 'running'
`setIsUnlocked(true)` is called inside `ctx.resume().then(...)`, so `isUnlocked` accurately tracks whether audio will actually fire.

### playSound no-ops when not running
If `ctx.state !== 'running'`, `playSound` returns immediately. This prevents errors if the runner engine fires a BEEP step before the user has tapped unlock.

---

## Usage in Phase 6+

The timer runner will call `unlock()` from its Start button, then call `playSound(step.soundId, step.volume)` whenever a BEEP step begins. It will also conditionally show a "Tap to enable sound" banner when `!isUnlocked`.

---

## Acceptance Checks

| Check | Result |
|---|---|
| `npm run build` — TypeScript clean, no errors | ✅ |
| `unlock()` called on click → `isUnlocked` becomes true | ✅ |
| `playSound('beep1', 0.8)` → short high beep | ✅ |
| `playSound('beep2', 0.8)` → short low beep | ✅ |
| `playSound('bell', 0.8)` → soft bell with 600ms decay | ✅ |
