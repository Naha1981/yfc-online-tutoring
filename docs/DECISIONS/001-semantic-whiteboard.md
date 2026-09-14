# ADR 001: Semantic whiteboard first

**Decision:** Use structured board actions and a lightweight DOM/SVG-capable renderer for the first slice.

**Why:** This supports replay, responsive rendering, accessibility descriptions, analytics and future export without bringing the cost and interaction complexity of a general-purpose freeform canvas. The MVP does not need collaborative freehand drawing.

**Consequences:** Add mathematical markup/graph renderers as dedicated action handlers later. Evaluate heavier libraries only if the learning authoring experience requires freeform manipulation.
