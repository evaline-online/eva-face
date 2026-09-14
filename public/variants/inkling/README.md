# Variant: inkling (matrix-face)

## Design choices
- `frameScale`: Expanded from 3.5/1.55 → 3.0/1.45 so the head fills more of the 80×40 / 106×36 grid without clipping.
- `HEAD_CY`: Raised to 0.19 (from 0.175) to show more face, less neck base.
- `FACE_STENCIL`: Eyes expanded to rx 0.14, ry 0.080 and tone raised to 0.28 (`:`). Hair tone set to 0.15 (`.`) so hair and eyes are instantly distinct (no more shared `.` due to floor clamp). Brows kept at 0.92 (`1` via new `SHADE_CHARS`). Nose bridge widened (rx 0.050) for stronger central column. Mouth widened (rx 0.22) for a clear dark line.
- `shadeChar`: Replaced `@` with `1` at high end so bright bars map to `1` characters as requested.
- `floor clamp`: Lowered from 0.12 → 0.08 across silhouette, stencil, and contour for better dark-level separation.
- `occludedGuard`: Added to `FOREHEAD`, `HAIR`, and all stencil features to prevent ghosting at yaw ≈ PI.
- New feature: `TEMPLE` highlights at (±0.42, 0.28, 0.55) for side-definition.

## Confidence
- High on frame/scale and occlusion guards (verified by preview output).
- High on tone separation: hair `.`, eyes `:`, mouth/nose dark, brows bright `1`.
- Medium on TEMPLE feature (subtle, may vary with yaw).
