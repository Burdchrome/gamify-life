# Design — Neon Street HUD (Direction 1b)

<!-- Source: design/Design Handoff.dc.html + design/Habit Cards.dc.html -->

Dense tactical HUD aesthetic. Cyberpunk 2077's layered UI meets
Destiny/Warframe stat-block density. Daily habits framed as ops in an
edgerunner's protocol — upgrading a character, not checking boxes.

---

## Color Grammar

Color is semantic — each hue carries a fixed meaning everywhere.

| Token             | Hex       | Meaning                              |
| ----------------- | --------- | ------------------------------------ |
| `--ground`        | `#0C0E15` | Page background                      |
| `--surface`       | `#161923` | Card / elevated surface              |
| `--cyan`          | `#25E1ED` | Active, in-progress, daily           |
| `--gold`          | `#CDAD36` | Earned, prestige, milestone          |
| `--yellow`        | `#F0D000` | Rank, XP, high-tier prestige (III+)  |
| `--text-primary`  | `#E8E6E3` | Primary text                         |
| `--text-dim`      | 70% white | Incomplete card names                |
| `--text-muted`    | 30% white | Stats on incomplete cards            |
| `--error`         | `#FF4444` | Error states                         |

**Rules:**
- Cyan = anything the user does today (progress bars, checkmarks, done borders).
- Gold = anything the user has earned (prestige badge, streak on completed cards, weekly-clear bars).
- Yellow = rank number and high-tier prestige (III+). Never on daily interactions.
- Incomplete cards use dim/muted text. Completed cards promote to full white + cyan accents.

---

## Typography

Two font families. No fallback mixing in the same element.

| Element          | Font      | Size / Weight          | Notes                        |
| ---------------- | --------- | ---------------------- | ---------------------------- |
| System labels    | Orbitron  | 9–11px / 700           | Uppercase, 2–4px tracking    |
| Rank number      | Orbitron  | 20px / 700             | Yellow, right-aligned        |
| Date             | Rajdhani  | 24px / 700             | -0.5px letter-spacing        |
| Card name        | Rajdhani  | 16px / 700             | Uppercase, 0.5px tracking    |
| Card stats       | Rajdhani  | 11px / 600             | Uppercase, 0.5px tracking    |
| Prestige label   | Rajdhani  | 9px / 700              | 1–2px tracking, gold         |

Google Fonts import: `Rajdhani:wght@500;600;700` + `Orbitron:wght@500;700`.

---

## Header Chrome

- **Protocol label:** `RUNNER://daily` — Orbitron 11px, 4px tracking, cyan.
- **Date:** Rajdhani 24px 700, abbreviated format (`TUE 08.12`).
- **Rank:** Orbitron 20px 700, yellow `#F0D000`, right-aligned. "RANK" sublabel
  below it (Orbitron 9px, 2px tracking, 50% yellow).
- **Ops progress:** segmented bar matching habit count + `1/3 OPS COMPLETE`
  label (11px, 30% white, Rajdhani 600).
- **Divider:** 1px solid `rgba(37, 225, 237, 0.12)` below header.

---

## Habit Card Anatomy

Each card contains:
1. **Pixel-art icon** — 32×32, `image-rendering: pixelated`. Placeholder SVGs
   for now; tints gold on prestige.
2. **Name** — uppercase Rajdhani, full white when complete, 70% when not.
3. **Checkbox** — 18×18, top-right. Incomplete: 1px white 15% border.
   Complete: 2px cyan border, cyan `✓`, 15% cyan fill.
4. **Stats row** — `WEEKLY n/n` + `STREAK n`, color-coded by state.
5. **Segmented progress bar** — one segment per target day, 3px tall, 2px gap.
   Filled = cyan or gold. Empty = 10–12% opacity.

### Card States

| State            | Left accent  | Border                              | Background                   |
| ---------------- | ------------ | ----------------------------------- | ---------------------------- |
| Incomplete       | none         | `1px solid rgba(255,255,255,0.06)`  | `rgba(255,255,255,0.02)`     |
| Complete (cyan)  | 2px cyan     | `1px solid rgba(cyan, 0.2)`         | `rgba(cyan, 0.04)` + glow    |
| Prestige I       | 2px gold     | `1px solid rgba(gold, 0.3)`         | `rgba(gold, 0.06)` + gradient|
| Prestige III+    | 2px yellow   | `1px solid rgba(yellow, 0.4)`       | `rgba(yellow, 0.08)` + glow  |

**Complete glow:** `linear-gradient(135deg, rgba(cyan, 0.08), transparent 60%)`
overlay inside the card.

**Prestige gradient:** `linear-gradient(135deg, rgba(gold, 0.08), transparent 50%)`.
Intensifies with tier.

---

## Prestige Tier System

Each weekly-target clear earns one prestige tier. Tiers persist and compound.

| Tier         | Badge    | Pips  | Visual                                            |
| ------------ | -------- | ----- | ------------------------------------------------- |
| Prestige I   | `P — I`  | 1     | Gold border + bars + stats. Icon tints gold.      |
| Prestige II  | `P — II` | 2     | Same gold, two pips.                              |
| Prestige III+| `P — III`| 3+    | Brighter yellow. Name turns gold. "N-WEEK VETERAN"|

Prestige is a Layer 2 feature (future). The card states and visual
treatments are designed now so the CSS vocabulary exists when it lands.

---

## Textures & Effects

- **Scan lines:** full-screen overlay.
  `repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.012) 2px, rgba(255,255,255,0.012) 4px)`.
  `pointer-events: none`.
- **Left accent line:** 2px wide, full card height, `position: absolute`.
  Cyan for complete, gold for prestige.
- **Card border-radius:** 4px (tight, not bubbly).

---

## Spacing & Layout

- App max-width: 480px, centered.
- Card padding: 12px 14px.
- Card gap: 8px.
- Card icon gap: 10px.
- Header bottom padding: 16px, divider below.

---

## Open Items (future tickets)

1. Tap completion animation — two tiers (common cyan ~320ms, exotic gold ~420ms).
2. Prestige promotion moment — card color transition on level-up.
3. Real pixel-art icon sprites.
4. Manage view in dark theme.
5. Habit form in dark theme.
6. Sound design (Web Audio API oscillator-based).
7. Prestige tier thresholds beyond III.
