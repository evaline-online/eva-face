# m3 — High-contrast "ink + phosphor" face

Variant directory for the consilium matrix-face shootout.

## Design philosophy

The reference renderer's biggest readability problem was that **everything dark
collapsed to `.` or ` `** — the 10-char ramp (` .:-=+*#%@`) has no true-black
glyph, the 0.12 floor clamp lifts every "dark" tone into the mid-range, and the
under-jaw shadow / nose-bridge highlight get squished together. So eyes and
hair both ended up as `.` at small grids, and the face lost its anchor points.

m3 fixes this by **making the ramp have a TRUE BLACK end** (the `█` U+2588
block character, char + color both at 0,0,0) and **banning the floor clamp on
stencil-painted cells**. Dark features now actually look ink-black.

## Key choices

- **Frame**: `frameScale` height budget tightened from `/1.55` to `/1.70` so the
  head truly fills the 80×40 vertical extent (less empty forehead band, more
  chin visible). `HEAD_CY = 0.185` (down 0.01) — confidence: medium.
- **Ramp**: `' .:-=+*#%@███'` — extended 13-step ramp with three `█` glyphs at
  the bright end (so tone=1.0 also renders solid). `shadeColor()` returns
  `[0,0,0]` for any tone ≤ 0.05 — confidence: high.
- **Eyes**: split into 3 layered features (`EYE_SCLERA` 0.95 / `EYE_IRIS` 0.55
  / `EYE_PUPIL` 0.02) painted in order so the pupil always wins. Confidence:
  high — this is the single biggest readability win.
- **Brows**: `tone = 1.0`, `ry = 0.055` (thicker) — guaranteed `█` bar.
- **Nose**: `tone = 1.0` column, `ry = 0.16` (taller) — guaranteed `█` strip.
- **Mouth / hair / nostrils**: `tone = 0.02` (true black), `rx` / `ry` bumped.
- **No floor clamp on stencil** — let the requested tone land exactly.
- **Light source**: kept at upper-right-front `(0.4, 0.45, 0.8)` — it works.
- **No new global rotation, no expression changes** — that belongs to other
  variants; m3 is purely about *contrast* and *feature legibility*.

## Top 3 priorities

1. **Eyes must read as eyes.** Sclera/iris/pupil layering + black pupil.
3. **Brows/nose/mouth/hair must use the ramp's two endpoints** (0 and 1) so
   the ASCII vocabulary says "this is a brow ridge" / "this is a hair cap"
   at any grid size.
4. **The head must fill the frame.** Tighter `frameScale` + lower `HEAD_CY`.