# Changelog

## 0.4.0 — 2026-09-14
- Added functional learner freehand ink using `perfect-freehand` (MIT).
- Added pen, eraser, undo and clear controls.
- Added browser voice input/output with interruption control.
- Added an optional OpenLive WebSocket adapter without coupling the lesson engine to OpenLive.
- Added ADRs for OpenLive integration and whiteboard strategy.

## 0.3.0 — Durable progress persistence
- Provisioned Mini App relational storage.
- Added private `lesson_sessions` persistence with row-level security.
- Retained browser local storage as the offline-first fallback.
- Added migrations and typed database definitions.

## 0.2.0 — 2026-09-14
- Extracted lesson progress, deterministic grading, structured board actions and interruption wording into a React-independent lesson engine.
- Added unit coverage in the project source for the lesson engine.

## 0.1.0 — 2026-09-14
- Created the runnable NahaLabs AI Whiteboard Tutor Mini App.
- Implemented the Grade 8 linear-equations classroom vertical slice.
- Added progressive whiteboard, adaptive remediation, interruption handling and local lesson resume.
- Added product, architecture, API, database and testing documentation.
