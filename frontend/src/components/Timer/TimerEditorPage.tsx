import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import type { MacroResponse, MacroSlot } from '../../types'
import { createTimer, getMacro, getTimer, updateTimer } from '../../api'
import MacroSlotRow from './MacroSlotRow'
import AddMacroModal from './AddMacroModal'
import ConfirmModal from '../shared/ConfirmModal'

interface SavedState {
  name: string
  totalMinutes: number
  slots: MacroSlot[]
}

function draftKey(id: string | undefined) {
  return `timer-draft-${id ?? 'new'}`
}

function cycleDurationMin(macro: MacroResponse): number {
  return macro.steps.reduce((sum, s) => sum + (s.type === 'WAIT' ? s.seconds : 0), 0) / 60
}

function computeAutoMinutes(
  totalMinutes: number,
  slots: MacroSlot[],
  slotMacros: Map<string, MacroResponse>,
): number | null {
  const autoCount = slots.filter(s => s.loopMode === 'AUTO').length
  if (autoCount === 0) return null
  let fixedMins = 0
  for (const s of slots) {
    if (s.loopMode === 'FIXED_MINUTES') {
      fixedMins += s.loopMinutes ?? 0
    } else if (s.loopMode === 'FIXED_CYCLES') {
      const macro = slotMacros.get(s.macroId)
      if (macro) fixedMins += (s.loopCycles ?? 1) * cycleDurationMin(macro)
    }
  }
  return (totalMinutes - fixedMins) / autoCount
}

