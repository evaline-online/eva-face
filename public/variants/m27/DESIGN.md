# m27 FACE_STENCIL Specification

| Feature | lx | ly | lz | rx | ry | tone | Notes |
|---------|----|----|----|----|----|----|-------|
| FOREHEAD | 0 | 0.50 | 0.78 | 0.32 | 0.18 | 0.60 | Broad bright block |
| BROW_SHADOW_L | -0.115 | 0.385 | 0.66 | 0.16 | 0.040 | 0.18 | Under-brow dark arc |
| BROW_SHADOW_R | 0.115 | 0.385 | 0.66 | 0.16 | 0.040 | 0.18 | Under-brow dark arc |
| BROW_L | -0.115 | 0.475 | 0.70 | 0.18 | 0.045 | 0.88 | Bright ridge (was 0.92) |
| BROW_R | 0.115 | 0.475 | 0.70 | 0.18 | 0.045 | 0.88 | Bright ridge (was 0.92) |
| NOSE_BRIDGE | 0 | 0.34 | 0.78 | 0.045 | 0.14 | 0.92 | Central column |
| NOSE_TIP | 0 | 0.24 | 0.84 | 0.06 | 0.055 | 0.82 | Tip highlight |
| NOSTRIL_L | -0.07 | 0.205 | 0.70 | 0.045 | 0.030 | 0.16 | Dark shadow |
| NOSTRIL_R | 0.07 | 0.205 | 0.70 | 0.045 | 0.030 | 0.16 | Dark shadow |
| PHILTRUM | 0 | 0.145 | 0.76 | 0.025 | 0.060 | 0.26 | Midline groove |
| MOUTH | 0 | 0.060 | 0.76 | 0.20 | 0.045 | 0.18 | Dark parting line |
| NASOLABIAL_L1 | -0.180 | 0.105 | 0.72 | 0.040 | 0.045 | 0.28 | Smile fold upper |
| NASOLABIAL_R1 | 0.180 | 0.105 | 0.72 | 0.040 | 0.045 | 0.28 | Smile fold upper |
| NASOLABIAL_L2 | -0.220 | 0.020 | 0.66 | 0.040 | 0.045 | 0.28 | Smile fold lower |
| NASOLABIAL_R2 | 0.220 | 0.020 | 0.66 | 0.040 | 0.045 | 0.28 | Smile fold lower |
| LIP_CUPID | 0 | 0.115 | 0.82 | 0.085 | 0.030 | 0.70 | Cupid's bow |
| LIP_LOWER | 0 | 0.020 | 0.82 | 0.095 | 0.040 | 0.78 | Lower lip highlight |
| CHEEK_L | -0.30 | 0.150 | 0.62 | 0.14 | 0.10 | 0.62 | Highlight |
| CHEEK_R | 0.30 | 0.150 | 0.62 | 0.14 | 0.10 | 0.62 | Highlight |
| CHIN | 0 | -0.36 | 0.60 | 0.14 | 0.12 | 0.66 | Chin light |
| JAW_L | -0.42 | -0.05 | 0.42 | 0.12 | 0.16 | 0.28 | Side shadow |
| JAW_R | 0.42 | -0.05 | 0.42 | 0.12 | 0.16 | 0.28 | Side shadow |
| EYE_L | -0.115 | 0.335 | 0.60 | 0.13 | 0.075 | 0.10 | **Changed from 0.12** |
| EYE_R | 0.115 | 0.335 | 0.60 | 0.13 | 0.075 | 0.10 | **Changed from 0.12** |
| HAIR | 0 | 0.70 | 0.40 | 0.64 | 0.20 | 0.06 | **Changed from 0.08** |
| HAIR_BACK | 0 | 0.50 | -0.30 | 0.64 | 0.24 | 0.06 | Back hair |

## Non-stencil Constants Changed
| Constant | Reference | m27 |
|----------|-----------|-----|
| floor clamp | 0.12 | 0.05 |
| HEAD_CY | 0.175 | 0.170 |
| frameScale min | screenW/3.5, screenH/1.55 | screenW/3.4, screenH/1.50 |
