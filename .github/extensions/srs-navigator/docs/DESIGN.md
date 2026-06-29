---
name: SRS Navigator
description: Interactive force-directed graph visualization for Problem-Based SRS specifications
colors:
  primary: "oklch(0.35 0.12 265)"
  primary-foreground: "oklch(0.98 0 0)"
  accent: "oklch(0.55 0.15 200)"
  node-problem: "oklch(0.65 0.19 50)"
  node-problem-stroke: "oklch(0.55 0.19 50)"
  node-need: "oklch(0.60 0.15 200)"
  node-need-stroke: "oklch(0.50 0.15 200)"
  node-fr: "oklch(0.55 0.18 265)"
  node-fr-stroke: "oklch(0.45 0.18 265)"
  node-nfr: "oklch(0.68 0.15 330)"
  node-nfr-stroke: "oklch(0.58 0.15 330)"
  background: "oklch(0.98 0 0)"
  card: "oklch(1 0 0)"
  foreground: "oklch(0.15 0.02 240)"
  secondary: "oklch(0.45 0.02 240)"
  muted: "oklch(0.75 0.01 240)"
  muted-foreground: "oklch(0.40 0.02 240)"
  border: "oklch(0.87 0.01 240)"
  hover: "oklch(0.95 0.005 240)"
  demo-badge-bg: "oklch(0.85 0.12 80)"
  demo-badge-text: "oklch(0.35 0.12 80)"
typography:
  display:
    fontFamily: "Space Grotesk, system-ui, -apple-system, sans-serif"
    fontSize: "22px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Space Grotesk, system-ui, -apple-system, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.65
  label:
    fontFamily: "Space Grotesk, system-ui, -apple-system, sans-serif"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: 1.3
  mono:
    fontFamily: "JetBrains Mono, ui-monospace, monospace"
    fontSize: "12px"
    fontWeight: 600
    lineHeight: 1.4
rounded:
  sm: "6px"
  md: "8px"
  lg: "12px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  2xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.md}"
    padding: "6px 12px"
  button-primary-hover:
    backgroundColor: "{colors.primary}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    padding: "6px 12px"
  button-ghost-hover:
    backgroundColor: "{colors.hover}"
  button-icon:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    padding: "0"
    size: "34px"
  search-input:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    padding: "6px 8px 6px 32px"
    height: "34px"
  spec-card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    padding: "16px"
---

# Design System: SRS Navigator

## 1. Overview

**Creative North Star: "The Specification Cockpit"**

An instrument-panel aesthetic for engineers who need to trust their readings. Every element earns its space through utility — nodes encode meaning through shape and color, connections reveal dependency at a glance, and the detail panel delivers data with zero ceremony. The system rejects decoration in favor of density-appropriate clarity: a tool that disappears into the task of understanding requirement traceability.

The palette moves from warm problem hues cooling toward technical implementation (ember → teal → indigo → rose), mirroring the intellectual journey from "what hurts" to "how we solve it." The UI chrome is deliberately neutral — cool-tinted near-white surfaces that never compete with the graph's semantic color.

This system explicitly rejects overly decorated dashboards, marketing-style data visualizations, toy graph explorers with bounce animations, and dark "hacker" aesthetics. It opts instead for the quiet authority of a well-calibrated instrument.

**Key Characteristics:**
- Instrument-grade density — high information content without clutter
- Semantic color as primary encoding — hue carries meaning, not decoration
- Single-family typography in two weights — geometric sans for UI, monospace for identifiers
- Flat canvas with elevated panels — depth only where interaction demands it
- Restrained motion — state feedback only, never choreography

## 2. Colors

Warm problem hues cooling toward technical implementation (ember → teal → indigo → rose). The four node colors are the system's signature; everything else recedes.

### Primary
- **Deep Indigo** (oklch(0.35 0.12 265)): Primary action color — active states, selected tabs, focus rings. Used sparingly (≤5% of surface) so it commands attention when it appears.
- **Analytical Teal** (oklch(0.55 0.15 200)): Accent for focus rings, selection highlights, and the Need node type. The system's secondary voice.

