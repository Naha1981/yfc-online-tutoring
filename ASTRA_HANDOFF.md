# Engineering Handoff

## What are we building?
A low-bandwidth, classroom-first whiteboard tutor for South African learners. The central experience is teacher-led teaching on a structured board, not a chat interface.

## What works in source?
The deterministic Grade 8 linear-equations lesson, private session persistence, semantic teacher board actions, learner ink, and browser voice adapters are implemented in source.

## Phase 1 voice architecture
`src/voice/openLiveClient.ts` is a thin adapter for OpenLive's browser `/live` WebSocket protocol. It sends final text turns, supports cancellation and is ready for future camera/screen frames. `src/voice/tutorVoice.ts` provides a no-infrastructure browser fallback using SpeechRecognition/SpeechSynthesis, preferring an available South African English voice.

## What is not verified?
The full application build/validator and hosted browser journey were not run in this environment because dependencies could not be installed here. OpenLive end-to-end is not verified because no companion `/live` service is attached to this Mini App. Camera/screen capture, provider abstraction, cloned voice admin and production LLM remain future slices.

## Do not redo
Do not replace the semantic structured-whiteboard model with a generic chat UI. Do not copy the entire OpenLive desktop/web application into the Mini App. Keep OpenLive optional and the tutoring engine independent.

## Next single action
Run the hosted app and verify: draw a stroke → erase/undo/clear; Start Voice Tutor → speak → transcript → tutor speech; stop during speech → Interrupted. Then configure an OpenLive companion endpoint and verify one real `user_text` → `text_delta` → `done` turn.

## Key files
- `src/App.tsx`
- `src/lessonEngine.ts`
- `src/InteractiveWhiteboard.tsx`
- `src/voice/openLiveClient.ts`
- `src/voice/tutorVoice.ts`
- `src/sessionRepository.ts`
- `docs/DECISIONS/002-openlive-integration.md`
- `docs/DECISIONS/003-functional-whiteboard.md`

## Commands
```bash
npm install
npm run typecheck
npm test
```
Mini App validation:
```bash
npx --yes @moxt-ai/miniapp-cli@0.1.1 check "General/NahaLabs-AI-Whiteboard-Tutor.app" --format json
```
