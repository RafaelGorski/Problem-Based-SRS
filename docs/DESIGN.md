# Design

## Theme

Light. A clean, off-white workspace: an engineer's reference page in daylight. Slightly-cool off-white surface, near-black ink, hairline borders, and a single committed deep indigo for identity. The methodology is about precision and traceability; a calm light canvas keeps the structural elements (the CP → CN → FR chain, the traceability graph, the code examples) legible and uncluttered. The off-white is held near-neutral to read as crisp and professional, not as the warm cream/sand AI default.

The palette is **sampled directly from the SRS Navigator Copilot extension UI**: the primary indigo is the app's "Graph" control, the link accent is its teal, and the four methodology node colors (amber CP, teal CN, indigo FR, purple NFR) match the app's graph. The webpage and the tool share one visual language.

## Color

Strategy: **Committed.** The primary deep indigo carries identity across headers, CTAs, and structural accents on a disciplined off-white field, with a teal accent for links and secondary emphasis. Customer-Problem examples use the amber CP node color so copy and graph speak the same language.

```css
:root {
  /* Primary — deep indigo, sampled from the app's "Graph" control. White text on fill. */
  --primary: oklch(0.45 0.16 266);
  --primary-hover: oklch(0.38 0.16 266);
  --primary-subtle: oklch(0.955 0.022 266);

  /* Background — clean, slightly-cool off-white, matched to the app canvas (#F3F6F8). */
  --bg: oklch(0.975 0.003 240);
  --bg-elevated: oklch(1 0 0);

  /* Surface — faint panels and code blocks, hairline borders. */
  --surface: oklch(0.965 0.004 240);
  --surface-hover: oklch(0.945 0.005 240);
  --surface-border: oklch(0.900 0.006 240);

  /* Ink — near-black text. ≥10:1 (body) / ≥13:1 (headings) vs bg. */
  --ink: oklch(0.30 0.012 264);
  --ink-heading: oklch(0.19 0.018 264);

  /* Accent — teal (sampled from CN nodes), darkened for link contrast. */
  --accent: oklch(0.53 0.10 205);
  --accent-hover: oklch(0.46 0.11 205);

  /* Muted — secondary text. ≥4.5:1 vs bg. */
  --muted: oklch(0.47 0.012 264);
  --muted-light: oklch(0.57 0.012 264);

  /* Semantic — methodology node colors, sampled from the SRS Navigator app. */
  --step-context: oklch(0.52 0.16 305); /* Business Context — plum */
  --step-why: oklch(0.61 0.18 48);      /* CP — amber/orange (#E56200) */
  --step-glance: oklch(0.58 0.10 202);  /* Software Glance — teal (#009BA7) */
  --step-what: oklch(0.58 0.10 202);    /* CN — teal */
  --step-vision: oklch(0.55 0.12 150);  /* Software Vision — green */
  --step-how: oklch(0.56 0.16 266);     /* FR — indigo (#3C68D9) */
  --step-nfr: oklch(0.54 0.15 320);     /* NFR — purple */
}
```

Text on primary/accent fills: white (`--bg-elevated`). Both are mid-luminance saturated colors; white text is the perceptually correct choice. CP example text uses a darkened amber (`oklch(0.48 0.14 50)`) to clear 4.5:1 on its light amber tint.

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
- **Body (Figtree):** Paragraphs, lists, UI text. Weight 400 (body), 500 (emphasis), 600 (labels). Geometric proportions, high x-height for screen readability. Line-height: 1.7 for comfortable reading on the off-white field.
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
White panel surface (`--bg-elevated`), dark mono ink, `--font-mono`, 1px border in `--surface-border`. Syntax highlighting uses the semantic step colors sparingly.

### Command table
Mono font for command names, body font for descriptions. Subtle row separators using `--surface-border`. No heavy borders or zebra striping.

### Methodology flow
Vertical sequence with step indicators using semantic step colors. Each step is a contained block with a color-coded left indicator (narrow, not a full border-left stripe — a 3px vertical rule as part of a larger composed indicator, not as a decorative accent).

### CTA buttons
Primary: `--primary` fill, white text, no border, 8px radius. Hover: `--primary-hover`.
Ghost: transparent, `--ink` text, 1px `--surface-border`, 8px radius. Hover: `--surface` fill.

## Assets

- No stock imagery needed. This is a methodology/documentation brand.
- Diagrams: SVG-based, using the semantic step colors on light backgrounds.
- App showcase: the SRS Navigator screenshot (`assets/srs-navigator.png`) is presented in a browser-chrome frame with a soft shadow.
- Icons: Minimal, monoline, used only for navigation and step indicators.
