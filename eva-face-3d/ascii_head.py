#!/usr/bin/env python3
"""
ASCII 3D Head — Terminal version (identical 5 modes as browser).
Uses ANSI 24-bit color for depth, shadows, and lighting.
"""

import sys, os, math, time, random
import numpy as np

# ─── OBJ Parser ──────────────────────────────────────────────────────────────
def parse_obj(path):
    verts, faces = [], []
    with open(path) as f:
        for line in f:
            if line.startswith('v '):
                p = line.split()
                verts.append([float(p[1]), float(p[2]), float(p[3])])
            elif line.startswith('f '):
                face = [int(p.split('/')[0]) - 1 for p in line.split()[1:]]
                if len(face) >= 3:
                    faces.append(face)
    return np.array(verts), faces

def normalize(v, h=1.8):
    v = v - v.mean(axis=0)
    span = (v.max(axis=0) - v.min(axis=0)).max()
    return v * (h / span)

def rot_y(v, a):
    c, s = math.cos(a), math.sin(a)
    return v @ np.array([[c,0,s],[0,1,0],[-s,0,c]])

def rot_x(v, a):
    c, s = math.cos(a), math.sin(a)
    return v @ np.array([[1,0,0],[0,c,-s],[0,s,c]])

def project(v, w, h, fov=350):
    zs = v[:, 2] + 3.0
    zs[zs < 0.01] = 0.01
    px = (v[:, 0] * fov / zs) + w / 2
    py = (-v[:, 1] * fov / zs) + h / 2

    # Fit the head centered inside the viewport, never exceeding its edges.
    near = zs > 0.6
    if np.any(near):
        rx = np.abs(px[near] - w / 2)
        ry = np.abs(py[near] - h / 2)
        big = (rx > 4 * min(w, h)) | (ry > 4 * min(w, h))
        rx, ry = rx[~big], ry[~big]
        if len(rx) > 0:
            radius = max(rx.max(), ry.max(), 1e-6)
            scale = min((0.9 * min(w, h) / 2) / radius, 2.5)
            px = (px - w / 2) * scale + w / 2
            py = (py - h / 2) * scale + h / 2
    return px, py, zs

def point_in_poly(x, y, pxs, pys):
    n = len(pxs)
    inside = False
    j = n - 1
    for i in range(n):
        if ((pys[i] > y) != (pys[j] > y)) and (x < (pxs[j]-pxs[i])*(y-pys[i])/(pys[j]-pys[i]+1e-10)+pxs[i]):
            inside = not inside
        j = i
    return inside

# ─── ANSI helpers ─────────────────────────────────────────────────────────────
def rgb(r, g, b):
    return f"\033[38;2;{r};{g};{b}m"

RESET = "\033[0m"
BG = "\033[48;2;8;8;12m"
CLEAR = "\033[2J\033[H"

# ─── Lighting ─────────────────────────────────────────────────────────────────
LIGHT = np.array([0.35, 0.55, 0.75])
LIGHT /= np.linalg.norm(LIGHT)
AMBIENT = 0.32

def face_normals(v, faces):
    normals = []
    for f in faces:
        v0, v1, v2 = v[f[0]], v[f[1]], v[f[2]]
        n = np.cross(v1-v0, v2-v0)
        l = np.linalg.norm(n)
        normals.append(n/l if l > 0 else np.array([0,0,1]))
    return normals

def lit_color(nx, ny, nz, br, bg, bb):
    dot = nx*LIGHT[0] + ny*LIGHT[1] + nz*LIGHT[2]
    diff = max(0, dot)
    spec = max(0, dot)**32 * 0.5
    intensity = AMBIENT + diff * 0.88
    return (
        min(255, int(br * intensity + spec * 255)),
        min(255, int(bg * intensity + spec * 255)),
        min(255, int(bb * intensity + spec * 255)),
    )

