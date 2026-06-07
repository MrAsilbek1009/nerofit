---
name: design-system
description: Kinetic Editorial design tokens and component patterns for the KINETIC fitness app. Load whenever building, styling, or reviewing any UI — screens, components, or visual changes. Ensures every screen matches the true-black + chartreuse editorial look.
---

# Kinetic Editorial — Design System

Apply this whenever you create or modify UI. Pull values from
`src/theme/tokens.ts`; never hardcode.

## Tokens
- Background (canvas): `#000000` true black.
- Surface: `#0E0E0E`. Elevated (cards / active): `#1A1A1A`.
- Accent: `#D4E924` chartreuse — used SPARINGLY (see discipline below).
- Text high: `#FFFFFF`. Text low (muted): `#8A8A8A`. Border: `#1F1F1F`.
- Radii: sm 8, md 16, pill 999. Spacing scale: 4 / 8 / 12 / 16 / 24 / 32 / 48.

## Typography
- Headings/display: **Hanken Grotesk**, bold, large, editorial. Strong size
  contrast against body.
- Body/labels: **Inter**.
- Label-caps: Inter, uppercase, letter-spaced, small, muted.

## Accent discipline (most important rule)
Chartreuse appears ONLY on: primary button, active bottom-nav item, progress
ring/line strokes, selected chip, and "See All" links. Everything else is
white + gray on true black. No glow effects. No gradients on cards. No colored
hero blocks. If a screen looks colorful, you've overused the accent.

## Layout principles
- Generous negative space; let content breathe.
- Photography is the hero on workout/program cards (full-bleed, title overlay).
- Surfaces are borderless on near-black; avoid heavy outlined boxes.
- Pill-shaped buttons and chips.

## Core primitives (compose everything from these)
`Button` (primary pill = chartreuse bg / black text; secondary = outlined),
`Card` (elevated, borderless), `Chip` (pill, selectable → chartreuse when
selected), `ProgressRing`, `ProgressLine`, `StatRow` (number + label-caps),
`SectionHeader` (title + optional chartreuse "See All"), `Avatar`, `VideoCard`.

## Checklist before finishing a UI task
- [ ] Colors/spacing/radii come from theme tokens, not literals.
- [ ] Accent discipline respected.
- [ ] Headings use Hanken Grotesk; body uses Inter.
- [ ] Loading / empty / error states present for data screens.
- [ ] Text uses i18n keys (UZ/RU/EN), not hardcoded strings.
