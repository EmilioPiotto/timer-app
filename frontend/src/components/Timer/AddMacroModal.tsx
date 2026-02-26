import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { MacroResponse, MacroSlot, MacroTemplate, LoopMode } from '../../types'
import { createMacro, getMacroTemplates, listMacros } from '../../api'

interface Props {
  onAdd: (slot: MacroSlot, macro: MacroResponse) => void
  onClose: () => void
}

export default function AddMacroModal({ onAdd, onClose }: Props) {
  const navigate = useNavigate()
  const [macros, setMacros] = useState<MacroResponse[]>([])
  const [templates, setTemplates] = useState<MacroTemplate[]>([])
  const [selected, setSelected] = useState<MacroResponse | null>(null)
  const [loopMode, setLoopMode] = useState<LoopMode>('AUTO')
  const [loopCycles, setLoopCycles] = useState(8)
  const [loopMinutes, setLoopMinutes] = useState(5)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    Promise.all([listMacros(), getMacroTemplates()]).then(([m, t]) => {
      setMacros(m)
      setTemplates(t)
    })
  }, [])

  async function handleUseTemplate(t: MacroTemplate) {
    setLoading(true)
    try {
      const macro = await createMacro({ name: t.name, steps: t.steps })
      setMacros(prev => [...prev, macro])
      setSelected(macro)
    } finally {
      setLoading(false)
    }
  }

  function handleAdd() {
    if (!selected) return
    const slot: MacroSlot = {
      macroId: selected.id,
      loopMode,
      loopCycles: loopMode === 'FIXED_CYCLES' ? loopCycles : null,
      loopMinutes: loopMode === 'FIXED_MINUTES' ? loopMinutes : null,
    }
    onAdd(slot, selected)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
      <div style={{ background: '#fff', borderRadius: 6, padding: 20, width: 480, maxHeight: '80vh', overflowY: 'auto' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ margin: 0 }}>Add Macro</h3>
          <button onClick={onClose}>×</button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <strong>My Macros</strong>
          <button onClick={() => { navigate('/macros/new'); onClose() }}>+ Create new</button>
        </div>
        {macros.length === 0 ? (
          <p style={{ color: '#888', fontSize: 13, marginBottom: 12 }}>No macros yet.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 12 }}>
            <tbody>
              {macros.map(m => (
                <tr
                  key={m.id}
                  onClick={() => setSelected(m)}
                  style={{
                    borderBottom: '1px solid #eee',
                    cursor: 'pointer',
                    background: selected?.id === m.id ? '#e8f0fe' : undefined,
                  }}
                >
                  <td style={{ padding: '6px 8px' }}>{m.name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <strong style={{ display: 'block', marginBottom: 6 }}>Templates</strong>
        {templates.length === 0 ? (
          <p style={{ color: '#888', fontSize: 13, marginBottom: 12 }}>No templates.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16 }}>
            <tbody>
              {templates.map((t, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '6px 8px' }}>{t.name}</td>
                  <td style={{ padding: '6px 8px', textAlign: 'right' }}>
                    <button onClick={() => handleUseTemplate(t)} disabled={loading}>Use</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {selected && (
          <div style={{ borderTop: '1px solid #ddd', paddingTop: 12, marginBottom: 12 }}>
            <div style={{ marginBottom: 6 }}><strong>Selected:</strong> {selected.name}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <label>Loop:</label>
              <select value={loopMode} onChange={e => setLoopMode(e.target.value as LoopMode)}>
                <option value="AUTO">Auto</option>
                <option value="FIXED_MINUTES">Fixed min</option>
                <option value="FIXED_CYCLES">Fixed cycles</option>
              </select>
              {loopMode === 'FIXED_CYCLES' && (
                <input
                  type="number" min={1} value={loopCycles}
                  onChange={e => setLoopCycles(Math.max(1, parseInt(e.target.value) || 1))}
                  style={{ width: 60 }}
                />
              )}
              {loopMode === 'FIXED_MINUTES' && (
                <input
                  type="number" min={0.5} step={0.5} value={loopMinutes}
                  onChange={e => setLoopMinutes(Math.max(0.5, parseFloat(e.target.value) || 0.5))}
                  style={{ width: 60 }}
                />
              )}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onClose}>Cancel</button>
          <button onClick={handleAdd} disabled={!selected}>Add</button>
        </div>
      </div>
    </div>
  )
}
