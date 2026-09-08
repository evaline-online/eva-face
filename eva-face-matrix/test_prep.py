#!/usr/bin/env python3
"""
Test benchmark for 3D Matrix Face renderer
"""
import os, sys, math, time, random
import numpy as np

def load_obj(path):
    verts, faces = [], []
    with open(path) as f:
        for line in f:
            if line.startswith('v '):
                p = line.split()
                verts.append([float(p[1]), float(p[2]), float(p[3])])
            elif line.startswith('f '):
                f_v = [int(x.split('/')[0]) - 1 for x in line.split()[1:]]
                faces.append(f_v)
    return np.array(verts, dtype=np.float32), faces

def prepare_mesh(verts, faces):
    # Center and normalize
    c = (verts.max(axis=0) + verts.min(axis=0)) / 2.0
    span = (verts.max(axis=0) - verts.min(axis=0)).max()
    verts = (verts - c) / (span / 2.0)  # in [-1, 1]

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

    # Generate dense sample points (vertices + face centers + edge midpoints)
    sample_pts = [verts]
    sample_norms = [normals]

    # Face centers
    f_centers = []
    f_norms = []
    for f in faces:
        pts = verts[f]
        nms = normals[f]
        f_centers.append(pts.mean(axis=0))
        fn = nms.mean(axis=0)
        norm = np.linalg.norm(fn)
        f_norms.append(fn / norm if norm > 1e-6 else fn)
    sample_pts.append(np.array(f_centers, dtype=np.float32))
    sample_norms.append(np.array(f_norms, dtype=np.float32))

    # Edge midpoints
    edge_mid_pts = []
    edge_mid_nms = []
    for f in faces:
        nv = len(f)
        for i in range(nv):
            j = (i + 1) % nv
            edge_mid_pts.append((verts[f[i]] + verts[f[j]]) * 0.5)
            fn = (normals[f[i]] + normals[f[j]]) * 0.5
            norm = np.linalg.norm(fn)
            edge_mid_nms.append(fn / norm if norm > 1e-6 else fn)
    sample_pts.append(np.array(edge_mid_pts, dtype=np.float32))
    sample_norms.append(np.array(edge_mid_nms, dtype=np.float32))

    all_pts = np.vstack(sample_pts)
    all_norms = np.vstack(sample_norms)
    return all_pts, all_norms

if __name__ == '__main__':
    t0 = time.perf_counter()
    v, f = load_obj('/home/evabot/Desktop/eva-face-matrix/models/head_lightning.obj')
    pts, norms = prepare_mesh(v, f)
    t1 = time.perf_counter()
    print(f"Prepared {len(pts)} surface points in {(t1-t0)*1000:.2f} ms")

    # Render a single test frame at 80x30
    W, H = 80, 32
    ay, ax = 0.2, 0.0
    cy, sy = np.cos(ay), np.sin(ay)
    cx, sx = np.cos(ax), np.sin(ax)
    Ry = np.array([[cy, 0, sy], [0, 1, 0], [-sy, 0, cy]], dtype=np.float32)
    Rx = np.array([[1, 0, 0], [0, cx, -sx], [0, sx, cx]], dtype=np.float32)
    R = Ry @ Rx

    r_pts = pts @ R
    r_norms = norms @ R

    # Camera settings
    fov = 30.0
    cam_dist = 2.4
    zs = r_pts[:, 2] + cam_dist

    # Project with aspect ratio correction: terminal chars are ~2:1 taller than wide
    # So 1 unit in X occupies ~2 columns per 1 row
    px = np.int32(np.round(W / 2.0 + (r_pts[:, 0] / zs) * fov * 2.0))
    py = np.int32(np.round(H / 2.0 - (r_pts[:, 1] / zs) * fov))

    valid = (px >= 0) & (px < W) & (py >= 0) & (py < H) & (zs > 0.1)
    px, py, pz = px[valid], py[valid], zs[valid]
    p_norms = r_norms[valid]

    # Lighting: key light from top-right-front
    light_dir = np.array([0.4, 0.6, 0.7], dtype=np.float32)
    light_dir /= np.linalg.norm(light_dir)

    diffuse = np.maximum(0.0, np.sum(p_norms * light_dir, axis=1))
    # Specular (Blinn-Phong)
    view_dir = np.array([0.0, 0.0, 1.0], dtype=np.float32)
    half_v = light_dir + view_dir
    half_v /= np.linalg.norm(half_v)
    specular = np.maximum(0.0, np.sum(p_norms * half_v, axis=1)) ** 16

    intensity = 0.15 + 0.65 * diffuse + 0.4 * specular
    intensity = np.clip(intensity, 0.0, 1.0)

    # Sort descending by depth so nearer points overwrite farther in buffer
    order = np.argsort(-pz)
    zbuf = np.full((H, W), 1e9, dtype=np.float32)
    lum = np.zeros((H, W), dtype=np.float32)

    zbuf[py[order], px[order]] = pz[order]
    lum[py[order], px[order]] = intensity[order]

    # Render characters
    matrix_chars = "ﾊﾐﾋｰｳｼﾅﾓﾆｻﾜﾂｵﾘｱﾎﾃﾏｹﾒｴｶｷﾑﾕﾗｾﾈｽﾀﾇﾍ1234567890:=*+-<>"
    lines = []
    for y in range(H):
        row = []
        for x in range(W):
            if zbuf[y, x] < 1e8:
                b = lum[y, x]
                ch = matrix_chars[(x * 7 + y * 13) % len(matrix_chars)]
                if b > 0.85:
                    # Specular highlight: white/pale green
                    r, g, bl = int(210 + 45 * b), 255, int(210 + 45 * b)
                elif b > 0.5:
                    # Bright neon Matrix green
                    r, g, bl = int(40 * (1 - b)), int(180 + 75 * b), int(40 * (1 - b))
                elif b > 0.2:
                    # Classic Matrix green
                    r, g, bl = 0, int(90 + 150 * b), 10
                else:
                    # Dark green shadow
                    r, g, bl = 0, int(40 + 80 * b), 5
                row.append(f"\033[38;2;{r};{g};{bl}m{ch}")
            else:
                row.append(" ")
        lines.append("".join(row))
    print("\n".join(lines) + "\033[0m")
