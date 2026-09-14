# NahaLabs AI Whiteboard Tutor

A classroom-first Mini App for active Grade 8 Mathematics tutoring. The learner follows structured teacher actions, answers checks for understanding, gets deterministic remediation, can ask side questions, and can draw on the board.

## Phase 1

- Functional learner ink whiteboard with pen, eraser, undo and clear.
- MIT-licensed `perfect-freehand` renderer for pressure-sensitive SVG-friendly strokes.
- Browser voice input/output with `en-ZA` preference where the browser exposes it.
- Barge-in/stop control for tutor speech.
- Thin OpenLive WebSocket adapter with a public hosted companion fallback.
- Hosted companion `/live` transport with streamed `text_delta` events and clean cancellation.
- Provider-neutral tutor gateway with selectable remote and local LLM profiles.

OpenLive is the real-time interaction/transport layer, not the tutoring intelligence. The lesson engine stays independent so the tutoring provider can be swapped without replacing the classroom workflow.

## LLM provider choices

The companion supports:

- OpenAI
- OpenRouter, including the free `openrouter/free` router
- Groq
- Google Gemini
- Ollama
- LM Studio
- Any reachable OpenAI-compatible endpoint
- Deterministic fallback when no external provider is configured

Provider API keys are server-side Render environment variables and are never embedded in browser code. See `docs/LLM_PROVIDERS.md` and `services/openlive-agent/.env.example` for configuration.

OpenRouter currently publishes `openrouter/free` as a zero-price router over available free models. citeturn334302search9turn334302search10 Google Gemini exposes an OpenAI-compatible Chat Completions endpoint; Groq does likewise. citeturn521528search1turn521528search0 Ollama and LM Studio can provide local OpenAI-compatible inference for self-hosted/local deployments. citeturn334302search0turn334302search8

## Render companion

The Phase 1 hosted companion is deployed from `astra/openlive-whiteboard-phase1` with:

```text
Build: npm install --prefix services/openlive-agent
Start: node services/openlive-agent/server.mjs
```

It exposes `/health`, `/config`, and an OpenLive-compatible `/live` WebSocket endpoint. `/health` and `/config` return provider status only and never return API secrets.

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

The current companion is OpenLive-compatible transport rather than the complete upstream OpenLive local voice-model stack. Browser speech is still the low-cost voice fallback. Camera/screen capture, CAPS source ingestion, cloned-voice administration, and full hosted browser E2E are subsequent slices.

See `ASTRA_STATE.md`, `ASTRA_HANDOFF.md`, `docs/ARCHITECTURE.md`, `docs/API.md`, `docs/TESTING.md`, and `docs/LLM_PROVIDERS.md`.
