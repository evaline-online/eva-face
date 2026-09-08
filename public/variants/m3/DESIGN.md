# m3 — Face stencil table

Coordinates are in model (post-normalization) units. Face toward +Z, y up.
Radius units are model-units; at 80×40 / cellAspect 0.5 one model-unit ≈ 18–20
cells horizontally (HEAD_HALF_W = 0.56, scale ≈ 22.8).

| Feature          |    lx |    ly |    lz |    rx |    ry |  tone | notes                              |
|------------------|------:|------:|------:|------:|------:|------:|------------------------------------|
| TEMPLE_SHADOW L  | -0.34 |  0.42 |  0.55 |  0.10 |  0.16 |  0.30 | NEW — frames the forehead sides    |
| TEMPLE_SHADOW R  |  0.34 |  0.42 |  0.55 |  0.10 |  0.16 |  0.30 | NEW                                |
| FOREHEAD         |  0.00 |  0.50 |  0.78 |  0.32 |  0.18 |  0.68 | tone bumped 0.60→0.68              |
| BROW_SHADOW L    | -0.115|  0.385|  0.66 |  0.16 |  0.040|  0.10 | darker (0.18→0.10)                 |
| BROW_SHADOW R    |  0.115|  0.385|  0.66 |  0.16 |  0.040|  0.10 |                                    |
| BROW L           | -0.115|  0.475|  0.70 |  0.18 |  0.055|  1.00 | brighter (0.92→1.00), thicker      |
| BROW R           |  0.115|  0.475|  0.70 |  0.18 |  0.055|  1.00 |                                    |
| EYE_SCLERA L     | -0.115|  0.335|  0.58 |  0.145|  0.085|  0.95 | NEW — bright white-of-eye ring     |
| EYE_SCLERA R     |  0.115|  0.335|  0.58 |  0.145|  0.085|  0.95 | NEW                                |
| EYE_IRIS L       | -0.115|  0.335|  0.60 |  0.085|  0.060|  0.55 | NEW — medium iris                  |
| EYE_IRIS R       |  0.115|  0.335|  0.60 |  0.085|  0.060|  0.55 | NEW                                |
| NOSE_BRIDGE      |  0.00 |  0.34 |  0.80 |  0.055|  0.16 |  1.00 | brighter (0.92→1.00), wider/taller |
| NOSE_TIP         |  0.00 |  0.24 |  0.86 |  0.07 |  0.060|  0.92 | brighter (0.82→0.92), wider        |
| NOSTRIL L        | -0.07 |  0.205|  0.70 |  0.045|  0.030|  0.02 | darker (0.16→0.02, true black)     |
| NOSTRIL R        |  0.07 |  0.205|  0.70 |  0.045|  0.030|  0.02 |                                    |
| PHILTRUM         |  0.00 |  0.145|  0.76 |  0.025|  0.060|  0.18 | darker (0.26→0.18)                 |
| MOUTH            |  0.00 |  0.060|  0.78 |  0.22 |  0.055|  0.02 | darker (0.18→0.02), thicker        |
| NASOLABIAL 1 L   | -0.180|  0.105|  0.72 |  0.040|  0.045|  0.22 | darker (0.28→0.22)                 |
| NASOLABIAL 1 R   |  0.180|  0.105|  0.72 |  0.040|  0.045|  0.22 |                                    |
| NASOLABIAL 2 L   | -0.220|  0.020|  0.66 |  0.040|  0.045|  0.22 |                                    |
| NASOLABIAL 2 R   |  0.220|  0.020|  0.66 |  0.040|  0.045|  0.22 |                                    |
| LIP upper        |  0.00 |  0.115|  0.82 |  0.085|  0.030|  0.75 | brighter (0.70→0.75)               |
| LIP lower        |  0.00 |  0.020|  0.82 |  0.095|  0.040|  0.85 | brighter (0.78→0.85)               |
| CHEEK L          | -0.30 |  0.150|  0.62 |  0.14 |  0.10 |  0.70 | brighter (0.62→0.70)               |
| CHEEK R          |  0.30 |  0.150|  0.62 |  0.14 |  0.10 |  0.70 |                                    |
| CHIN             |  0.00 | -0.36 |  0.60 |  0.14 |  0.12 |  0.75 | brighter (0.66→0.75)               |
| JAW L            | -0.42 | -0.05 |  0.42 |  0.12 |  0.16 |  0.18 | darker (0.28→0.18)                 |
| JAW R            |  0.42 | -0.05 |  0.42 |  0.12 |  0.16 |  0.18 |                                    |
| EYE_PUPIL L      | -0.115|  0.335|  0.62 |  0.045|  0.045|  0.02 | NEW — replaces old 'EYE' entry     |
| EYE_PUPIL R      |  0.115|  0.335|  0.62 |  0.045|  0.045|  0.02 | NEW                                |
| HAIR             |  0.00 |  0.70 |  0.40 |  0.66 |  0.22 |  0.02 | true black (0.08→0.02)             |
| HAIR_BACK        |  0.00 |  0.50 | -0.30 |  0.64 |  0.24 |  0.02 | true black                         |

## Other tweaks

- **HEAD_CY**: 0.175 → 0.185 (confidence: medium)
- **frameScale** height budget: `/1.55` → `/1.70` (confidence: high — head
  fills the frame top-to-bottom in both 80×40 and 120×45)
- **shadeChar ramp**: `' .:-=+*#%@'` → `' .:-=+*##%@\u2588\u2588\u2588'`
  (replaced the # and % with one extra # and three `█` at the bright end;
  *added* three `█` at the bright end so tone=1.0 always renders solid)
  — wait, the actual edit was ` .:-=+*#%@███` (no character deleted, three
  `█` appended), giving a 13-step ramp with TRUE black at both ends.
- **shadeColor**: tone ≤ 0.05 → `[0,0,0]` instead of `[12,12,12]` (true
  black instead of "very dark green")
- **Stencil paint loop**: removed the `Math.max(0.12, …)` floor clamp so
  `tone = 0.02` actually lands as `tone = 0.02`.
- **Light direction**: kept at upper-right-front `(0.4, 0.45, 0.8)`.
- **Occlusion guard**: every face feature carries `occludedGuard: true` so
  no ghost-face on the back of the skull at yaw ≈ π.
- **HAIR_BACK** keeps its `occlusionMargin: 0.7` so the near-side skull is
  still painted at partial-yaw views.