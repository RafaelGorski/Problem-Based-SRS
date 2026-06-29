---
name: Problem-Based SRS
description: An AI-guided requirements engineering methodology, and the reference page that teaches it.
colors:
  primary: "oklch(0.45 0.16 266)"
  primary-hover: "oklch(0.38 0.16 266)"
  primary-deep: "oklch(0.30 0.12 266)"
  primary-subtle: "oklch(0.955 0.022 266)"
  on-primary: "oklch(0.99 0 0)"
  accent: "oklch(0.53 0.10 205)"
  accent-hover: "oklch(0.46 0.11 205)"
  bg: "oklch(0.975 0.003 240)"
  bg-elevated: "oklch(1 0 0)"
  surface: "oklch(0.965 0.004 240)"
  surface-hover: "oklch(0.945 0.005 240)"
  surface-border: "oklch(0.900 0.006 240)"
  ink: "oklch(0.30 0.012 264)"
  ink-heading: "oklch(0.19 0.018 264)"
  muted: "oklch(0.47 0.012 264)"
  muted-light: "oklch(0.57 0.012 264)"
  cp-bold: "oklch(0.55 0.17 50)"
  step-context: "oklch(0.52 0.16 305)"
  step-why: "oklch(0.61 0.18 48)"
  step-glance: "oklch(0.58 0.10 202)"
  step-what: "oklch(0.58 0.10 202)"
  step-vision: "oklch(0.55 0.12 150)"
  step-how: "oklch(0.56 0.16 266)"
  step-nfr: "oklch(0.54 0.15 320)"
typography:
  display:
    fontFamily: "Bricolage Grotesque, system-ui, sans-serif"
    fontSize: "clamp(3.2rem, 2.2rem + 3vw, 5rem)"
    fontWeight: 800
    lineHeight: 1.04
    letterSpacing: "-0.03em"
  headline:
    fontFamily: "Bricolage Grotesque, system-ui, sans-serif"
    fontSize: "clamp(2.2rem, 1.7rem + 1.5vw, 2.8rem)"
    fontWeight: 800
    lineHeight: 1.1
    letterSpacing: "-0.03em"
  title:
    fontFamily: "Bricolage Grotesque, system-ui, sans-serif"
    fontSize: "clamp(1.4rem, 1.2rem + 0.6vw, 1.65rem)"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Figtree, system-ui, sans-serif"
    fontSize: "clamp(0.95rem, 0.88rem + 0.25vw, 1.05rem)"
    fontWeight: 400
    lineHeight: 1.7
    letterSpacing: "normal"
  label:
    fontFamily: "JetBrains Mono, Cascadia Code, monospace"
    fontSize: "clamp(0.75rem, 0.7rem + 0.15vw, 0.8rem)"
    fontWeight: 400
    lineHeight: 1.35
    letterSpacing: "0.01em"
rounded:
  xs: "4px"
  sm: "6px"
  md: "8px"
  lg: "10px"
  xl: "14px"
  pill: "999px"
spacing:
  xs: "clamp(0.25rem, 0.2rem + 0.15vw, 0.375rem)"
  sm: "clamp(0.5rem, 0.4rem + 0.3vw, 0.75rem)"
  md: "clamp(1rem, 0.8rem + 0.6vw, 1.5rem)"
  lg: "clamp(1.5rem, 1.2rem + 1vw, 2.5rem)"
  xl: "clamp(2.5rem, 1.8rem + 2vw, 4rem)"
  2xl: "clamp(4rem, 2.8rem + 3.5vw, 6.5rem)"
  section: "clamp(5rem, 3.5rem + 4.5vw, 9rem)"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "0.75em 1.5em"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
    textColor: "{colors.on-primary}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "0.75em 1.5em"
  button-ghost-hover:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
  version-badge:
    backgroundColor: "{colors.primary-subtle}"
    textColor: "{colors.primary}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "0.18em 0.62em"
  hero-badge:
    backgroundColor: "transparent"
    textColor: "{colors.muted}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "0.3em 0.8em"
  code-inline:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink-heading}"
    typography: "{typography.label}"
    rounded: "{rounded.xs}"
    padding: "0.15em 0.4em"
