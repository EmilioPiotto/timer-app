# Phase 8 — Home Page & Polish

## Goal

Wire up the home page, add a shared header, replace all `window.confirm` calls with a proper modal, and apply global CSS polish including a dark runner theme.

**Done condition:** Full flow from clone to completing a workout — home page lists timers and templates, nav works, unsaved-changes guard fires as a modal, runner page is always dark.

---

## Files Added / Modified

```
README.md                                              added
frontend/src/index.css                                 modified (global reset + dark runner)
frontend/src/App.tsx                                   modified (Header + hide on runner)
frontend/src/components/Home/HomePage.tsx              modified (full implementation)
frontend/src/components/shared/Header.tsx              added
frontend/src/components/shared/ConfirmModal.tsx        added
frontend/src/components/Timer/TimerEditorPage.tsx      modified (ConfirmModal, handleRun guard)
frontend/src/components/Timer/TimerRunnerPage.tsx      modified (dark runner class)
frontend/src/components/Macro/MacroBuilderPage.tsx     modified (ConfirmModal)
```

---

## HomePage (`/`)

Loads `listTimers()` and `getTimerTemplates()` in parallel on mount.

**My Timers** table: name, total minutes, [Run ▶] and [Edit] buttons.

**Template Timers** table: name, total minutes, [Use] button. Clicking Use:
1. Fetches macro templates
2. Creates each referenced macro via `POST /api/macros`
3. Creates the timer via `POST /api/timers` with the new macro IDs
4. Navigates to the new timer's editor

---

## Header

Rendered in `App.tsx` via `AppInner` which reads `useLocation()`. Hidden on `/run` routes so the runner gets a clean full-screen view.

```
[ Timers ]   [ Macros ]
```

Active link is bold (`fontWeight: 700`) via `NavLink`'s `isActive` prop.

---

## ConfirmModal

Reusable overlay dialog at `components/shared/ConfirmModal.tsx`.

Props: `message`, `confirmLabel` (default "OK"), `cancelLabel` (default "Cancel"), `onConfirm`, `onCancel`.

- Clicking the backdrop calls `onCancel`
- Confirm button has a red border to signal a destructive action
- `.modal-box` class on the inner div enables dark mode override via `index.css`

---

## Unsaved-Changes Guard

Both editor pages track a `confirm` state: `{ message, onConfirm } | null`. When set, `ConfirmModal` renders. Replaced all `window.confirm` calls:

| Page | Trigger | Message |
|---|---|---|
| MacroBuilderPage | Back button (dirty) | "Discard unsaved changes?" |
| MacroBuilderPage | Delete button | "Delete this macro? This cannot be undone." |
| TimerEditorPage | Back button (dirty) | "Discard unsaved changes?" |
| TimerEditorPage | Run ▶ button (dirty) | "You have unsaved changes. Run anyway?" |

The Run ▶ dirty check is new in this phase — previously it navigated unconditionally.

---

## CSS — `index.css`

Global styles cover: font, body reset, `h1/h2/h3`, `button`, `input/select`, `a`, dark mode (`prefers-color-scheme: dark`).

Dark runner block (always applied, not media-query dependent):
```css
.runner        { min-height: 100vh; background: #111; color: #f0f0f0; }
.runner .dim   { color: #888; }
.runner .subdim{ color: #555; }
```

All four runner screen variants (`IDLE`, `RUNNING/PAUSED`, `TRANSITIONING`, `COMPLETED`) use `className="runner"`. Inline color overrides were replaced with `.dim` / `.subdim` helper classes.

---

## Key Design Decisions

### ConfirmModal state pattern
Both editor pages use a single `confirm` state slot (`{ message, onConfirm } | null`) rather than separate boolean flags per action. This keeps the JSX to one `ConfirmModal` instance and makes adding future confirm dialogs trivial.

### Runner is always dark
The runner dark theme is not behind `prefers-color-scheme` — it is always dark. The runner is a focus screen (like a workout display), not a document, so it has its own visual identity regardless of system theme.

### Template "Use" creates copies
Using a template creates real macro and timer records. The user then owns them and can edit freely. Templates are never mutated.

---

## Acceptance Checks

| Check | Result |
|---|---|
| `npm run build` — TypeScript clean, no errors | ✅ |
| Home page loads timer list and templates | ✅ |
| [Use] on a template creates timer and navigates to editor | ✅ |
| [Run ▶] from home navigates to runner | ✅ |
| Header shows on all pages except runner | ✅ |
| Active nav link is bold | ✅ |
| Back with unsaved changes shows ConfirmModal (not browser dialog) | ✅ |
| Run ▶ with unsaved changes shows ConfirmModal | ✅ |
| Delete macro shows ConfirmModal | ✅ |
| Runner page has dark background on all 4 screen phases | ✅ |
| Dark mode system preference respected on non-runner pages | ✅ |
