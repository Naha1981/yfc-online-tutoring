import http from 'node:http'
import { WebSocketServer } from 'ws'

const port = Number(process.env.PORT || process.env.AGENT_PORT || 8787)
const provider = (process.env.TUTOR_PROVIDER || 'fallback').toLowerCase()
const tutorApiKey = process.env.TUTOR_API_KEY || ''
const tutorModel = process.env.TUTOR_MODEL || ''
const tutorBaseUrl = resolveBaseUrl(provider, process.env.TUTOR_BASE_URL || '')
const tutorTemperature = clampNumber(process.env.TUTOR_TEMPERATURE, 0.25, 0, 2)

const PROVIDERS = {
  openai: { label: 'OpenAI', baseUrl: 'https://api.openai.com/v1', requiresKey: true },
  openrouter: { label: 'OpenRouter', baseUrl: 'https://openrouter.ai/api/v1', requiresKey: true },
  groq: { label: 'Groq', baseUrl: 'https://api.groq.com/openai/v1', requiresKey: true },
  gemini: { label: 'Google Gemini', baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai', requiresKey: true },
  ollama: { label: 'Ollama (local/self-hosted)', baseUrl: 'http://localhost:11434/v1', requiresKey: false },
  lmstudio: { label: 'LM Studio (local)', baseUrl: 'http://localhost:1234/v1', requiresKey: false },
}

function clampNumber(value, fallback, min, max) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? Math.min(Math.max(parsed, min), max) : fallback
}

function resolveBaseUrl(name, explicit) {
  const trimmed = explicit.trim().replace(/\/$/, '')
  if (trimmed) return trimmed
  return PROVIDERS[name]?.baseUrl || ''
}

function providerStatus() {
  const preset = PROVIDERS[provider]
  const needsKey = preset ? preset.requiresKey : provider !== 'fallback'
  return {
    provider,
    providerLabel: preset?.label || (provider === 'fallback' ? 'Deterministic fallback' : 'Custom OpenAI-compatible'),
    model: tutorModel || null,
    configured: provider !== 'fallback' && Boolean(tutorBaseUrl && tutorModel && (!needsKey || tutorApiKey)),
    baseUrlConfigured: Boolean(tutorBaseUrl),
    keyConfigured: Boolean(tutorApiKey),
    note: provider === 'fallback' ? 'No external LLM configured; using deterministic tutor.' : null,
  }
}

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', process.env.WEB_PUBLIC_URL || '*')
  res.setHeader('Access-Control-Allow-Headers', 'content-type')
  if (req.url === '/health' || req.url === '/config') {
    res.writeHead(200, { 'content-type': 'application/json' })
    res.end(JSON.stringify({
      ok: true,
      service: 'nahalabs-openlive-agent',
      protocol: 'openlive-live-v1',
      tutor: providerStatus(),
    }))
    return
  }
  res.writeHead(404)
  res.end('not found')
})

const wss = new WebSocketServer({ noServer: true })
const sessions = new Map()

function deterministicTeacherReply(text) {
  const q = text.toLowerCase()
  if (q.includes('hello') || q.includes('hi')) return 'Hello! I am your NahaLabs AI teacher. What are you working on today?'
  if (q.includes('why did you subtract') || q.includes('why subtract')) return 'Good question. We subtract 5 because we want to undo the plus 5. Whatever we do to one side of an equation, we do to the other side too.'
  if (q.includes('linear equation') || q.includes('solve')) return 'Let us solve it together. Start with 3x plus 5 equals 20. What operation would remove the 5 first?'
  if (q.includes('help')) return 'Absolutely. Tell me the exact step that feels confusing, and we will work through it together.'
  return `I heard you say: ${text}. Let us work through that carefully together.`
}

function tutorSystemPrompt(context) {
  const grade = context?.grade || 'school'
  const subject = context?.subject || 'the current subject'
  const topic = context?.topic || 'the current topic'
  const phase = context?.phase || 'the current lesson phase'
  return [
    `You are a patient South African ${grade} tutor for ${subject}, currently teaching ${topic}.`,
    `The learner is in the ${phase} phase of a structured lesson.`,
    'Teach step by step, ask one useful question at a time, never shame the learner, and prefer explaining reasoning over giving the final answer immediately.',
    'Respect the teacher-led whiteboard flow. Keep spoken responses concise and natural for text-to-speech.',
  ].join(' ')
}

