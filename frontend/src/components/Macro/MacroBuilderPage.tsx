import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import type { Step } from '../../types'
import { createMacro, deleteMacro, getMacro, updateMacro } from '../../api'
import StepSequence from './StepSequence'

interface Draft {
  name: string
  steps: Step[]
}

function draftKey(id: string | undefined) {
  return `macro-draft-${id ?? 'new'}`
}

export default function MacroBuilderPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [steps, setSteps] = useState<Step[]>([])
  const [savedState, setSavedState] = useState<Draft | null>(null)
  const [errors, setErrors] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  // Load on mount
  useEffect(() => {
    const key = draftKey(id)

    if (!id) {
      // New mode
      const raw = localStorage.getItem(key)
      if (raw) {
        try {
          const draft: Draft = JSON.parse(raw)
          setName(draft.name)
          setSteps(draft.steps)
        } catch { /* ignore corrupt draft */ }
      }
      setSavedState({ name: '', steps: [] })
    } else {
      // Edit mode
      getMacro(id)
        .then(macro => {
          setSavedState({ name: macro.name, steps: macro.steps })
          const raw = localStorage.getItem(key)
          if (raw) {
            try {
              const draft: Draft = JSON.parse(raw)
              setName(draft.name)
              setSteps(draft.steps)
            } catch {
              setName(macro.name)
              setSteps(macro.steps)
            }
          } else {
            setName(macro.name)
            setSteps(macro.steps)
          }
        })
        .catch(() => navigate('/macros'))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  // Auto-save draft
  useEffect(() => {
    if (savedState === null) return // not loaded yet
    localStorage.setItem(draftKey(id), JSON.stringify({ name, steps }))
  }, [id, name, steps, savedState])

  const isDirty =
    savedState !== null &&
    (name !== savedState.name || JSON.stringify(steps) !== JSON.stringify(savedState.steps))

  function validate(): string[] {
    const errs: string[] = []
    if (!name.trim()) errs.push('Name is required.')
    if (steps.length < 1) errs.push('At least one step is required.')
    steps.forEach((s, i) => {
      if (s.type === 'WAIT' && s.seconds < 1) errs.push(`Step ${i + 1}: wait seconds must be ≥ 1.`)
    })
    return errs
  }

  async function handleSave() {
    const errs = validate()
    if (errs.length) { setErrors(errs); return }
    setErrors([])
    setSaving(true)
    try {
      const body = { name: name.trim(), steps }
      const saved = id ? await updateMacro(id, body) : await createMacro(body)
      localStorage.removeItem(draftKey(id))
      setSavedState({ name: saved.name, steps: saved.steps })
      if (!id) navigate(`/macros/${saved.id}`, { replace: true })
    } catch (e) {
      setErrors([(e as Error).message])
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!id) return
    if (!window.confirm('Delete this macro?')) return
    await deleteMacro(id)
    localStorage.removeItem(draftKey(id))
    navigate('/macros')
  }

  function handleBack() {
    if (isDirty && !window.confirm('Discard unsaved changes?')) return
    navigate('/macros')
  }

  return (
    <div style={{ padding: 16, maxWidth: 800 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <input
          type="text"
          placeholder="Macro name"
          value={name}
          onChange={e => setName(e.target.value)}
          style={{ fontSize: 18, flex: 1, marginRight: 16 }}
        />
        <button onClick={handleBack}>Back</button>
      </div>

      <StepSequence steps={steps} onChange={setSteps} />

      {errors.length > 0 && (
        <ul style={{ color: 'red', marginTop: 8 }}>
          {errors.map((e, i) => <li key={i}>{e}</li>)}
        </ul>
      )}

      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </button>
        {id && (
          <button onClick={handleDelete} style={{ color: 'red' }}>
            Delete
          </button>
        )}
      </div>
    </div>
  )
}
