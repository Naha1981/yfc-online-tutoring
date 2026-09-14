export type VoiceStatus = 'idle' | 'listening' | 'thinking' | 'speaking' | 'interrupted' | 'error'

type RecognitionResult = { isFinal: boolean; transcript: string }

type RecognitionLike = {
  continuous: boolean
  interimResults: boolean
  lang: string
  onstart: (() => void) | null
  onend: (() => void) | null
  onerror: ((event: { error?: string }) => void) | null
  onresult: ((event: { results: { length: number; [index: number]: { isFinal: boolean; [index: number]: { transcript: string } } } }) => void) | null
  start(): void
  stop(): void
}

type WindowWithRecognition = Window & {
  SpeechRecognition?: new () => RecognitionLike
  webkitSpeechRecognition?: new () => RecognitionLike
}

export function speakTutor(text: string, onStart?: () => void, onEnd?: () => void) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return false
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  const voices = window.speechSynthesis.getVoices()
  const preferred = voices.find(v => v.lang.toLowerCase() === 'en-za')
    ?? voices.find(v => v.lang.toLowerCase().startsWith('en-gb'))
    ?? voices.find(v => v.lang.toLowerCase().startsWith('en-us'))
  if (preferred) utterance.voice = preferred
  utterance.lang = preferred?.lang ?? 'en-ZA'
  utterance.rate = 0.98
  utterance.pitch = 1
  utterance.onstart = () => onStart?.()
  utterance.onend = () => onEnd?.()
  utterance.onerror = () => onEnd?.()
  window.speechSynthesis.speak(utterance)
  return true
}

export function stopTutorSpeech(onStop?: () => void) {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel()
  onStop?.()
}

export function createSpeechRecognizer({
  onStatus,
  onTranscript,
  onError,
}: {
  onStatus?: (status: VoiceStatus) => void
  onTranscript: (result: RecognitionResult) => void
  onError?: (message: string) => void
}) {
  if (typeof window === 'undefined') return null
  const ctor = (window as WindowWithRecognition).SpeechRecognition ?? (window as WindowWithRecognition).webkitSpeechRecognition
  if (!ctor) return null

  const recognition = new ctor()
  recognition.continuous = false
  recognition.interimResults = true
  recognition.lang = 'en-ZA'
  recognition.onstart = () => onStatus?.('listening')
  recognition.onresult = event => {
    let transcript = ''
    let isFinal = false
    for (let i = 0; i < event.results.length; i += 1) {
      const result = event.results[i]
      transcript += result[0]?.transcript ?? ''
      if (result.isFinal) isFinal = true
    }
    if (transcript.trim()) onTranscript({ transcript: transcript.trim(), isFinal })
  }
  recognition.onerror = event => {
    onStatus?.('error')
    onError?.(event.error ? `Voice input error: ${event.error}` : 'Voice input is unavailable in this browser.')
  }
  recognition.onend = () => onStatus?.('idle')
  return recognition
}