async function providerTeacherReply(history, context, signal) {
  if (!tutorBaseUrl || !tutorModel) return null
  const preset = PROVIDERS[provider]
  const needsKey = preset ? preset.requiresKey : provider !== 'fallback'
  if (needsKey && !tutorApiKey) return null

  const headers = { 'content-type': 'application/json' }
  if (tutorApiKey) headers.authorization = `Bearer ${tutorApiKey}`
  if (provider === 'openrouter') {
    if (process.env.OPENROUTER_REFERER) headers['HTTP-Referer'] = process.env.OPENROUTER_REFERER
    if (process.env.OPENROUTER_TITLE) headers['X-Title'] = process.env.OPENROUTER_TITLE
  }

  const response = await fetch(`${tutorBaseUrl}/chat/completions`, {
    method: 'POST',
    headers,
    signal,
    body: JSON.stringify({
      model: tutorModel,
      temperature: tutorTemperature,
      stream: true,
      messages: [
        { role: 'system', content: tutorSystemPrompt(context) },
        ...history,
      ],
    }),
  })

  if (!response.ok) throw new Error(`Tutor provider returned HTTP ${response.status}`)
  if (!response.body) throw new Error('Tutor provider returned no response body')
  return response.body
}

function emit(ws, event) {
  if (ws.readyState === 1) ws.send(JSON.stringify({ t: 'sse', event }))
}

async function streamProviderReply(ws, state, context) {
  const controller = new AbortController()
  state.controller = controller
  const body = await providerTeacherReply(state.history, context, controller.signal)
  if (!body) return null

  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let fullText = ''

  while (!state.cancelled) {
    const { value, done } = await reader.read()
    buffer += decoder.decode(value || new Uint8Array(), { stream: !done })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      if (!line.startsWith('data:')) continue
      const payload = line.slice(5).trim()
      if (!payload || payload === '[DONE]') continue
      let json
      try { json = JSON.parse(payload) } catch { continue }
      const delta = json?.choices?.[0]?.delta?.content
      if (typeof delta === 'string' && delta) {
        fullText += delta
        emit(ws, { type: 'text_delta', text: delta })
      }
    }
    if (done) break
  }

  try { await reader.cancel() } catch { /* best effort */ }
  state.controller = null
  return fullText.trim() || null
}

wss.on('connection', (ws, request) => {
  const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`)
  const chat = url.searchParams.get('chat') || crypto.randomUUID()
  const state = { cancelled: false, history: [], controller: null }
  sessions.set(chat, state)

  ws.on('message', async raw => {
    let message
    try {
      if (Buffer.isBuffer(raw)) return
      message = JSON.parse(String(raw))
    } catch {
      ws.send(JSON.stringify({ t: 'error', message: 'Invalid JSON message' }))
      return
    }

    if (message.t === 'cancel') {
      state.cancelled = true
      try { state.controller?.abort() } catch { /* best effort */ }
      return
    }

    if (message.t === 'control' && message.action === 'end') {
      ws.close()
      return
    }

    if (message.t !== 'user_text') return

    const text = String(message.text || '').trim()
    if (!text) return

    state.cancelled = false
    state.history.push({ role: 'user', content: text })
    state.history = state.history.slice(-12)
    emit(ws, { type: 'status', text: 'Thinking…' })

    let answer = null
    try {
      answer = await streamProviderReply(ws, state, message.context || {})
    } catch (error) {
      if (!state.cancelled) console.error('Tutor provider error:', error?.message || error)
    }

    if (!answer && !state.cancelled) {
      answer = deterministicTeacherReply(text)
      let cursor = 0
      const timer = setInterval(() => {
        if (state.cancelled || ws.readyState !== 1) {
          clearInterval(timer)
          return
        }
        const next = Math.min(cursor + 8, answer.length)
        emit(ws, { type: 'text_delta', text: answer.slice(cursor, next) })
        cursor = next
        if (cursor >= answer.length) {
          clearInterval(timer)
          emit(ws, { type: 'done' })
        }
      }, 18)
    } else if (answer && !state.cancelled) {
      emit(ws, { type: 'done' })
    }

    if (answer && !state.cancelled) state.history.push({ role: 'assistant', content: answer })
  })

  ws.on('close', () => {
    state.cancelled = true
    try { state.controller?.abort() } catch { /* best effort */ }
    sessions.delete(chat)
  })
})

server.on('upgrade', (request, socket, head) => {
  const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`)
  if (url.pathname !== '/live') {
    socket.destroy()
    return
  }
  wss.handleUpgrade(request, socket, head, ws => wss.emit('connection', ws, request))
})

server.listen(port, '0.0.0.0', () => {
  console.log(`NahaLabs OpenLive companion listening on :${port}`)
})
