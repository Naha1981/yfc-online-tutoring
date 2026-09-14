# Product Requirements — MVP

## Goal
Prove a classroom-first tutoring loop for South African Grade 8 learners: the tutor teaches progressively on a board, asks for thinking, adapts after an incorrect answer, handles a side question, and preserves progress.

## Implemented journey
Grade/subject/topic selection → classroom → progressive equation demonstration → misconception-aware feedback → independent practice → completion and browser-persisted resume.

## Phase 1 interaction goal
Add a real learner ink surface plus low-cost voice input/output. OpenLive is an optional real-time interaction bridge; the tutoring domain remains independent from it.

## Guardrails
The prototype is deterministic and makes no CAPS-compliance claim beyond the selected subject/grade framing. It collects no learner identity, audio, or sensitive data through the new voice/ink code. Voice audio is handled by the browser/OpenLive local interaction layer and is not persisted by the lesson engine.

## MVP acceptance mapping
The app covers the specified Grade 8 linear-equation interaction, including an incorrect response, interruption, return to the active phase, correct answer evaluation, and browser refresh persistence. Production backend/API, authenticated cross-device persistence, live camera/screen vision, and production LLM tutoring remain future slices.
