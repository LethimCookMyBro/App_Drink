---
name: Wong Taek
colors:
  primary: "#C73DF5"
  primary-glow: "rgba(199, 61, 245, 0.6)"
  background: "#0D0D0D"
  surface: "#1A1A1A"
  card: "#1E1E1E"
  text: "#FFFFFF"
  text-muted: "rgba(255, 255, 255, 0.6)"
  neon-red: "#FF0040"
  neon-green: "#80FF00"
  neon-blue: "#00F0FF"
  neon-yellow: "#FBFF00"
  neon-purple: "#C73DF5"
typography:
  display:
    fontFamily: "\"Kanit\", \"Space Grotesk\", sans-serif"
    fontWeight: "700"
  body:
    fontFamily: "\"Kanit\", sans-serif"
    fontWeight: "400"
rounded:
  default: 0.5rem
  lg: 1rem
  xl: 1.5rem
  2xl: 2rem
  full: 9999px
spacing:
  unit: 8px
  safe-padding: 16px
  card-padding: 20px
components:
  glass-panel:
    backgroundColor: "rgba(255, 255, 255, 0.03)"
    backdropFilter: "blur(12px)"
    borderColor: "rgba(255, 255, 255, 0.05)"
    rounded: "{rounded.2xl}"
    padding: "{spacing.card-padding}"
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.text}"
    typography: "{typography.display}"
    rounded: "{rounded.2xl}"
    boxShadow: "0 0 20px rgba(199, 61, 245, 0.5), 0 0 40px rgba(199, 61, 245, 0.2)"
  button-neon-blue:
    backgroundColor: transparent
    borderColor: "{colors.neon-blue}"
    textColor: "{colors.neon-blue}"
    typography: "{typography.display}"
    rounded: "{rounded.lg}"
    boxShadow: "0 0 15px rgba(0, 255, 255, 0.4), inset 0 0 10px rgba(0, 255, 255, 0.1)"
  input-neon:
    backgroundColor: "rgba(255, 255, 255, 0.05)"
    textColor: "{colors.text}"
    borderColor: "rgba(199, 61, 245, 0.5)"
    rounded: "{rounded.xl}"
    padding: 16px
---

## Brand & Style

Wong Taek (วงแตก) employs a high-energy, Cyberpunk Neon design aesthetic. The visual identity aims to create a highly engaging, party-game atmosphere that feels electric and alive. It balances dark, deep backgrounds with high-contrast, hyper-saturated neon glows.

The core interface relies heavily on dark surfaces layered with subtle translucency (glassmorphism) to let underlying atmospheric effects (like radial smoke gradients and CRT noise) bleed through. Interactive elements physically respond and pulse with light, giving users a highly tactile and immersive digital experience.

## Colors

The color palette thrives on stark contrast. The dark backgrounds act as a canvas for intensely bright neon accents that guide the user's attention and communicate game state.

- **Primary Canvas:** Deep blacks (`#0D0D0D`) and dark charcoals (`#1A1A1A`) dominate the background, preventing eye strain while making the neon colors "pop."
- **Primary Brand:** Neon Purple (`#C73DF5`) serves as the core brand color, used heavily in primary actions, loading states, and core branding elements.
- **Neon Accents:** Bright cyan (`#00F0FF`), toxic green (`#80FF00`), hazard red (`#FF0040`), and electric yellow (`#FBFF00`) are used semantically for success, failure, warnings, and player identification.
- **Typography:** Text is kept stark white (`#FFFFFF`) or muted white (`rgba(255, 255, 255, 0.6)`) to ensure high readability against the dark interface.

## Typography

Typography focuses on bold, contemporary sans-serif fonts that support both Thai and English character sets seamlessly.

- **Display:** The `Kanit` and `Space Grotesk` fonts provide a geometric, slightly widened stance that pairs perfectly with the cyberpunk aesthetic. Headers use heavy weights (700+) to command attention.
- **Body:** `Kanit` in regular weights ensures maximum legibility for game questions, instructions, and standard UI copy.
- **Glow Effects:** High-impact text (such as warnings, game over screens, or player turns) often utilizes `text-shadow` to create a neon glow that matches the accent color.

## Layout & Spacing

The layout is built for fluid, mobile-first responsiveness, ensuring the game is playable in portrait orientation, which is common for party games.

- **Safe Areas:** Padding heavily relies on environmental safe areas (`env(safe-area-inset-bottom)`) to ensure the UI is never obstructed by mobile device bezels or notches.
- **Component Spacing:** Generous padding within cards (`20px`) prevents the UI from feeling claustrophobic, allowing the glowing elements breathing room.

## Elevation & Depth

Depth in Wong Taek is primarily achieved through lighting, specifically glowing box-shadows, rather than traditional dark drop-shadows.

- **Neon Shadows:** Interactive elements hover above the background by casting colored light. A primary button, for instance, casts a dual-layered purple shadow (`0 0 20px rgba(199, 61, 245, 0.5), 0 0 40px rgba(199, 61, 245, 0.2)`).
- **Glass Layers:** Cards and panels (`.glass-panel`) use a very subtle `backdrop-filter: blur(12px)` and a near-transparent white fill (`rgba(255, 255, 255, 0.03)`). This creates a frosted lens over the ambient background smoke and noise.
- **Physical States:** Pressed states on buttons physically push down (`translate-y-[4px]`) and lose their solid shadow, providing immediate, arcade-machine-like physical feedback.

## Shapes

Shapes are predominantly rounded and friendly, contrasting with the harshness of the neon colors to keep the game approachable.

- **Cards & Panels:** Large, sweeping border radii (`rounded-2xl` / 32px) are used for main game cards and dialogs.
- **Interactive Elements:** Buttons and inputs use medium to large curves (`rounded-lg` or `rounded-xl`) to feel tactile.
- **Avatars:** Player representations use perfectly rounded circles or smooth squircles, accented with animated pulsing rings to denote active turns.

## Components

### Glass Panels
The foundational container for content. These panels use frosted glass with translucent, 1px white/5% borders. They serve as the holding area for game questions, settings, and player lists, often featuring a subtle entrance animation rising from the bottom.

### Action Elements
Buttons are highly stylized.
- **Primary:** Solid neon purple with an animated shimmering reflection that sweeps across the button on hover.
- **Neon Variants:** Hollow buttons with colored borders that cast matching colored light.
- **Arcade Variants (Red/Green):** Solid colors with hard, un-blurred offset shadows that simulate chunky, physical arcade buttons.

### Inputs & Forms
Inputs (`.input-neon`) ditch traditional bounding boxes for a sleek, underline-focused design. They feature dark, translucent backgrounds with a bottom border that ignites into the primary neon color upon focus. Auto-filled browser states are explicitly styled to maintain the dark, neon aesthetic without breaking immersion.