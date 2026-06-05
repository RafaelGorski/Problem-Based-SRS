# Design

## Theme

Dark. An engineer's focused workspace at night: dark surface, warm signal colors that draw the eye to what matters. The methodology is about precision and clarity; the visual system mirrors that. Dark backgrounds let the structural elements (the CP → CN → FR chain, the traceability diagrams, the code examples) command attention without competing with decorative surface treatment.

## Color

Strategy: **Committed.** The primary crimson carries identity across headers, CTAs, and structural accents. The rest is disciplined dark neutrals with a cool-teal accent for secondary emphasis.

```css
:root {
  /* Primary — warm crimson, the seed anchor. Signal color for identity. */
  --primary: oklch(0.60 0.16 24);
  --primary-hover: oklch(0.55 0.18 24);
  --primary-subtle: oklch(0.25 0.06 24);

  /* Background — near-black, zero chroma. Pure dark stage. */
  --bg: oklch(0.10 0.000 0);
  --bg-elevated: oklch(0.13 0.000 0);

  /* Surface — bg pulled slightly lighter for cards and panels. */
  --surface: oklch(0.16 0.004 24);
  --surface-hover: oklch(0.19 0.005 24);
  --surface-border: oklch(0.22 0.005 24);

  /* Ink — near-white body text. ≥7:1 contrast vs bg. */
  --ink: oklch(0.93 0.000 0);
  --ink-heading: oklch(0.97 0.000 0);

  /* Accent — cool teal, distinct from warm primary in both hue and feel. */
  --accent: oklch(0.72 0.12 190);
  --accent-hover: oklch(0.67 0.14 190);
  --accent-subtle: oklch(0.22 0.04 190);

  /* Muted — secondary text. Ink pulled 40% toward bg. ≥3.5:1 vs bg. */
  --muted: oklch(0.60 0.000 0);
  --muted-light: oklch(0.50 0.000 0);

  /* Semantic — methodology step colors (used sparingly in diagrams). */
  --step-why: oklch(0.62 0.18 25);     /* CP — crimson/warm, aligns with primary */
  --step-glance: oklch(0.68 0.12 175); /* Software Glance — teal */
  --step-what: oklch(0.65 0.10 230);   /* CN — steel blue */
  --step-vision: oklch(0.66 0.10 155); /* Software Vision — muted green */
  --step-how: oklch(0.75 0.12 85);     /* FR — warm amber */
  --step-context: oklch(0.60 0.10 310); /* Business Context — muted plum */
}
```

Text on primary/accent fills: white (`--ink-heading`). Both are mid-luminance saturated colors; white text is the perceptually correct choice.

## Typography

```css
:root {
  --font-display: 'Bricolage Grotesque', system-ui, sans-serif;
  --font-body: 'Figtree', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', 'Cascadia Code', monospace;

  /* Scale — 1.25 ratio (Major Third), fluid clamp */
  --text-xs: clamp(0.75rem, 0.7rem + 0.15vw, 0.8rem);
  --text-sm: clamp(0.825rem, 0.78rem + 0.2vw, 0.9rem);
  --text-base: clamp(0.95rem, 0.88rem + 0.25vw, 1.05rem);
  --text-lg: clamp(1.125rem, 1rem + 0.4vw, 1.3rem);
  --text-xl: clamp(1.4rem, 1.2rem + 0.6vw, 1.65rem);
  --text-2xl: clamp(1.75rem, 1.4rem + 1vw, 2.1rem);
  --text-3xl: clamp(2.2rem, 1.7rem + 1.5vw, 2.8rem);
  --text-4xl: clamp(2.8rem, 2rem + 2.2vw, 3.6rem);
  --text-hero: clamp(3.2rem, 2.2rem + 3vw, 5rem);
}
```

- **Display (Bricolage Grotesque):** Headers h1–h3. Weight 700. Angular terminals give it a technical, engineered quality without being cold. Letter-spacing: -0.02em on display sizes.
- **Body (Figtree):** Paragraphs, lists, UI text. Weight 400 (body), 500 (emphasis), 600 (labels). Geometric proportions, high x-height for screen readability. Line-height: 1.7 for body on dark bg (extra breathing room for light-on-dark).
- **Mono (JetBrains Mono):** Code blocks, command references, file paths. Weight 400. Used in the commands table and installation instructions.

Cap body line-length at 68ch. Use `text-wrap: balance` on h1–h3.

## Spacing

```css
:root {
  --space-xs: clamp(0.25rem, 0.2rem + 0.15vw, 0.375rem);
  --space-sm: clamp(0.5rem, 0.4rem + 0.3vw, 0.75rem);
  --space-md: clamp(1rem, 0.8rem + 0.6vw, 1.5rem);
  --space-lg: clamp(1.5rem, 1.2rem + 1vw, 2.5rem);
  --space-xl: clamp(2.5rem, 1.8rem + 2vw, 4rem);
  --space-2xl: clamp(4rem, 2.8rem + 3.5vw, 6.5rem);
  --space-section: clamp(5rem, 3.5rem + 4.5vw, 9rem);
}
```

Vary spacing for rhythm. Section breaks use `--space-section`. Related content groups use `--space-lg`. Intra-component gaps use `--space-sm` to `--space-md`.

## Layout

- Max content width: 1120px, centered.
- Asymmetric compositions where emphasis is needed (hero, methodology flow).
- Responsive grids: `repeat(auto-fit, minmax(280px, 1fr))` where grids are appropriate.
- No nested cards. Cards only when content genuinely benefits from containment.
- Flexbox for 1D sequences (nav, step flow), Grid for 2D compositions (feature comparisons).

## Motion

- Entrance reveals: opacity + translateY(12px), 400ms ease-out-quart, staggered 60ms per item within a group.
- Hover transitions: 200ms ease-out on color/background changes.
- Scroll-triggered reveals for methodology steps (each step fades in as it enters viewport).
- `@media (prefers-reduced-motion: reduce)`: all animations replaced with instant crossfade or removed entirely.

## Components

### Code blocks
Dark surface (`--bg-elevated`), `--font-mono`, 1px border in `--surface-border`. Syntax highlighting uses the semantic step colors sparingly.

### Command table
Mono font for command names, body font for descriptions. Subtle row separators using `--surface-border`. No heavy borders or zebra striping.

### Methodology flow
Vertical sequence with step indicators using semantic step colors. Each step is a contained block with a color-coded left indicator (narrow, not a full border-left stripe — a 3px vertical rule as part of a larger composed indicator, not as a decorative accent).

### CTA buttons
Primary: `--primary` fill, white text, no border, 8px radius. Hover: `--primary-hover`.
Ghost: transparent, `--ink` text, 1px `--surface-border`, 8px radius. Hover: `--surface` fill.

## Assets

- No stock imagery needed. This is a methodology/documentation brand.
- Diagrams: SVG-based, using the semantic step colors on dark backgrounds.
- Icons: Minimal, monoline, used only for navigation and step indicators.
