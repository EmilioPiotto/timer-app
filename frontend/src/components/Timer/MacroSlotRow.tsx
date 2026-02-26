import { useNavigate } from 'react-router-dom'
import type { MacroResponse, MacroSlot, LoopMode } from '../../types'

function cycleDurationMin(macro: MacroResponse): number {
  return macro.steps.reduce((sum, s) => sum + (s.type === 'WAIT' ? s.seconds : 0), 0) / 60
}

interface Props {
  slot: MacroSlot
  macro: MacroResponse
  index: number
  total: number
  autoMinutes: number | null
  onChange: (s: MacroSlot) => void
  onDelete: () => void
  onMoveUp: () => void
  onMoveDown: () => void
}

export default function MacroSlotRow({
  slot, macro, index, total, autoMinutes,
  onChange, onDelete, onMoveUp, onMoveDown,
}: Props) {
  const navigate = useNavigate()

  function handleLoopModeChange(mode: LoopMode) {
    onChange({
      ...slot,
      loopMode: mode,
      loopCycles: mode === 'FIXED_CYCLES' ? (slot.loopCycles ?? 8) : null,
      loopMinutes: mode === 'FIXED_MINUTES' ? (slot.loopMinutes ?? 5) : null,
    })
  }

  const cycleMins = cycleDurationMin(macro)

  let durationLabel: string
  if (slot.loopMode === 'FIXED_CYCLES') {
    const totalMin = (slot.loopCycles ?? 1) * cycleMins
    durationLabel = `~${totalMin.toFixed(1)} min`
  } else if (slot.loopMode === 'FIXED_MINUTES') {
    durationLabel = `${slot.loopMinutes} min`
  } else {
    durationLabel = autoMinutes !== null ? `auto (~${autoMinutes.toFixed(1)} min)` : 'auto'
  }

  return (
    <tr style={{ borderBottom: '1px solid #ddd' }}>
      <td style={{ padding: '8px 4px', width: 24, color: '#888' }}>{index + 1}</td>
      <td style={{ padding: '8px 4px' }}>
        {macro.name}
        <button
          onClick={() => navigate(`/macros/${macro.id}`)}
          style={{ marginLeft: 6, fontSize: 11, border: 'none', background: 'none', cursor: 'pointer' }}
          title="Edit macro"
        >↗</button>
      </td>
      <td style={{ padding: '8px 4px', whiteSpace: 'nowrap' }}>
        <button onClick={onMoveUp} disabled={index === 0} style={{ marginRight: 2 }}>↑</button>
        <button onClick={onMoveDown} disabled={index === total - 1}>↓</button>
      </td>
      <td style={{ padding: '8px 4px', whiteSpace: 'nowrap' }}>
        <select value={slot.loopMode} onChange={e => handleLoopModeChange(e.target.value as LoopMode)}>
          <option value="AUTO">Auto</option>
          <option value="FIXED_MINUTES">Fixed min</option>
          <option value="FIXED_CYCLES">Fixed cycles</option>
        </select>
        {slot.loopMode === 'FIXED_CYCLES' && (
          <input
            type="number" min={1} value={slot.loopCycles ?? 1}
            onChange={e => onChange({ ...slot, loopCycles: Math.max(1, parseInt(e.target.value) || 1) })}
            style={{ width: 50, marginLeft: 4 }}
          />
        )}
        {slot.loopMode === 'FIXED_MINUTES' && (
          <input
            type="number" min={0.5} step={0.5} value={slot.loopMinutes ?? 0.5}
            onChange={e => onChange({ ...slot, loopMinutes: Math.max(0.5, parseFloat(e.target.value) || 0.5) })}
            style={{ width: 50, marginLeft: 4 }}
          />
        )}
      </td>
      <td style={{ padding: '8px 4px', color: '#555', fontSize: 13 }}>{durationLabel}</td>
      <td style={{ padding: '8px 4px' }}>
        <button onClick={onDelete} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'red', fontSize: 16 }}>×</button>
      </td>
    </tr>
  )
}
