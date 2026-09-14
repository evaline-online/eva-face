# m27 Variant Design Notes

## Design Philosophy
A "clarity-first" variant optimized for instant face recognition at tiny grids (80x40 terminal). The core insight: the 0.12 floor clamp collapses all dark tones into undifferentiated space, making eyes and hair vanish. Lowering the floor reveals structure in shadows.

## Key Changes from Reference

| Parameter | Reference | m27 | Rationale |
|-----------|-----------|-----|------------|
| floor clamp | 0.12 | 0.05 | Dark features need room to breathe |
| EYE tone | 0.12 | 0.10 | Visible dark without washing out |
| HAIR tone | 0.08 | 0.06 | Negative-space hairline (intentional) |
| BROW tone | 0.92 | 0.88 | Slightly softer bright bar |
| HEAD_CY | 0.175 | 0.170 | Minor vertical re-centering |
| frameScale | screenW/3.5, screenH/1.55 | screenW/3.4, screenH/1.50 | Head fills more of the frame |

## Top 3 Priorities
1. **Eyes must be visible dots** — floor clamp lowered so 0.10 → '.' (index 1)
2. **Brows must be bright bars** — keeping 0.88-0.92 tone for '@' character
3. **Nose must read as a column** — NOSE_BRIDGE at tone 0.92 ensures it wins over eyes

## Confidence
- floor clamp change: HIGH confidence (directly fixes eye/hair visibility)
- frameScale tweak: MEDIUM confidence (may need tuning for specific aspect ratios)
- Negative-space hair: LOW confidence (experimental, user may prefer visible hair)