---

# Design System: Problem-Based SRS

## 1. Overview

**Creative North Star: "The Engineer's Daylight Reference"**

This is the visual system of a methodology that insists on evidence before code. It reads like a senior engineer's reference page open on a second monitor at midday: a calm, slightly-cool off-white field, near-black ink, hairline borders, and a single committed deep indigo carrying identity. Nothing decorative competes with the one thing that matters, the traceability chain (Customer Problem → Customer Need → Functional Requirement). The palette and node colors are sampled directly from the SRS Navigator Copilot extension, so the page and the tool speak one visual language.

Density is deliberate and varied: tight where structure benefits from proximity (the methodology timeline, the commands table), spacious where the reader needs room to breathe (section breaks, the hero). Asymmetry is used for emphasis, not symmetry for safety. The page rewards scrolling because each section either teaches something or moves the reader toward installation; there is no filler.

It explicitly rejects the template look: Bootstrap card grids, purple gradients, rounded-pill buttons with no voice, CRUD-table-as-landing-page, generic SaaS hero-metric blocks, and "supercharge your workflow" marketing copy. Confidence is earned by showing a real before/after requirements session, not by superlatives. The off-white is held near-neutral (chroma ~0.003) so it reads as crisp and professional, never as the warm cream/sand AI default.

**Key Characteristics:**
- Committed deep-indigo identity on a disciplined cool off-white field
- Tokens and node colors sampled from the SRS Navigator app for one shared language
- Structure-first information architecture mirroring the CP → CN → FR chain
- Varied spacing for rhythm; asymmetry only where it creates emphasis
- WCAG AA throughout; OKLCH color doctrine end to end

## 2. Colors

A committed deep-indigo identity on a near-neutral cool off-white, with a darkened teal for links and seven sampled methodology node hues that let prose and graph speak the same language.

### Primary
- **Graph Indigo** (`oklch(0.45 0.16 266)`): The brand's load-bearing color. Carries headers' brand mark, primary CTA fills, the version badge, focus rings, and structural accents. Hover deepens to `oklch(0.38 0.16 266)`. Text on the fill is near-white (`--on-primary`).
- **Drenched Indigo** (`oklch(0.30 0.12 266)`): The closing CTA panel surface, the one drenched moment on the page. Body text on it uses light tints (`--on-deep-muted`) at ≥7.9:1.

### Secondary
- **CN Teal** (`oklch(0.53 0.10 205)`): Link and secondary-emphasis accent, sampled from the app's Customer-Need nodes and darkened for AA link contrast. Hover: `oklch(0.46 0.11 205)`.

### Tertiary
- **CP Amber** (`oklch(0.55 0.17 50)`): The committed color moment, used for the hero's "problem" word and Customer-Problem example copy (a darkened `oklch(0.48 0.14 50)` on a 10% amber tint clears 4.5:1). It is the page's emotional anchor, the thing the methodology starts from.

### Neutral
- **Daylight Off-White** (`oklch(0.975 0.003 240)`): Body background. Cool, near-neutral; crisp not creamy.
- **Elevated White** (`oklch(1 0 0)`): Code blocks, the app-frame surface.
- **Panel Surface** (`oklch(0.965 0.004 240)`): Faint panels, inline code, quote blocks. Hover: `oklch(0.945 0.005 240)`.
- **Hairline Border** (`oklch(0.900 0.006 240)`): All borders and dividers; 1px only.
- **Ink** (`oklch(0.30 0.012 264)`): Body text, ≥10:1 on bg.
- **Heading Ink** (`oklch(0.19 0.018 264)`): Headings, ≥13:1 on bg.
- **Muted** (`oklch(0.47 0.012 264)`): Secondary text, ≥4.5:1 on bg. Lighter step `oklch(0.57 0.012 264)` for non-text UI only.

