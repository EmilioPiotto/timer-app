import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { MacroResponse, MacroTemplate, Step } from '../../types'
import { createMacro, getMacroTemplates, listMacros } from '../../api'

function stepSummary(steps: Step[]): string {
  return steps.map(s => s.type === 'BEEP' ? `🔔${s.soundId}` : `${s.seconds}s`).join(' ')
}

export default function MacroLibraryPage() {
  const navigate = useNavigate()
  const [macros, setMacros] = useState<MacroResponse[]>([])
  const [templates, setTemplates] = useState<MacroTemplate[]>([])

  useEffect(() => {
    Promise.all([listMacros(), getMacroTemplates()]).then(([m, t]) => {
      setMacros(m)
      setTemplates(t)
    })
  }, [])

  async function handleUseTemplate(t: MacroTemplate) {
    const created = await createMacro({ name: t.name, steps: t.steps })
    navigate(`/macros/${created.id}`)
  }

  return (
    <div style={{ padding: 16, maxWidth: 800 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>My Macros</h2>
        <button onClick={() => navigate('/macros/new')}>+ New Macro</button>
      </div>

      {macros.length === 0 ? (
        <p style={{ color: '#888' }}>No macros yet.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 24 }}>
          <tbody>
            {macros.map(m => (
              <tr key={m.id} style={{ borderBottom: '1px solid #ddd' }}>
                <td style={{ padding: '8px 4px', fontWeight: 500 }}>{m.name}</td>
                <td style={{ padding: '8px 4px', color: '#555', fontSize: 13 }}>{stepSummary(m.steps)}</td>
                <td style={{ padding: '8px 4px', textAlign: 'right' }}>
                  <button onClick={() => navigate(`/macros/${m.id}`)}>Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h2 style={{ marginBottom: 16 }}>Template Macros</h2>

      {templates.length === 0 ? (
        <p style={{ color: '#888' }}>No templates available.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            {templates.map((t, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #ddd' }}>
                <td style={{ padding: '8px 4px', fontWeight: 500 }}>{t.name}</td>
                <td style={{ padding: '8px 4px', color: '#555', fontSize: 13 }}>{stepSummary(t.steps)}</td>
                <td style={{ padding: '8px 4px', textAlign: 'right' }}>
                  <button onClick={() => handleUseTemplate(t)}>Use</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
