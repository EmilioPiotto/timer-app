import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { TimerListItem, TimerTemplate } from '../../types'
import { createMacro, createTimer, getMacroTemplates, getTimerTemplates, listTimers } from '../../api'

export default function HomePage() {
  const navigate = useNavigate()
  const [timers, setTimers] = useState<TimerListItem[]>([])
  const [templates, setTemplates] = useState<TimerTemplate[]>([])

  useEffect(() => {
    Promise.all([listTimers(), getTimerTemplates()]).then(([t, tmpl]) => {
      setTimers(t)
      setTemplates(tmpl)
    })
  }, [])

  async function handleUseTemplate(t: TimerTemplate) {
    const macroTemplates = await getMacroTemplates()
    const macroMap = new Map<string, string>() // macroName → id

    for (const slot of t.slots) {
      if (!macroMap.has(slot.macroName)) {
        const mt = macroTemplates.find(m => m.name === slot.macroName)
        if (mt) {
          const macro = await createMacro({ name: mt.name, steps: mt.steps })
          macroMap.set(slot.macroName, macro.id)
        }
      }
    }

    const slots = t.slots
      .filter(s => macroMap.has(s.macroName))
      .map(s => ({
        macroId: macroMap.get(s.macroName)!,
        loopMode: s.loopMode,
        loopCycles: s.loopCycles,
        loopMinutes: s.loopMinutes,
      }))

    const timer = await createTimer({ name: t.name, totalMinutes: t.totalMinutes, slots })
    navigate(`/timers/${timer.id}`)
  }

  return (
    <div style={{ padding: 16, maxWidth: 800 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2>My Timers</h2>
        <button onClick={() => navigate('/timers/new')}>+ New Timer</button>
      </div>

      {timers.length === 0 ? (
        <p style={{ color: '#888' }}>No timers yet.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 28 }}>
          <tbody>
            {timers.map(t => (
              <tr key={t.id} style={{ borderBottom: '1px solid #ddd' }}>
                <td style={{ padding: '8px 4px', fontWeight: 500 }}>{t.name}</td>
                <td style={{ padding: '8px 4px', color: '#666', fontSize: 13 }}>{t.totalMinutes} min</td>
                <td style={{ padding: '8px 4px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <button onClick={() => navigate(`/timers/${t.id}/run`)} style={{ marginRight: 6 }}>Run ▶</button>
                  <button onClick={() => navigate(`/timers/${t.id}`)}>Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h2 style={{ marginBottom: 16 }}>Template Timers</h2>

      {templates.length === 0 ? (
        <p style={{ color: '#888' }}>No templates.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            {templates.map((t, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #ddd' }}>
                <td style={{ padding: '8px 4px', fontWeight: 500 }}>{t.name}</td>
                <td style={{ padding: '8px 4px', color: '#666', fontSize: 13 }}>{t.totalMinutes} min</td>
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
