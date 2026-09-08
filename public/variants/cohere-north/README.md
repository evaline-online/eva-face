# cohre-north Matrix Face Variant

## Design Choices

**frameScale formula**: Modified to `Math.min(screenW / 3.3, screenH / 1.4)` for better head fill and cleaner facial proportions. **HEAD_CY**: Set to `0.185` for higher cheekbones and more prominent facial structure.

**New features added**:
- Enhanced eye contrast by moving EYE landmarks forward (+Z) and using tone 0.08 instead of 0.12
- Redesigned brow/shadow separation for clearer brow definition
- Added chin point feature for sharper jawline
- Introduced slightly higher forehead pad for more youthful appearance

**Tone palette strategy**:
- Eyes: Deep dark (0.08) to ensure distinct black appearance
- Brows: Bright bars (0.95) for clear upward ridges
- Hair: Subtle dark (0.06) to differentiate from eyes while maintaining contrast
- Skin: Mid-range (0.55-0.65) for natural complexion
- Shadows: Dark (0.15-0.20) for depth and definition
- Highlights: Bright (0.85-0.95) for facial prominence

**Confidence levels**:
- frameScale formula: high - based on field research
- HEAD_CY adjustment: high - tested for facial balance
- EYELANDMARK adjustments: medium - visual testing needed
- New features: medium - some experimental elements

The design prioritizes instant human recognition at small grid sizes, with clear distinction between eyes, brows, nose, and mouth regions.