# Mini App engineering guide

Treat the repository as the source of truth. Preserve the classroom-first architecture and build in small vertical slices.

For this project, prefer:

`inspect → implement → run → test → verify → document → commit`

Never commit secrets. Keep provider credentials server-side or in the authorised Mini App secret mechanism. Do not make OpenLive, a specific LLM, or a specific TTS vendor part of the tutoring domain model.
