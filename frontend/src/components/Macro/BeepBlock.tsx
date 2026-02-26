import type { BeepStep } from '../../types'

interface Props {
  step: BeepStep
  onChange: (s: BeepStep) => void
  onDelete: () => void
}

export default function BeepBlock({ step, onChange, onDelete }: Props) {
  return (
    <div style={{ border: '1px solid #888', borderRadius: 4, padding: '6px 8px', display: 'inline-flex', flexDirection: 'column', gap: 4, minWidth: 120 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <strong style={{ fontSize: 12 }}>BEEP</strong>
        <button onClick={onDelete} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 14, lineHeight: 1 }}>×</button>
      </div>
      <select
        value={step.soundId}
        onChange={e => onChange({ ...step, soundId: e.target.value as BeepStep['soundId'] })}
        style={{ fontSize: 12 }}
      >
        <option value="beep1">beep1</option>
        <option value="beep2">beep2</option>
        <option value="bell">bell</option>
      </select>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
        <input
          type="range"
          min={0.1}
          max={1}
          step={0.1}
          value={step.volume}
          onChange={e => onChange({ ...step, volume: parseFloat(e.target.value) })}
          style={{ width: 70 }}
        />
        <span>{step.volume.toFixed(1)}</span>
      </div>
    </div>
  )
}
