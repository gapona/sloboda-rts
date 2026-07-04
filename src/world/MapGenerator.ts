import { TileMap, TileType } from './TileMap';
import { MAP_W, MAP_H, TILE } from '../config';
import { hasWalkablePath } from './MapValidation';

export interface MapDecal {
  x: number;
  y: number;
  key: string;
  scale: number;
  rotation: number;
}

export interface MapLayout {
  map: TileMap;
  playerBase: { tx: number; ty: number };
  aiBase: { tx: number; ty: number };
  goldMines: { tx: number; ty: number }[];
  trees: { tx: number; ty: number }[];
  decals: MapDecal[];
}

interface MapProfile {
  forestClusters: number;
  forestMinRadius: number;
  forestMaxRadius: number;
  mainLaneRadius: number;
  sideLaneRadius: number;
  stonePatches: number;
  pondPairs: number;
  decalDensity: number;
}

export function generateMap(seed = 42): MapLayout {
  const rng = mulberry32(seed);
  const profile = createMapProfile(rng);
  const map = new TileMap();
  const playerBase = { tx: 19, ty: 12 };
  const aiBase = mirror(playerBase);
  const center = { tx: Math.floor(MAP_W / 2), ty: Math.floor(MAP_H / 2) };

  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      map.set(x, y, rng() < 0.3 ? TileType.Grass2 : TileType.Grass);
    }
  }

  addDecorativeWater(rng, map, profile);
  scatterStone(rng, profile.stonePatches, map);
  clusterForestMirrored(rng, profile.forestClusters, profile.forestMinRadius, profile.forestMaxRadius, map);

  carveLane(map, playerBase, center, profile.mainLaneRadius);
  carveLane(map, center, aiBase, profile.mainLaneRadius);
  carveLane(map, { tx: 10, ty: MAP_H - 13 }, { tx: MAP_W - 12, ty: 12 }, profile.sideLaneRadius);
  clearArea(map, playerBase.tx, playerBase.ty, 9);
  clearArea(map, aiBase.tx, aiBase.ty, 9);
  clearArea(map, center.tx, center.ty, 7);

  const goldMines = mirroredPoints([
    { tx: playerBase.tx + 7, ty: playerBase.ty + 1 },
    { tx: playerBase.tx + 1, ty: playerBase.ty + 9 },
    { tx: center.tx - 4, ty: center.ty - 5 }
  ]);
  goldMines.push({ tx: center.tx + 2, ty: center.ty + 3 });
  for (const m of goldMines) clearArea(map, m.tx, m.ty, 5);
  addStartingForests(rng, map, playerBase, aiBase, goldMines);

  if (!hasWalkablePath(map, playerBase, aiBase)) {
    carveLane(map, playerBase, center, 5);
    carveLane(map, center, aiBase, 5);
  }

  const trees = materializeTrees(map, playerBase, aiBase, goldMines);
  addNorthernBaseTrees(rng, map, playerBase, aiBase, goldMines, trees);
  const decals = scatterDecals(rng, map, profile.decalDensity);
  return { map, playerBase, aiBase, goldMines, trees, decals };
}

export interface SnakeNode { tx: number; ty: number; r: number; }

/**
 * Мапа-«змійка»: один прохідний коридор-серпантин, обведений лісом з усіх боків.
 * Кожен «вузол» — кімната для одного епізоду сценарію; вузли йдуть послідовно,
 * тож гравець фізично проходить події по черзі, а не натрапляє на все відразу.
 */
export interface SnakeMapOptions {
  playerBase: { tx: number; ty: number };
  aiBase: { tx: number; ty: number };
  pockets?: { from: SnakeNode; to: SnakeNode }[];
  goldMines?: { tx: number; ty: number }[];
}

