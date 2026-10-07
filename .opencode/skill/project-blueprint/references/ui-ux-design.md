# Template: `.ai/04-UI-UX-DESIGN.md`

Purpose: the complete visual and interaction spec. The result must look polished and intentional, never like a generic template. If the `frontend-design` skill is available, read it before writing this file.

## Required structure

```markdown
# UI/UX DESIGN: <Project Name>

> File purpose: visual system and screen design. Depends on: 01-PRD.md, 03-APP-FLOW.md.

## 1. Design Direction

- Mood (3-5 adjectives):
- Reference feel (e.g. "calm editorial", "bold fintech", "playful, rounded"):
- One memorable signature element (what makes this design recognizable):
- Do NOT: (e.g. purple gradients on white, default system fonts, cramped layouts, stock card grids)

## 2. Design Tokens (exact values)

### Colors

| Token                                           | Light | Dark | Usage           |
| ----------------------------------------------- | ----- | ---- | --------------- |
| --bg                                            | #...  | #... | page background |
| --surface                                       |       |      | cards           |
| --text                                          |       |      | body text       |
| --text-muted                                    |       |      | secondary text  |
| --primary                                       |       |      | main actions    |
| --accent                                        |       |      | highlights      |
| --success / --warning / --danger                |       |      | status          |
| --border                                        |       |      | dividers        |
| (Check text/background contrast meets WCAG AA.) |

### Typography

| Role                                                           | Font family (+ fallback stack) | Size | Weight | Line height |
| -------------------------------------------------------------- | ------------------------------ | ---- | ------ | ----------- |
| Display                                                        |                                |      |        |             |
| H1 / H2 / H3                                                   |                                |      |        |             |
| Body                                                           |                                |      |        |             |
| Caption / Label                                                |                                |      |        |             |
| Font source (Google Fonts link or local) and loading strategy: |

### Spacing, Radius, Shadow, Layout

- Spacing scale: 4, 8, 12, 16, 24, 32, 48, 64 (px) (adjust if needed)
- Radius: sm / md / lg / full values
- Shadows: sm / md / lg exact CSS
- Container max-width, grid columns, gutters
- Breakpoints: mobile / tablet / desktop (px)

### Motion

- Durations and easing (e.g. 150ms ease-out for hover, 300ms for page transitions)
- Where animation is used, and where it is NOT
- Respect prefers-reduced-motion

## 3. Component Library

For each reusable component (Button, Input, Card, Modal, Nav, Toast, Table, etc.):
| Component | Variants | States (default/hover/focus/active/disabled/loading/error) | Specs (size, padding, radius, colors by token) |

## 4. Screen Designs

### S-01: <Screen name> (matches 03-APP-FLOW.md)

- Layout (describe regions top to bottom; ASCII wireframe encouraged):
```

+---------------------------+
| Header |
+---------------------------+
| Hero (headline + CTA) |
+---------------------------+

```
- Components used (by name):
- Real sample content (actual headlines, labels, numbers; no lorem ipsum):
- Mobile vs desktop differences:
- Empty / loading / error visuals:
(repeat for every screen)

## 5. Interaction and UX Rules
- Feedback for every action (toast, inline message, spinner)
- Form behavior (inline validation timing, focus management)
- Keyboard navigation and focus order
- Touch target minimum size (44px)

## 6. Accessibility Checklist
- Contrast, alt text, aria labels, semantic HTML, focus rings visible

## 7. Assets
| Asset | Type | Source / how to generate |
|-------|------|--------------------------|
(Icons library name, logo, illustrations. Specify only assets that can actually be produced.)
```

## Notes

- Every screen ID in 03-APP-FLOW.md must have an entry in section 4.
- Reference tokens by name in component and screen specs, not raw hex values.
- Pick a deliberate palette and type pairing; avoid the default AI look.
