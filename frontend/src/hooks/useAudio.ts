import { useCallback, useRef, useState } from 'react'
import type { BeepStep } from '../types'

type SoundId = BeepStep['soundId']

export interface UseAudioReturn {
  isUnlocked: boolean
  unlock: () => void
  playSound: (soundId: SoundId, volume: number) => void
}

export function useAudio(): UseAudioReturn {
  const ctxRef = useRef<AudioContext | null>(null)
  const [isUnlocked, setIsUnlocked] = useState(false)

  const unlock = useCallback(() => {
    if (!ctxRef.current) {
      ctxRef.current = new AudioContext()
    }
    const ctx = ctxRef.current
    if (ctx.state === 'running') {
      setIsUnlocked(true)
    } else {
      ctx.resume().then(() => setIsUnlocked(true))
    }
  }, [])

  const playSound = useCallback((soundId: SoundId, volume: number) => {
    if (!ctxRef.current || ctxRef.current.state !== 'running') return
    const ctx = ctxRef.current
    const now = ctx.currentTime

    function makeBeep(frequency: number, duration: number, vol: number) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.value = frequency
      gain.gain.setValueAtTime(vol, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration)
      osc.start(now)
      osc.stop(now + duration)
    }

    if (soundId === 'beep1') {
      makeBeep(880, 0.08, volume)
    } else if (soundId === 'beep2') {
      makeBeep(440, 0.08, volume)
    } else {
      // bell: two simultaneous oscillators at 660 + 880 Hz
      makeBeep(660, 0.6, volume / 2)
      makeBeep(880, 0.6, volume / 2)
    }
  }, [])

  return { isUnlocked, unlock, playSound }
}