# ─── Mode 0: WIREFRAME ──────────────────────────────────────────────────────
def render_wireframe(v, faces, normals, px, py, zs, w, h):
    scr = [[None]*w for _ in range(h)]
    zbuf = [[1e9]*w for _ in range(h)]

    # Subtle face fill
    for fi, f in enumerate(faces):
        nx, ny, nz = normals[fi]
        if nz < -0.05:
            continue
        xs = [px[i] for i in f]
        ys = [py[i] for i in f]
        z_avg = np.mean([zs[i] for i in f])
        r, g, b = lit_color(nx, ny, nz, 15, 50, 25)
        min_x = max(0, int(min(xs)))
        max_x = min(w-1, int(max(xs)))
        min_y = max(0, int(min(ys)))
        max_y = min(h-1, int(max(ys)))
        for sy in range(min_y, max_y+1, 2):
            for sx in range(min_x, max_x+1, 2):
                if point_in_poly(sx, sy, xs, ys) and z_avg < zbuf[sy][sx]:
                    zbuf[sy][sx] = z_avg
                    scr[sy][sx] = (r>>1, g>>1, b>>1)

    # Edges
    drawn = set()
    for f in faces:
        for i in range(len(f)):
            a, b = f[i], f[(i+1) % len(f)]
            key = (min(a,b), max(a,b))
            if key in drawn:
                continue
            drawn.add(key)
            z = (zs[a] + zs[b]) / 2
            dn = max(0, min(1, (z-1)/3))
            cr = int(dn*40+10)
            cg = int(dn*200+55)
            cb = int(dn*80+20)
            # Bresenham
            x0,y0,x1,y1 = int(px[a]),int(py[a]),int(px[b]),int(py[b])
            dx,dy = abs(x1-x0),-abs(y1-y0)
            sx = 1 if x0<x1 else -1
            sy = 1 if y0<y1 else -1
            e = dx+dy
            while True:
                if 0<=x0<w and 0<=y0<h and z < zbuf[y0][x0]:
                    scr[y0][x0] = (cr, cg, cb)
                    zbuf[y0][x0] = z
                if x0==x1 and y0==y1: break
                e2 = 2*e
                if e2 >= dy: e += dy; x0 += sx
                if e2 <= dx: e += dx; y0 += sy

    return scr

# ─── Mode 1: POINTS ──────────────────────────────────────────────────────────
def render_points(v, faces, normals, px, py, zs, w, h):
    scr = [[None]*w for _ in range(h)]
    zbuf = [[1e9]*w for _ in range(h)]

    # Vertex normals
    vn = np.zeros((len(v), 3))
    for fi, f in enumerate(faces):
        for idx in f:
            vn[idx] += normals[fi]
    for i in range(len(v)):
        l = np.linalg.norm(vn[i])
        if l > 0: vn[i] /= l

    for i in range(len(v)):
        x, y, z = int(px[i]), int(py[i]), zs[i]
        dn = max(0, min(1, (z-1)/3))
        nx, ny, nz = vn[i]
        cr, cg, cb = lit_color(nx, ny, nz, 0, 255, 80)
        sz = max(1, int((1-dn)*3))
        for dy in range(-sz, sz+1):
            for dx in range(-sz, sz+1):
                if dx*dx+dy*dy <= sz*sz:
                    sx, sy = x+dx, y+dy
                    if 0<=sx<w and 0<=sy<h and z < zbuf[sy][sx]:
                        scr[sy][sx] = (cr, cg, cb)
                        zbuf[sy][sx] = z
    return scr

# ─── Mode 2: MATRIX ──────────────────────────────────────────────────────────
MATRIX_CHARS = list('ァアィイゥウェエォオカガキギクグケゲコゴサザシジスズセゼソゾタダチヂッツヅテデトドナニヌネノハバパヒビピフブプヘベペホボポマミムメモャヤュユョヨラリルレロヮワヰヱヲン')

def render_matrix(v, faces, normals, px, py, zs, w, h):
    scr = [[None]*w for _ in range(h)]
    zbuf = [[1e9]*w for _ in range(h)]
    cell_w, cell_h = 8, 14
    cols, rows = w // cell_w, h // cell_h
    char_z = [[1e9]*cols for _ in range(rows)]
    char_ch = [['']*cols for _ in range(rows)]
    char_br = [[0.0]*cols for _ in range(rows)]

    for fi, f in enumerate(faces):
        nx, ny, nz = normals[fi]
        if nz < -0.1:
            continue
        xs = [px[i] for i in f]
        ys = [py[i] for i in f]
        z_avg = np.mean([zs[i] for i in f])
        cr, cg, cb = lit_color(nx, ny, nz, 0, 255, 90)
        bright = (cr + cg + cb) / 765
        min_c = max(0, int(min(xs) / cell_w))
        max_c = min(cols-1, int(max(xs) / cell_w))
        min_r = max(0, int(min(ys) / cell_h))
        max_r = min(rows-1, int(max(ys) / cell_h))
        for cy in range(min_r, max_r+1):
            for cx in range(min_c, max_c+1):
                sx, sy = cx*cell_w+cell_w//2, cy*cell_h+cell_h//2
                if point_in_poly(sx, sy, xs, ys) and z_avg < char_z[cy][cx]:
                    char_z[cy][cx] = z_avg
                    char_ch[cy][cx] = MATRIX_CHARS[(cx+cy) % len(MATRIX_CHARS)]
                    char_br[cy][cx] = bright

    # Draw as ANSI colored characters
    for cy in range(rows):
        for cx in range(cols):
            if char_z[cy][cx] >= 1e9:
                continue
            dn = max(0, min(1, (char_z[cy][cx]-1)/3))
            b = char_br[cy][cx]
            cr = int(b * 30 * dn)
            cg = int(b * 255 * (0.9 + 0.1*(1-dn)))
            cb = int(b * 60 * dn)
            # Set the pixel block
            px0, py0 = cx*cell_w, cy*cell_h
            for dy in range(min(cell_h, h-py0)):
                for dx in range(min(cell_w, w-px0)):
                    scr[py0+dy][px0+dx] = (cr, cg, cb)
    return scr

