# Testing

## Verification status for Phase 1

**Verified in this engineering environment:** isolated TypeScript compilation for `src/voice/openLiveClient.ts` and `src/voice/tutorVoice.ts` completed successfully. Repository and source inspection completed.

**Not verified here:** the full application build, Mini App CLI validation and hosted browser acceptance journey. The local environment did not have the project dependencies installed and package downloads timed out, so no full-build success is claimed.

Run standard validation where the Mini App runtime is available:

```bash
npx --yes @moxt-ai/miniapp-cli@0.1.1 check "General/NahaLabs-AI-Whiteboard-Tutor.app" --format json
```

If dependencies are available, also run:

```bash
npm install
npm run typecheck
npm test
```

## Manual acceptance script

1. Select Grade 8 → Mathematics → Linear Equations and enter the classroom.
2. Confirm the loading state clears and a previously saved lesson is resumed when one exists.
3. Begin, continue, then answer the first question incorrectly (for example `divide by 3`).
4. Confirm remediation appears. Ask `Why did you subtract 5?` in the right panel.
5. Confirm the tutor answers and the board remains at remediation.
6. Continue and answer `5`; confirm the lesson reaches completion.
7. Leave, re-enter and refresh. Confirm the browser-local fallback restores state.
8. Draw with mouse/finger/stylus; confirm ink appears immediately.
9. Switch to eraser; confirm a stroke can be removed, undo restores it and clear removes all learner ink.
10. Use **Start Voice Tutor** in a browser that exposes SpeechRecognition; confirm Listening → transcript → tutor response → speech.
11. Press stop while speech is playing; confirm speech stops and status becomes Interrupted.
12. When `OPENLIVE_WS_URL` is configured by the host, confirm an OpenLive `/live` connection is attempted and a bridge failure falls back without crashing the lesson.

OpenLive/camera/screen end-to-end transport is **not yet verified in the hosted Mini App** because this Mini App does not ship the OpenLive companion agent service.
