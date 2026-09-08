#!/usr/bin/env python3
"""
╔═══════════════════════════════════════════════════════════════════════════╗
║                      THE MATRIX: 3D FACE IN TERMINAL                      ║
║                 Real-time 3D Matrix Rain & Cyberpunk Hologram             ║
╚═══════════════════════════════════════════════════════════════════════════╝
"""

import sys
import os
import time
import math
import select
import tty
import termios
import signal
import atexit
import argparse
import random
import numpy as np

# ─── Matrix Characters & Color Constants ─────────────────────────────────────
# Authentic half-width Katakana + Matrix digits and symbols
KATAKANA = "ｦｱｳｴｵｶｷｹｹｺｻｼｽｾｿﾀﾂﾃﾅﾆﾇﾈﾊﾋﾎﾏﾐﾑﾒﾓﾔﾕﾗﾘﾜ"
MATRIX_SYMBOLS = "0123456789:・=*+-<>¦|ZXY"
MATRIX_CHARS = list(KATAKANA + MATRIX_SYMBOLS)

ASCII_RAMP = " .'`^\",:;Il!i><~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$"

# ANSI Control Codes
C_HIDE = "\033[?25l"
C_SHOW = "\033[?25h"
C_HOME = "\033[H"
C_CLEAR = "\033[2J"
C_ALT_ON = "\033[?1049h"
C_ALT_OFF = "\033[?1049l"
C_RESET = "\033[0m"

# ─── Mesh Loading & Geometry ──────────────────────────────────────────────────
def load_obj(path):
    """Load OBJ file vertices and faces."""
    verts = []
    faces = []
    if not os.path.exists(path):
        return None, None
    with open(path, 'r', encoding='utf-8', errors='ignore') as f:
        for line in f:
            if line.startswith('v '):
                p = line.split()
                verts.append([float(p[1]), float(p[2]), float(p[3])])
            elif line.startswith('f '):
                parts = line.split()[1:]
                fv = []
                for p in parts:
                    try:
                        idx = int(p.split('/')[0]) - 1
                        fv.append(idx)
                    except ValueError:
                        continue
                if len(fv) >= 3:
                    faces.append(fv)
    if not verts:
        return None, None
    return np.array(verts, dtype=np.float32), faces


def create_procedural_head():
    """Fallback 3D ellipsoid / cyber head mesh if no OBJ file is found."""
    lat_steps = 36
    lon_steps = 48
    verts = []
    faces = []
    for i in range(lat_steps + 1):
        lat = -math.pi / 2 + math.pi * (i / lat_steps)
        y = math.sin(lat) * 1.3
        r = math.cos(lat)
        for j in range(lon_steps):
            lon = 2 * math.pi * (j / lon_steps)
            x = math.cos(lon) * r * 0.95
            z = math.sin(lon) * r * 1.15
            # Indent eyes and pull nose
            if z > 0:
                if abs(x) < 0.25 and 0.0 < y < 0.4:
                    z += 0.35  # nose
                elif 0.2 < abs(x) < 0.6 and 0.3 < y < 0.7:
                    z -= 0.15  # eye socket
                elif abs(x) < 0.35 and -0.4 < y < -0.15:
                    z += 0.08  # lips
            verts.append([x, y, z])

    for i in range(lat_steps):
        for j in range(lon_steps):
            p1 = i * lon_steps + j
            p2 = p1 + lon_steps
            p3 = i * lon_steps + ((j + 1) % lon_steps)
            p4 = p2 + 1 if (j + 1) < lon_steps else (i + 1) * lon_steps
            faces.append([p1, p2, p4, p3])

    return np.array(verts, dtype=np.float32), faces


