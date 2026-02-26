import { useState } from 'react'
import type { Step, BeepStep, WaitStep } from '../../types'
import BeepBlock from './BeepBlock'
import WaitBlock from './WaitBlock'

interface InsertButtonProps {
  onInsert: (s: Step) => void
}

function InsertButton({ onInsert }: InsertButtonProps) {
  const [open, setOpen] = useState(false)

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{ alignSelf: 'center', fontSize: 18, lineHeight: 1, padding: '2px 6px', cursor: 'pointer' }}
        title="Insert step"
      >
        +
      </button>
    )
  }

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, alignSelf: 'center' }}>
      <button onClick={() => { onInsert({ type: 'BEEP', soundId: 'beep1', volume: 0.8 }); setOpen(false) }}>Beep</button>
      <button onClick={() => { onInsert({ type: 'WAIT', seconds: 10 }); setOpen(false) }}>Wait</button>
      <button onClick={() => setOpen(false)}>×</button>
    </div>
  )
}

interface Props {
  steps: Step[]
  onChange: (steps: Step[]) => void
}

export default function StepSequence({ steps, onChange }: Props) {
  function insertAt(index: number, step: Step) {
    const next = [...steps]
    next.splice(index, 0, step)
    onChange(next)
  }

  function updateAt(index: number, step: Step) {
    onChange(steps.map((s, i) => (i === index ? step : s)))
  }

  function deleteAt(index: number) {
    onChange(steps.filter((_, i) => i !== index))
  }

  const items: React.ReactNode[] = []

  items.push(<InsertButton key="ins-0" onInsert={s => insertAt(0, s)} />)

  steps.forEach((step, i) => {
    const block =
      step.type === 'BEEP' ? (
        <BeepBlock
          key={`step-${i}`}
          step={step as BeepStep}
          onChange={s => updateAt(i, s)}
          onDelete={() => deleteAt(i)}
        />
      ) : (
        <WaitBlock
          key={`step-${i}`}
          step={step as WaitStep}
          onChange={s => updateAt(i, s)}
          onDelete={() => deleteAt(i)}
        />
      )

    items.push(block)
    items.push(<InsertButton key={`ins-${i + 1}`} onInsert={s => insertAt(i + 1, s)} />)
  })

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap: 4, padding: '8px 0' }}>
      {items}
    </div>
  )
}