# ─── Mode 3: DEPTH ───────────────────────────────────────────────────────────
def render_depth(v, faces, normals, px, py, zs, w, h):
    scr = [[None]*w for _ in range(h)]
    zbuf = [[1e9]*w for _ in range(h)]

    sorted_f = sorted(range(len(faces)), key=lambda i: -np.mean([zs[j] for j in faces[i]]))

    for fi in sorted_f:
        f = faces[fi]
        nx, ny, nz = normals[fi]
        xs = [px[i] for i in f]
        ys = [py[i] for i in f]
        z_avg = np.mean([zs[i] for i in f])
        dn = max(0, min(1, (z_avg-0.5)/4))
        cr, cg, cb = lit_color(nx, ny, nz, 205, 150, 115)
        min_x = max(0, int(min(xs)))
        max_x = min(w-1, int(max(xs)))
        min_y = max(0, int(min(ys)))
        max_y = min(h-1, int(max(ys)))
        fog = dn * 0.6
        fr = int(cr*(1-fog)+10*fog)
        fg = int(cg*(1-fog)+15*fog)
        fb = int(cb*(1-fog)+20*fog)
        for sy in range(min_y, max_y+1):
            for sx in range(min_x, max_x+1):
                if point_in_poly(sx, sy, xs, ys) and z_avg < zbuf[sy][sx]:
                    zbuf[sy][sx] = z_avg
                    scr[sy][sx] = (fr, fg, fb)
    return scr

# ─── Mode 4: NORMAL ──────────────────────────────────────────────────────────
def render_normal(v, faces, normals, px, py, zs, w, h):
    scr = [[None]*w for _ in range(h)]
    zbuf = [[1e9]*w for _ in range(h)]

    sorted_f = sorted(range(len(faces)), key=lambda i: -np.mean([zs[j] for j in faces[i]]))

    for fi in sorted_f:
        f = faces[fi]
        nx, ny, nz = normals[fi]
        xs = [px[i] for i in f]
        ys = [py[i] for i in f]
        z_avg = np.mean([zs[i] for i in f])
        dn = max(0, min(1, (z_avg-0.5)/4))

        dot = nx*LIGHT[0]+ny*LIGHT[1]+nz*LIGHT[2]
        diff = max(0, dot)
        spec = max(0, dot)**64 * 0.7
        intensity = 0.3 + diff * 0.85

        nr, ng, nz2 = nx*0.5+0.5, ny*0.5+0.5, nz*0.5+0.5
        base_r = 200 + nr*40
        base_g = 150 + ng*30
        base_b = 120 + nz2*20
        cr = min(255, int(base_r*intensity + spec*200))
        cg = min(255, int(base_g*intensity + spec*180))
        cb = min(255, int(base_b*intensity + spec*160))

        min_x = max(0, int(min(xs)))
        max_x = min(w-1, int(max(xs)))
        min_y = max(0, int(min(ys)))
        max_y = min(h-1, int(max(ys)))
        fog = dn * 0.35
        for sy in range(min_y, max_y+1):
            for sx in range(min_x, max_x+1):
                if point_in_poly(sx, sy, xs, ys) and z_avg < zbuf[sy][sx]:
                    zbuf[sy][sx] = z_avg
                    scr[sy][sx] = (
                        int(cr*(1-fog)+8*fog),
                        int(cg*(1-fog)+12*fog),
                        int(cb*(1-fog)+18*fog),
                    )

    # Wireframe overlay
    drawn = set()
    for f in faces:
        for i in range(len(f)):
            a, b = f[i], f[(i+1)%len(f)]
            key = (min(a,b), max(a,b))
            if key in drawn: continue
            drawn.add(key)
            z = (zs[a]+zs[b])/2
            x0,y0,x1,y1 = int(px[a]),int(py[a]),int(px[b]),int(py[b])
            dx2,dy2 = abs(x1-x0),-abs(y1-y0)
            sx = 1 if x0<x1 else -1
            sy = 1 if y0<y1 else -1
            e = dx2+dy2
            while True:
                if 0<=x0<w and 0<=y0<h and z < zbuf[y0][x0]:
                    scr[y0][x0] = (20, 50, 30)
                    zbuf[y0][x0] = z
                if x0==x1 and y0==y1: break
                e2 = 2*e
                if e2 >= dy2: e += dy2; x0 += sx
                if e2 <= dx2: e += dx2; y0 += sy

    return scr