export function generateSlobodaSnakeMap(seed: number, path: SnakeNode[], opts: SnakeMapOptions): MapLayout {
  const rng = mulberry32(seed);
  const profile = createMapProfile(rng);
  const map = new TileMap();

  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      map.set(x, y, rng() < 0.3 ? TileType.Grass2 : TileType.Grass);
    }
  }

  // Заліснюємо все, тоді прорубуємо шлях — рештки лісу стають стіною-кордоном.
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      map.set(x, y, TileType.Forest);
      map.setWalkable(x, y, false);
    }
  }

  carveSnakePath(map, path, seed);
  for (let i = 0; i < (opts.pockets ?? []).length; i++) {
    const p = (opts.pockets ?? [])[i];
    carveSnakeLane(map, p.from, p.to, 4, 1000 + i, seed);
    clearArea(map, p.to.tx, p.to.ty, p.to.r);
  }
  carveSnakeRoad(map, path, seed);

  addDecorativeWater(rng, map, profile);
  scatterStone(rng, profile.stonePatches, map);

  // Water/stone scatter may have overwritten carved nodes (e.g. the townhall
  // site) with unwalkable tiles — re-carve node clearings so they stay buildable.
  carveSnakePath(map, path, seed);
  for (const p of opts.pockets ?? []) {
    clearArea(map, p.to.tx, p.to.ty, p.to.r);
  }

  const goldMines = opts.goldMines ?? [];
  for (const m of goldMines) clearArea(map, m.tx, m.ty, 4);

  const trees = materializeBorderTrees(map);
  const decals = scatterDecals(rng, map, profile.decalDensity);

  return { map, playerBase: opts.playerBase, aiBase: opts.aiBase, goldMines, trees, decals };
}

// Перпендикулярний "вигин" уздовж відрізка — детермінований за seed, на кінцях (t=0/1) дорівнює 0,
// щоб вузли-кімнати лишались чистими, а коридор між ними плавно вигинався.
function snakeWiggle(t: number, segIndex: number, seed: number): number {
  return Math.sin(t * Math.PI * 2 + segIndex * 1.7 + seed * 0.013) * 1.6 * Math.sin(t * Math.PI);
}

function carveSnakePath(map: TileMap, nodes: SnakeNode[], seed: number): void {
  for (const n of nodes) clearArea(map, n.tx, n.ty, n.r);
  for (let i = 0; i < nodes.length - 1; i++) {
    const a = nodes[i], b = nodes[i + 1];
    const steps = Math.max(Math.abs(b.tx - a.tx), Math.abs(b.ty - a.ty));
    const dx = b.tx - a.tx, dy = b.ty - a.ty;
    const len = Math.hypot(dx, dy) || 1;
    const px = -dy / len, py = dx / len;
    for (let s = 0; s <= steps; s++) {
      const t = steps === 0 ? 0 : s / steps;
      const wiggle = snakeWiggle(t, i, seed);
      const x = Math.round(lerp(a.tx, b.tx, t) + px * wiggle);
      const y = Math.round(lerp(a.ty, b.ty, t) + py * wiggle);
      const r = Math.max(4, Math.round(lerp(a.r, b.r, t)) - 1);
      clearArea(map, x, y, r);
    }
  }
}

function carveSnakeRoad(map: TileMap, nodes: SnakeNode[], seed: number): void {
  for (let i = 0; i < nodes.length - 1; i++) {
    carveSnakeLane(map, nodes[i], nodes[i + 1], 2, i, seed);
  }
}

function carveSnakeLane(map: TileMap, from: { tx: number; ty: number }, to: { tx: number; ty: number }, radius: number, segIndex: number, seed: number): void {
  const steps = Math.max(Math.abs(to.tx - from.tx), Math.abs(to.ty - from.ty));
  const dx = to.tx - from.tx, dy = to.ty - from.ty;
  const len = Math.hypot(dx, dy) || 1;
  const px = -dy / len, py = dx / len;
  for (let i = 0; i <= steps; i++) {
    const t = steps === 0 ? 0 : i / steps;
    const wiggle = snakeWiggle(t, segIndex, seed);
    const x = Math.round(lerp(from.tx, to.tx, t) + px * wiggle);
    const y = Math.round(lerp(from.ty, to.ty, t) + py * wiggle);
    clearArea(map, x, y, radius, TileType.Dirt);
  }
}

function materializeBorderTrees(map: TileMap): { tx: number; ty: number }[] {
  const trees: { tx: number; ty: number }[] = [];
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]] as const;
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      if (map.get(x, y) !== TileType.Forest) continue;
      const onEdge = dirs.some(([dx, dy]) => {
        const nx = x + dx, ny = y + dy;
        return map.inBounds(nx, ny) && map.get(nx, ny) !== TileType.Forest;
      });
      if (onEdge) trees.push({ tx: x, ty: y });
    }
  }
  return trees;
}

