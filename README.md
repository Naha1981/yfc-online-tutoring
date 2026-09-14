# NahaLabs AI Whiteboard Tutor

A classroom-first Mini App for active Grade 8 Mathematics tutoring. The learner follows structured teacher actions, answers checks for understanding, gets deterministic remediation, can ask side questions, and can draw on the board.

## Phase 1 additions

- Functional learner ink whiteboard with pen, eraser, undo and clear.
- MIT-licensed `perfect-freehand` renderer for pressure-sensitive SVG-friendly strokes.
- Browser voice input/output with `en-ZA` preference where the browser exposes it.
- Barge-in/stop control for tutor speech.
- Thin OpenLive WebSocket adapter. When the host provides `OPENLIVE_WS_URL`, final transcripts can be sent through the OpenLive protocol and streamed `text_delta` replies are spoken back. Without that endpoint, the app remains usable with browser speech APIs.

OpenLive is the real-time interaction layer, not the tutoring intelligence. The lesson engine stays independent so an LLM, STT, TTS or vision provider can be swapped later.

## Run and validate

The application is designed for the NahaLabs Mini App runtime. Standard validation is:

```bash
npx --yes @moxt-ai/miniapp-cli@0.1.1 check "General/NahaLabs-AI-Whiteboard-Tutor.app" --format json
```

Project-local scripts are also defined for future environments with dependencies installed:

```bash
npm install
npm run typecheck
npm test
```

## Current limitations

This branch does not yet include the OpenLive companion agent service, production LLM tutoring, camera/screen transport, CAPS source ingestion, cloned-voice administration or hosted end-to-end voice verification. Browser voice is a low-cost fallback, not a claim of OpenLive parity.

See `ASTRA_STATE.md`, `ASTRA_HANDOFF.md`, `docs/ARCHITECTURE.md`, `docs/API.md`, and `docs/TESTING.md`.
