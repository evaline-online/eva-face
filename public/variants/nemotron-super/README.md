README.md for nemotron-super variant

Design Choices:
- frameScale: adjusted to make head fill more of the viewport by increasing the scale factor. We changed the denominator for screenW from 3.5 to 3.0 and for screenH from 1.55 to 1.3 to make the head larger.
- HEAD_CY: kept at 0.175 (no change) as it centers the head well vertically.
- Tone palette: removed the 0.12 floor clamp in both silhouette and stencil painting to allow full intensity range. Set hair tone to 0.2 (rendering as ':'), eye tone to 0.1 (rendering as '.'), making eyes darker than hair. Brows remain bright (0.92 -> '@'). Nose and mouth tones adjusted for clarity.
- New features: none added; refined existing stencil values for better proportions.
- Confidence: high on frameScale and HEAD_CY, medium on tone adjustments (requires visual verification), high on occludedGuard additions.