# API Design (target)

All production endpoints are versioned under `/api/v1` and require authenticated learner context except health endpoints.

| Method | Path | Purpose |
|---|---|---|
| GET | `/curriculum` | Query curriculum hierarchy |
| GET | `/lessons/{id}` | Retrieve lesson and structured steps |
| POST | `/sessions` | Create or resume lesson session |
| GET | `/sessions/{id}` | Read lesson state |
| POST | `/sessions/{id}/message` | Ask a tutor side question |
| POST | `/sessions/{id}/answer` | Submit learner answer and receive grading feedback |
| GET | `/sessions/{id}/whiteboard` | Retrieve action log for replay |
| POST | `/sessions/{id}/whiteboard/actions` | Append validated tutor board actions |
| GET | `/learners/{id}/progress` | Read progress evidence |
| GET | `/health`, `/readiness` | Operational checks |

Tutor payloads must include a confidence field, source metadata where applicable, and semantic board actions. No provider credentials are supplied to browser clients.

## Live interaction boundary

The browser-side OpenLive adapter sends the same conceptual messages as the OpenLive web client: `user_text` for final transcripts, `cancel` for barge-in, and optional `frames` for later camera/screen turns. The tutor intelligence remains outside this layer.
