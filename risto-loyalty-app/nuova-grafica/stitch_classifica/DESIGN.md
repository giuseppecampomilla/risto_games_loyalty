# Design System Strategy: Neo-Arcade Digital Experience

## 1. Overview & Creative North Star
### The Creative North Star: "The Electric Afterglow"
This design system is built to bridge the gap between the tactile nostalgia of a 1980s arcade and the sleek, high-octane atmosphere of a modern premium lounge. We are moving away from "web-standard" layouts toward a "Digital Editorial" approach. 

The experience is defined by **The Electric Afterglow**: a philosophy where every element emits light or reacts to it. We break the rigid, boxed-in "template" look by using intentional asymmetry, overlapping glass surfaces, and a typography scale that demands attention even in low-light, high-distraction environments (Pub Mode UX).

## 2. Colors & Atmospheric Depth
Our palette is a high-contrast interaction between a "void" background and neon-gas accents.

### The Palette
*   **Primary (Amber - `#ffad4a`):** The core interactive energy. Use this for main CTAs and "Golden Path" actions.
*   **Secondary (Teal - `#26fedc`):** The "Win" state. Used for gamified progress, pint-filling animations, and success notifications.
*   **Tertiary (Electric Purple - `#c57eff`):** The "VIP/Rare" tier. Used for high-score badges, prize notifications, and legendary status avatars.
*   **Background (`#0e0e0e`):** A deep, ink-black textured base.

### The "No-Line" Rule
**Explicit Instruction:** You are prohibited from using 1px solid borders to section off content. In this system, boundaries are defined by:
1.  **Background Shifts:** Transitioning from `surface` to `surface-container-low`.
2.  **Tonal Transitions:** Using the `surface-container` tiers to create hierarchy.
3.  **Light Spillage:** Using soft glows to define where one element ends and another begins.

### Surface Hierarchy & Nesting
Think of the UI as a series of physical, stacked sheets of frosted glass. 
*   **Base:** `surface-dim` (`#0e0e0e`)
*   **Sectioning:** `surface-container-low` (`#131313`)
*   **Interactive Cards:** `surface-container-high` (`#201f1f`)
*   **Floating Modals:** `surface-container-highest` (`#262626`) with `backdrop-blur`.

### Signature Textures
Avoid flat fills. For primary CTAs or Hero backgrounds, use a subtle linear gradient from `primary` (`#ffad4a`) to `primary-container` (`#fb9a02`) at a 135-degree angle. This provides a "liquid-neon" polish that feels bespoke.

## 3. Typography
We use a high-contrast pairing to ensure readability in dark, social environments.

*   **Display & Headlines (Space Grotesk):** This is our "Arcade" voice. It’s technical, bold, and futuristic. Use `display-lg` for win states and `headline-md` for game titles. The tight tracking and wide stance of Space Grotesk communicate high energy.
*   **Body & Titles (Manrope):** Our "Function" voice. Manrope is chosen for its geometric clarity and high x-height, ensuring that even at `body-sm`, a user in a dimly lit pub can read their score or the menu.
*   **Hierarchy as Brand:** Use extreme scale differences. A `display-lg` score should sit right next to a `label-md` timestamp to create an editorial, non-linear feel.

## 4. Elevation & Depth
In "The Electric Afterglow," we do not use traditional drop shadows.

### The Layering Principle
Depth is achieved by "stacking" container tiers. An inner prize card (`surface-container-highest`) sitting on a leaderboard background (`surface-container-low`) creates a natural, sophisticated lift.

### Ambient Shadows
If a floating element (like a prize notification) requires a shadow, it must be an **Ambient Glow**:
*   **Blur:** 40px - 60px.
*   **Opacity:** 8%-12%.
*   **Color:** Use the `primary` or `tertiary` token instead of black. This mimics the way a neon sign casts light onto a dark wall.

### The "Ghost Border"
If a container needs more definition (e.g., in high-glare environments), use a "Ghost Border": the `outline-variant` token at **15% opacity**. Never 100%.

### Glassmorphism
For floating menus or prize overlays, use `surface-container-highest` with a 60% opacity and a `20px` backdrop-blur. This allows the high-energy game colors to bleed through the UI, making the app feel like a cohesive part of the environment.

## 5. Components

### Fat-Finger Buttons
Designed for the "Pub Mode" context where precision is low.
*   **Primary:** `primary` background, `on-primary` text. Height: 64px minimum. Roundedness: `md` (`1.5rem`).
*   **Interaction:** On hover/tap, add a `primary-dim` outer glow.
*   **Typography:** `title-lg` (Manrope) for maximum legibility.

### Gamified Progress Bars (The "Pint" Bar)
*   **Container:** `surface-container-highest` with a `none` roundedness at the bottom and `sm` at the top to mimic a glass.
*   **Fill:** `secondary` (`#26fedc`) gradient. 
*   **Micro-interaction:** Add a "fizz" effect using small, floating circles of `on-secondary-container` at the top of the fill level.

### Game Cards
*   **Forbid dividers.** Use `md` (`1.5rem`) vertical spacing between elements.
*   **Layout:** Use an asymmetrical "Feature Image" that overlaps the card boundary by `-1rem` to break the grid.
*   **Background:** `surface-container-low`.

### Prize Notifications & Badges
*   **Badges:** Use `tertiary` (`#c57eff`) with `full` roundedness. 
*   **Notifications:** These should use the Glassmorphism rule. A "Prize Won" alert should be a full-width glass sheet with `display-sm` text in `secondary`.

### Avatars
*   **Style:** `xl` (`3rem`) roundedness (squircle).
*   **Border:** A 2px "Ghost Border" using `secondary` at 40% opacity to denote an "active" player.

## 6. Do's and Don'ts

### Do:
*   **Do** use extreme typographic contrast (Large headers vs tiny labels).
*   **Do** allow elements to overlap. This creates a "collaged" editorial look.
*   **Do** use `secondary` and `tertiary` for "High-Energy" moments only. Keep the rest of the UI in `surface` tiers.
*   **Do** ensure all touch targets are at least 48x48px, ideally 64px for primary actions.

### Don't:
*   **Don't** use 1px solid white or grey lines. They kill the premium atmosphere.
*   **Don't** use pure black (`#000000`) for containers; use the `surface-container` tiers to maintain "breathable" depth.
*   **Don't** use standard "drop shadows." If it doesn't glow, it shouldn't have a shadow.
*   **Don't** cram the screen. If a user is in a pub, they need one clear action per screen. Use white space as a functional tool.