### Methodology Node Palette (semantic, sampled from SRS Navigator)
- **Business Context** plum `oklch(0.52 0.16 305)` · **Customer Problem** amber `oklch(0.61 0.18 48)` · **Software Glance** teal `oklch(0.58 0.10 202)` · **Customer Need** teal `oklch(0.58 0.10 202)` · **Software Vision** green `oklch(0.55 0.12 150)` · **Functional Requirement** indigo `oklch(0.56 0.16 266)` · **Non-Functional Requirement** purple `oklch(0.54 0.15 320)`. Used as step indicators and graph nodes; copy that references a step borrows its hue.

### Named Rules
**The Shared-Language Rule.** Methodology colors are sampled from the SRS Navigator app, never re-picked. When the app's graph changes a node hue, the page follows. The page and the tool must never disagree on what "a Customer Problem" looks like.

**The Cool-Neutral Rule.** The off-white field stays at chroma ~0.003 toward blue, never warmed toward cream/sand/paper. Warmth enters only through CP Amber, deliberately and sparingly.

## 3. Typography

**Display Font:** Bricolage Grotesque (with system-ui, sans-serif)
**Body Font:** Figtree (with system-ui, sans-serif)
**Label/Mono Font:** JetBrains Mono (with Cascadia Code, monospace)

**Character:** Bricolage's angular terminals give headings a technical, engineered quality without being cold; Figtree's high x-height keeps long-form reading comfortable on the off-white field; JetBrains Mono carries every command, file path, and requirement ID so the methodology's machinery is always legible. Three families, one for each job, no indecision.

### Hierarchy
- **Display** (Bricolage Grotesque 800, 3.2–5rem fluid, line-height 1.04, -0.03em): The hero h1 only. Capped at 5rem; loud but not shouting.
- **Headline** (Bricolage Grotesque 800, 2.2–2.8rem fluid, line-height 1.1, -0.03em): Section h2. Uses text-wrap balance for even lines.
- **Title** (Bricolage Grotesque 700, 1.4–1.65rem fluid, line-height 1.25, -0.02em): Subsection h3.
- **Body** (Figtree 400, 0.95–1.05rem fluid, line-height 1.7): Paragraphs and lists. Max line length 68ch. Emphasis at 500, labels at 600.
- **Label** (JetBrains Mono 400, 0.75–0.8rem fluid, 0.01em tracking): Version badge, app-frame title, eyebrow metadata.

### Named Rules
**The Three-Job Rule.** One family per job: Bricolage displays, Figtree reads, JetBrains Mono encodes. Never mix mono into prose for "technical flavor"; the methodology is technical enough on its own.

## 4. Elevation

The system is flat by default. Depth comes from tonal layering (off-white bg → panel surface → elevated white) and 1px hairline borders, not from shadows. The single exception is the app-frame screenshot, which earns a soft composed shadow to read as a real window floating above the page. There are no hover-lift shadows on cards or buttons; state is communicated by background and color shifts.

### Shadow Vocabulary
- **App-frame float** (`box-shadow: 0 2px 4px oklch(0.2 0.02 264 / 0.05), 0 20px 44px oklch(0.42 0.05 25 / 0.12)`): The only intentional shadow. Layers a tight contact shadow over a wide diffuse one to lift the SRS Navigator screenshot.

### Named Rules
**The Flat-By-Default Rule.** Surfaces are flat at rest and separated by tone + hairline border. A shadow appears only on the app-frame; never pair a 1px border with a soft drop shadow on the same card or button.

## 5. Components

