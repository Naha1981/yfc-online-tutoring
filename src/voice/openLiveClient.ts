export type OpenLiveFrame = { data: string; mime: string; source: "camera" | "screen" }
export type OpenLiveEvent = { type: string; text?: string; [key: string]: unknown }

/**
 * Thin browser adapter for the OpenLive wire protocol.
 * OpenLive itself runs as a local companion service; the Mini App keeps its
 * tutoring engine independent and only uses the live endpoint when provided.
 */
export class OpenLiveClient {
  private socket: WebSocket | null = null
  private listeners = new Set<(event: OpenLiveEvent) => void>()

  constructor(private readonly url: string) {}

  connect(chatId: string, callbacks?: { onOpen?: () => void; onClose?: () => void }) {
    if (typeof WebSocket === "undefined" || !this.url) return false
    try {
      const separator = this.url.includes('?') ? '&' : '?'
      this.socket = new WebSocket(`${this.url}${separator}chat=${encodeURIComponent(chatId)}`)
      this.socket.onopen = () => callbacks?.onOpen?.()
      this.socket.onclose = () => callbacks?.onClose?.()
      this.socket.onmessage = event => {
        if (typeof event.data !== 'string') return
        try {
          const value = JSON.parse(event.data) as { t?: string; event?: OpenLiveEvent; message?: string }
          if (value.t === 'sse' && value.event) this.listeners.forEach(listener => listener(value.event!))
          if (value.t === 'error') this.listeners.forEach(listener => listener({ type: 'error', text: value.message }))
        } catch {
          // Ignore malformed bridge frames; browser fallback remains available.
        }
      }
      this.socket.onerror = () => this.listeners.forEach(listener => listener({ type: 'error' }))
      return true
    } catch {
      this.socket = null
      return false
    }
  }

  on(listener: (event: OpenLiveEvent) => void) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  userText(text: string, frames?: OpenLiveFrame[]) {
    this.send({ t: 'user_text', text, ...(frames?.length ? { frames } : {}) })
  }

  cancel(spoken?: string) {
    this.send({ t: 'cancel', ...(spoken ? { spoken } : {}) })
  }

  control(action: 'camera_on' | 'camera_off' | 'screen_on' | 'screen_off' | 'end') {
    this.send({ t: 'control', action })
  }

  close() {
    try { this.socket?.close() } catch { /* no-op */ }
    this.socket = null
  }

  get ready() { return this.socket?.readyState === WebSocket.OPEN }

  private send(value: unknown) {
    if (this.ready) this.socket?.send(JSON.stringify(value))
  }
}

export function readOpenLiveUrl() {
  const candidate = (globalThis as typeof globalThis & { OPENLIVE_WS_URL?: unknown }).OPENLIVE_WS_URL
  if (typeof candidate === 'string' && candidate.trim()) return candidate.trim()

  // Phase 1 hosted companion fallback. This is a public, non-secret WebSocket URL.
  return 'wss://nahalabs-openlive-agent-test.onrender.com/live'
}
