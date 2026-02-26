// Mirrors backend Pydantic models

export interface BeepStep {
  type: 'BEEP'
  soundId: 'beep1' | 'beep2' | 'bell'
  volume: number // 0..1
}

export interface WaitStep {
  type: 'WAIT'
  seconds: number // 1–3600
}

export type Step = BeepStep | WaitStep

export type LoopMode = 'FIXED_CYCLES' | 'FIXED_MINUTES' | 'AUTO'

export interface MacroSlot {
  macroId: string
  loopMode: LoopMode
  loopCycles: number | null
  loopMinutes: number | null
}

// Macro

export interface MacroCreate {
  name: string
  steps: Step[]
}

export interface MacroResponse {
  id: string
  name: string
  steps: Step[]
  createdAt: string
  updatedAt: string
}

// Timer

export interface TimerCreate {
  name: string
  totalMinutes: number
  slots: MacroSlot[]
}

// Expanded slot returned by GET /timers/:id
export interface ExpandedMacroSlot extends MacroSlot {
  macro: MacroResponse
}

export interface TimerResponse {
  id: string
  name: string
  totalMinutes: number
  slots: ExpandedMacroSlot[]
  createdAt: string
  updatedAt: string
}

// List response (slots not expanded)
export interface TimerListItem {
  id: string
  name: string
  totalMinutes: number
  slots: MacroSlot[]
  createdAt: string
  updatedAt: string
}

// Templates

export interface MacroTemplate {
  name: string
  steps: Step[]
}

export interface TimerSlotTemplate {
  macroName: string
  loopMode: LoopMode
  loopCycles: number | null
  loopMinutes: number | null
}

export interface TimerTemplate {
  name: string
  totalMinutes: number
  slots: TimerSlotTemplate[]
}
