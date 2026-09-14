# ADR 003: Functional learner ink with perfect-freehand

**Decision:** Keep semantic teacher actions as the authoritative lesson representation and add a separate learner freehand ink layer using `perfect-freehand` 1.2.3.

**Why:** `perfect-freehand` is MIT licensed, has zero runtime dependencies and produces pressure-sensitive SVG-friendly outlines. It gives learners a real pen/eraser/undo experience without replacing the semantic board model or pulling in a large collaborative editor.

**Consequences:** Teacher actions remain replayable and structured. Learner ink is currently local to the browser and is not yet part of the remote database snapshot. A later persistence slice can store serialized strokes/events without changing the renderer.
