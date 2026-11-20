# 🌸 HALCYON // 2000 ✦ Master Game Specification & AI Prompt 🍑
> *A Dreamy, Whimsical Y2K Pastel Pixel-Core Computer Vision Slicing Game*

---

### 🏷️ Notion Page Properties
| Property | Value |
| :--- | :--- |
| **Status** | `✨ Completed & Live` |
| **Live URL** | [https://halcyon-2000.vercel.app/](https://halcyon-2000.vercel.app/) |
| **GitHub Repo** | [ayeshamallick6514-aye/Halcyon-2000](https://github.com/ayeshamallick6514-aye/Halcyon-2000) |
| **Aesthetic** | `Y2K Tamagotchi` · `Pastel Pixel-Core` · `Lo-Fi Whimsy` |
| **Tech Stack** | `Vanilla HTML5 Canvas` · `ES6 Modules` · `MediaPipe AI` · `Web Audio API` |
| **Target FPS** | `60 FPS (Zero Lag, Mobile Optimized)` |

---

> 🌸 **Welcome to the Halcyon Dreamscape!**  
> Drift into a nostalgic daydream of soft cotton-candy skies, shimmering pixel sparkles, and procedural lo-fi synths. In HALCYON // 2000, your webcam transforms your fingertips into magic rainbow wands shedding stardust cross-stars and hearts. This document contains the complete design contract, technical architecture, and the master AI prompt to rebuild this game in one shot.

---

## 🎨 Aesthetic Tokens & Visual Identity

### 🍬 Design Golden Rules
- **No Harsh Black:** Absolutely `#000000` is forbidden! Every dark pixel, text, and border uses cozy Cocoa-Plum (`#5C3A58`).
- **Soft Dream Shadows:** Box shadows use crisp 2px–4px pastel offsets (`4px 4px 0 var(--sakura)`).
- **Pixelated Sharpness:** `image-rendering: pixelated` and `ctx.imageSmoothingEnabled = false` for authentic 16-bit retro vibes.

### 🌸 Color Palette Database
| Token Name | Hex Code | Swatch Preview | Usage in Game |
| :--- | :--- | :--- | :--- |
| `--sakura` | `#FFD1E8` | 🌸 Sakura Pink | Primary highlights, button accents, score popups, ribbon trails |
| `--lavender` | `#E2D1F9` | 💜 Dreamy Lavender | Card shadows, modal backdrops, boba cup body, CRT borders |
| `--mint` | `#D4F8E8` | 💚 Mint Cream | Secondary buttons, cyber wand trails, fruit leaves, peace bonus |
| `--butter` | `#FFF3C4` | 💛 Butter Yellow | Starfruit body, active mode pills, sparkle confetti |
| `--cloud` | `#FFFDF9` | ☁️ Cloud White | Modal card backgrounds, Polaroid borders, light reflections |
| `--cocoa` | `#5C3A58` | 🍫 Cocoa-Plum | High-contrast typography, 3px solid borders, drop shadows |
| `--peach` | `#FFCBA4` | 🍑 Warm Peach | Start screen floating Cloud Peach body, boba straw accents |
| `--rose` | `#FFB7C5` | 🍓 Sweet Rose | Strawberries, dragonfruit outer rim, decorative hearts |

### 🔤 Typography
- **Headings & Titles:** `'Press Start 2P', cursive` (with 2px–3px drop shadows)
- **Body, Stats & Hints:** `'VT323', monospace` (crisp, readable 16-bit terminal feel)

---

## 🕹️ Core Game Mechanics & Slicing Physics

<details>
<summary><b>▶ Click to expand Slicing & Collision Specifications</b></summary>

### 1. Continuous Swept-Line Collision (`lineCircleHit`)
Fast flicking often tunnels through targets in standard distance checks. HALCYON // 2000 utilizes continuous line-segment intersection against circular fruit radii:
- Calculates closest point on the line segment `(prevPos → currentPos)` to target center `(cx, cy)`.
- If distance $\le$ fruit radius, registers a cut instantaneously.
- Fallback proximity detection ensures touch taps register cleanly.

### 2. Dual Slicing Halves & Physics
When a fruit is sliced:
- Severed into two distinct halves (`drawPixelSpriteHalf`).
- Left half flies with `vx = t.vx - 3`, right half with `vx = t.vx + 3`.
- Both halves spin outwards (`rotSpeed = ±0.15`) and fade gracefully under gravity.

### 3. Fever Mode (Rainbow Rush)
- Triggered on reaching a **5x Combo streak**.
- Lasts **6 seconds** with floating gravity ($0.6\times$), double points ($2\times$), celebratory rainbow gradient overlay, and dense confetti bursts.

</details>

---

## 🖐️ Dual-Hand AI Computer Vision & Gesture Recognition

<details>
<summary><b>▶ Click to expand MediaPipe & Gesture Tracking specs</b></summary>

- **Model Engine:** `@mediapipe/tasks-vision` HandLandmarker (WASM + GPU delegate).
- **Dual-Hand Capability:** Configured with `numHands: 2`. Players can dual-wield both hands to slice fruit simultaneously with independent color trails.
- **Index Tip Tracking:** Uses **Landmark 8** (Index Finger Tip), mirrored horizontally (`(1 - lm.x) * canvas.width`) for natural intuitive mirroring.
- **Peace-Sign Bonus Easter Egg (`✌️`):**
  - Detects index and middle fingers extended while ring and pinky fingers are curled.
  - Holding the gesture for `0.5s` during gameplay awards a **"PEACE & LOVE +5 ✨"** bonus, stardust confetti blast, and music-box chime audio (10s cooldown).

</details>

---

## ⏱️ Custom Timer & Endless Vibe Engine

<details>
<summary><b>▶ Click to expand Duration & Bomb Handling specs</b></summary>

- **Interactive Duration Selector:**
  - Pills: `30s`, `60s` (Default), `90s`, `3m` (180s - full song length).
  - Custom Input: Numeric field accepting `10s` to `600s`.
  - `♾️ Endless Vibe`: Clock counts upward indefinitely with no time pressure.
- **Cozy Bomb Mechanics:**
  - Slicing a Grumpy Raincloud bomb in Timed or Endless mode triggers a cozy screen shake, deducts `-5` points, and resets combo multiplier without terminating gameplay.
  - Classic 3-strike heart system (`♥ ♥ ♥`) is preserved when selecting Chaos Mode.
- **HUD Clock:** Polished retro `MM:SS` display in the top HUD pill.

</details>

---

## 🎧 Persistent "Pick Your Vibe" Lo-Fi Music Box

<details>
<summary><b>▶ Click to expand Web Audio API Synthesizers</b></summary>

A collapsible deck in the top-right corner that **never restarts or cuts out** across screen changes:
1. **📁 Local Audio:** Drag-and-drop or file picker for `.mp3`, `.wav`, or `.m4a` files with seamless loop and volume sliders.
2. **🔗 Stream Link:** Embed YouTube or Spotify music streams inside a styled pastel frame.
3. **✦ Built-In Procedural Chiptune Synths (Web Audio API):**
   - 🌙 **Midnight Synthwave:** 110 BPM bassline, Cm7/Fm7 lush pads, retro drum kit.
   - 🎵 **Seoul Chill R&B:** 78 BPM sub-bass, Cmaj7/Am7 soft keys, brushed lo-fi snare.
   - ✦ **Pastel Fairycore:** 138 BPM 8-bit cycling arpeggios, staccato bass, happy lead melody.
- **Audio-Reactive Border:** `AnalyserNode` frequency bins pulse the canvas border glow in sync with real-time music bass.

</details>

---

## 📸 Y2K Polaroid Photo-Booth & Souvenir Generator

<details>
<summary><b>▶ Click to expand Polaroid Photo-Booth specs</b></summary>

- **3-2-1 Countdown:** Clicking *"Snap Vibe Polaroid 📸"* runs an authentic countdown.
- **Framed Canvas Output (400x520):**
  - Crisp white Polaroid border with Cocoa-Plum edge.
  - Live webcam snapshot (or game artwork fallback) with soft pastel glow.
  - Decorative pixel hearts (`♥`) and stars (`✦`).
  - Score, peak combo, date stamp, and watermark `HALCYON // 2000`.
  - Dynamic Rank Title based on performance:
    - 👑 *Legendary Fruit Empress* ($\ge 100$)
    - 🧚 *Certified Fruit Fairy* ($\ge 70$)
    - 🌸 *Pastel Samurai* ($\ge 50$)
    - 🪄 *Combo Wizard* ($\ge 10\times\text{ combo}$)
    - ✨ *Slice Apprentice* ($\ge 30$)
    - 🍰 *Snack Slicer* ($\ge 15$)
    - ☁️ *Cloud Daydreamer* ($< 15$)
- **1-Click Download:** *"Download PNG 💾"* saves high-resolution memory card to device.

</details>

---

## 📁 File Structure & Technical Deliverables

```
pastel-slice-2000/
├── index.html        # Semantic HTML5, accessible overlays, custom SVG favicon
├── style.css         # 16-bit pixel styling, fluid clamp() typography, responsive breakpoints
├── game.js           # MediaPipe CV, continuous collision, state machine, Polaroid capture
├── audio.js          # Procedural Web Audio API sound synthesis & music player engine
├── vercel.json       # Project name & clean URL configuration
└── README.md         # Aesthetic documentation & user guide
```

---

## 🤖 Turnkey Master AI Prompt (Copy-Paste Ready)

> 💡 **How to Use:** Copy the block below and paste it into any AI coding assistant (Gemini, Claude, Cursor, Antigravity, ChatGPT) to generate the complete game from scratch in one execution!

```markdown
Build a complete, production-ready, browser-based web game called **HALCYON // 2000** — a whimsical Y2K Tamagotchi-era "pastel pixel-core" fruit-slicing experience featuring real-time AI webcam hand tracking, lo-fi chiptune audio synthesis, and a retro Polaroid photo-booth.

The project must be modular, self-contained (zero framework dependencies, vanilla HTML5 Canvas, modern ES6+ modules, and pure CSS3), and run at a silky 60 FPS on desktop, tablet, and mobile.

---

### 🎨 1. Aesthetic & Design System (Pastel Pixel-Core)
- **Design Rule:** Strictly NO harsh black (`#000`) or blinding neon anywhere. Use Cocoa-Plum (`#5C3A58`) for all borders, shadows, and text.
- **Color Tokens:**
  - Sakura Pink: `#FFD1E8`
  - Dreamy Lavender: `#E2D1F9`
  - Mint Cream: `#D4F8E8`
  - Butter Yellow: `#FFF3C4`
  - Cloud White: `#FFFDF9`
  - Cocoa-Plum: `#5C3A58`
  - Rose Blush: `#FFB7C5`
- **Typography:**
  - Headers / Titles: `'Press Start 2P', cursive`
  - Body / Stats / Hints: `'VT323', monospace`
- **UI Feel:** 2px–3px solid pixel borders, 2px–4px pastel drop shadows, soft translucent modal backdrops (`rgba(226, 209, 249, 0.35)` with `backdrop-filter: blur(4px)`), and rounded pixel cards.
- **Custom Favicon:** A kawaii smiling pastel peach inside a cloud-white badge with floating pixel sparkle stars.

---

### 📁 2. File Architecture
Deliver the project cleanly across 4 files:
1. `index.html` — Semantic HTML5 layout, accessible modal dialogs, HUD elements, and SVG favicon.
2. `style.css` — 16-bit retro pixel styling, responsive `clamp()` typography, HUD pills, and mobile media queries.
3. `audio.js` — Standalone ES module exporting an `AudioEngine` class (Web Audio API synths, SFX, and file player).
4. `game.js` — Main ES module (MediaPipe vision loader, continuous line-segment collision physics, state machine, particle engine, camera filters, and Polaroid generator).

---

### 🕹️ 3. Core Mechanics & Input System
- **Dual-Hand AI Webcam Tracking:**
  - Dynamically load Google MediaPipe Vision (`@mediapipe/tasks-vision` HandLandmarker) with `numHands: 2` and `runningMode: 'VIDEO'`.
  - Track Index Fingertip (Landmark 8) for each hand. Mirror horizontal coordinates (`1 - x`) to match natural hand movement.
  - Draw smooth rainbow ribbon trails shedding stardust cross-stars (`✦`) and mini hearts (`♥`).
- **Seamless Mouse & Mobile Touch Fallback:**
  - Allow instant mouse drag or touchscreen swiping without requiring camera permissions.
  - `touch-action: none` on the canvas to eliminate touch scrolling interference.
- **Menu Hover/Tap Protection (`isOverModalCard`):**
  - Moving the cursor or sliding over UI cards (Start Screen, Game Over, Music Player) must NEVER trigger a slice. Slicing only activates outside modal boundaries with an intentional swipe velocity (`dx*dx + dy*dy >= 49`), allowing players to freely click buttons without accidentally auto-starting the game.
- **Continuous Line-to-Circle Collision (`lineCircleHit`):**
  - Implement mathematical continuous line-segment intersection checks against fruit radii so high-speed flicks never tunnel through targets.

---

### ✌️ 4. Secret "Peace & Love" Easter Egg
- Detect a Peace Sign (`✌️` — index and middle fingers extended upward, ring and pinky fingers curled).
- Holding a peace sign in front of the camera for 0.5s during gameplay awards a **"PEACE & LOVE +5 ✨"** bonus popup, celebratory confetti explosion, and music-box chime audio (with a 10-second cooldown timer).

---

### ⏱️ 5. Customizable Timers & Endless Vibe Mode
- **Start Screen Duration Picker:**
  - Clickable pastel pills for `30s`, `60s`, `90s`, `3m` (180s), and `♾️ Endless Vibe`.
  - Numeric custom input field supporting `10s` to `600s`.
- **Cozy Bomb Handling:**
  - Slicing a Grumpy Raincloud bomb in Timed or Endless mode triggers a cozy screen shake, deducts `-5` points, and resets the combo streak without ending the session early.
  - Classic 3-strike life system (`♥ ♥ ♥`) is retained when selecting Classic Chaos Mode.
- **Retro HUD Clock:** Displays clean `MM:SS` formatting (counts down for timed runs, counts up for endless vibe).

---

### 🪄 6. Wand & Camera Customizers
- **Wand Trail Selector:**
  - `🌈 Pastel Rainbow`: Sakura, Mint, Butter, Lavender, Rose cycle.
  - `🌸 Sakura Petals`: Monochromatic rose, pink, and blush tones.
  - `💚 Cyber Mint`: Mint, seafoam, and pastel violet.
- **Live Camera Filter:**
  - Boost camera canvas contrast and brightness (`filter: brightness(1.12) contrast(1.05)`).
  - Selectable soft canvas wash overlays: `🍬 Cotton Candy Wash`, `🎮 90s Pink GameBoy`, or `🌿 Natural Soft`.

---

### 🎧 7. Persistent "Pick Your Vibe" Music Player
A collapsible floating deck in the top-right corner that persists uninterrupted across all screens:
1. **Local Audio:** File picker and drag-and-drop zone for `.mp3`, `.wav`, or `.m4a` files with play/pause, loop toggle, and volume slider.
2. **Stream Link:** Input field to embed Spotify or YouTube tracks inside an aesthetic mini-frame.
3. **Procedural Chiptune Synths (Web Audio API):**
   - 🌙 *Midnight Synthwave* (110 BPM bass, Cm7/Fm7 lush pads, retro drum machine).
   - 🎵 *Seoul Chill R&B* (78 BPM sub-bass, Cmaj7/Am7 soft keys, brushed lo-fi kit).
   - ✦ *Pastel Fairycore* (138 BPM 8-bit cycling arpeggios, staccato bassline, upbeat melody).
- **Audio-Reactive Border:** `AnalyserNode` frequency detection pulses the canvas border glow in sync with the bassline.
- **Procedural Sound Effects:** Chime slice chords, whoosh swipes, click taps, bomb thunder, and combo music-box arpeggios.

---

### 📸 8. Y2K Polaroid Photo-Booth (Game Over Screen)
- "Snap Vibe Polaroid 📸" button triggers an authentic 3-2-1 countdown.
- Renders a retro 400x520 white Polaroid frame with:
  - Mirrored camera snapshot (or canvas artwork fallback) with subtle soft pastel tint.
  - Decorative pixel hearts (`♥`) and stars (`✦`).
  - Watermark: `HALCYON // 2000`.
  - Final Score, Peak Combo, and Date Stamp.
  - Generated Rank Title based on score (e.g. *Legendary Fruit Empress 👑*, *Certified Fruit Fairy 🧚*, *Pastel Samurai 🌸*, *Combo Wizard 🪄*, *Snack Slicer 🍰*).
- "Download PNG 💾" button provides instant 1-click download of the souvenir image.

---

### 🚀 9. Output Expectations
- Write clean, complete, unminified code with NO missing functions, placeholder comments, or TODOs.
- Ensure all DOM selectors match cached references.
- Verify `node --check` syntax clean on JavaScript files.
- Ready for zero-config static hosting (Vercel, GitHub Pages, or local `python -m http.server 3000`).
```

---

## 📋 Quality & Verification Checklist
- [x] Dual-Hand tracking with MediaPipe Vision (`numHands: 2`)
- [x] Continuous swept-line collision detection (`lineCircleHit`)
- [x] Slicing disabled over menu cards (`isOverModalCard`)
- [x] Peace-Sign `✌️` gesture easter egg (+5 points, stardust, sound)
- [x] Customizable duration pills (`30s`, `60s`, `90s`, `3m`, `♾️ Endless`, custom `10s-600s`)
- [x] Grumpy Rainclouds deduct `-5` and reset combo in Timed/Endless mode
- [x] Wand trail palette customizer (`Pastel Rainbow`, `Sakura Petals`, `Cyber Mint`)
- [x] Live webcam brightness boost (`brightness(1.12) contrast(1.05)`) & filter customizer
- [x] Persistent Lo-Fi & Chiptune Music Box with audio-reactive bass border glow
- [x] 3-2-1 countdown Polaroid photo-booth with souvenir PNG download
- [x] High-contrast Cocoa-Plum branding and custom kawaii SVG favicon
- [x] Full mobile touch optimization with `touch-action: none`
- [x] Live on Vercel at [https://halcyon-2000.vercel.app/](https://halcyon-2000.vercel.app/)

---
*Crafted with infinite love, nostalgia, and cotton-candy pixels for HALCYON // 2000.* 🌸✨🍑