### Buttons
- **Shape:** Gently rounded, `border-radius: 8px` (`{rounded.md}`). Never pill-shaped for actions, never above 14px.
- **Primary:** `--primary` fill, `--on-primary` near-white text, no border, padding `0.75em 1.5em`. Hover deepens fill to `--primary-hover` (200ms ease). Icons inline at 0.5em gap.
- **Ghost:** Transparent fill, `--ink` text, 1px `--surface-border`. Hover fills `--surface` and shifts the border to `--muted-light`.
- **Focus:** 2px solid focus ring in the relevant brand/accent color, 2px offset.

### Badges & Chips
- **Version badge:** Mono label, `--primary` text on `--primary-subtle`, 1px primary-tinted border, pill radius. Hover inverts to filled `--primary` with near-white text.
- **Hero badge:** Mono-scale muted text, transparent fill, 1px `--surface-border`, pill radius. Static metadata, no hover.

### Cards / Containers
- **Corner Style:** 10px (`{rounded.lg}`) for content panels (problem-before, link cards); 14px (`{rounded.xl}`) for the app-frame only.
- **Background:** `--surface` for panels, `--bg-elevated` for code/app-frame.
- **Shadow Strategy:** None, except the app-frame (see Elevation).
- **Border:** 1px `--surface-border`. No side-stripe accents.
- **Internal Padding:** `--space-lg` for panels.

### Code
- **Inline:** `--font-mono` at 0.9em, `--ink-heading` on `--surface`, 1px `--surface-border`, 4px radius, `0.15em 0.4em` padding.
- **Block (`pre`):** `--bg-elevated` surface, 1px `--surface-border`, 8px radius, `--space-md` padding, horizontal scroll. Methodology node colors used for syntax accents sparingly.

### Navigation
- **Style:** Sticky top bar, translucent `--bg` at 82% with `backdrop-filter: blur(12px)`, 1px bottom hairline. Brand mark in Bricolage with the second word in `--primary`.
- **Links:** Figtree 500 at `--text-sm`, `--muted` default → `--ink` on hover (200ms). Min 24px hit target.

### Methodology Flow (signature component)
A vertical timeline: a 2px `--surface-border` rail with a 16px color-coded dot per step (`--dot-color` set to the semantic node hue). Each step composes a colored indicator with a title and body, never a decorative `border-left` stripe. This is the page made of the methodology it teaches.

## 6. Do's and Don'ts

### Do:
- **Do** sample methodology and node colors from the SRS Navigator app; keep the page and tool in one visual language.
- **Do** keep the body field cool off-white at chroma ~0.003; carry warmth only through CP Amber, sparingly.
- **Do** verify AA contrast: body ink ≥4.5:1, the CP-amber example uses `oklch(0.48 0.14 50)` to clear it on its tint.
- **Do** use one family per job (Bricolage display, Figtree body, JetBrains Mono code).
- **Do** cap the hero at `--text-hero` (5rem) and keep display letter-spacing at -0.03em.
- **Do** keep surfaces flat, separated by tone and 1px hairline borders; reserve the one shadow for the app-frame.
- **Do** vary spacing for rhythm using the `--space-*` scale; `--space-section` for section breaks.
- **Do** provide `@media (prefers-reduced-motion: reduce)` alternatives for every reveal and hover-lift.

### Don't:
- **Don't** warm the background toward cream/sand/paper; the cool off-white is the point.
- **Don't** use Bootstrap-template card grids, purple gradients, or rounded-pill action buttons with no voice.
- **Don't** dress a table of content as a landing page (CRUD/list catalog look).
- **Don't** ship generic SaaS marketing: hero-metric templates, identical testimonial cards, "supercharge your workflow" copy.
- **Don't** use any layout that looks like a template with color swaps.
- **Don't** add `border-left`/`border-right` colored stripes on the flow steps or cards; compose a dot + indicator instead.
- **Don't** pair a 1px border with a soft drop shadow on the same card or button.
- **Don't** mix mono into prose for "technical flavor"; reserve JetBrains Mono for commands, paths, and IDs.
- **Don't** round action buttons or cards above 14px.