function createMapProfile(rng: () => number): MapProfile {
  const forestRoll = rng();
  const waterRoll = rng();
  return {
    forestClusters: 9 + Math.floor(forestRoll * 8),
    forestMinRadius: forestRoll > 0.62 ? 3 : 2,
    forestMaxRadius: forestRoll > 0.34 ? 5 : 4,
    mainLaneRadius: 4 + (rng() > 0.72 ? 1 : 0),
    sideLaneRadius: 3 + (rng() > 0.6 ? 1 : 0),
    stonePatches: 5 + Math.floor(rng() * 6),
    pondPairs: waterRoll > 0.72 ? 3 : waterRoll > 0.26 ? 2 : 1,
    decalDensity: 0.75 + rng() * 0.75
  };
}

function scatterDecals(rng: () => number, map: TileMap, density = 1): MapDecal[] {
  const decals: MapDecal[] = [];
  const flowerKeys = ['decal_flower_0', 'decal_flower_1', 'decal_flower_2', 'decal_flower_3', 'decal_flower_4'];
  const pebbleKeys = ['decal_pebble_0', 'decal_pebble_1'];
  const tuftKeys = ['decal_tuft_0', 'decal_tuft_1'];
  const mushroomKeys = ['decal_mushroom_0', 'decal_mushroom_1'];
  const groundPatchKeys = ['decal_dirt_patch', 'decal_rock_pile'];
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      const t = map.get(x, y);
      if (t === TileType.Water || t === TileType.Stone || t === TileType.Forest) continue;
      const roll = rng();
      const flowerChance = 0.04 * density;
      const tuftChance = 0.07 * density;
      const pebbleChance = 0.085 * density;
      const mushroomChance = 0.09 * density;
      const twigChance = 0.095 * density;
      const groundPatchChance = 0.102 * density;
      let key: string | null = null;
      if (roll < flowerChance) key = flowerKeys[Math.floor(rng() * flowerKeys.length)];
      else if (roll < tuftChance) key = tuftKeys[Math.floor(rng() * tuftKeys.length)];
      else if (roll < pebbleChance) key = pebbleKeys[Math.floor(rng() * pebbleKeys.length)];
      else if (roll < mushroomChance && t === TileType.Grass) key = mushroomKeys[Math.floor(rng() * mushroomKeys.length)];
      else if (roll < twigChance) key = 'decal_twig';
      else if (roll < groundPatchChance && t !== TileType.Grass2) key = groundPatchKeys[Math.floor(rng() * groundPatchKeys.length)];
      if (!key) continue;
      decals.push({
        x: x * TILE + 4 + rng() * (TILE - 8),
        y: y * TILE + 4 + rng() * (TILE - 8),
        key,
        scale: 0.8 + rng() * 0.4,
        rotation: (rng() - 0.5) * 0.6
      });
    }
  }
  return decals;
}

function addDecorativeWater(rng: () => number, map: TileMap, profile: MapProfile): void {
  const mirroredPond = (p: { tx: number; ty: number; rx: number; ry: number }): { tx: number; ty: number; rx: number; ry: number } => {
    const m = mirror(p);
    return { tx: m.tx, ty: m.ty, rx: p.rx, ry: p.ry };
  };
  const anchors = [
    { tx: 17 + Math.floor(rng() * 5), ty: 42 + Math.floor(rng() * 7), rx: 3 + Math.floor(rng() * 3), ry: 2 + Math.floor(rng() * 3) },
    { tx: 26 + Math.floor(rng() * 7), ty: 12 + Math.floor(rng() * 6), rx: 2 + Math.floor(rng() * 3), ry: 2 + Math.floor(rng() * 2) },
    { tx: 10 + Math.floor(rng() * 10), ty: 25 + Math.floor(rng() * 10), rx: 2 + Math.floor(rng() * 2), ry: 3 + Math.floor(rng() * 3) }
  ].slice(0, profile.pondPairs);
  for (const p of anchors.flatMap((p) => [p, mirroredPond(p)])) {
    paintPond(rng, map, p.tx, p.ty, p.rx, p.ry);
  }
}

function paintPond(rng: () => number, map: TileMap, cx: number, cy: number, rx: number, ry: number): void {
  for (let dy = -ry; dy <= ry; dy++) {
    for (let dx = -rx; dx <= rx; dx++) {
      const x = cx + dx, y = cy + dy;
      if (!map.inBounds(x, y)) continue;
      if (map.get(x, y) === TileType.Forest) continue;
      const norm = (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry);
      if (norm <= 1 && rng() < 0.9 - norm * 0.18) map.set(x, y, TileType.Water);
    }
  }
}

