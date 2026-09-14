import test from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import WebSocket from 'ws'

const port = 8899

test('OpenLive companion exposes health and live websocket', async () => {
  const child = spawn(process.execPath, ['server.mjs'], {
    cwd: new URL('.', import.meta.url).pathname,
    env: { ...process.env, PORT: String(port) },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  try {
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('server start timeout')), 5000)
      child.stdout.on('data', chunk => {
        if (String(chunk).includes('listening')) { clearTimeout(timeout); resolve() }
      })
      child.on('error', reject)
    })

    const health = await fetch(`http://127.0.0.1:${port}/health`).then(r => r.json())
    assert.equal(health.ok, true)

    const ws = new WebSocket(`ws://127.0.0.1:${port}/live?chat=test`)
    const events = []
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('websocket timeout')), 5000)
      ws.on('open', () => ws.send(JSON.stringify({ t: 'user_text', text: 'Why did you subtract 5?' })))
      ws.on('message', data => {
        const m = JSON.parse(String(data))
        if (m.t === 'sse') events.push(m.event)
        if (m.t === 'sse' && m.event.type === 'done') { clearTimeout(timeout); resolve() }
      })
      ws.on('error', reject)
    })
    assert.ok(events.some(e => e.type === 'text_delta'))
    assert.ok(events.some(e => e.type === 'done'))
    ws.close()
  } finally {
    child.kill('SIGTERM')
  }
})