### Semantic (Node Colors)
- **Ember** (oklch(0.65 0.19 50)): Customer Problem nodes. Warm and urgent — signals "this is the pain point."
- **Teal** (oklch(0.60 0.15 200)): Customer Need nodes. Cool and purposeful — "what users require."
- **Indigo** (oklch(0.55 0.18 265)): Functional Requirements. Deep technical — "what the system does."
- **Rose** (oklch(0.68 0.15 330)): Non-Functional Requirements. Measured constraint — "how well it must perform."

### Neutral
- **Background** (oklch(0.98 0 0)): Page surface. Pure achromatic near-white.
- **Card** (oklch(1 0 0)): Elevated surfaces (toolbar, panels, modals). True white.
- **Foreground** (oklch(0.15 0.02 240)): Primary text. Near-black with a cool cast.
- **Muted** (oklch(0.40 0.02 240)): Secondary text, labels, metadata.
- **Border** (oklch(0.87 0.01 240)): Structural dividers. Subtle, never heavy.

### Named Rules
**The Four-Color Authority Rule.** The four node colors are the only saturated hues on the canvas. No other element may use chroma above 0.05 except these four and the primary action color. Their rarity is their meaning.

## 3. Typography

**Body Font:** Space Grotesk (with system-ui, -apple-system, sans-serif fallback)
**Mono Font:** JetBrains Mono (with ui-monospace, monospace fallback)

**Character:** Geometric precision meets technical readability. Space Grotesk carries the UI — its squared terminals and open apertures read clearly at small sizes without feeling clinical. JetBrains Mono handles identifiers (CP-1, FR-3, NFR-2) where character distinction matters.

### Hierarchy
- **Display** (700, 22px, 1.2): Page title only. One instance per view.
- **Title** (700, 20px, 1.3): Node title in detail panel. text-wrap: balance.
- **Body** (400, 14px, 1.65): Description text in detail panel. Maximum 65ch.
- **Label** (500, 13px, 1.3): Buttons, tabs, search, metadata. The workhorse size.
- **Mono Label** (600, 12px, 1.4): Node IDs, code references, connection badges.
- **Caption** (600, 11-12px, uppercase 0.04-0.06em tracking): Section headers in detail panel. Uppercase + tracking for structural hierarchy, not decoration.

### Named Rules
**The Two-Family Rule.** Only Space Grotesk and JetBrains Mono. No additional typefaces. Weight variation (400/500/600/700) handles hierarchy within each family.

## 4. Elevation

Hybrid: flat canvas with shadows reserved for elevated panels and modal overlays. The graph surface is rendered flat — nodes rely on color fills and stroke contrast rather than shadow for depth. When UI elements detach from the surface (detail panel, zoom controls, modal, toast), a directional shadow signals elevation.

### Shadow Vocabulary
- **Ambient Low** (`0 2px 8px oklch(0 0 0 / 0.06)`): Zoom control cluster. Subtle presence without weight.
- **Panel** (`-4px 0 24px oklch(0 0 0 / 0.06)`): Detail panel sliding in from right. Directional shadow matching motion origin.
- **Modal** (`0 16px 48px oklch(0 0 0 / 0.15), 0 0 0 1px var(--border)`): Load Specification modal. Strong separation from content.
- **Toast** (`0 4px 16px oklch(0 0 0 / 0.1)`): Notification toasts. Light lift.
- **Button Active** (`0 1px 3px oklch(0 0 0 / 0.08)`): Active button in segmented control. Micro-elevation for "selected" state.

### Named Rules
**The Flat-Canvas Rule.** The graph area itself is shadowless. Depth in the visualization comes from color, opacity, and stroke — never box-shadow. Shadows exist only on chrome that overlays the canvas.

## 5. Components

