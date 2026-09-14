# eva-face
**EvaBot Face — avatar rendering engine (2D / 3D / Matrix / ASCII).**

## Contents
- `eva-face-app/` — web face UI (assets, index.html, multihead)
- `eva-face-3d/` — Python 3D face server (`server.py`, :8093, WebGL/Three.js models)
- `eva-face-matrix/` — Matrix-style renderer (`matrix_face.py`)
- `ascii-art/` — ASCII face generators (build.js, head.js, faces.json)

Routes: nginx `/face` → :8093
