# Responsive UI Orchestration Plan

## Goal
Make the app work cleanly on Windows laptops, MacBook, iPad/tablets, and iPhone/Android without flattening the current visual style, motion, or game-first feel.

## Current Findings

### Layout Foundation
- [src/app/globals.css](/mnt/d/fortestdrink/wong-taek-app/src/app/globals.css): `.container-mobile` is hard-locked to `max-w-md`, which keeps every major screen in a phone-sized column even on tablet and laptop.
- [src/app/layout.tsx](/mnt/d/fortestdrink/wong-taek-app/src/app/layout.tsx): the global shell is visually centered, but it does not provide a wider responsive stage for large screens or tablet landscape.

### Fixed Navigation and Safe Areas
- [src/components/ui/BottomNav.tsx](/mnt/d/fortestdrink/wong-taek-app/src/components/ui/BottomNav.tsx): bottom nav is permanently fixed and sized for mobile only; it needs desktop/tablet behavior and better large-screen spacing.
- [src/app/globals.css](/mnt/d/fortestdrink/wong-taek-app/src/app/globals.css): there is a `safe-area-bottom` helper, but usage is inconsistent across pages with fixed footers and bottom action bars.

### Entry and Form Screens
- [src/app/page.tsx](/mnt/d/fortestdrink/wong-taek-app/src/app/page.tsx): hero and selector layout are mobile-first and do not yet scale typography/spacing for tablet and laptop.
- [src/app/create/page.tsx](/mnt/d/fortestdrink/wong-taek-app/src/app/create/page.tsx) and [src/app/join/page.tsx](/mnt/d/fortestdrink/wong-taek-app/src/app/join/page.tsx): fixed bottom action areas are constrained to a phone-width overlay and need a desktop/tablet footer treatment.
- [src/app/login/page.tsx](/mnt/d/fortestdrink/wong-taek-app/src/app/login/page.tsx), [src/app/register/page.tsx](/mnt/d/fortestdrink/wong-taek-app/src/app/register/page.tsx), [src/app/settings/page.tsx](/mnt/d/fortestdrink/wong-taek-app/src/app/settings/page.tsx): forms are usable on mobile, but spacing and width caps need a tablet/laptop pass.

### Lobby and Sheets
- [src/app/lobby/[roomCode]/page.tsx](/mnt/d/fortestdrink/wong-taek-app/src/app/lobby/[roomCode]/page.tsx): uses `h-[100dvh]`, mobile-only player list density, and bottom sheets sized to `max-w-md`; likely to feel cramped on iPad landscape and underused on laptop.

### Game Pages
- [src/app/game/modes/page.tsx](/mnt/d/fortestdrink/wong-taek-app/src/app/game/modes/page.tsx): uses full-screen horizontal cards sized around mobile viewport assumptions; needs tablet/desktop card widths and better large-screen composition.
- [src/app/game/play/page.tsx](/mnt/d/fortestdrink/wong-taek-app/src/app/game/play/page.tsx): header, player token, question card, timer, and dual CTA footer are tightly stacked for phone portrait and need responsive spacing and max widths.
- [src/app/game/truth-or-dare/page.tsx](/mnt/d/fortestdrink/wong-taek-app/src/app/game/truth-or-dare/page.tsx): card height, header density, and footer CTAs are likely to compress badly in short landscape viewports.
- [src/app/game/chaos/page.tsx](/mnt/d/fortestdrink/wong-taek-app/src/app/game/chaos/page.tsx): relies on `h-screen`, strong fixed vertical sequencing, and dense visual chrome; needs orientation-aware spacing.
- [src/app/game/wheel/page.tsx](/mnt/d/fortestdrink/wong-taek-app/src/app/game/wheel/page.tsx): wheel sizing is static; result card and footer need better scaling for tablet and laptop.
- [src/app/game/summary/page.tsx](/mnt/d/fortestdrink/wong-taek-app/src/app/game/summary/page.tsx): summary cards and footer actions are still framed like a phone screen, not a flexible responsive results layout.

## Phase 2 Implementation Plan

### 1. Foundation
- Replace the single-width mobile shell with breakpoint-aware container utilities.
- Add a shared responsive content pattern for phone, tablet, and laptop widths.
- Normalize `min-h-screen` vs `100dvh` usage so Safari/iPad/mobile browser chrome behaves better.

### 2. Shared UI
- Update `Button`, bottom nav, sheets, and repeated card wrappers to scale typography, height, and padding by breakpoint.
- Make fixed footers and bottom action bars work with safe areas on iPhone and with centered width on tablet/laptop.

### 3. Responsive App Screens
- Refactor home, create, join, login, register, settings, profile, history, feedback, and admin shells so they stop pretending every device is a phone.
- Preserve the neon look, but allow larger, calmer spacing and wider content on tablet/laptop.

### 4. Responsive Game Screens
- Re-layout modes, play, truth-or-dare, chaos, wheel, and summary for portrait and landscape.
- Keep animation and drama, but prevent clipping, CTA crowding, and header/footer collisions.

### 5. Verification
- Test widths: 390, 430, 768, 820, 1024, 1280, 1440.
- Test orientations: phone portrait, phone landscape, iPad portrait, iPad landscape.
- Smoke test flow: home -> create/join -> lobby -> modes -> play -> summary.
- Run `git diff --check`.
- Run `npx tsc --noEmit --pretty false --incremental false`.

## Deliverables
- Updated global responsive shell
- Responsive bottom nav and action footers
- Refined entry/lobby/forms for tablet and laptop
- Responsive game pages without removing animations
- Verification notes after implementation
