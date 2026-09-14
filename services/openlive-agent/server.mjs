import http from 'node:http'
import { WebSocketServer } from 'ws'

const port = Number(process.env.PORT || process.env.AGENT_PORT || 8787)
const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', process.env.WEB_PUBLIC_URL || '*')
  res.setHeader('Access-Control-Allow-Headers', 'content-type')
  if (req.url === '/health') {
    res.writeHead(200, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ ok: true, service: 'nahalabs-openlive-agent', protocol: 'openlive-live-v1' }))
    return
  }
  res.writeHead(404)
  res.end('not found')
})

const wss = new WebSocketServer({ noServer: true })
const sessions = new Map()

function teacherReply(text) {
  const q = text.toLowerCase()
  if (q.includes('hello') || q.includes('hi')) return 'Hello! I am your NahaLabs AI teacher. What are you working on today?'
  if (q.includes('why did you subtract') || q.includes('why subtract')) return 'Good question. We subtract 5 because we want to undo the plus 5. Whatever we do to one side of an equation, we do to the other side too.'
  if (q.includes('linear equation') || q.includes('solve')) return 'Let us solve it together. Start with 3x plus 5 equals 20. What operation would remove the 5 first?'
  if (q.includes('help')) return 'Absolutely. Tell me the exact step that feels confusing, and we will work through it together.'
  return `I heard you say: ${text}. Let us work through that carefully together.`
}

function emit(ws, event) {
  if (ws.readyState === 1) ws.send(JSON.stringify({ t: 'sse', event }))
}

wss.on('connection', (ws, request) => {
  const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`)
  const chat = url.searchParams.get('chat') || crypto.randomUUID()
  const state = { cancelled: false }
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
      return
    }

    if (message.t === 'control' && message.action === 'end') {
      ws.close()
      return
    }

    if (message.t !== 'user_text') return

    state.cancelled = false
    const answer = teacherReply(String(message.text || '').trim())
    let cursor = 0
    emit(ws, { type: 'status', text: 'Thinking…' })

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
  })

  ws.on('close', () => sessions.delete(chat))
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
