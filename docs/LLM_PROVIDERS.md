# NahaLabs Tutor LLM Providers

The OpenLive companion keeps the tutoring brain provider-neutral. Configure one active provider in Render environment variables; learner/browser code never receives the API key.

## Supported profiles

| Provider | `TUTOR_PROVIDER` | Default API base | Key required | Notes |
|---|---|---|---|---|
| OpenAI | `openai` | `https://api.openai.com/v1` | Yes | Standard OpenAI-compatible Chat Completions |
| OpenRouter | `openrouter` | `https://openrouter.ai/api/v1` | Yes | Supports `openrouter/free` for currently available free models |
| Groq | `groq` | `https://api.groq.com/openai/v1` | Yes | Fast OpenAI-compatible inference |
| Google Gemini | `gemini` | `https://generativelanguage.googleapis.com/v1beta/openai` | Yes | Gemini OpenAI compatibility layer |
| Ollama | `ollama` | `http://localhost:11434/v1` | No | Local/self-hosted; Render cannot reach your laptop's localhost |
| LM Studio | `lmstudio` | `http://localhost:1234/v1` | Usually no | Local/self-hosted OpenAI-compatible server |
| Any compatible API | `custom` | Set `TUTOR_BASE_URL` | Depends | Any reachable OpenAI Chat Completions endpoint |
| No external model | `fallback` | — | No | Deterministic Grade 8 fallback for development/offline use |

## Render variables

Set these in the OpenLive companion service:

```text
TUTOR_PROVIDER=openrouter
TUTOR_API_KEY=<secret>
TUTOR_MODEL=openrouter/free
```

The base URL is selected automatically for the named provider. Set `TUTOR_BASE_URL` only when overriding that preset or using `custom`.

Optional:

```text
TUTOR_TEMPERATURE=0.25
OPENROUTER_REFERER=https://your-public-app.example
OPENROUTER_TITLE=NahaLabs AI Whiteboard Tutor
```

## Free / low-cost routes

### OpenRouter free router
OpenRouter publishes a free model router at `openrouter/free`; it selects among currently available free models and does not charge prompt/completion tokens. Free availability and rate limits can change, so the service must treat provider failures as recoverable and fall back cleanly.

### Local Ollama
Ollama exposes an OpenAI-compatible API that can be used with the same adapter. Use it when the companion service is running on the same machine/network as Ollama.

### Local LM Studio
LM Studio exposes OpenAI-compatible `/v1/chat/completions` and `/v1/responses` endpoints. This is useful for fully local development and testing.

## Security model

API keys belong in Render environment variables or another server-side secret store. Do not place `TUTOR_API_KEY` in browser code, Mini App configuration visible to learners, Git commits, screenshots or documentation.

The `/health` and `/config` endpoints report provider name, model and whether a key is configured, but never return the key itself.

## Switching providers

Changing provider does not require a source-code change. Update the three core values and redeploy:

```text
TUTOR_PROVIDER=<profile>
TUTOR_API_KEY=<key-or-empty-for-local>
TUTOR_MODEL=<model-id>
```

For a custom OpenAI-compatible API:

```text
TUTOR_PROVIDER=custom
TUTOR_BASE_URL=https://example.com/v1
TUTOR_API_KEY=<key-if-required>
TUTOR_MODEL=<model-id>
```

The tutoring prompt and lesson workflow remain in NahaLabs code, so provider changes do not change the classroom interaction contract.