function clusterForestMirrored(rng: () => number, count: number, minRadius: number, maxRadius: number, map: TileMap): void {
  for (let i = 0; i < count; i++) {
    const cx = 5 + Math.floor(rng() * (MAP_W / 2 - 10));
    const cy = 5 + Math.floor(rng() * (MAP_H - 10));
    const radius = minRadius + Math.floor(rng() * (maxRadius - minRadius + 1));
    paintForestCluster(rng, map, cx, cy, radius);
    const m = mirror({ tx: cx, ty: cy });
    paintForestCluster(rng, map, m.tx, m.ty, radius);
  }
}

function paintForestCluster(rng: () => number, map: TileMap, cx: number, cy: number, radius: number): void {
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const x = cx + dx, y = cy + dy;
      if (!map.inBounds(x, y)) continue;
      const d = Math.hypot(dx, dy);
      if (d <= radius && rng() < 0.9 - d / (radius + 1)) map.set(x, y, TileType.Forest);
    }
  }
}

function addStartingForests(
  rng: () => number,
  map: TileMap,
  playerBase: { tx: number; ty: number },
  aiBase: { tx: number; ty: number },
  goldMines: { tx: number; ty: number }[]
): void {
  const patches = [
    { dx: -10, dy: -2, rx: 5, ry: 4 },
    { dx: -2, dy: -10, rx: 5, ry: 4 },
    { dx: 2, dy: -10, rx: 5, ry: 4 },
    { dx: -8, dy: 8, rx: 4, ry: 4 },
    { dx: 6, dy: -10, rx: 5, ry: 3 }
  ];

  for (const patch of patches) {
    paintStartingForestPatch(rng, map, playerBase, playerBase.tx + patch.dx, playerBase.ty + patch.dy, patch.rx, patch.ry, goldMines);
    const mirrored = mirror({ tx: playerBase.tx + patch.dx, ty: playerBase.ty + patch.dy });
    paintStartingForestPatch(rng, map, aiBase, mirrored.tx, mirrored.ty, patch.rx, patch.ry, goldMines);
  }
}

function paintStartingForestPatch(
  rng: () => number,
  map: TileMap,
  base: { tx: number; ty: number },
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  goldMines: { tx: number; ty: number }[]
): void {
  for (let dy = -ry; dy <= ry; dy++) {
    for (let dx = -rx; dx <= rx; dx++) {
      const x = cx + dx;
      const y = cy + dy;
      if (!map.inBounds(x, y)) continue;
      const t = map.get(x, y);
      if (t !== TileType.Grass && t !== TileType.Grass2) continue;
      if (!isFar(x, y, base, 8.8) || goldMines.some(m => !isFar(x, y, m, 6.4))) continue;
      const norm = (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry);
      if (norm <= 1 && rng() < 0.94 - norm * 0.22) map.set(x, y, TileType.Forest);
    }
  }
}

function addNorthernBaseTrees(
  rng: () => number,
  map: TileMap,
  playerBase: { tx: number; ty: number },
  aiBase: { tx: number; ty: number },
  goldMines: { tx: number; ty: number }[],
  trees: { tx: number; ty: number }[]
): void {
  const occupied = new Set(trees.map(t => `${t.tx}:${t.ty}`));
  const patches = [
    { dx: -7, dy: -5, rx: 4, ry: 2 },
    { dx: -2, dy: -6, rx: 4, ry: 3 },
    { dx: 4, dy: -6, rx: 5, ry: 3 },
    { dx: 9, dy: -5, rx: 3, ry: 2 }
  ];

  for (const patch of patches) {
    addForcedForestPatch(rng, map, playerBase, playerBase.tx + patch.dx, playerBase.ty + patch.dy, patch.rx, patch.ry, goldMines, trees, occupied);
    const mirrored = mirror({ tx: playerBase.tx + patch.dx, ty: playerBase.ty + patch.dy });
    addForcedForestPatch(rng, map, aiBase, mirrored.tx, mirrored.ty, patch.rx, patch.ry, goldMines, trees, occupied);
  }
}

