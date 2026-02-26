import { useCallback, useEffect, useRef, useState } from 'react'
import type { BeepStep, TimerResponse } from '../types'

// ─── Public state shape ────────────────────────────────────────────────────────

export interface EngineState {
  phase: 'IDLE' | 'RUNNING' | 'PAUSED' | 'TRANSITIONING' | 'COMPLETED'
  // RUNNING / PAUSED
  slotIndex: number
  loopIteration: number   // 0-indexed cycle count within current slot
  stepIndex: number
  remainingStepMs: number // ms until current WAIT ends (updated each frame)
  // TRANSITIONING
  nextSlotIndex: number
  countdown: number       // 3 → 2 → 1 (updated each frame)
  // all active phases
  elapsedMs: number
}

const IDLE: EngineState = {
  phase: 'IDLE',
  slotIndex: 0,
  loopIteration: 0,
  stepIndex: 0,
  remainingStepMs: 0,
  nextSlotIndex: 0,
  countdown: 3,
  elapsedMs: 0,
}

export interface UseTimerEngineReturn {
  state: EngineState
  slotDurations: number[]  // ms per slot, populated after start()
  start: () => void
  pause: () => void
  resume: () => void
  stop: () => void
}

// ─── Hook ──────────────────────────────────────────────────────────────────────

