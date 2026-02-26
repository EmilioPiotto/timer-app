import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import type { TimerResponse } from '../../types'
import { getTimer } from '../../api'
import { useAudio } from '../../hooks/useAudio'
import { useTimerEngine } from '../../hooks/useTimerEngine'

function formatMs(ms: number): string {
  const totalSec = Math.floor(ms / 1000)
  const min = Math.floor(totalSec / 60)
  const sec = totalSec % 60
  return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
}

export default function TimerRunnerPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [timer, setTimer] = useState<TimerResponse | null>(null)

  const { isUnlocked, unlock, playSound } = useAudio()
  const { state, slotDurations, start, pause, resume, stop } = useTimerEngine(timer, playSound)

  useEffect(() => {
    if (!id) { navigate('/'); return }
    getTimer(id).then(setTimer).catch(() => navigate('/'))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  function handleStart() {
    unlock()
    start()
  }

  function handleStop() {
    stop()
    navigate(`/timers/${id}`)
  }

  if (!timer) return <div style={{ padding: 16 }}>Loading…</div>

  const { phase } = state

  // ── Completed ───────────────────────────────────────────────────────────────
  if (phase === 'COMPLETED') {
    return (
      <div style={{ padding: 32, textAlign: 'center' }}>
        <h2>Workout complete!</h2>
        <p style={{ fontSize: 28 }}>Total time: {formatMs(state.elapsedMs)}</p>
        <button onClick={() => navigate('/')} style={{ marginTop: 16, padding: '10px 24px' }}>
          Back to Timers
        </button>
      </div>
    )
  }

  // ── Idle ────────────────────────────────────────────────────────────────────
  if (phase === 'IDLE') {
    return (
      <div style={{ padding: 32, textAlign: 'center' }}>
        <h2>{timer.name}</h2>
        <p style={{ color: '#666' }}>
          {timer.totalMinutes} min · {timer.slots.length} macro{timer.slots.length !== 1 ? 's' : ''}
        </p>
        <button
          onClick={handleStart}
          style={{ fontSize: 20, padding: '12px 32px', marginTop: 20 }}
        >
          Start ▶
        </button>
        <div style={{ marginTop: 12 }}>
          <button onClick={() => navigate(`/timers/${id}`)}>Back</button>
        </div>
      </div>
    )
  }

  // ── Transitioning ───────────────────────────────────────────────────────────
  if (phase === 'TRANSITIONING') {
    const nextSlot = timer.slots[state.nextSlotIndex]
    const nextDurMs = slotDurations[state.nextSlotIndex] ?? 0
    return (
      <div style={{ padding: 32, textAlign: 'center' }}>
        {!isUnlocked && (
          <p style={{ color: 'orange', cursor: 'pointer' }} onClick={unlock}>
            ⚠ Tap to enable sound
          </p>
        )}
        <p style={{ color: '#888', fontSize: 16, marginBottom: 8 }}>Next up:</p>
        <h2 style={{ margin: '0 0 4px' }}>{nextSlot.macro.name}</h2>
        {nextDurMs > 0 && (
          <p style={{ color: '#666' }}>{(nextDurMs / 60_000).toFixed(1)} min</p>
        )}
        <p style={{ fontSize: 64, margin: '16px 0' }}>{state.countdown}…</p>
        <button onClick={handleStop} style={{ marginTop: 8 }}>Stop</button>
      </div>
    )
  }

  // ── Running / Paused ────────────────────────────────────────────────────────
  const slot = timer.slots[state.slotIndex]
  const steps = slot.macro.steps
  const currentStep = steps[state.stepIndex]
  const nextStep = steps[state.stepIndex + 1] ?? null

  const loopLabel =
    slot.loopMode === 'FIXED_CYCLES'
      ? `loop ${state.loopIteration + 1} / ${slot.loopCycles ?? '?'}`
      : null

  return (
    <div style={{ padding: 32, textAlign: 'center', maxWidth: 420, margin: '0 auto' }}>
      {!isUnlocked && (
        <p style={{ color: 'orange', cursor: 'pointer', marginBottom: 8 }} onClick={unlock}>
          ⚠ Tap to enable sound
        </p>
      )}

      {/* Macro header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        fontSize: 14, color: '#666', marginBottom: 28,
      }}>
        <span>
          Macro: <strong>{slot.macro.name}</strong> ({state.slotIndex + 1} of {timer.slots.length})
        </span>
        {loopLabel && <span>{loopLabel}</span>}
      </div>

      {/* Big countdown */}
      <div style={{ fontSize: 80, lineHeight: 1, margin: '0 0 8px', fontFamily: 'monospace' }}>
        {currentStep.type === 'WAIT' ? formatMs(state.remainingStepMs) : '——'}
      </div>

      {/* Step type */}
      <div style={{ fontSize: 22, color: '#444', marginBottom: 24 }}>
        {currentStep.type === 'WAIT'
          ? 'WAIT'
          : `BEEP · ${currentStep.soundId}`}
      </div>

      {/* Next step preview */}
      <div style={{ fontSize: 14, color: '#999', marginBottom: 36, minHeight: 20 }}>
        {nextStep
          ? `next: ${nextStep.type === 'WAIT' ? `WAIT ${nextStep.seconds}s` : `BEEP (${nextStep.soundId})`}`
          : ''}
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
        {phase === 'RUNNING' ? (
          <button onClick={pause} style={{ padding: '10px 28px', fontSize: 16 }}>Pause</button>
        ) : (
          <button onClick={resume} style={{ padding: '10px 28px', fontSize: 16 }}>Resume</button>
        )}
        <button onClick={handleStop} style={{ padding: '10px 28px', fontSize: 16 }}>Stop</button>
      </div>
    </div>
  )
}
