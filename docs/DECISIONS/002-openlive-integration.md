# ADR 002: OpenLive as optional real-time interaction layer

**Decision:** Integrate OpenLive through a thin browser WebSocket adapter, while keeping browser-native speech APIs as the zero-infrastructure fallback.

**Why:** OpenLive provides a model-neutral local voice/vision pipeline with a browser `/live` WebSocket, on-device VAD/STT/TTS and barge-in. Its published web implementation depends on a companion local agent service, so importing the entire OpenLive application into this Mini App would add a runtime requirement that does not exist today.

**Consequences:** The tutoring engine remains independent of OpenLive. When `OPENLIVE_WS_URL` is supplied, transcript turns can use the OpenLive bridge and later camera/screen frames can ride the same protocol. Without it, voice can still work in supported browsers through `SpeechRecognition` and `speechSynthesis`. No OpenLive secret is stored in the browser.
