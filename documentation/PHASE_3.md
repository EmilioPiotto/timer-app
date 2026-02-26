# Phase 3 — Macro Library + Builder

## Goal

Implement the two macro pages fully: a library listing all user-created macros and template macros, and a step-by-step macro builder with inline-editable BEEP and WAIT blocks.

**Done condition:** Create a 4-step macro, save it, hard-reload the page (data reloads from backend), edit a step, save again, reload again — changes persist. Navigate to `/macros` — the macro appears with a step summary. Click [Use] on a template — a new macro is created and the page navigates to its edit view.

---

## Files Created / Modified

```
frontend/src/components/Macro/
  BeepBlock.tsx           new — inline editor for a BEEP step
  WaitBlock.tsx           new — inline editor for a WAIT step
  StepSequence.tsx        new — horizontal [+][Block][+] step layout
  MacroBuilderPage.tsx    replaced stub — full create/edit page
  MacroLibraryPage.tsx    replaced stub — library + templates listing
```

No changes to `types.ts`, `api.ts`, or `App.tsx`.

---

## Component Overview

### BeepBlock.tsx
Props: `{ step: BeepStep, onChange, onDelete }`

Renders inline (no popover): a `<select>` for `soundId` (`beep1 | beep2 | bell`), a range slider for `volume` (0.1–1, step 0.1) with a numeric label, and a `×` delete button. All changes call `onChange({ ...step, field: value })`.

### WaitBlock.tsx
Props: `{ step: WaitStep, onChange, onDelete }`

Renders inline: a `<input type="number">` for `seconds` (min 1, max 3600) with an "s" label and a `×` delete button. Invalid parses clamp to 1.

### StepSequence.tsx
Props: `{ steps: Step[], onChange }`

Layout: `[+] [Block] [+] [Block] [+]` — flexbox row, wraps on small screens.

An internal `InsertButton` renders a `(+)` button by default. On click it shows an inline mini-menu `[Beep] [Wait] [×]`. Selecting Beep inserts `{ type: 'BEEP', soundId: 'beep1', volume: 0.8 }`, Wait inserts `{ type: 'WAIT', seconds: 10 }`. `×` cancels. Closes after any insertion. All mutations use immutable spread/filter — no direct array mutation.

### MacroBuilderPage.tsx
Routing: `useParams<{ id }>()` — `id` undefined = create mode, defined = edit mode.

State: `name`, `steps`, `savedState` (null until loaded), `errors`, `saving`.

**Load (useEffect on id):**
- New mode: reads draft from `localStorage['macro-draft-new']`; pre-fills if present; sets `savedState = { name: '', steps: [] }`
- Edit mode: calls `getMacro(id)` → sets `savedState` from API; if a draft also exists in localStorage, prefers the draft (user was mid-edit); on 404/error → navigates to `/macros`

**Auto-save draft:** `useEffect` on `name`/`steps` — writes `localStorage['macro-draft-{id|new}']` on every change, after initial load.

**isDirty:** `name !== savedState.name || JSON.stringify(steps) !== JSON.stringify(savedState.steps)`

**Save flow:**
1. Validate → show errors and abort if any
2. `createMacro` (new) or `updateMacro` (edit)
3. On success: remove draft from localStorage, update `savedState`, clear errors
4. New mode only: `navigate('/macros/${saved.id}', { replace: true })` (URL changes, component stays mounted as edit mode)

**Delete:** `window.confirm` → `deleteMacro(id)` → clear draft → navigate to `/macros`

**Back:** if `isDirty` → `window.confirm('Discard unsaved changes?')`; then navigate to `/macros`

**Validation (on Save only):**
- `name.trim()` not empty
- `steps.length >= 1`
- Every WAIT step: `seconds >= 1`
- Errors rendered as a list above the Save button

### MacroLibraryPage.tsx
State: `macros: MacroResponse[]`, `templates: MacroTemplate[]`

Load: `Promise.all([listMacros(), getMacroTemplates()])` on mount.

Step summary helper (pure, local): maps each step to `🔔{soundId}` (BEEP) or `{seconds}s` (WAIT), joined with spaces.

[Use] template: calls `createMacro({ name, steps })` then navigates to `/macros/${created.id}`.

---

## Key Design Decisions

### localStorage draft auto-save
The draft is written on every name/step change, keyed by `macro-draft-{id|new}`. In edit mode, the draft takes priority over the server state on reload — this means an interrupted edit session is never silently lost. The draft is cleared only on successful Save or Delete.

### savedState tracks the server's last-known value
`isDirty` compares current form state against `savedState` (the last thing successfully saved or loaded from the API). This allows the Back guard to fire only when there are genuine unsaved changes.

### New → edit mode transition via navigate({ replace: true })
After a successful Create, `navigate('/macros/${id}', { replace: true })` rewrites the URL so the browser history stack doesn't grow, and the component naturally re-enters edit mode via the `id` param change. No full remount needed because the useEffect depends on `id`.

### No CSS files added
All styling is minimal inline styles. Full visual polish is Phase 8.

---

## Acceptance Checks

| Check | Result |
|---|---|
| `npm run build` — TypeScript clean, no errors | ✅ |
| Create 4-step macro, save → URL changes to `/macros/{id}` | ✅ |
| Hard-reload → macro reloads from backend with same data | ✅ |
| Edit a step → Save → reload → changes persisted | ✅ |
| Navigate to `/macros` → macro appears with step summary | ✅ |
| Click [Use] on template → new macro created → taken to edit page | ✅ |
