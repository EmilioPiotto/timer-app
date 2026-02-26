# Phase 4 — Timer Editor

## Goal

Implement the timer editor: a name/duration header, an ordered slot table where each slot links a macro with loop settings, an auto-distribution summary, and Save/Run actions. Mirrors the Macro Builder pattern with draft auto-save, `isDirty` guard, and create→edit mode transition.

**Done condition:** Create a timer with 3 macros (one AUTO slot), verify the auto-distribution math, save, hard-reload — data reloads from backend with same values.

---

## Files Created / Modified

```
frontend/src/components/Timer/
  MacroSlotRow.tsx      new — one table row per slot: macro name, ↑↓, loop mode, duration, [↗] [×]
  AddMacroModal.tsx     new — modal to pick a macro and configure its loop settings
  TimerEditorPage.tsx   replaced stub — full create/edit page
```

---

## Component Overview

### MacroSlotRow.tsx
Props: `{ slot, macro, index, total, autoMinutes, onChange, onDelete, onMoveUp, onMoveDown }`

Renders one `<tr>` with:
- Slot number
- Macro name + `[↗]` button that navigates to `/macros/{id}` (inline `useNavigate`)
- `↑` / `↓` reorder buttons (disabled at boundaries)
- Loop mode `<select>` (Auto / Fixed min / Fixed cycles) with a number input appearing for FIXED_CYCLES or FIXED_MINUTES
- Computed duration label:
  - FIXED_CYCLES: `~{loopCycles × cycleDuration} min` (cycle duration = sum of WAIT seconds in macro)
  - FIXED_MINUTES: `{loopMinutes} min`
  - AUTO: `auto (~{autoMinutes} min)` when `autoMinutes` is known

When loop mode changes, `loopCycles`/`loopMinutes` are reset to sensible defaults (8 cycles, 5 min) while the other field is nulled out.

### AddMacroModal.tsx
Props: `{ onAdd(slot, macro), onClose }`

On mount: fetches `listMacros()` and `getMacroTemplates()` in parallel.

Flow:
1. User selects a macro from "My Macros" (row highlight) or clicks **[Use]** on a template (creates it via `createMacro` first, then selects it)
2. **[+ Create new]** navigates to `/macros/new` and closes the modal — timer draft preserves state
3. Once a macro is selected, a loop-mode picker appears (Auto / Fixed min / Fixed cycles + value input)
4. **[Add]** assembles the `MacroSlot` and calls `onAdd(slot, macro)`

### TimerEditorPage.tsx
Routing: `useParams<{ id }>()` — `id` undefined = create mode, defined = edit mode.

State: `name`, `totalMinutes`, `slots: MacroSlot[]`, `slotMacros: Map<string, MacroResponse>`, `savedState`, `showAddModal`, `errors`, `warnings`, `saving`.

**Load (useEffect on id):**
- New mode: `savedState = { name: '', totalMinutes: 30, slots: [] }`; read draft from localStorage if present
- Edit mode: `getTimer(id)` → extract `MacroSlot[]` from expanded slots, set `savedState`; prefer localStorage draft if present; on 404/error → navigate to `/`
- After resolving form slots: `Promise.allSettled(macroIds.map(getMacro))` → builds `slotMacros` map; slots whose macros fail to load are silently filtered out

**Auto-save draft:** `useEffect` on `name`/`totalMinutes`/`slots` — writes `localStorage['timer-draft-{id|new}']` after initial load.

**isDirty:** compares `name`, `totalMinutes`, and `JSON.stringify(slots)` against `savedState`.

**Auto-distribution:**
```
fixedMins = Σ FIXED_MINUTES slots + Σ FIXED_CYCLES slots × cycleDuration(macro)
autoMinutes = (totalMinutes − fixedMins) / autoCount
```
Displayed below the table as: `"Auto slots share: X min remaining ÷ N = Y min each"`

**Validation (on Save):**
- Blocking errors: name not empty, totalMinutes ≥ 1, FIXED_CYCLES loopCycles ≥ 1, FIXED_MINUTES loopMinutes ≥ 0.5
- Non-blocking warnings: fixed durations exceed totalMinutes (shown in amber, save still proceeds)

**Save flow:**
1. Validate → show errors/warnings; abort if errors
2. `createTimer` (new) or `updateTimer` (edit)
3. On success: remove draft, update `savedState`, clear errors
4. New mode: `navigate('/timers/${saved.id}', { replace: true })`

**Slot operations:** all immutable — spread/filter/swap.

---

## Key Design Decisions

### slotMacros is a Map keyed by macroId
Multiple slots can reference the same macro. Keying by macroId avoids duplicate fetches and ensures all rows share a single source of truth for macro data.

### getTimer returns ExpandedMacroSlot — fields extracted explicitly
`timer.slots[i]` is `ExpandedMacroSlot` (extends `MacroSlot` with a `macro` field). Rather than destructuring with `{ macro: _, ...rest }` (noisy TypeScript), the four `MacroSlot` fields are explicitly picked. The macro objects are then re-fetched from the `slotMacros` fetch step, which handles the draft-slot case too.

### Warnings don't block save
Exceeding totalMinutes with fixed slots is a recoverable situation (user might be mid-editing). Blocking save would be frustrating. The warning is shown in amber and the user can still save.

### "Create new" in AddMacroModal navigates away
Opening a nested creation flow (new macro inside a modal inside the timer editor) would add significant complexity. Instead, [+ Create new] navigates to `/macros/new` and closes the modal. The timer editor's draft auto-save preserves all in-progress work; the user returns, reopens the modal, and their new macro appears.

---

## Acceptance Checks

| Check | Result |
|---|---|
| `npm run build` — TypeScript clean, no errors | ✅ |
| Create timer with 3 macros (1 AUTO), auto-distribution math correct | ✅ |
| Save → URL changes to `/timers/{id}` | ✅ |
| Hard-reload → timer reloads from backend | ✅ |
| Edit slot loop mode → save → reload → persisted | ✅ |
| ↑↓ reordering works, boundaries disabled | ✅ |
| [↗] navigates to macro editor | ✅ |
| Fixed durations > total → amber warning shown, save not blocked | ✅ |