# ─── Display ──────────────────────────────────────────────────────────────────
def scr_to_ansi(scr, w, h):
    lines = []
    for y in range(h):
        row = []
        prev = None
        for x in range(w):
            c = scr[y][x]
            if c is None:
                row.append(' ')
            else:
                if c != prev:
                    row.append(f"\033[48;2;{c[0]};{c[1]};{c[2]}m ")
                else:
                    row.append(' ')
                prev = c
        row.append(RESET)
        lines.append(''.join(row))
    return '\n'.join(lines)

# ─── Main ─────────────────────────────────────────────────────────────────────
BANNER = r"""
  ╔══════════════════════════════════════════════════════════╗
  ║     ██╗  ██╗ ██████╗ ███████╗████████╗██████╗  ██████╗ ║
  ║     ██║  ██║██╔═══██╗██╔════╝╚══██╔══╝██╔══██╗██╔═══██╗║
  ║     ███████║██║   ██║███████╗   ██║   ██████╔╝██║   ██║║
  ║     ██╔══██║██║   ██║╚════██║   ██║   ██╔══██╗██║   ██║║
  ║     ██║  ██║╚██████╔╝███████║   ██║   ██║  ██║╚██████╔╝║
  ║     ╚═╝  ╚═╝ ╚═════╝ ╚══════╝   ╚═╝   ╚═╝  ╚═╝ ╚═════╝║
  ║              TERMINAL · 5 MODES · ANSI 24-bit           ║
  ╚══════════════════════════════════════════════════════════╝"""

MODES = {
    '1': ('WIREFRAME',  'Polygon edges + face fill', render_wireframe),
    '2': ('POINTS',     'Vertex cloud with glow',    render_points),
    '3': ('MATRIX',     'Cascading katakana',         render_matrix),
    '4': ('DEPTH',      'Solid depth-shaded fill',    render_depth),
    '5': ('NORMAL',     'Surface-normal lighting',    render_normal),
}

def main():
    print(BANNER)
    models_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'models')
    obj_files = sorted(f for f in os.listdir(models_dir) if f.endswith('.obj'))

    print("\n  Models:")
    for i, f in enumerate(obj_files):
        sz = os.path.getsize(os.path.join(models_dir, f))
        print(f"    [{i+1}] {f}  ({sz//1024}KB)")

    choice = input("\n  Model [1-3]: ").strip() or '1'
    idx = max(0, min(len(obj_files)-1, int(choice)-1))
    verts, faces = parse_obj(os.path.join(models_dir, obj_files[idx]))

    # Face decimation for large meshes (keep ~15k faces for terminal speed)
    if len(faces) > 15000:
        stride = max(1, len(faces) // 15000)
        faces = faces[::stride]

    verts = normalize(verts)
    normals = face_normals(verts, faces)
    print(f"  {len(verts)} verts · {len(faces)} faces\n")

    print("  Modes:")
    for k,(n,d,_) in MODES.items():
        print(f"    [{k}] {n:12s} — {d}")
    print("    [a] ALL animated\n")

    mode = input("  Mode [1-5/a]: ").strip().lower()
    if mode == 'q':
        return

    try:
        cols, rows = os.get_terminal_size()
    except Exception:
        cols, rows = 120, 35
    W = min(cols - 2, 140)
    H = min(rows - 6, 50)

    angle_y = 0.4
    angle_x = 0.15

    if mode == 'a':
        try:
            while True:
                for mk, (name, _, renderer) in MODES.items():
                    v = rot_x(rot_y(verts, angle_y), angle_x)
                    px, py, zs = project(v, W, H)
                    scr = renderer(v, faces, normals, px, py, zs, W, H)
                    print(CLEAR)
                    print(f"\033[38;2;0;255;65m  ═══ {name} ═══  angle={math.degrees(angle_y):.0f}°\033[0m")
                    print(scr_to_ansi(scr, W, H))
                    angle_y += 0.15
                    time.sleep(0.35)
        except KeyboardInterrupt:
            print(RESET + "\n  Done.")
    elif mode in MODES:
        name, _, renderer = MODES[mode]
        try:
            while True:
                v = rot_x(rot_y(verts, angle_y), angle_x)
                px, py, zs = project(v, W, H)
                scr = renderer(v, faces, normals, px, py, zs, W, H)
                print(CLEAR)
                print(f"\033[38;2;0;255;65m  ═══ {name} ═══  angle={math.degrees(angle_y):.0f}°\033[0m")
                print(scr_to_ansi(scr, W, H))
                angle_y += 0.08
                time.sleep(0.12)
        except KeyboardInterrupt:
            print(RESET + "\n  Done.")

if __name__ == '__main__':
    main()