def prepare_dense_mesh(verts, faces):
    """Normalize mesh, compute vertex normals, and sample dense surface points."""
    c = (verts.max(axis=0) + verts.min(axis=0)) / 2.0
    span = (verts.max(axis=0) - verts.min(axis=0)).max()
    verts = (verts - c) / (span / 2.0)  # scale to [-1, 1]

    # Compute vertex normals
    normals = np.zeros_like(verts)
    for f in faces:
        v0, v1, v2 = verts[f[0]], verts[f[1]], verts[f[2]]
        fn = np.cross(v1 - v0, v2 - v0)
        norm = np.linalg.norm(fn)
        if norm > 1e-6:
            fn /= norm
            for idx in f:
                normals[idx] += fn
    norms = np.linalg.norm(normals, axis=1, keepdims=True)
    norms[norms < 1e-6] = 1.0
    normals /= norms

    # Generate dense sample points
    sample_pts = [verts]
    sample_norms = [normals]

    # Add face centers
    f_centers = []
    f_norms = []
    for f in faces:
        pts = verts[f]
        nms = normals[f]
        f_centers.append(pts.mean(axis=0))
        fn = nms.mean(axis=0)
        norm = np.linalg.norm(fn)
        f_norms.append(fn / norm if norm > 1e-6 else fn)
    if f_centers:
        sample_pts.append(np.array(f_centers, dtype=np.float32))
        sample_norms.append(np.array(f_norms, dtype=np.float32))

    # Add edge midpoints
    edge_pts = []
    edge_nms = []
    for f in faces:
        nv = len(f)
        for i in range(nv):
            j = (i + 1) % nv
            edge_pts.append((verts[f[i]] + verts[f[j]]) * 0.5)
            fn = (normals[f[i]] + normals[f[j]]) * 0.5
            norm = np.linalg.norm(fn)
            edge_nms.append(fn / norm if norm > 1e-6 else fn)
    if edge_pts:
        sample_pts.append(np.array(edge_pts, dtype=np.float32))
        sample_norms.append(np.array(edge_nms, dtype=np.float32))

    all_pts = np.vstack(sample_pts)
    all_norms = np.vstack(sample_norms)

    # Extract edge lines for wireframe mode
    edges = set()
    for f in faces:
        nv = len(f)
        for i in range(nv):
            j = (i + 1) % nv
            v_a, v_b = f[i], f[j]
            edges.add((min(v_a, v_b), max(v_a, v_b)))
    edge_list = list(edges)

    return all_pts, all_norms, verts, normals, edge_list


