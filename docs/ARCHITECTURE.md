# Architecture

## Current runnable slice

React + TypeScript Mini App. `src/lessonEngine.ts` contains UI-independent lesson progress, deterministic grading, interruption wording and semantic `BoardAction` objects. `App.tsx` renders the classroom. `src/sessionRepository.ts` provides the persistence boundary:

1. it writes the compact lesson snapshot to browser local storage first;
2. it then upserts the same snapshot to the learner's private `lesson_sessions` row;
3. it reads the remote snapshot when available and otherwise resumes the local fallback.

The persistence boundary lets the classroom UI remain independent of the transport and gives learners an offline-resilient experience. The database enforces ownership with `auth.user_id()` and row-level security; the client does not pass an owner id.

## Target service boundaries

- **Curriculum service:** versioned grade, subject, objective and lesson metadata.
- **Lesson engine:** explicit phase transitions, interruption stack, teaching objective and event stream.
- **Tutor provider:** model-agnostic explanatory response generation; must return structured response/action proposals.
- **Math provider:** deterministic verification (SymPy or equivalent) before mathematical feedback.
- **Whiteboard renderer:** actions such as WRITE, UNDERLINE, BOX, ARROW, SHOW_EQUATION and WAIT_FOR_LEARNER.
- **Progress service:** authenticated learner state and mastery evidence.

## Technology decision

Use DOM/SVG-style semantic primitives first rather than a large freeform whiteboard package. This gives low bundle weight, deterministic replay and a direct accessibility path. KaTeX/SVG graph primitives can be added when multi-lesson mathematical rendering needs them. A pen/board presentation is selected for MVP over an avatar because it avoids latency, media cost and accessibility dependency.

## Phase 1 voice/whiteboard additions

The classroom now has two independent presentation layers: structured teacher actions from `lessonEngine.ts`, plus a learner ink layer in `InteractiveWhiteboard.tsx`. The ink renderer uses the MIT-licensed `perfect-freehand` package.

Voice is behind `src/voice/`: `openLiveClient.ts` implements the small OpenLive wire adapter, while `tutorVoice.ts` provides browser speech input/output and South African English voice selection where available. The classroom does not depend on OpenLive being installed; when no `OPENLIVE_WS_URL` runtime setting exists, the browser voice path remains usable.