export function useTimerEngine(
  timer: TimerResponse | null,
  playSound: (soundId: BeepStep['soundId'], volume: number) => void,
): UseTimerEngineReturn {
  const [state, setState] = useState<EngineState>(IDLE)
  const stateRef = useRef<EngineState>(IDLE)

  // Stable refs so callbacks never go stale
  const timerRef = useRef(timer)
  useEffect(() => { timerRef.current = timer }, [timer])
  const playSoundRef = useRef(playSound)
  useEffect(() => { playSoundRef.current = playSound }, [playSound])

  const rafRef = useRef<number | null>(null)

  // Timing refs — all absolute performance.now() values while RUNNING
  const stepEndMsRef = useRef(0)          // when current step (WAIT or BEEP) ends
  const slotEndMsRef = useRef(Infinity)   // when current slot's time budget ends (Infinity for FIXED_CYCLES)
  const transitionEndMsRef = useRef(0)    // when 3s transition ends

  // Pause: remaining durations stored here, restored on resume
  const pausedStepRemRef = useRef(0)
  const pausedSlotRemRef = useRef(Infinity)

  // Elapsed tracking across pause/resume
  const segStartRef = useRef(0)           // performance.now() at start of current run segment
  const elapsedBeforeRef = useRef(0)      // accumulated elapsed from previous segments

  // Slot durations computed at start()
  const slotDurationsRef = useRef<number[]>([])
  const [slotDurations, setSlotDurations] = useState<number[]>([])

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  function computeSlotDurations(t: TimerResponse): number[] {
    const dur = new Array<number>(t.slots.length).fill(0)
    let fixedMs = 0
    let autoCount = 0

    t.slots.forEach((slot, i) => {
      if (slot.loopMode === 'FIXED_MINUTES') {
        dur[i] = (slot.loopMinutes ?? 0) * 60_000
        fixedMs += dur[i]
      } else if (slot.loopMode === 'FIXED_CYCLES') {
        const cycleDurationMs = slot.macro.steps.reduce(
          (sum, s) => sum + (s.type === 'WAIT' ? s.seconds * 1000 : 0), 0
        )
        dur[i] = (slot.loopCycles ?? 1) * cycleDurationMs
        fixedMs += dur[i]
      } else {
        autoCount++
      }
    })

    if (autoCount > 0) {
      const autoMs = Math.max(0, (t.totalMinutes * 60_000 - fixedMs) / autoCount)
      t.slots.forEach((slot, i) => {
        if (slot.loopMode === 'AUTO') dur[i] = autoMs
      })
    }

    return dur
  }

  // Enter a step: play BEEP immediately if needed, set stepEndMsRef
  function enterStep(
    t: TimerResponse,
    slotIndex: number,
    stepIndex: number,
    now: number,
  ) {
    const step = t.slots[slotIndex].macro.steps[stepIndex]
    if (step.type === 'BEEP') {
      playSoundRef.current(step.soundId, step.volume)
      stepEndMsRef.current = 0  // now >= 0 always → advances next tick
    } else {
      stepEndMsRef.current = now + step.seconds * 1000
    }
  }

  // ─── RAF tick ────────────────────────────────────────────────────────────────

  const tick = useCallback(() => {
    const t = timerRef.current
    if (!t) return

    const now = performance.now()
    const prev = stateRef.current
    const elapsed = elapsedBeforeRef.current + (now - segStartRef.current)

    let next = prev

    if (prev.phase === 'RUNNING') {
      if (now >= stepEndMsRef.current) {
        // Current step done — advance
        const steps = t.slots[prev.slotIndex].macro.steps
        let nextStep = prev.stepIndex + 1
        let nextLoop = prev.loopIteration

        if (nextStep >= steps.length) {
          // Completed one loop pass
          nextLoop++
          const slot = t.slots[prev.slotIndex]
          const slotDone =
            slot.loopMode === 'FIXED_CYCLES'
              ? nextLoop >= (slot.loopCycles ?? 1)
              : now >= slotEndMsRef.current

          if (slotDone) {
            const nextSlotIdx = prev.slotIndex + 1
            if (nextSlotIdx >= t.slots.length) {
              // All slots done → completed
              next = { ...prev, phase: 'COMPLETED', elapsedMs: elapsed }
            } else {
              // Start 3-second transition
              transitionEndMsRef.current = now + 3000
              next = {
                ...prev,
                phase: 'TRANSITIONING',
                nextSlotIndex: nextSlotIdx,
                countdown: 3,
                elapsedMs: elapsed,
              }
            }
          } else {
            // Same slot, next loop — restart at step 0
            nextStep = 0
            enterStep(t, prev.slotIndex, 0, now)
            next = {
              ...prev,
              stepIndex: 0,
              loopIteration: nextLoop,
              remainingStepMs: Math.max(0, stepEndMsRef.current - now),
              elapsedMs: elapsed,
            }
          }
        } else {
          // Next step within same loop pass
          enterStep(t, prev.slotIndex, nextStep, now)
          next = {
            ...prev,
            stepIndex: nextStep,
            loopIteration: nextLoop,
            remainingStepMs: Math.max(0, stepEndMsRef.current - now),
            elapsedMs: elapsed,
          }
        }
      } else {
        // Waiting — just update the countdown
        next = { ...prev, remainingStepMs: stepEndMsRef.current - now, elapsedMs: elapsed }
      }
    } else if (prev.phase === 'TRANSITIONING') {
      const remaining = transitionEndMsRef.current - now
      if (remaining <= 0) {
        // Transition over — start next slot
        const si = prev.nextSlotIndex
        slotEndMsRef.current =
          t.slots[si].loopMode !== 'FIXED_CYCLES'
            ? now + slotDurationsRef.current[si]
            : Infinity
        enterStep(t, si, 0, now)
        next = {
          ...prev,
          phase: 'RUNNING',
          slotIndex: si,
          loopIteration: 0,
          stepIndex: 0,
          remainingStepMs: Math.max(0, stepEndMsRef.current - now),
          elapsedMs: elapsed,
        }
      } else {
        next = { ...prev, countdown: Math.ceil(remaining / 1000), elapsedMs: elapsed }
      }
    }

    stateRef.current = next
    setState(next)

    if (next.phase === 'RUNNING' || next.phase === 'TRANSITIONING') {
      rafRef.current = requestAnimationFrame(tick)
    } else {
      rafRef.current = null
    }
  }, []) // stable — uses only refs inside

  // ─── Controls ─────────────────────────────────────────────────────────────────

  const start = useCallback(() => {
    const t = timerRef.current
    if (!t || t.slots.length === 0) return

    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)

    const durations = computeSlotDurations(t)
    slotDurationsRef.current = durations
    setSlotDurations(durations)

    const now = performance.now()
    segStartRef.current = now
    elapsedBeforeRef.current = 0

    slotEndMsRef.current =
      t.slots[0].loopMode !== 'FIXED_CYCLES' ? now + durations[0] : Infinity

    enterStep(t, 0, 0, now)

    const initial: EngineState = {
      phase: 'RUNNING',
      slotIndex: 0,
      loopIteration: 0,
      stepIndex: 0,
      remainingStepMs: Math.max(0, stepEndMsRef.current - now),
      nextSlotIndex: 0,
      countdown: 3,
      elapsedMs: 0,
    }
    stateRef.current = initial
    setState(initial)
    rafRef.current = requestAnimationFrame(tick)
  }, [tick])

  const pause = useCallback(() => {
    if (stateRef.current.phase !== 'RUNNING') return
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    const now = performance.now()
    elapsedBeforeRef.current += now - segStartRef.current
    pausedStepRemRef.current = Math.max(0, stepEndMsRef.current - now)
    pausedSlotRemRef.current =
      slotEndMsRef.current === Infinity ? Infinity : Math.max(0, slotEndMsRef.current - now)

    const paused: EngineState = { ...stateRef.current, phase: 'PAUSED' }
    stateRef.current = paused
    setState(paused)
  }, [])

  const resume = useCallback(() => {
    if (stateRef.current.phase !== 'PAUSED') return
    const now = performance.now()
    segStartRef.current = now
    stepEndMsRef.current = now + pausedStepRemRef.current
    slotEndMsRef.current =
      pausedSlotRemRef.current === Infinity ? Infinity : now + pausedSlotRemRef.current

    const running: EngineState = { ...stateRef.current, phase: 'RUNNING' }
    stateRef.current = running
    setState(running)
    rafRef.current = requestAnimationFrame(tick)
  }, [tick])

  const stop = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    stateRef.current = IDLE
    setState(IDLE)
  }, [])

  // Cancel rAF on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  return { state, slotDurations, start, pause, resume, stop }
}
