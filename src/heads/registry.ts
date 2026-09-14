/**
 * registry.ts — Master Registry of all Eva 3D Face Heads & Standalone Stations.
 *
 * Each head is a separate, dedicated module with its own:
 * - 3D Geometry morphs / shaders
 * - Color palette & material traits
 * - Physics / visemes / responsiveness
 * - Independent Station Web Endpoint (/face/stations/<id>.html)
 * - Independent Terminal CLI command (./eva-face.sh <id>)
 */

export interface HeadStationMeta {
  id: string;
  name: string;
  codename: string;
  category: 'Matrix 3D' | 'Vector Hologram' | 'Cyberpunk PBR' | 'Solid HD' | 'Retro ASCII';
  badge: string;
  icon: string;
  primaryColor: string;
  accentColor: string;
  fpsTarget: number;
  description: string;
  technique: string;
  moduleFile: string;
  stationUrl: string;
  cliCommand: string;
}

export const HEAD_STATIONS: HeadStationMeta[] = [
  {
    id: 'eva',
    name: 'Eva Matrix Core',
    codename: 'EVA-01-PHOSPHOR',
    category: 'Matrix 3D',
    badge: 'FLAGSHIP',
    icon: '🟢',
    primaryColor: '#00ff66',
    accentColor: '#ffffff',
    fpsTarget: 60,
    description: 'Оригинальный женский облик Евы из чистого матричного люминофора с каскадным цифровым дождем.',
    technique: 'Pinscreen 3D (10.8K verts) + Katakana Density Atlas + Downward Rain Shader',
    moduleFile: 'src/heads/eva_matrix.ts',
    stationUrl: '/face/stations/eva.html',
    cliCommand: './eva-face.sh eva',
  },
  {
    id: 'adam',
    name: 'Adam Cyber Gold',
    codename: 'ADAM-02-AMBER',
    category: 'Matrix 3D',
    badge: 'MASCULINE',
    icon: '🟡',
    primaryColor: '#ffb400',
    accentColor: '#fff5dc',
    fpsTarget: 60,
    description: 'Кибернетический командир с расширенной челюстью, солнечными бликами и янтарно-бронзовым кодом.',
    technique: 'Pinscreen 3D + Jaw Morph (1.10) + Brow Lift + Amber Shading',
    moduleFile: 'src/heads/adam_cyber.ts',
    stationUrl: '/face/stations/adam.html',
    cliCommand: './eva-face.sh adam',
  },
  {
    id: 'neo',
    name: 'Neo Electra Cyan',
    codename: 'NEO-03-CYAN',
    category: 'Matrix 3D',
    badge: 'HIGH-CONTRAST',
    icon: '🔵',
    primaryColor: '#00f0ff',
    accentColor: '#ffffff',
    fpsTarget: 60,
    description: 'Высококонтрастная сущность из электрического цианового кода с быстрыми потоками данных.',
    technique: 'Pinscreen 3D + Supernova White Highlights + Electric Obsidian Depth',
    moduleFile: 'src/heads/neo_electra.ts',
    stationUrl: '/face/stations/neo.html',
    cliCommand: './eva-face.sh neo',
  },
  {
    id: 'rain',
    name: 'Pure Matrix Rain',
    codename: 'RAIN-04-CASCADE',
    category: 'Matrix 3D',
    badge: 'PROCEDURAL',
    icon: '🌧️',
    primaryColor: '#32ff78',
    accentColor: '#e8ffee',
    fpsTarget: 60,
    description: 'Сущность, органически рождающаяся из плотного ливня матричного кода. Лицо выступает из глубины ливня.',
    technique: 'Dynamic Density Emergence + Dual Depth Stream Rain + High Speed Flow',
    moduleFile: 'src/heads/rain_code.ts',
    stationUrl: '/face/stations/rain.html',
    cliCommand: './eva-face.sh rain',
  },
  {
    id: 'hologram',
    name: 'Vector Hologram Eco',
    codename: 'HOLO-05-ECO60',
    category: 'Vector Hologram',
    badge: '60 FPS GUARANTEE',
    icon: '⚡',
    primaryColor: '#00ffcc',
    accentColor: '#ffffff',
    fpsTarget: 60,
    description: 'Ультралегкая векторная голограмма в стиле Tron / CAD. Без нагрузки на видеокарту — строго 60 FPS на любых слабых телефонах и ПК.',
    technique: 'Zero-Atlas Pure GLSL Vector Contours + CRT Hologram Scanlines + Rim Glow',
    moduleFile: 'src/heads/hologram_eco.ts',
    stationUrl: '/face/stations/hologram.html',
    cliCommand: './eva-face.sh eco',
  },
  {
    id: 'cyber',
    name: 'Cyberpunk PBR 3D',
    codename: 'CYBER-06-PBR',
    category: 'Cyberpunk PBR',
    badge: 'EYE-TRACKING PBR',
    icon: '🧬',
    primaryColor: '#00f0ff',
    accentColor: '#ff007f',
    fpsTarget: 60,
    description: 'Реалистичная кибернетическая 3D-модель с глазными яблоками, зрачками, сеткой полигонов, точками и физическим освещением.',
    technique: 'Three.js PBR Physical Material + 3D Eyeballs with Iris Saccades + Wireframe Overlays',
    moduleFile: 'src/heads/cyber_pbr.ts',
    stationUrl: '/face/stations/cyber.html',
    cliCommand: './eva-face.sh cyber',
  },
  {
    id: 'solid',
    name: 'Ultra-HD TrueColor Solid',
    codename: 'SOLID-07-TRUECOLOR',
    category: 'Solid HD',
    badge: 'RETINA PIXELS',
    icon: '▀',
    primaryColor: '#00ff66',
    accentColor: '#ffffff',
    fpsTarget: 60,
    description: 'Фотореалистичный субпиксельный рендерер из полублоков TrueColor с 3-точечным студийным светом.',
    technique: 'Subpixel Half-Block (▀) Dual-Buffer Rasterization + 24-bit TrueColor Gradient Lighting',
    moduleFile: 'src/heads/solid_hd.ts',
    stationUrl: '/face/stations/solid.html',
    cliCommand: './eva-face.sh solid',
  },
  {
    id: 'ascii',
    name: 'Classic Retro ASCII',
    codename: 'ASCII-08-RETRO',
    category: 'Retro ASCII',
    badge: 'ORIGINAL',
    icon: '📟',
    primaryColor: '#00ff66',
    accentColor: '#ffffff',
    fpsTarget: 60,
    description: 'Классическая ретро-станция символьного 3D-лица на основе трафаретной сетки и градиента плотности.',
    technique: 'ASCII Stencil Ramp + Landmark Anchors + 2D/3D Depth Projection',
    moduleFile: 'src/heads/ascii_classic.ts',
    stationUrl: '/face/stations/ascii.html',
    cliCommand: './eva-face.sh ascii',
  },
];

export function getStationById(id: string): HeadStationMeta | undefined {
  return HEAD_STATIONS.find((s) => s.id === id);
}