# ─── Matrix Rain Simulation ──────────────────────────────────────────────────
class RainStream:
    def __init__(self, x, height):
        self.x = x
        self.height = height
        self.reset(initial=True)

    def reset(self, initial=False):
        self.y = random.uniform(-self.height, 0) if initial else random.uniform(-18, -1)
        self.speed = random.uniform(0.5, 1.3)
        self.length = random.randint(8, max(12, self.height // 2))
        self.head_char = random.choice(MATRIX_CHARS)

    def step(self):
        self.y += self.speed
        if random.random() < 0.35:
            self.head_char = random.choice(MATRIX_CHARS)
        if self.y - self.length > self.height:
            self.reset(initial=False)


# ─── Main Renderer Engine ─────────────────────────────────────────────────────
class MatrixFaceApp:
    MODES = [
        ("DEUS EX MACHINA", "Full 3D Cyber Face with matrix background rain"),
        ("RAIN SCANNER",   "Falling digital rain slicing & illuminating the 3D head"),
        ("CYBER WIREFRAME","Holographic operator vector wireframe console"),
        ("ASCII DENSITY",  "High-resolution phosphorescent ASCII depth shading"),
    ]

    def __init__(self, model_paths, default_mode=0):
        self.model_paths = [p for p in model_paths if os.path.exists(p)]
        self.current_model_idx = 0
        self.mode = default_mode
        self.paused = False
        self.show_rain = True
        self.running = True

        # Camera & Transform
        self.yaw = 0.25
        self.pitch = 0.05
        self.roll = 0.0
        self.zoom = 1.0
        self.auto_rotate = True
        self.rot_speed = 0.035

        # Lighting Direction (Key Light from top-right-front)
        l_vec = np.array([0.45, 0.65, 0.60], dtype=np.float32)
        self.light_dir = l_vec / np.linalg.norm(l_vec)

        # View Direction
        self.view_dir = np.array([0.0, 0.0, 1.0], dtype=np.float32)
        h_vec = self.light_dir + self.view_dir
        self.half_v = h_vec / np.linalg.norm(h_vec)

        # Terminal state
        self.old_termios = None
        self.w, self.h = self.get_term_size()

        # Matrix rain streams
        self.init_rain()

        # Phosphor decay buffer for scanner mode
        self.phosphor = np.zeros((self.h, self.w), dtype=np.float32)

        # Matrix chars cache
        self.screen_chars = np.random.choice(MATRIX_CHARS, size=(self.h, self.w))

        # Load initial model
        self.load_current_model()

    def get_term_size(self):
        try:
            cols, rows = os.get_terminal_size()
            return max(40, cols), max(20, rows)
        except Exception:
            return 100, 40

    def init_rain(self):
        self.streams = [RainStream(x, self.h) for x in range(self.w)]
        self.phosphor = np.zeros((self.h, self.w), dtype=np.float32)
        self.screen_chars = np.random.choice(MATRIX_CHARS, size=(self.h, self.w))

    def on_resize(self, signum=None, frame=None):
        self.w, self.h = self.get_term_size()
        self.init_rain()

    def load_current_model(self):
        if self.model_paths:
            path = self.model_paths[self.current_model_idx]
            v, f = load_obj(path)
            self.model_name = os.path.basename(path)
        else:
            v, f = create_procedural_head()
            self.model_name = "Procedural Cyber Head"

        if v is None:
            v, f = create_procedural_head()
            self.model_name = "Procedural Cyber Head"

        self.pts, self.norms, self.base_verts, self.base_norms, self.edges = prepare_dense_mesh(v, f)

    def next_model(self):
        if self.model_paths:
            self.current_model_idx = (self.current_model_idx + 1) % len(self.model_paths)
            self.load_current_model()

    # ─── Terminal Raw Mode Setup ──────────────────────────────────────────────
    def setup_terminal(self):
        if sys.stdin.isatty():
            self.old_termios = termios.tcgetattr(sys.stdin)
            tty.setcbreak(sys.stdin.fileno())
        sys.stdout.write(C_ALT_ON + C_HIDE + C_CLEAR)
        sys.stdout.flush()

        signal.signal(signal.SIGWINCH, self.on_resize)
        atexit.register(self.restore_terminal)

    def restore_terminal(self):
        sys.stdout.write(C_RESET + C_SHOW + C_ALT_OFF)
        sys.stdout.flush()
        if self.old_termios and sys.stdin.isatty():
            termios.tcsetattr(sys.stdin, termios.TCSADRAIN, self.old_termios)

    # ─── Non-blocking Input Handler ───────────────────────────────────────────
    def handle_input(self):
        while True:
            r, _, _ = select.select([sys.stdin], [], [], 0)
            if not r:
                break
            ch = sys.stdin.read(1)
            if ch == '\033':
                # Escape sequence (e.g. arrow keys)
                r2, _, _ = select.select([sys.stdin], [], [], 0.03)
                if r2:
                    seq = sys.stdin.read(2)
                    if seq == '[A':    # Up
                        self.pitch += 0.12
                    elif seq == '[B':  # Down
                        self.pitch -= 0.12
                    elif seq == '[C':  # Right
                        self.yaw += 0.15
                        self.auto_rotate = False
                    elif seq == '[D':  # Left
                        self.yaw -= 0.15
                        self.auto_rotate = False
                else:
                    self.running = False
            elif ch in ('q', 'Q', '\x03'):
                self.running = False
            elif ch in ('1', '2', '3', '4'):
                self.mode = int(ch) - 1
            elif ch in (' ', 'p'):
                self.auto_rotate = not self.auto_rotate
            elif ch in ('a', 'A'):
                self.yaw -= 0.15
                self.auto_rotate = False
            elif ch in ('d', 'D'):
                self.yaw += 0.15
                self.auto_rotate = False
            elif ch in ('w', 'W'):
                self.pitch += 0.12
            elif ch in ('s', 'S'):
                self.pitch -= 0.12
            elif ch in ('+', '='):
                self.zoom = min(2.5, self.zoom * 1.1)
            elif ch in ('-', '_'):
                self.zoom = max(0.4, self.zoom / 1.1)
            elif ch in ('r', 'R'):
                self.show_rain = not self.show_rain
            elif ch in ('m', 'M'):
                self.next_model()

    # ─── Frame Computation & Rendering ────────────────────────────────────────
    def render_frame(self):
        W, H = self.w, self.h

        # Update rain streams
        if self.show_rain:
            for s in self.streams:
                s.step()

        # Randomly mutate 4% of background screen characters for live Matrix shimmer
        mask = np.random.rand(H, W) < 0.04
        if np.any(mask):
            self.screen_chars[mask] = np.random.choice(MATRIX_CHARS, size=np.count_nonzero(mask))

        # Rotate mesh
        cy, sy = math.cos(self.yaw), math.sin(self.yaw)
        cx, sx = math.cos(self.pitch), math.sin(self.pitch)
        Ry = np.array([[cy, 0, sy], [0, 1, 0], [-sy, 0, cy]], dtype=np.float32)
        Rx = np.array([[1, 0, 0], [0, cx, -sx], [0, sx, cx]], dtype=np.float32)
        R = Ry @ Rx

        r_pts = self.pts @ R
        r_norms = self.norms @ R

        # Camera projection
        cam_dist = 2.4 / self.zoom
        fov = min(W * 0.28, H * 0.58) * self.zoom
        zs = r_pts[:, 2] + cam_dist

        # Aspect ratio correction (terminal chars are ~2:1 taller than wide)
        px = np.int32(np.round(W / 2.0 + (r_pts[:, 0] / zs) * fov * 2.0))
        py = np.int32(np.round(H / 2.0 - (r_pts[:, 1] / zs) * fov))

        valid = (px >= 0) & (px < W) & (py >= 0) & (py < H) & (zs > 0.1)
        v_px = px[valid]
        v_py = py[valid]
        v_pz = zs[valid]
        v_norms = r_norms[valid]

        # Blinn-Phong Surface Lighting
        diffuse = np.maximum(0.0, np.sum(v_norms * self.light_dir, axis=1))
        specular = np.maximum(0.0, np.sum(v_norms * self.half_v, axis=1)) ** 18
        # Rim light (Fresnel glow along head silhouette)
        rim = (1.0 - np.maximum(0.0, v_norms[:, 2])) ** 2.5 * 0.35

        intensity = 0.12 + 0.60 * diffuse + 0.45 * specular + rim
        intensity = np.clip(intensity, 0.0, 1.0)

        # Z-Buffer sorting: farthest points first so nearest overwrite
        order = np.argsort(-v_pz)
        zbuf = np.full((H, W), 1e9, dtype=np.float32)
        lum = np.zeros((H, W), dtype=np.float32)

        zbuf[v_py[order], v_px[order]] = v_pz[order]
        lum[v_py[order], v_px[order]] = intensity[order]

        # Build rain grid
        rain_val = np.zeros((H, W), dtype=np.float32)
        rain_is_head = np.zeros((H, W), dtype=bool)

        if self.show_rain:
            for s in self.streams:
                x = s.x
                if x >= W:
                    continue
                head_y = int(s.y)
                if 0 <= head_y < H:
                    rain_val[head_y, x] = 1.0
                    rain_is_head[head_y, x] = True
                    self.screen_chars[head_y, x] = s.head_char
                # Tail
                tail_start = max(0, head_y - s.length)
                tail_end = min(H, head_y)
                if tail_start < tail_end:
                    for ty in range(tail_start, tail_end):
                        dist = head_y - ty
                        decay = max(0.0, 1.0 - dist / s.length)
                        if decay > rain_val[ty, x]:
                            rain_val[ty, x] = decay

        # Mode 1: Rain Scanner phosphor persistence
        if self.mode == 1:
            # When rain hits the face, recharge phosphor
            hit = (zbuf < 1e8) & (rain_val > 0.3)
            self.phosphor[hit] = np.maximum(self.phosphor[hit], rain_val[hit])
            # Exponential decay
            self.phosphor *= 0.88

        # Assemble ANSI string
        lines = []
        # Header Status Bar
        mode_name, mode_desc = self.MODES[self.mode]
        head_title = (
            f"\033[1;32m ░▒▓ MATRIX 3D FACE ▓▒░ \033[0m "
            f"\033[38;2;120;255;120m[{self.mode+1}] {mode_name}\033[0m "
            f"\033[38;2;0;180;50mModel: {self.model_name} | Yaw: {math.degrees(self.yaw)%360:.0f}° | Zoom: {self.zoom:.1f}x\033[0m"
        )
        lines.append(head_title)

        ramp_len = len(ASCII_RAMP)

        for y in range(1, H - 1):
            row_chars = []
            prev_color = None
            for x in range(W):
                has_face = zbuf[y, x] < 1e8
                face_lum = lum[y, x]
                ch = self.screen_chars[y, x]

                # MODE 0: DEUS EX MACHINA (Luminous Cyber Face + Background Rain)
                if self.mode == 0:
                    if has_face:
                        # Face made of glowing code
                        b = face_lum
                        if b > 0.82:
                            r, g, bl = int(220 + 35 * b), 255, int(220 + 35 * b)
                        elif b > 0.45:
                            r, g, bl = int(40 * (1 - b)), int(180 + 75 * b), int(40 * (1 - b))
                        elif b > 0.18:
                            r, g, bl = 0, int(80 + 160 * b), 12
                        else:
                            r, g, bl = 0, int(35 + 80 * b), 6
                    elif self.show_rain and rain_val[y, x] > 0.02:
                        # Background rain
                        rv = rain_val[y, x]
                        if rain_is_head[y, x]:
                            r, g, bl = 240, 255, 240
                        else:
                            r, g, bl = int(10 * rv), int(200 * rv), int(30 * rv)
                    else:
                        r, g, bl = 0, 0, 0
                        ch = " "

                # MODE 1: DIGITAL RAIN SCANNER (Rain slices & reveals face)
                elif self.mode == 1:
                    if has_face:
                        ph = self.phosphor[y, x]
                        rv = rain_val[y, x]
                        total_light = max(rv * 0.9, ph * 0.95) * face_lum
                        if total_light > 0.75:
                            r, g, bl = 240, 255, 245
                        elif total_light > 0.35:
                            r, g, bl = 20, int(160 + 95 * total_light), 30
                        elif total_light > 0.08:
                            r, g, bl = 0, int(60 + 140 * total_light), 10
                        else:
                            # Faint wireframe trace in dark
                            r, g, bl = 0, int(25 * face_lum), 4
                    elif self.show_rain and rain_val[y, x] > 0.02:
                        rv = rain_val[y, x]
                        if rain_is_head[y, x]:
                            r, g, bl = 220, 255, 220
                        else:
                            r, g, bl = int(10 * rv), int(190 * rv), int(25 * rv)
                    else:
                        r, g, bl = 0, 0, 0
                        ch = " "

                # MODE 2: CYBER WIREFRAME (Operator holographic terminal)
                elif self.mode == 2:
                    if has_face:
                        b = face_lum
                        # Silhouette & highlights
                        if b > 0.75:
                            r, g, bl = 180, 255, 200
                            ch = "+" if (x + y) % 2 == 0 else "*"
                        elif b > 0.35:
                            r, g, bl = 0, 220, 60
                            ch = "/" if (x + y) % 2 == 0 else "\\"
                        else:
                            r, g, bl = 0, 90, 25
                            ch = "."
                    elif self.show_rain and rain_val[y, x] > 0.02:
                        rv = rain_val[y, x]
                        r, g, bl = 0, int(110 * rv), 15
                    else:
                        r, g, bl = 0, 0, 0
                        ch = " "

                # MODE 3: ASCII DENSITY SHADING (High-contrast depth shading)
                elif self.mode == 3:
                    if has_face:
                        b = face_lum
                        idx = int(b * (ramp_len - 1))
                        ch = ASCII_RAMP[idx]
                        if b > 0.8:
                            r, g, bl = 240, 255, 230
                        elif b > 0.4:
                            r, g, bl = 0, int(160 + 95 * b), 20
                        else:
                            r, g, bl = 0, int(50 + 130 * b), 10
                    elif self.show_rain and rain_val[y, x] > 0.02:
                        rv = rain_val[y, x]
                        r, g, bl = 0, int(120 * rv), 15
                        ch = "|" if rain_is_head[y, x] else ":"
                    else:
                        r, g, bl = 0, 0, 0
                        ch = " "

                # Color change optimization
                if r == 0 and g == 0 and bl == 0:
                    color_code = "\033[0m"
                    ch = " "
                else:
                    color_code = f"\033[38;2;{r};{g};{bl}m"

                if color_code != prev_color:
                    row_chars.append(color_code + ch)
                    prev_color = color_code
                else:
                    row_chars.append(ch)

            row_chars.append(C_RESET)
            lines.append("".join(row_chars))

        # Footer Navigation Bar
        footer = (
            f"\033[38;2;0;255;65m[1-4]\033[0m Mode  "
            f"\033[38;2;0;255;65m[Space]\033[0m Pause  "
            f"\033[38;2;0;255;65m[Arrows/WASD]\033[0m Rotate  "
            f"\033[38;2;0;255;65m[+/-]\033[0m Zoom  "
            f"\033[38;2;0;255;65m[R]\033[0m Rain  "
            f"\033[38;2;0;255;65m[M]\033[0m Model  "
            f"\033[38;2;0;255;65m[Q]\033[0m Exit"
        )
        lines.append(footer)

        # Output entire frame buffer in single atomic flush at (1,1)
        sys.stdout.write(C_HOME + "\n".join(lines))
        sys.stdout.flush()

    # ─── Main Game Loop ───────────────────────────────────────────────────────
    def run(self):
        self.setup_terminal()
        target_fps = 30.0
        frame_time = 1.0 / target_fps

        try:
            while self.running:
                t_start = time.perf_counter()
                self.handle_input()

                if self.auto_rotate and not self.paused:
                    self.yaw += self.rot_speed

                self.render_frame()

                elapsed = time.perf_counter() - t_start
                sleep_time = frame_time - elapsed
                if sleep_time > 0:
                    time.sleep(sleep_time)
        finally:
            self.restore_terminal()


# ─── Entry Point ─────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(description="Matrix 3D Face Terminal Renderer")
    parser.add_argument("--model", type=str, default=None, help="Path to custom OBJ model")
    parser.add_argument("--mode", type=int, default=0, choices=[1, 2, 3, 4], help="Visual mode (1-4)")
    parser.add_argument("--no-rain", action="store_true", help="Disable digital rain background")
    args = parser.parse_args()

    script_dir = os.path.dirname(os.path.abspath(__file__))
    models_dir = os.path.join(script_dir, "models")

    model_candidates = []
    if args.model:
        model_candidates.append(args.model)

    # Standard model search locations
    standard_models = [
        os.path.join(models_dir, "head_lightning.obj"),
        os.path.join(models_dir, "makehuman_base.obj"),
        os.path.join(models_dir, "head_spot.obj"),
    ]
    model_candidates.extend(standard_models)

    selected_mode = args.mode - 1 if args.mode else 0

    app = MatrixFaceApp(model_candidates, default_mode=selected_mode)
    if args.no_rain:
        app.show_rain = False

    app.run()


if __name__ == "__main__":
    main()
