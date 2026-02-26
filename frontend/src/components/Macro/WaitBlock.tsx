import type { WaitStep } from '../../types'

interface Props {
  step: WaitStep
  onChange: (s: WaitStep) => void
  onDelete: () => void
}

export default function WaitBlock({ step, onChange, onDelete }: Props) {
  return (
    <div style={{ border: '1px solid #888', borderRadius: 4, padding: '6px 8px', display: 'inline-flex', flexDirection: 'column', gap: 4, minWidth: 80 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <strong style={{ fontSize: 12 }}>WAIT</strong>
        <button onClick={onDelete} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 14, lineHeight: 1 }}>×</button>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
        <input
          type="number"
          min={1}
          max={3600}
          value={step.seconds}
          onChange={e => {
            const n = parseInt(e.target.value, 10)
            onChange({ ...step, seconds: isNaN(n) ? 1 : Math.max(1, n) })
          }}
          style={{ width: 60, fontSize: 12 }}
        />
        <span>s</span>
      </div>
    </div>
  )
}