function addForcedForestPatch(
  rng: () => number,
  map: TileMap,
  base: { tx: number; ty: number },
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  goldMines: { tx: number; ty: number }[],
  trees: { tx: number; ty: number }[],
  occupied: Set<string>
): void {
  for (let dy = -ry; dy <= ry; dy++) {
    for (let dx = -rx; dx <= rx; dx++) {
      const x = cx + dx;
      const y = cy + dy;
      if (!map.inBounds(x, y)) continue;
      if (y >= base.ty - 2) continue;
      const t = map.get(x, y);
      if (t !== TileType.Grass && t !== TileType.Grass2 && t !== TileType.Forest) continue;
      if (goldMines.some(m => !isFar(x, y, m, 5.5))) continue;
      const norm = (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry);
      if (norm > 1 || rng() > 0.98 - norm * 0.12) continue;
      const key = `${x}:${y}`;
      if (occupied.has(key)) continue;
      map.set(x, y, TileType.Forest);
      map.setWalkable(x, y, false);
      trees.push({ tx: x, ty: y });
      occupied.add(key);
    }
  }
}

function scatterStone(rng: () => number, count: number, map: TileMap): void {
  for (let i = 0; i < count; i++) {
    const cx = 4 + Math.floor(rng() * (MAP_W / 2 - 8));
    const cy = 4 + Math.floor(rng() * (MAP_H - 8));
    paintStone(rng, map, cx, cy);
    const m = mirror({ tx: cx, ty: cy });
    paintStone(rng, map, m.tx, m.ty);
  }
}

function paintStone(rng: () => number, map: TileMap, cx: number, cy: number): void {
  const r = 1 + Math.floor(rng() * 2);
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      const x = cx + dx, y = cy + dy;
      if (!map.inBounds(x, y)) continue;
      if (map.get(x, y) === TileType.Forest) continue;
      if (Math.hypot(dx, dy) <= r && rng() < 0.65) map.set(x, y, TileType.Stone);
    }
  }
}

function carveLane(map: TileMap, from: { tx: number; ty: number }, to: { tx: number; ty: number }, radius: number): void {
  const steps = Math.max(Math.abs(to.tx - from.tx), Math.abs(to.ty - from.ty));
  for (let i = 0; i <= steps; i++) {
    const t = steps === 0 ? 0 : i / steps;
    const x = Math.round(lerp(from.tx, to.tx, t));
    const y = Math.round(lerp(from.ty, to.ty, t));
    clearArea(map, x, y, radius, TileType.Dirt);
  }
}

function clearArea(map: TileMap, cx: number, cy: number, r: number, tile: TileType = TileType.Grass): void {
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      const x = cx + dx, y = cy + dy;
      if (!map.inBounds(x, y)) continue;
      if (Math.hypot(dx, dy) <= r) {
        map.set(x, y, tile === TileType.Grass && (dx + dy) % 2 !== 0 ? TileType.Grass2 : tile);
        map.setWalkable(x, y, true);
      }
    }
  }
}

function materializeTrees(
  map: TileMap,
  playerBase: { tx: number; ty: number },
  aiBase: { tx: number; ty: number },
  goldMines: { tx: number; ty: number }[]
): { tx: number; ty: number }[] {
  const trees: { tx: number; ty: number }[] = [];
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      if (map.get(x, y) !== TileType.Forest) continue;
      if (!isFar(x, y, playerBase, 9) || !isFar(x, y, aiBase, 9) || goldMines.some(m => !isFar(x, y, m, 6))) {
        map.set(x, y, TileType.Grass);
        map.setWalkable(x, y, true);
        continue;
      }
      trees.push({ tx: x, ty: y });
      map.setWalkable(x, y, false);
    }
  }
  return trees;
}

function mirroredPoints(points: { tx: number; ty: number }[]): { tx: number; ty: number }[] {
  const out: { tx: number; ty: number }[] = [];
  for (const p of points) {
    out.push(p);
    out.push(mirror(p));
  }
  return out;
}

function mirror(p: { tx: number; ty: number }, offset = 0): { tx: number; ty: number } {
  return { tx: MAP_W - p.tx - 1 + offset, ty: MAP_H - p.ty - 1 + offset };
}

function isFar(x: number, y: number, p: { tx: number; ty: number }, r: number): boolean {
  return Math.hypot(x - p.tx, y - p.ty) > r;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