export default function TimerEditorPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [totalMinutes, setTotalMinutes] = useState(30)
  const [slots, setSlots] = useState<MacroSlot[]>([])
  const [slotMacros, setSlotMacros] = useState<Map<string, MacroResponse>>(new Map())
  const [savedState, setSavedState] = useState<SavedState | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [errors, setErrors] = useState<string[]>([])
  const [warnings, setWarnings] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [confirm, setConfirm] = useState<{ message: string; onConfirm: () => void } | null>(null)

  // Load on mount
  useEffect(() => {
    async function load() {
      let formName = ''
      let formMinutes = 30
      let formSlots: MacroSlot[] = []

      if (!id) {
        setSavedState({ name: '', totalMinutes: 30, slots: [] })
        const raw = localStorage.getItem(draftKey(id))
        if (raw) {
          try {
            const d = JSON.parse(raw)
            formName = d.name ?? ''
            formMinutes = d.totalMinutes ?? 30
            formSlots = d.slots ?? []
          } catch { /* ignore corrupt draft */ }
        }
      } else {
        try {
          const timer = await getTimer(id)
          const apiSlots: MacroSlot[] = timer.slots.map(s => ({
            macroId: s.macroId,
            loopMode: s.loopMode,
            loopCycles: s.loopCycles,
            loopMinutes: s.loopMinutes,
          }))
          setSavedState({ name: timer.name, totalMinutes: timer.totalMinutes, slots: apiSlots })
          formName = timer.name
          formMinutes = timer.totalMinutes
          formSlots = apiSlots

          const raw = localStorage.getItem(draftKey(id))
          if (raw) {
            try {
              const d = JSON.parse(raw)
              formName = d.name ?? formName
              formMinutes = d.totalMinutes ?? formMinutes
              formSlots = d.slots ?? formSlots
            } catch { /* keep API data */ }
          }
        } catch {
          navigate('/')
          return
        }
      }

      // Fetch macros for all slots
      const macroIds = [...new Set(formSlots.map(s => s.macroId))]
      const results = await Promise.allSettled(macroIds.map(mid => getMacro(mid)))
      const map = new Map<string, MacroResponse>()
      results.forEach((r, i) => {
        if (r.status === 'fulfilled') map.set(macroIds[i], r.value)
      })

      setName(formName)
      setTotalMinutes(formMinutes)
      setSlots(formSlots.filter(s => map.has(s.macroId)))
      setSlotMacros(map)
    }

    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  // Auto-save draft
  useEffect(() => {
    if (savedState === null) return
    localStorage.setItem(draftKey(id), JSON.stringify({ name, totalMinutes, slots }))
  }, [id, name, totalMinutes, slots, savedState])

  const isDirty =
    savedState !== null && (
      name !== savedState.name ||
      totalMinutes !== savedState.totalMinutes ||
      JSON.stringify(slots) !== JSON.stringify(savedState.slots)
    )

  const autoMinutes = computeAutoMinutes(totalMinutes, slots, slotMacros)
  const autoCount = slots.filter(s => s.loopMode === 'AUTO').length

  function validate(): { errors: string[]; warnings: string[] } {
    const errs: string[] = []
    const warns: string[] = []

    if (!name.trim()) errs.push('Name is required.')
    if (totalMinutes < 1) errs.push('Total minutes must be at least 1.')

    slots.forEach((s, i) => {
      if (s.loopMode === 'FIXED_CYCLES' && (s.loopCycles ?? 0) < 1)
        errs.push(`Slot ${i + 1}: cycles must be ≥ 1.`)
      if (s.loopMode === 'FIXED_MINUTES' && (s.loopMinutes ?? 0) < 0.5)
        errs.push(`Slot ${i + 1}: fixed minutes must be ≥ 0.5.`)
    })

    if (autoCount > 0 && autoMinutes !== null && autoMinutes < 0) {
      warns.push('Fixed slot durations exceed total minutes — AUTO slots would have negative time.')
    } else if (autoCount === 0) {
      let fixed = 0
      for (const s of slots) {
        if (s.loopMode === 'FIXED_MINUTES') fixed += s.loopMinutes ?? 0
        else if (s.loopMode === 'FIXED_CYCLES') {
          const macro = slotMacros.get(s.macroId)
          if (macro) fixed += (s.loopCycles ?? 1) * cycleDurationMin(macro)
        }
      }
      if (fixed > totalMinutes) warns.push('Fixed slot durations exceed total minutes.')
    }

    return { errors: errs, warnings: warns }
  }

  async function handleSave() {
    const { errors: errs, warnings: warns } = validate()
    setErrors(errs)
    setWarnings(warns)
    if (errs.length) return
    setSaving(true)
    try {
      const body = { name: name.trim(), totalMinutes, slots }
      const saved = id ? await updateTimer(id, body) : await createTimer(body)
      localStorage.removeItem(draftKey(id))
      const savedSlots: MacroSlot[] = saved.slots.map(s => ({
        macroId: s.macroId,
        loopMode: s.loopMode,
        loopCycles: s.loopCycles,
        loopMinutes: s.loopMinutes,
      }))
      setSavedState({ name: saved.name, totalMinutes: saved.totalMinutes, slots: savedSlots })
      setErrors([])
      if (!id) navigate(`/timers/${saved.id}`, { replace: true })
    } catch (e) {
      setErrors([(e as Error).message])
    } finally {
      setSaving(false)
    }
  }

  function handleBack() {
    if (isDirty) {
      setConfirm({ message: 'Discard unsaved changes?', onConfirm: () => navigate('/') })
    } else {
      navigate('/')
    }
  }

  function handleRun() {
    if (!id) return
    if (isDirty) {
      setConfirm({ message: 'You have unsaved changes. Run anyway?', onConfirm: () => navigate(`/timers/${id}/run`) })
    } else {
      navigate(`/timers/${id}/run`)
    }
  }

  function handleAddSlot(slot: MacroSlot, macro: MacroResponse) {
    setSlotMacros(prev => new Map(prev).set(macro.id, macro))
    setSlots(prev => [...prev, slot])
    setShowAddModal(false)
  }

  function updateSlot(index: number, slot: MacroSlot) {
    setSlots(prev => prev.map((s, i) => (i === index ? slot : s)))
  }

  function deleteSlot(index: number) {
    setSlots(prev => prev.filter((_, i) => i !== index))
  }

  function moveSlot(index: number, direction: -1 | 1) {
    setSlots(prev => {
      const next = [...prev]
      const target = index + direction
      if (target < 0 || target >= next.length) return prev
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }

  return (
    <div style={{ padding: 16, maxWidth: 800 }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <input
          type="text"
          placeholder="Timer name"
          value={name}
          onChange={e => setName(e.target.value)}
          style={{ fontSize: 18, flex: 1 }}
        />
        <label style={{ whiteSpace: 'nowrap' }}>
          Total:&nbsp;
          <input
            type="number"
            min={1}
            value={totalMinutes}
            onChange={e => setTotalMinutes(Math.max(1, parseInt(e.target.value) || 1))}
            style={{ width: 60 }}
          />
          &nbsp;min
        </label>
        <button onClick={handleBack}>Back</button>
      </div>

      {/* Slot table */}
      {slots.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 8 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #ccc', textAlign: 'left', fontSize: 13, color: '#666' }}>
              <th style={{ padding: '4px 4px' }}>#</th>
              <th style={{ padding: '4px 4px' }}>Macro</th>
              <th style={{ padding: '4px 4px' }}>Order</th>
              <th style={{ padding: '4px 4px' }}>Loop</th>
              <th style={{ padding: '4px 4px' }}>Duration</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {slots.map((slot, i) => {
              const macro = slotMacros.get(slot.macroId)
              if (!macro) return null
              return (
                <MacroSlotRow
                  key={`${slot.macroId}-${i}`}
                  slot={slot}
                  macro={macro}
                  index={i}
                  total={slots.length}
                  autoMinutes={autoMinutes}
                  onChange={s => updateSlot(i, s)}
                  onDelete={() => deleteSlot(i)}
                  onMoveUp={() => moveSlot(i, -1)}
                  onMoveDown={() => moveSlot(i, 1)}
                />
              )
            })}
          </tbody>
        </table>
      )}

      {/* Auto-distribution summary */}
      {autoCount > 0 && autoMinutes !== null && (
        <p style={{ color: '#555', fontSize: 13, margin: '4px 0 12px' }}>
          Auto slots share: {(totalMinutes - (autoMinutes * autoCount < 0 ? 0 : totalMinutes - autoMinutes * autoCount)).toFixed(1)} min remaining ÷ {autoCount} = {autoMinutes.toFixed(1)} min each
        </p>
      )}

      {/* Warnings */}
      {warnings.length > 0 && (
        <ul style={{ color: '#b45309', margin: '0 0 8px' }}>
          {warnings.map((w, i) => <li key={i}>{w}</li>)}
        </ul>
      )}

      {/* Errors */}
      {errors.length > 0 && (
        <ul style={{ color: 'red', margin: '0 0 8px' }}>
          {errors.map((e, i) => <li key={i}>{e}</li>)}
        </ul>
      )}

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <button onClick={() => setShowAddModal(true)}>+ Add Macro</button>
        <button onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
        {id && (
          <button onClick={handleRun} style={{ marginLeft: 'auto' }}>
            Run ▶
          </button>
        )}
      </div>

      {showAddModal && (
        <AddMacroModal
          onAdd={handleAddSlot}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {confirm && (
        <ConfirmModal
          message={confirm.message}
          confirmLabel="Yes"
          onConfirm={() => { setConfirm(null); confirm.onConfirm() }}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  )
}