### Buttons
- **Shape:** Gently curved edges (8px radius, `var(--radius)`)
- **Primary (active state):** Deep Indigo fill, white text, 1px border matching fill. Used in segmented controls for current selection.
- **Ghost:** Transparent background, foreground text, 1px border. Standard interactive button.
- **Hover:** Background shifts to `var(--hover)` (near-white). Subtle, not dramatic.
- **Focus:** 2px solid accent outline, 2px offset. Standard focus ring.
- **Icon Button:** 34×34px square, centered icon, same border and radius as ghost.
- **Segmented Control (btn-group):** Pill container with 3px padding, slightly recessed background (oklch(0.97 0 0)). Active item gets white background + micro-shadow.

### Search Input
- **Style:** 34px height, left-aligned icon, 1px border, 8px radius. Quiet until focused.
- **Focus:** Border shifts to accent color, 3px spread ring at 15% opacity. Clear "you're here" signal.
- **Placeholder:** Muted foreground color, "Search nodes…"

### Detail Panel
- **Structure:** 360px wide, right-anchored, full-height. Slides in with translateX + opacity transition (250ms cubic-bezier).
- **Header:** Section title (uppercase 14px), close button (28px, 6px radius).
- **Body:** Scrollable, 24px padding. Node badge (pill, node color fill, white text + icon), node ID in mono, title at 20px/700, description in body text.
- **Connections:** Small colored badges in JetBrains Mono with 1.5px colored border, clickable for navigation.

### Modal (Load Specification)
- **Overlay:** Fixed inset, black at 40% opacity, 2px blur. Centers content.
- **Container:** White, 12px radius, 90% width max 540px, entrance animation (translateY 8px + scale 0.98 → normal, 200ms ease-out).
- **Tabs:** Bottom-bordered, active tab shows 2px primary underline.
- **Spec Card:** 1px border, 8px radius, 16px padding. Hover lightens background. "Current" variant shows accent border + tinted background.

### Toast
- **Position:** Fixed bottom-right, 24px inset.
- **Style:** White card, 1px border, 8px radius, shadow. Enters from below (translateY 100px → 0, 300ms ease-out).
- **Content:** Icon (green checkmark) + 13px/500 text.

### Node (Graph)
- **Plate:** White rect with 1.5px colored border (node type color). SVG shadow filter for micro-elevation.
- **Content:** Centered type icon (28px, colored via currentColor) + ID text (JetBrains Mono 11px) + truncated label (Space Grotesk 10px).
- **Hover:** brightness(1.04) filter.
- **Links:** Dashed lines (5,5 dasharray), 1.5px stroke, 35% opacity. Neutral hue.

## 6. Do's and Don'ts

### Do:
- **Do** use the four semantic node colors exclusively for their assigned node types — never repurpose Ember for a warning or Rose for an error.
- **Do** keep all interactive elements at 34px minimum height for touch and click targets.
- **Do** use JetBrains Mono for any identifier-like content (node IDs, file paths, JSON keys) and Space Grotesk for everything else.
- **Do** provide `prefers-reduced-motion` alternatives that collapse all animations to instant.
- **Do** test every text element against its background for 4.5:1 contrast minimum.
- **Do** use the shadow vocabulary exactly as specified — ambient-low for small floating controls, panel for slide-in surfaces, modal for dialogs.

### Don't:
- **Don't** use dark mode, neon accents, or high-contrast hacker aesthetics — this tool runs in a professional engineering workflow, not a demo reel.
- **Don't** add bounce, elastic, or spring animations. Motion is 150–250ms ease-out, period.
- **Don't** introduce gradients on interactive elements. Flat fills only.
- **Don't** use shadows on in-canvas graph elements (nodes, links, hulls). The Flat-Canvas Rule is absolute.
- **Don't** add decorative motion sequences on load. The tool boots into a ready state immediately.
- **Don't** use marketing-style vanity metrics (big numbers, decorative stat cards). Every data point serves traceability, not impressiveness.
- **Don't** reinvent standard form controls or navigation patterns. Buttons, inputs, tabs, and modals follow platform conventions.
