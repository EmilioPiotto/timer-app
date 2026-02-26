import type {
  MacroCreate,
  MacroResponse,
  MacroTemplate,
  TimerCreate,
  TimerListItem,
  TimerResponse,
  TimerTemplate,
} from './types'

const BASE = '/api'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`${res.status} ${res.statusText}: ${text}`)
  }
  return res.json() as Promise<T>
}

// Health

export function getHealth(): Promise<{ status: string }> {
  return request('/health')
}

// Macros

export function listMacros(): Promise<MacroResponse[]> {
  return request('/macros')
}

export function getMacro(id: string): Promise<MacroResponse> {
  return request(`/macros/${id}`)
}

export function createMacro(body: MacroCreate): Promise<MacroResponse> {
  return request('/macros', { method: 'POST', body: JSON.stringify(body) })
}

export function updateMacro(id: string, body: MacroCreate): Promise<MacroResponse> {
  return request(`/macros/${id}`, { method: 'PUT', body: JSON.stringify(body) })
}

export function deleteMacro(id: string): Promise<void> {
  return request(`/macros/${id}`, { method: 'DELETE' })
}

// Timers

export function listTimers(): Promise<TimerListItem[]> {
  return request('/timers')
}

export function getTimer(id: string): Promise<TimerResponse> {
  return request(`/timers/${id}`)
}

export function createTimer(body: TimerCreate): Promise<TimerResponse> {
  return request('/timers', { method: 'POST', body: JSON.stringify(body) })
}

export function updateTimer(id: string, body: TimerCreate): Promise<TimerResponse> {
  return request(`/timers/${id}`, { method: 'PUT', body: JSON.stringify(body) })
}

export function deleteTimer(id: string): Promise<void> {
  return request(`/timers/${id}`, { method: 'DELETE' })
}

// Templates

export function getMacroTemplates(): Promise<MacroTemplate[]> {
  return request('/templates/macros')
}

export function getTimerTemplates(): Promise<TimerTemplate[]> {
  return request('/templates/timers')
}
