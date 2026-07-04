import Phaser from 'phaser';
import { TILE } from '../config';
import type { EditorObj, EditorArea } from './types';
import { TILE_COLORS } from './types';

const MM_PX = 2; // screen pixels per map tile

export class Minimap {
  private bg!: Phaser.GameObjects.Graphics;
  private terrainGfx!: Phaser.GameObjects.Graphics;
  private overlayGfx!: Phaser.GameObjects.Graphics;

  private mmX = 0;
  private mmY = 0;
  private mmW = 0;
  private mmH = 0;

  constructor(private scene: Phaser.Scene, private viewW: number, private viewH: number) {
    this.bg = scene.add.graphics().setScrollFactor(0).setDepth(200);
    this.terrainGfx = scene.add.graphics().setScrollFactor(0).setDepth(201);
    this.overlayGfx = scene.add.graphics().setScrollFactor(0).setDepth(202);
  }

  updateTerrain(tileData: Uint8Array | number[], mapW: number, mapH: number): void {
    this.mmW = mapW * MM_PX;
    this.mmH = mapH * MM_PX;
    this.mmX = this.viewW - this.mmW - 10;
    this.mmY = this.viewH - this.mmH - 10;

    const gfx = this.terrainGfx;
    gfx.clear();
    gfx.x = this.mmX;
    gfx.y = this.mmY;

    // Background
    this.bg.clear();
    this.bg.fillStyle(0x0a0804, 1);
    this.bg.fillRect(this.mmX - 2, this.mmY - 2, this.mmW + 4, this.mmH + 4);
    this.bg.lineStyle(1, 0x7a6243, 1);
    this.bg.strokeRect(this.mmX - 2, this.mmY - 2, this.mmW + 4, this.mmH + 4);

    // Draw all-grass base first, then non-grass on top (fast)
    gfx.fillStyle(TILE_COLORS[0], 1);
    gfx.fillRect(0, 0, this.mmW, this.mmH);

    for (let ty = 0; ty < mapH; ty++) {
      for (let tx = 0; tx < mapW; tx++) {
        const t = tileData[ty * mapW + tx];
        if (t === 0) continue;
        gfx.fillStyle(TILE_COLORS[t] ?? TILE_COLORS[0], 1);
        gfx.fillRect(tx * MM_PX, ty * MM_PX, MM_PX, MM_PX);
      }
    }
  }

  updateOverlay(
    cam: Phaser.Cameras.Scene2D.Camera,
    objects: EditorObj[],
    areas: EditorArea[],
    mapW: number,
    mapH: number
  ): void {
    const gfx = this.overlayGfx;
    gfx.clear();
    gfx.x = this.mmX;
    gfx.y = this.mmY;

    const worldW = mapW * TILE;
    const worldH = mapH * TILE;
    const scaleX = this.mmW / worldW;
    const scaleY = this.mmH / worldH;

    // Areas
    for (const a of areas) {
      const ax = a.x * scaleX;
      const ay = a.y * scaleY;
      const ar = a.radius * scaleX;
      gfx.lineStyle(1, 0xffff88, 0.7);
      gfx.strokeCircle(ax, ay, Math.max(ar, 2));
    }

    // Objects
    for (const obj of objects) {
      const ox = obj.x * scaleX;
      const oy = obj.y * scaleY;
      let color = 0xffffff;
      if (obj.type === 'building')   color = obj.race === 'alliance' ? 0x4a9ade : 0xdea040;
      else if (obj.type === 'unit')  color = obj.race === 'alliance' ? 0x88ccff : 0xffcc66;
      else if (obj.type === 'resource') color = obj.kind === 'gold' ? 0xd9ad3d : 0xc8d4e0;
      else if (obj.type === 'animal')   color = 0x8B7355;
      else if (obj.type === 'landmark') color = 0xaaaaaa;
      else if (obj.type === 'marker')   color = obj.kind === 'start_player' ? 0x44dd44 : 0xdd4444;
      gfx.fillStyle(color, 1);
      gfx.fillRect(ox - 1.5, oy - 1.5, 3, 3);
    }

    // Camera viewport rect
    const rx = cam.scrollX * scaleX;
    const ry = cam.scrollY * scaleY;
    const rw = (cam.width / cam.zoom) * scaleX;
    const rh = (cam.height / cam.zoom) * scaleY;
    gfx.lineStyle(1, 0xffffff, 1);
    gfx.strokeRect(rx, ry, rw, rh);
  }

  /** Returns world position if click was inside minimap, else null. */
  handleClick(sx: number, sy: number, mapW: number, mapH: number): { wx: number; wy: number } | null {
    const lx = sx - this.mmX;
    const ly = sy - this.mmY;
    if (lx < 0 || ly < 0 || lx > this.mmW || ly > this.mmH) return null;
    return {
      wx: (lx / this.mmW) * mapW * TILE,
      wy: (ly / this.mmH) * mapH * TILE,
    };
  }

  isInside(sx: number, sy: number): boolean {
    return sx >= this.mmX && sx <= this.mmX + this.mmW &&
           sy >= this.mmY && sy <= this.mmY + this.mmH;
  }

  destroy(): void {
    this.bg.destroy();
    this.terrainGfx.destroy();
    this.overlayGfx.destroy();
  }
}
