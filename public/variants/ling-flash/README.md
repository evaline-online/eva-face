# ling-flash Variant — High-Contrast Matrix Face

## Design Choices

- **frameScale**: `Math.min(screenW / 3.2, screenH / 1.45)` — head is ~9% wider and 7% taller than default, filling the frame without clipping. Confidence: **high**.
- **HEAD_CY = 0.15**: Lowered from 0.175 to shift the head mass slightly down, centering the face better against the jaw/clipping boundary. Confidence: **high**.
- **shadeChar gamma (0.35 power)**: Non-linear mapping spreads dark tones so eyes (tone 0.04) render as `0` and hair (tone 0.08) renders as `1`, making them instantly distinct. Confidence: **medium**.
- **Floor clamp lowered to 0.04**: Previously 0.12 clamped both eyes and hair to the same `.` character. Now the darkest features are visible. Confidence: **high**.
- **FACE_STENCIL**: Eyes set to tone 0.04 (dark `0`), hair cap to 0.08 (`1`), brows to 0.95 (`@`). All face features have `occludedGuard: true`. Added brow-ridge highlights. Confidence: **high**.
- **Tone palette**: Eyes=`0`, Hair=`1`, Brows=`@`, Nose=`@`, Mouth=`-`, Skin=`:`-`*`, Cheeks=`%`. Binary-style contrast for key features. Confidence: **medium**.

## Top 3 Design Priorities

1. Eyes must be instantly recognizable as dark hollows (`0`), distinct from hair (`1`).
2. Brows must render as bright bars (`@`/`1`) contrasting against dark eye sockets.
3. Head must fill the frame maximally without clipping at 80x40 and 142x45.
