import Phaser from 'phaser';
import { MAP_W, MAP_H, TILE, type Race, type BuildingKind, type UnitKind, VIEW_W, VIEW_H } from '../config';
import { TileType } from '../world/TileMap';
import {
  buildingArtReady, buildingSheetKey, getBuildingStageFrame,
  legacyBuildingStageKey, unitSheetKey, BUILDING_ART_DISPLAY, UNIT_ART_DISPLAY
} from '../assets/artManifest';
import { Minimap } from '../editor/Minimap';
import { CampaignPanel } from '../editor/CampaignPanel';
import type { EditorObj, EditorMapData, EditorArea, EditorEvent } from '../editor/types';

export type { EditorObj, EditorMapData };

type Tool = 'terrain' | 'place' | 'select' | 'erase' | 'area';
type BrushSize = 1 | 3 | 5 | 7 | 11 | 15;
type PaletteTab = 'terrain' | 'resources' | 'buildings' | 'units' | 'animals' | 'landmarks' | 'campaign';

interface PaletteItem {
  id: string; label: string;
  objType: EditorObj['type'];
  kind: string;
  race: 'alliance' | 'horde' | 'neutral';
  side: 'player' | 'ai' | 'neutral';
  color: string;
  snapGrid: boolean;
  footprint: number;
  defaultAmount?: number;
}

let _eid = 1;
function eid(): string { return `e${_eid++}`; }

const TERRAIN_ITEMS = [
  { type: TileType.Grass,  label: 'Трава',   key: 'tile_grass',   color: '#73833e' },
  { type: TileType.Grass2, label: 'Трава 2', key: 'tile_grass2',  color: '#839347' },
  { type: TileType.Dirt,   label: 'Бруд',    key: 'tile_dirt',    color: '#8a6a3a' },
  { type: TileType.Forest, label: 'Ліс',     key: 'tile_forest',  color: '#2e5527' },
  { type: TileType.Stone,  label: 'Камінь',  key: 'tile_stone',   color: '#6a6258' },
  { type: TileType.Water,  label: 'Вода',    key: 'tile_water_0', color: '#2e6e8e' },
];

const RESOURCE_ITEMS: PaletteItem[] = [
  { id: 'gold', label: 'Копальня',      objType: 'resource', kind: 'gold', race: 'neutral', side: 'neutral', color: '#d9ad3d', snapGrid: true,  footprint: 3, defaultAmount: 1800 },
  { id: 'salt', label: 'Соляне джерело', objType: 'resource', kind: 'salt', race: 'neutral', side: 'neutral', color: '#c8d4e0', snapGrid: true,  footprint: 2, defaultAmount: 2000 },
];

function bldItems(race: 'alliance' | 'horde', side: 'player' | 'ai'): PaletteItem[] {
  const c = race === 'alliance' ? '#4a9ade' : '#dea040';
  const s = race === 'alliance' ? '' : ' (тат.)';
  const fp: Record<string, number> = { townhall: 3, barracks: 3, workshop: 3, farm: 2, tower: 2, field: 2 };
  const lbl: Record<string, string> = { townhall: 'Хутір', barracks: 'Курінь', workshop: 'Кузня', farm: 'Хата', tower: 'Вежа', field: 'Поле' };
  return Object.keys(fp).map(k => ({ id: `${k}_${race}`, label: lbl[k]+s, objType: 'building' as const, kind: k, race, side, color: c, snapGrid: true, footprint: fp[k] }));
}
const BUILDING_ITEMS: PaletteItem[] = [...bldItems('alliance','player'), ...bldItems('horde','ai')];

function unitItems(race: 'alliance' | 'horde', side: 'player' | 'ai'): PaletteItem[] {
  const c = race === 'alliance' ? '#4a9ade' : '#dea040';
  const L: Record<string, [string,string]> = {
    worker: ['Селянин','Чура'], footman: ['Козак','Аскер'],
    archer: ['Стрілець','Лучник'], knight: ['Сердюк','Джигіт'], catapult: ['Гармата','Тарань'],
  };
  return Object.entries(L).map(([k,[a,h]]) => ({ id: `${k}_${race}`, label: race==='alliance'?a:h, objType: 'unit' as const, kind: k, race, side, color: c, snapGrid: false, footprint: 1 }));
}
const UNIT_ITEMS: PaletteItem[] = [...unitItems('alliance','player'), ...unitItems('horde','ai')];

const ANIMAL_ITEMS: PaletteItem[] = [
  { id: 'deer',     label: 'Олень',   objType: 'animal', kind: 'deer',     race: 'neutral', side: 'neutral', color: '#8B7355', snapGrid: false, footprint: 1 },
  { id: 'boar',     label: 'Вепр',    objType: 'animal', kind: 'boar',     race: 'neutral', side: 'neutral', color: '#5c4520', snapGrid: false, footprint: 1 },
  { id: 'wolf',     label: 'Вовк',    objType: 'animal', kind: 'wolf',     race: 'neutral', side: 'neutral', color: '#888899', snapGrid: false, footprint: 1 },
  { id: 'wolf_den', label: 'Лігво',   objType: 'animal', kind: 'wolf_den', race: 'neutral', side: 'neutral', color: '#445566', snapGrid: true,  footprint: 2 },
];

const LANDMARK_ITEMS: PaletteItem[] = [
  { id: 'lm_ruins',            label: 'Руїни',             objType: 'landmark', kind: 'sloboda_ruins',            race: 'neutral', side: 'neutral', color: '#666', snapGrid: false, footprint: 5 },
  { id: 'lm_khutir',           label: 'Хутір (нейтр.)',    objType: 'landmark', kind: 'sloboda_khutir',           race: 'neutral', side: 'neutral', color: '#aaa', snapGrid: false, footprint: 4 },
  { id: 'lm_neutral_hut',      label: 'Хата нейтральна',   objType: 'landmark', kind: 'sloboda_neutral_hut',      race: 'neutral', side: 'neutral', color: '#aaa', snapGrid: false, footprint: 3 },
  { id: 'lm_enemy_camp',       label: 'Ворожий стан',      objType: 'landmark', kind: 'sloboda_enemy_camp',       race: 'neutral', side: 'ai',      color: '#c44', snapGrid: false, footprint: 6 },
  { id: 'lm_saltmine',         label: 'Солеварня',         objType: 'landmark', kind: 'sloboda_saltmine',         race: 'neutral', side: 'neutral', color: '#c8d4e0', snapGrid: false, footprint: 4 },
  { id: 'lm_fog_shrine',       label: 'Туманне святилище', objType: 'landmark', kind: 'sloboda_fog_shrine',       race: 'neutral', side: 'neutral', color: '#8899aa', snapGrid: false, footprint: 3 },
  { id: 'lm_kharakternyk_hut', label: 'Хата характерника', objType: 'landmark', kind: 'sloboda_kharakternyk_hut', race: 'neutral', side: 'neutral', color: '#9966cc', snapGrid: false, footprint: 3 },
  { id: 'lm_sawmill',          label: 'Лісопилка',         objType: 'landmark', kind: 'sloboda_sawmill',          race: 'neutral', side: 'neutral', color: '#7a5a2a', snapGrid: false, footprint: 3 },
  { id: 'lm_bridge',           label: 'Міст',              objType: 'landmark', kind: 'sloboda_bridge',           race: 'neutral', side: 'neutral', color: '#885522', snapGrid: false, footprint: 2 },
  { id: 'lm_squad_player',     label: 'Загін гравця',      objType: 'landmark', kind: 'sloboda_squad_player',     race: 'neutral', side: 'player', color: '#4a9ade', snapGrid: false, footprint: 3 },
  { id: 'lm_squad_enemy',      label: 'Загін ворога',      objType: 'landmark', kind: 'sloboda_squad_enemy',      race: 'neutral', side: 'ai',     color: '#dea040', snapGrid: false, footprint: 3 },
  { id: 'mk_player',           label: '⚑ Старт гравця',    objType: 'marker',   kind: 'start_player',            race: 'alliance', side: 'player', color: '#44dd44', snapGrid: true, footprint: 3 },
  { id: 'mk_ai',               label: '⚑ Старт AI',        objType: 'marker',   kind: 'start_ai',                race: 'horde',    side: 'ai',     color: '#dd4444', snapGrid: true, footprint: 3 },
];

export class EditorScene extends Phaser.Scene {
  // Map dimensions (dynamic)
  private mapW = MAP_W;
  private mapH = MAP_H;

  // Tile data
  private tileData = new Uint8Array(MAP_W * MAP_H);
  private minimapDirty = true;

  // Objects
  private objects: EditorObj[] = [];
  private objSprites = new Map<string, Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle>();
  private objLabels  = new Map<string, Phaser.GameObjects.Text>();

  // Areas
  private areas: EditorArea[] = [];
  private areaGfx!: Phaser.GameObjects.Graphics;
  private selectedAreaId: string | null = null;

  // Tool state
  private activeTool: Tool = 'terrain';
  private activeTerrain: TileType = TileType.Grass;
  private activePalItem: PaletteItem | null = null;
  private brushSize: BrushSize = 1;
  private selectedId: string | null = null;
  private isPainting = false;
  private isPanning  = false;
  private panStart      = { x: 0, y: 0 };
  private panScrollStart = { x: 0, y: 0 };

  // Phaser objects
  private tileRT!: Phaser.GameObjects.RenderTexture;
  private gridGfx!: Phaser.GameObjects.Graphics;
  private selRing!: Phaser.GameObjects.Graphics;
  private ghostImg!: Phaser.GameObjects.Image;
  private ghostRect!: Phaser.GameObjects.Rectangle;
  private _wpVec = new Phaser.Math.Vector2();

  // Keyboard navigation
  private wasdKeys!: { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key };

  // Minimap
  private minimap!: Minimap;

  // Campaign data
  private mapId       = 'custom-map';
  private mapTitle    = 'Нова карта';
  private initialPhase = 'phase_1';
  private enemyStatMul = { hp: 1.0, atk: 1.0 };
  private playerEcon   = { gold: 400, lumber: 200, salt: 0,   food: 100 };
  private aiEcon       = { gold: 400, lumber: 200, salt: 0,   food: 100 };
  private phases:   import('../editor/types').EditorPhase[]   = [];
  private triggers: import('../editor/types').EditorTrigger[] = [];
  private campaignPanel?: CampaignPanel;

  // DOM refs
  private activeTab: PaletteTab = 'terrain';
  private paletteContent!: HTMLElement;
  private propsPanel!: HTMLElement;
  private titleInput!: HTMLInputElement;
  private toolButtonEls: Partial<Record<Tool, HTMLButtonElement>> = {};
  private tabButtonEls: Partial<Record<PaletteTab, HTMLButtonElement>> = {};
  private activePalEl: HTMLElement | null = null;

  constructor() { super('EditorScene'); }

  create(): void {
    this.tileData.fill(TileType.Grass);

    this.tileRT = this.add.renderTexture(0, 0, this.mapW * TILE, this.mapH * TILE).setOrigin(0, 0);
    this.redrawAllTiles();

    this.gridGfx = this.add.graphics();
    this.drawGrid();
    this.gridGfx.setVisible(false);

    this.areaGfx  = this.add.graphics();
    this.selRing  = this.add.graphics();
    this.ghostImg  = this.add.image(0, 0, 'tile_grass').setAlpha(0.5).setOrigin(0.5, 0.5).setDepth(50).setVisible(false);
    this.ghostRect = this.add.rectangle(0, 0, 32, 32, 0x44ff44, 0.35).setDepth(50).setVisible(false);

    this.cameras.main.setBounds(0, 0, this.mapW * TILE, this.mapH * TILE);
    this.cameras.main.setZoom(1.2);

    this.minimap = new Minimap(this, VIEW_W, VIEW_H);
    this.minimap.updateTerrain(this.tileData, this.mapW, this.mapH);
    this.minimapDirty = false;

    const kb = this.input.keyboard!;
    this.wasdKeys = {
      W: kb.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      A: kb.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      S: kb.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      D: kb.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };

    this.setupInput();
    this.injectStyles();
    this.createDOM();
  }

  update(_time: number, delta: number): void {
    // WASD camera pan (speed scales with zoom so it feels consistent)
    const cam = this.cameras.main;
    const speed = (600 / cam.zoom) * (delta / 1000);
    const { W, A, S, D } = this.wasdKeys;
    if (W.isDown) cam.scrollY -= speed;
    if (S.isDown) cam.scrollY += speed;
    if (A.isDown) cam.scrollX -= speed;
    if (D.isDown) cam.scrollX += speed;

    const ptr = this.input.activePointer;
    // Use getWorldPoint explicitly — ptr.worldX can return screen coords if ptr.camera is stale
    const { x: wx, y: wy } = cam.getWorldPoint(ptr.x, ptr.y, this._wpVec);

    if (this.activeTool === 'place' && this.activePalItem) {
      const item = this.activePalItem;
      const pos = item.snapGrid ? this.snapWorld(wx, wy, item.footprint) : { snapX: wx, snapY: wy };
      this.positionGhost(item, pos.snapX, pos.snapY);
    } else {
      this.ghostImg.setVisible(false);
      this.ghostRect.setVisible(false);
    }

    if (this.isPainting) {
      const { tx, ty } = this.worldToTile(wx, wy);
      if      (this.activeTool === 'terrain') this.applyBrush(tx, ty, this.activeTerrain);
      else if (this.activeTool === 'erase')   this.applyBrush(tx, ty, TileType.Grass);
    }

    if (this.minimapDirty) {
      this.minimap.updateTerrain(this.tileData, this.mapW, this.mapH);
      this.minimapDirty = false;
    }
    this.minimap.updateOverlay(this.cameras.main, this.objects, this.areas, this.mapW, this.mapH);
  }

  // ── Tiles ────────────────────────────────────────────────────────────────────

  private redrawAllTiles(): void {
    for (let ty = 0; ty < this.mapH; ty++)
      for (let tx = 0; tx < this.mapW; tx++)
        this.stampTile(tx, ty, this.tileData[ty * this.mapW + tx] as TileType);
  }

  private stampTile(tx: number, ty: number, t: TileType): void {
    this.tileRT.stamp(this.tileKey(t), undefined, tx * TILE + TILE / 2, ty * TILE + TILE / 2);
  }

  private tileKey(t: TileType): string {
    switch (t) {
      case TileType.Grass:  return 'tile_grass';
      case TileType.Grass2: return 'tile_grass2';
      case TileType.Forest: return 'tile_forest';
      case TileType.Stone:  return 'tile_stone';
      case TileType.Water:  return 'tile_water_0';
      case TileType.Dirt:   return 'tile_dirt';
    }
  }

  private setTile(tx: number, ty: number, t: TileType): void {
    if (tx < 0 || ty < 0 || tx >= this.mapW || ty >= this.mapH) return;
    this.tileData[ty * this.mapW + tx] = t;
    this.stampTile(tx, ty, t);
    this.minimapDirty = true;
  }

  private applyBrush(cx: number, cy: number, t: TileType): void {
    if (this.brushSize === 1) { this.setTile(cx, cy, t); return; }
    const r = (this.brushSize - 1) / 2;
    const r2 = r * r;
    for (let dy = -Math.ceil(r); dy <= Math.ceil(r); dy++)
      for (let dx = -Math.ceil(r); dx <= Math.ceil(r); dx++)
        if (dx * dx + dy * dy <= r2) this.setTile(cx + dx, cy + dy, t);
  }

  private drawGrid(): void {
    this.gridGfx.clear();
    this.gridGfx.lineStyle(1, 0xffffff, 0.12);
    for (let tx = 0; tx <= this.mapW; tx++) { this.gridGfx.moveTo(tx * TILE, 0); this.gridGfx.lineTo(tx * TILE, this.mapH * TILE); }
    for (let ty = 0; ty <= this.mapH; ty++) { this.gridGfx.moveTo(0, ty * TILE); this.gridGfx.lineTo(this.mapW * TILE, ty * TILE); }
    this.gridGfx.strokePath();
  }

  // ── Map resize ───────────────────────────────────────────────────────────────

  resizeMap(newW: number, newH: number): void {
    const old = this.tileData;
    const newData = new Uint8Array(newW * newH);
    newData.fill(TileType.Grass);
    for (let ty = 0; ty < Math.min(this.mapH, newH); ty++)
      for (let tx = 0; tx < Math.min(this.mapW, newW); tx++)
        newData[ty * newW + tx] = old[ty * this.mapW + tx];
    this.mapW = newW;
    this.mapH = newH;
    this.tileData = newData;

    this.tileRT.destroy();
    this.tileRT = this.add.renderTexture(0, 0, newW * TILE, newH * TILE).setOrigin(0, 0);
    this.redrawAllTiles();
    this.cameras.main.setBounds(0, 0, newW * TILE, newH * TILE);
    this.drawGrid();
    this.minimap.updateTerrain(this.tileData, this.mapW, this.mapH);
    this.minimapDirty = false;
  }

  // ── Coords ───────────────────────────────────────────────────────────────────

  private worldToTile(wx: number, wy: number) {
    return { tx: Math.floor(wx / TILE), ty: Math.floor(wy / TILE) };
  }

  private snapWorld(wx: number, wy: number, footprint: number) {
    const tx = Math.floor(wx / TILE);
    const ty = Math.floor(wy / TILE);
    return { snapX: tx * TILE + (footprint * TILE) / 2, snapY: ty * TILE + (footprint * TILE) / 2, tx, ty };
  }

  // ── Texture resolution ───────────────────────────────────────────────────────

  private objTex(type: EditorObj['type'], kind: string, race: string): { key: string; frame?: number; isRect: boolean; color: number } {
    const fallback = (color: number) => ({ key: '', frame: undefined, isRect: true, color });
    if (type === 'building') {
      const r = (race === 'neutral' ? 'alliance' : race) as Race;
      const bk = kind as BuildingKind;
      if (buildingArtReady(this, bk, r)) return { key: buildingSheetKey(bk, r), frame: getBuildingStageFrame('final'), isRect: false, color: 0 };
      const lk = legacyBuildingStageKey(bk, r, 'final');
      if (this.textures.exists(lk)) return { key: lk, isRect: false, color: 0 };
      return fallback(r === 'alliance' ? 0x4a9ade : 0xdea040);
    }
    if (type === 'unit') {
      const r = (race === 'neutral' ? 'alliance' : race) as Race;
      const uk = kind as UnitKind;
      const ak = unitSheetKey(uk, r, 'idle');
      if (this.textures.exists(ak)) return { key: ak, frame: 0, isRect: false, color: 0 };
      const pk = `unit_${uk}_${r}`;
      if (this.textures.exists(pk)) return { key: pk, isRect: false, color: 0 };
      return fallback(r === 'alliance' ? 0x4a9ade : 0xdea040);
    }
    if (type === 'resource') {
      if (kind === 'gold') return { key: 'goldmine', isRect: false, color: 0 };
      if (kind === 'salt') return { key: 'salt_deposit', isRect: false, color: 0 };
      return { key: 'tree', isRect: false, color: 0 };
    }
    if (type === 'animal') {
      const k = kind === 'wolf_den' ? 'wolf_den' : `animal_${kind}`;
      if (this.textures.exists(k)) return { key: k, isRect: false, color: 0 };
      return fallback(0x8B7355);
    }
    if (type === 'landmark') {
      if (this.textures.exists(kind)) return { key: kind, isRect: false, color: 0 };
      return fallback(0x888888);
    }
    return fallback(kind === 'start_player' ? 0x44dd44 : 0xdd4444);
  }

  private objDisplaySize(type: EditorObj['type'], kind: string): { w: number; h: number } {
    if (type === 'building') { const d = BUILDING_ART_DISPLAY[kind as BuildingKind]; return d ? { w: d.width, h: d.height } : { w: 96, h: 96 }; }
    if (type === 'unit')     { const d = UNIT_ART_DISPLAY[kind as UnitKind];         return d ? { w: d.width, h: d.height } : { w: 40, h: 40 }; }
    if (type === 'resource') { if (kind === 'gold') return { w: 80, h: 80 }; if (kind === 'salt') return { w: 64, h: 64 }; return { w: 32, h: 32 }; }
    if (type === 'animal')   return kind === 'wolf_den' ? { w: 52, h: 36 } : { w: 44, h: 30 };
    if (type === 'landmark') return { w: 150, h: 150 };
    return { w: 56, h: 56 };
  }

  // ── Ghost ─────────────────────────────────────────────────────────────────────

  private positionGhost(item: PaletteItem, wx: number, wy: number): void {
    const tex = this.objTex(item.objType, item.kind, item.race);
    const size = this.objDisplaySize(item.objType, item.kind);
    if (tex.isRect) {
      this.ghostImg.setVisible(false);
      this.ghostRect.setPosition(wx, wy).setSize(size.w, size.h).setFillStyle(tex.color, 0.4).setVisible(true);
    } else {
      this.ghostRect.setVisible(false);
      this.ghostImg.setTexture(tex.key, tex.frame).setDisplaySize(size.w, size.h).setPosition(wx, wy).setVisible(true);
    }
  }

  // ── Objects ───────────────────────────────────────────────────────────────────

  private placeObject(item: PaletteItem, wx: number, wy: number): void {
    let x = wx, y = wy, tx = Math.floor(wx / TILE), ty = Math.floor(wy / TILE);
    if (item.snapGrid) { const s = this.snapWorld(wx, wy, item.footprint); x = s.snapX; y = s.snapY; tx = s.tx; ty = s.ty; }
    const obj: EditorObj = { id: eid(), type: item.objType, kind: item.kind, race: item.race, side: item.side, tx, ty, x, y, amount: item.defaultAmount };
    this.objects.push(obj);
    this.createObjSprite(obj);
  }

  private createObjSprite(obj: EditorObj): void {
    const tex = this.objTex(obj.type, obj.kind, obj.race);
    const size = this.objDisplaySize(obj.type, obj.kind);
    let sprite: Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle;
    if (tex.isRect) {
      sprite = this.add.rectangle(obj.x, obj.y, size.w, size.h, tex.color, 0.85);
    } else {
      sprite = this.add.image(obj.x, obj.y, tex.key, tex.frame).setDisplaySize(size.w, size.h);
    }
    sprite.setInteractive(new Phaser.Geom.Rectangle(-size.w/2, -size.h/2, size.w, size.h), Phaser.Geom.Rectangle.Contains);
    sprite.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
      if (!ptr.leftButtonDown()) return;
      if (this.activeTool === 'select') this.selectObj(obj.id);
      else if (this.activeTool === 'erase') this.removeObject(obj.id);
    });
    this.objSprites.set(obj.id, sprite);
    if (obj.type === 'landmark' || obj.type === 'marker') {
      const lbl = obj.customName ?? (obj.type === 'marker' ? (obj.kind === 'start_player' ? 'Гравець' : 'AI') : obj.kind.replace('sloboda_', ''));
      const t = this.add.text(obj.x, obj.y + size.h/2 + 4, lbl, { fontSize: '10px', color: '#fff', backgroundColor: '#000a', padding: { x: 2, y: 1 } }).setOrigin(0.5, 0);
      this.objLabels.set(obj.id, t);
    }
  }

  private removeObject(id: string): void {
    this.objects = this.objects.filter(o => o.id !== id);
    this.objSprites.get(id)?.destroy(); this.objSprites.delete(id);
    this.objLabels.get(id)?.destroy();  this.objLabels.delete(id);
    if (this.selectedId === id) this.selectObj(null);
  }

  private selectObj(id: string | null): void {
    this.selectedId = id;
    this.selectedAreaId = null;
    this.selRing.clear();
    if (id) {
      const obj = this.objects.find(o => o.id === id);
      if (obj) {
        const { w, h } = this.objDisplaySize(obj.type, obj.kind);
        this.selRing.lineStyle(2, 0xffff00, 1);
        this.selRing.strokeRect(obj.x - w/2 - 4, obj.y - h/2 - 4, w + 8, h + 8);
      }
    }
    this.updatePropsPanel();
  }

  private findObjAt(wx: number, wy: number): EditorObj | undefined {
    for (let i = this.objects.length - 1; i >= 0; i--) {
      const obj = this.objects[i];
      const { w, h } = this.objDisplaySize(obj.type, obj.kind);
      if (wx >= obj.x - w/2 && wx <= obj.x + w/2 && wy >= obj.y - h/2 && wy <= obj.y + h/2) return obj;
    }
  }

  // ── Areas ─────────────────────────────────────────────────────────────────────

  private placeArea(wx: number, wy: number): void {
    const area: EditorArea = { id: `area_${_eid++}`, label: 'Нова зона', x: wx, y: wy, radius: 5 * TILE };
    this.areas.push(area);
    this.drawAreas();
    this.selectArea(area.id);
    this.campaignPanel?.build();
  }

  private selectArea(id: string | null): void {
    this.selectedAreaId = id;
    this.selectedId = null;
    this.selRing.clear();
    this.updatePropsPanel();
  }

  private findAreaAt(wx: number, wy: number): EditorArea | undefined {
    for (let i = this.areas.length - 1; i >= 0; i--) {
      const a = this.areas[i];
      const dx = wx - a.x, dy = wy - a.y;
      if (Math.sqrt(dx*dx + dy*dy) <= a.radius) return a;
    }
  }

  private drawAreas(): void {
    const gfx = this.areaGfx;
    gfx.clear();
    for (const a of this.areas) {
      const isSelected = a.id === this.selectedAreaId;
      gfx.lineStyle(isSelected ? 2 : 1, isSelected ? 0xffff00 : 0xffff88, isSelected ? 1 : 0.6);
      gfx.fillStyle(0xffff44, 0.06);
      gfx.fillCircle(a.x, a.y, a.radius);
      gfx.strokeCircle(a.x, a.y, a.radius);
      this.add.text(a.x, a.y - 10, a.id, { fontSize: '9px', color: '#ffff88', backgroundColor: '#0006', padding: { x: 2, y: 1 } }).setOrigin(0.5, 0.5).setDepth(5);
    }
  }

  // ── Input ─────────────────────────────────────────────────────────────────────

  private setupInput(): void {
    this.input.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
      // Minimap click → pan camera
      if (this.minimap.isInside(ptr.x, ptr.y)) {
        const wp = this.minimap.handleClick(ptr.x, ptr.y, this.mapW, this.mapH);
        if (wp) {
          this.cameras.main.scrollX = wp.wx - this.cameras.main.width / this.cameras.main.zoom / 2;
          this.cameras.main.scrollY = wp.wy - this.cameras.main.height / this.cameras.main.zoom / 2;
        }
        return;
      }

      if (ptr.rightButtonDown()) {
        this.isPanning = true;
        this.panStart = { x: ptr.x, y: ptr.y };
        this.panScrollStart = { x: this.cameras.main.scrollX, y: this.cameras.main.scrollY };
        return;
      }
      if (!ptr.leftButtonDown()) return;

      const { x: wx, y: wy } = this.cameras.main.getWorldPoint(ptr.x, ptr.y);

      if (this.activeTool === 'terrain') {
        this.isPainting = true;
        const { tx, ty } = this.worldToTile(wx, wy);
        this.applyBrush(tx, ty, this.activeTerrain);
      } else if (this.activeTool === 'erase') {
        this.isPainting = true;
        const { tx, ty } = this.worldToTile(wx, wy);
        this.applyBrush(tx, ty, TileType.Grass);
        const fo = this.findObjAt(wx, wy);
        if (fo) this.removeObject(fo.id);
        const fa = this.findAreaAt(wx, wy);
        if (fa) { this.areas = this.areas.filter(a => a.id !== fa.id); this.drawAreas(); this.campaignPanel?.build(); }
      } else if (this.activeTool === 'place' && this.activePalItem) {
        this.placeObject(this.activePalItem, wx, wy);
      } else if (this.activeTool === 'area') {
        this.placeArea(wx, wy);
      } else if (this.activeTool === 'select') {
        const fo = this.findObjAt(wx, wy);
        if (fo) { this.selectObj(fo.id); return; }
        const fa = this.findAreaAt(wx, wy);
        if (fa) { this.selectArea(fa.id); this.drawAreas(); return; }
        this.selectObj(null);
      }
    });

    this.input.on('pointermove', (ptr: Phaser.Input.Pointer) => {
      if (!this.isPanning) return;
      const cam = this.cameras.main;
      cam.scrollX = this.panScrollStart.x - (ptr.x - this.panStart.x) / cam.zoom;
      cam.scrollY = this.panScrollStart.y - (ptr.y - this.panStart.y) / cam.zoom;
    });

    this.input.on('pointerup', (ptr: Phaser.Input.Pointer) => {
      if (ptr.rightButtonReleased()) this.isPanning = false;
      if (ptr.leftButtonReleased()) { this.isPainting = false; if (this.minimapDirty) { this.minimap.updateTerrain(this.tileData, this.mapW, this.mapH); this.minimapDirty = false; } }
    });

    this.input.on('wheel', (_: unknown, __: unknown, _dx: number, dy: number) => {
      const cam = this.cameras.main;
      cam.setZoom(Phaser.Math.Clamp(cam.zoom * (dy > 0 ? 0.9 : 1.1), 0.3, 3.5));
    });

    this.input.keyboard!.on('keydown-G', () => this.gridGfx.setVisible(!this.gridGfx.visible));
    this.input.keyboard!.on('keydown-DELETE', () => {
      if (this.selectedId)     this.removeObject(this.selectedId);
      if (this.selectedAreaId) { this.areas = this.areas.filter(a => a.id !== this.selectedAreaId); this.selectedAreaId = null; this.drawAreas(); this.campaignPanel?.build(); }
    });
    this.input.keyboard!.on('keydown-ESC', () => {
      this.selectObj(null); this.selectArea(null); this.setTool('terrain');
      this.activePalItem = null;
      this.activePalEl?.classList.remove('active'); this.activePalEl = null;
    });
  }

  // ── DOM ───────────────────────────────────────────────────────────────────────

  private injectStyles(): void {
    const s = document.createElement('style');
    s.textContent = `
      #ed-root{position:fixed;inset:0;pointer-events:none;z-index:10;font-family:sans-serif}
      #ed-topbar{position:absolute;top:0;left:250px;right:0;height:40px;background:#1a1208ee;display:flex;align-items:center;gap:6px;padding:0 10px;pointer-events:all;border-bottom:1px solid #7a6243;flex-shrink:0}
      #ed-topbar input{background:#2a1f10;border:1px solid #7a6243;color:#ffd36a;padding:3px 6px;border-radius:3px;font-size:13px;width:150px}
      #ed-topbar button{background:#3a2a14;border:1px solid #7a6243;color:#ffd36a;padding:3px 8px;border-radius:3px;cursor:pointer;font-size:11px;white-space:nowrap}
      #ed-topbar button:hover{background:#5a3e1c}
      #ed-topbar button.story-btn{background:#1a3a1a;border-color:#5a9a5a;color:#aaffaa}
      #ed-topbar button.story-btn:hover{background:#2a5a2a}
      #ed-hint{color:#555;font-size:10px;margin-left:auto;white-space:nowrap}
      #ed-left{position:absolute;top:0;left:0;width:250px;height:100%;background:#1a1208ee;border-right:1px solid #7a6243;pointer-events:all;display:flex;flex-direction:column;overflow:hidden}
      .ed-sec{padding:5px 8px;border-bottom:1px solid #2a1a08}
      .ed-sec-ttl{color:#7a6243;font-size:10px;text-transform:uppercase;margin-bottom:4px}
      .ed-tools{display:flex;gap:3px;flex-wrap:wrap}
      .ed-tbtn{flex:1;min-width:48px;background:#2a1f10;border:1px solid #5a4020;color:#bbb;padding:4px 3px;border-radius:3px;cursor:pointer;font-size:11px;text-align:center}
      .ed-tbtn:hover{background:#3a2a14}.ed-tbtn.active{background:#5a3e1c;border-color:#ffd36a;color:#ffd36a}
      .ed-tbtn.area-btn{border-color:#8899aa;color:#8899aa}.ed-tbtn.area-btn.active{background:#224455;border-color:#ffff88;color:#ffff88}
      .ed-brush{display:flex;align-items:center;gap:6px}
      .ed-brush label{color:#888;font-size:11px}
      .ed-brush select{background:#2a1f10;border:1px solid #5a4020;color:#ccc;padding:2px 4px;border-radius:2px;font-size:11px}
      .ed-tabs{display:flex;flex-wrap:wrap;gap:2px}
      .ed-tab{flex:1;min-width:34px;background:#2a1f10;border:1px solid #2a1a08;color:#999;padding:3px 2px;border-radius:2px;cursor:pointer;font-size:10px;text-align:center}
      .ed-tab:hover{background:#3a2a14}.ed-tab.active{background:#3d2810;border-color:#7a6243;color:#ffd36a}
      .ed-tab.campaign-tab{border-color:#3a5a3a;color:#88aa88}.ed-tab.campaign-tab.active{background:#1a3a1a;border-color:#5a9a5a;color:#aaffaa}
      #ed-pal{flex:1;overflow-y:auto;padding:6px 8px}
      .ed-pi{display:flex;align-items:center;gap:5px;padding:4px 6px;border-radius:3px;cursor:pointer;border:1px solid transparent;margin-bottom:2px}
      .ed-pi:hover{background:#2a1f10;border-color:#5a4020}.ed-pi.active{background:#3d2810;border-color:#ffd36a}
      .ed-pi .sw{width:18px;height:18px;border-radius:2px;flex-shrink:0;border:1px solid #0004}
      .ed-pi .lb{color:#ccc;font-size:12px}
      .ed-grp{color:#7a6243;font-size:10px;text-transform:uppercase;margin:6px 0 2px 2px}
      #ed-right{position:absolute;top:40px;right:0;width:230px;background:#1a1208ee;border-left:1px solid #7a6243;pointer-events:all;padding:10px;display:none;max-height:calc(100%-40px);overflow-y:auto}
      #ed-right .rttl{color:#ffd36a;font-size:13px;font-weight:bold;margin-bottom:8px}
      .ed-pr{margin-bottom:7px}.ed-pr label{color:#888;font-size:11px;display:block;margin-bottom:2px}
      .ed-pr input,.ed-pr select{background:#2a1f10;border:1px solid #5a4020;color:#fff;padding:3px 6px;border-radius:2px;font-size:12px;width:100%;box-sizing:border-box}
      .ed-del{background:#5a1010;border:1px solid #aa3333;color:#ffaaaa;padding:5px;border-radius:3px;cursor:pointer;font-size:12px;width:100%;margin-top:6px}
      .ed-del:hover{background:#7a1818}
      #ed-pal::-webkit-scrollbar,#ed-right::-webkit-scrollbar{width:5px}
      #ed-pal::-webkit-scrollbar-track,#ed-right::-webkit-scrollbar-track{background:#1a1208}
      #ed-pal::-webkit-scrollbar-thumb,#ed-right::-webkit-scrollbar-thumb{background:#5a4020;border-radius:3px}
    `;
    document.head.appendChild(s);
  }

  private createDOM(): void {
    const root = document.createElement('div');
    root.id = 'ed-root';
    document.body.appendChild(root);

    // Top bar
    const top = document.createElement('div');
    top.id = 'ed-topbar';
    root.appendChild(top);

    const nlbl = document.createElement('label');
    nlbl.style.cssText = 'color:#888;font-size:11px;white-space:nowrap';
    nlbl.textContent = 'Назва:';
    top.appendChild(nlbl);

    const ti = document.createElement('input');
    ti.value = this.mapTitle;
    ti.addEventListener('input', () => { this.mapTitle = ti.value; });
    top.appendChild(ti);
    this.titleInput = ti;

    const addBtn = (text: string, cls: string, onClick: () => void) => {
      const b = document.createElement('button');
      b.textContent = text; b.className = cls;
      b.addEventListener('click', (e) => { e.stopPropagation(); onClick(); });
      top.appendChild(b);
      return b;
    };

    addBtn('⬇ Зберегти', '', () => this.exportJSON());

    const fileIn = document.createElement('input');
    fileIn.type = 'file'; fileIn.accept = '.json'; fileIn.style.display = 'none';
    fileIn.addEventListener('change', () => {
      const f = fileIn.files?.[0]; if (!f) return;
      const r = new FileReader();
      r.onload = (ev) => { try { this.importFromJSON(JSON.parse(ev.target!.result as string) as EditorMapData); } catch { alert('Помилка JSON'); } };
      r.readAsText(f);
    });
    top.appendChild(fileIn);
    addBtn('⬆ Завантажити', '', () => fileIn.click());
    addBtn('📜 Генерувати .ts', 'story-btn', () => this.exportStoryTS());
    addBtn('🎮 Зберегти в гру', 'story-btn', () => this.saveToGame());
    addBtn('🌿 Травою', '', () => { this.tileData.fill(TileType.Grass); this.redrawAllTiles(); this.minimapDirty = true; });

    const hint = document.createElement('span');
    hint.id = 'ed-hint';
    hint.textContent = 'G=сітка · Del=видалити · ПКМ=панорам · Scroll=зум · Клік на мінікарту=навігація · ESC=скинути';
    top.appendChild(hint);

    // Left panel
    const left = document.createElement('div');
    left.id = 'ed-left';
    root.appendChild(left);

    // Tools
    const toolSec = document.createElement('div');
    toolSec.className = 'ed-sec';
    toolSec.innerHTML = '<div class="ed-sec-ttl">Інструмент</div>';
    const toolsDiv = document.createElement('div');
    toolsDiv.className = 'ed-tools';
    toolSec.appendChild(toolsDiv);
    left.appendChild(toolSec);

    const TOOLS: { id: Tool; label: string; cls?: string }[] = [
      { id: 'terrain', label: '✏ Ландшафт' },
      { id: 'place',   label: '📌 Розміщення' },
      { id: 'select',  label: '↖ Вибір' },
      { id: 'erase',   label: '⌫ Стерти' },
      { id: 'area',    label: '⭕ Область', cls: 'area-btn' },
    ];
    for (const t of TOOLS) {
      const b = document.createElement('button');
      b.className = 'ed-tbtn' + (t.cls ? ' ' + t.cls : '') + (t.id === this.activeTool ? ' active' : '');
      b.textContent = t.label;
      b.addEventListener('click', (e) => { e.stopPropagation(); this.setTool(t.id); });
      toolsDiv.appendChild(b);
      this.toolButtonEls[t.id] = b;
    }

    // Brush
    const brushSec = document.createElement('div');
    brushSec.className = 'ed-sec';
    brushSec.innerHTML = '<div class="ed-brush"><label>Пензель:</label><select id="ed-br"><option value="1">1 (крапка)</option><option value="3">3 (S)</option><option value="5">5 (M)</option><option value="7">7 (L)</option><option value="11">11 (XL)</option><option value="15">15 (XXL)</option></select></div>';
    brushSec.querySelector('select')!.addEventListener('change', (e) => { this.brushSize = parseInt((e.target as HTMLSelectElement).value) as BrushSize; });
    // default to size 5 for a more natural feel
    (brushSec.querySelector('select') as HTMLSelectElement).value = '5';
    this.brushSize = 5;
    left.appendChild(brushSec);

    // Tabs
    const tabSec = document.createElement('div');
    tabSec.className = 'ed-sec';
    tabSec.innerHTML = '<div class="ed-sec-ttl">Палітра</div>';
    const tabsDiv = document.createElement('div');
    tabsDiv.className = 'ed-tabs';
    tabSec.appendChild(tabsDiv);
    left.appendChild(tabSec);

    const TABS: { id: PaletteTab; label: string; cls?: string }[] = [
      { id: 'terrain',   label: 'Терен' },
      { id: 'resources', label: 'Ресурси' },
      { id: 'buildings', label: 'Будівлі' },
      { id: 'units',     label: 'Юніти' },
      { id: 'animals',   label: 'Тварини' },
      { id: 'landmarks', label: 'Лендмарки' },
      { id: 'campaign',  label: '📋 Кампанія', cls: 'campaign-tab' },
    ];
    for (const tab of TABS) {
      const b = document.createElement('button');
      b.className = 'ed-tab' + (tab.cls ? ' ' + tab.cls : '') + (tab.id === this.activeTab ? ' active' : '');
      b.textContent = tab.label;
      b.addEventListener('click', (e) => { e.stopPropagation(); this.switchTab(tab.id); });
      tabsDiv.appendChild(b);
      this.tabButtonEls[tab.id] = b;
    }

    const pal = document.createElement('div');
    pal.id = 'ed-pal';
    left.appendChild(pal);
    this.paletteContent = pal;

    // Right props
    const right = document.createElement('div');
    right.id = 'ed-right';
    root.appendChild(right);
    this.propsPanel = right;

    this.buildPaletteContent('terrain');
  }

  private setTool(t: Tool): void {
    this.activeTool = t;
    for (const [id, b] of Object.entries(this.toolButtonEls)) b?.classList.toggle('active', id === t);
    if (t !== 'place') { this.ghostImg.setVisible(false); this.ghostRect.setVisible(false); }
  }

  private switchTab(tab: PaletteTab): void {
    this.activeTab = tab;
    for (const [id, b] of Object.entries(this.tabButtonEls)) b?.classList.toggle('active', id === tab);
    this.buildPaletteContent(tab);
  }

  private buildPaletteContent(tab: PaletteTab): void {
    this.paletteContent.innerHTML = '';

    if (tab === 'campaign') {
      this.campaignPanel = new CampaignPanel(
        this.paletteContent,
        { phases: this.phases, triggers: this.triggers, areas: this.areas, mapId: this.mapId, mapTitle: this.mapTitle, initialPhase: this.initialPhase, enemyStatMul: this.enemyStatMul, playerEcon: this.playerEcon, aiEcon: this.aiEcon },
        {
          getMapSize: () => ({ w: this.mapW, h: this.mapH }),
          onResizeMap: (w, h) => this.resizeMap(w, h),
          onAreasChanged: () => this.drawAreas(),
          onMapIdChange: (id) => { this.mapId = id; },
          onInitialPhaseChange: (phase) => { this.initialPhase = phase; },
        }
      );
      this.campaignPanel.build();
      return;
    }

    if (tab === 'terrain') {
      for (const item of TERRAIN_ITEMS) {
        const el = document.createElement('div');
        el.className = 'ed-pi' + (this.activeTerrain === item.type ? ' active' : '');
        el.innerHTML = `<div class="sw" style="background:${item.color}"></div><span class="lb">${item.label}</span>`;
        el.addEventListener('click', (e) => {
          e.stopPropagation(); this.activeTerrain = item.type; this.setTool('terrain');
          this.activePalEl?.classList.remove('active'); el.classList.add('active'); this.activePalEl = el;
        });
        this.paletteContent.appendChild(el);
      }
      return;
    }

    const MAP: Record<Exclude<PaletteTab, 'terrain' | 'campaign'>, PaletteItem[]> = {
      resources: RESOURCE_ITEMS, buildings: BUILDING_ITEMS,
      units: UNIT_ITEMS, animals: ANIMAL_ITEMS, landmarks: LANDMARK_ITEMS,
    };
    const items = MAP[tab as Exclude<PaletteTab, 'terrain' | 'campaign'>];
    let lastRace = '';
    for (const item of items) {
      if (tab === 'buildings' || tab === 'units') {
        if (item.race !== lastRace) {
          const g = document.createElement('div');
          g.className = 'ed-grp';
          g.textContent = item.race === 'alliance' ? '— Слобожани —' : '— Татари —';
          this.paletteContent.appendChild(g);
          lastRace = item.race;
        }
      }
      const el = document.createElement('div');
      el.className = 'ed-pi';
      el.innerHTML = `<div class="sw" style="background:${item.color}"></div><span class="lb">${item.label}</span>`;
      el.addEventListener('click', (e) => {
        e.stopPropagation(); this.activePalItem = item; this.setTool('place');
        this.activePalEl?.classList.remove('active'); el.classList.add('active'); this.activePalEl = el;
      });
      this.paletteContent.appendChild(el);
    }
  }

  private updatePropsPanel(): void {
    const p = this.propsPanel;

    // Area selected
    if (this.selectedAreaId) {
      const area = this.areas.find(a => a.id === this.selectedAreaId);
      if (!area) { p.style.display = 'none'; return; }
      p.style.display = 'block';
      p.innerHTML = `<div class="rttl">Зона: ${area.id}</div>`;
      const addRow = (lbl: string, val: string, onChange: (v: string) => void, type = 'text') => {
        const row = document.createElement('div'); row.className = 'ed-pr';
        const l = document.createElement('label'); l.textContent = lbl;
        const inp = document.createElement('input'); inp.type = type; inp.value = val;
        inp.addEventListener('input', (e) => onChange((e.target as HTMLInputElement).value));
        row.appendChild(l); row.appendChild(inp); p.appendChild(row);
      };
      addRow('Мітка', area.label, (v) => { area.label = v; this.drawAreas(); });
      addRow('X', String(Math.round(area.x)), (v) => { area.x = parseFloat(v)||area.x; this.drawAreas(); }, 'number');
      addRow('Y', String(Math.round(area.y)), (v) => { area.y = parseFloat(v)||area.y; this.drawAreas(); }, 'number');
      addRow('Радіус (px)', String(Math.round(area.radius)), (v) => { area.radius = parseFloat(v)||area.radius; this.drawAreas(); }, 'number');
      const del = document.createElement('button'); del.className = 'ed-del'; del.textContent = '🗑 Видалити зону';
      del.addEventListener('click', () => { this.areas = this.areas.filter(a => a.id !== area.id); this.selectedAreaId = null; this.drawAreas(); p.style.display = 'none'; this.campaignPanel?.build(); });
      p.appendChild(del);
      return;
    }

    // Object selected
    if (!this.selectedId) { p.style.display = 'none'; return; }
    const obj = this.objects.find(o => o.id === this.selectedId);
    if (!obj) { p.style.display = 'none'; return; }

    p.style.display = 'block';
    p.innerHTML = `<div class="rttl">${obj.type}: ${obj.kind}</div>`;

    const addRow = (lbl: string, val: string, onChange: (v: string) => void, type = 'text') => {
      const row = document.createElement('div'); row.className = 'ed-pr';
      const l = document.createElement('label'); l.textContent = lbl;
      const inp = document.createElement('input'); inp.type = type; inp.value = val;
      inp.addEventListener('input', (e) => onChange((e.target as HTMLInputElement).value));
      row.appendChild(l); row.appendChild(inp); p.appendChild(row);
    };

    addRow('Ім\'я', obj.customName ?? '', (v) => { obj.customName = v; const t = this.objLabels.get(obj.id); if (t) t.setText(v||obj.kind); });
    if (obj.amount !== undefined) addRow('Кількість', String(obj.amount), (v) => { obj.amount = parseInt(v)||0; }, 'number');
    addRow('Позиція X', String(Math.round(obj.x)), (v) => {
      obj.x = parseFloat(v)||obj.x;
      this.objSprites.get(obj.id)?.setPosition(obj.x, obj.y);
      this.objLabels.get(obj.id)?.setPosition(obj.x, obj.y + this.objDisplaySize(obj.type, obj.kind).h/2 + 4);
      this.selectObj(obj.id);
    }, 'number');
    addRow('Позиція Y', String(Math.round(obj.y)), (v) => {
      obj.y = parseFloat(v)||obj.y;
      this.objSprites.get(obj.id)?.setPosition(obj.x, obj.y);
      this.objLabels.get(obj.id)?.setPosition(obj.x, obj.y + this.objDisplaySize(obj.type, obj.kind).h/2 + 4);
      this.selectObj(obj.id);
    }, 'number');

    if (obj.type === 'unit' || obj.type === 'landmark') {
      addRow('Group ID', obj.groupId ?? '', (v) => { obj.groupId = v || undefined; });
    }
    if (obj.type === 'unit') {
      addRow('HP mul (напр. 2.4)', String(obj.hpMul ?? ''), (v) => { obj.hpMul = parseFloat(v)||undefined; }, 'number');
      addRow('ATK mul', String(obj.atkMul ?? ''), (v) => { obj.atkMul = parseFloat(v)||undefined; }, 'number');
      addRow('Speed mul', String(obj.speedMul ?? ''), (v) => { obj.speedMul = parseFloat(v)||undefined; }, 'number');
    }

    const del = document.createElement('button'); del.className = 'ed-del'; del.textContent = '🗑 Видалити';
    del.addEventListener('click', (e) => { e.stopPropagation(); this.removeObject(obj.id); });
    p.appendChild(del);
  }

  // ── Export / Import ───────────────────────────────────────────────────────────

  exportJSON(): void {
    const data: EditorMapData = {
      id: this.mapId, title: this.mapTitle,
      mapW: this.mapW, mapH: this.mapH,
      tiles: Array.from(this.tileData),
      objects: this.objects.map(o => ({ ...o })),
      playerEconomy: { ...this.playerEcon },
      aiEconomy:     { ...this.aiEcon },
      initialPhase:  this.initialPhase,
      phases:   JSON.parse(JSON.stringify(this.phases)),
      triggers: JSON.parse(JSON.stringify(this.triggers)),
      areas:    JSON.parse(JSON.stringify(this.areas)),
      enemyStatMul: { ...this.enemyStatMul },
    };
    this.download(`${this.mapId}.json`, JSON.stringify(data, null, 2), 'application/json');
  }

  importFromJSON(data: EditorMapData): void {
    for (const id of this.objSprites.keys()) { this.objSprites.get(id)?.destroy(); this.objLabels.get(id)?.destroy(); }
    this.objSprites.clear(); this.objLabels.clear();
    this.objects = []; this.areas = [];
    this.selectObj(null); this.selectArea(null);

    this.mapId       = data.id       ?? 'custom-map';
    this.mapTitle    = data.title    ?? 'Нова карта';
    this.initialPhase = data.initialPhase ?? 'phase_1';
    this.enemyStatMul = data.enemyStatMul ?? { hp: 1, atk: 1 };
    this.titleInput.value = this.mapTitle;
    if (data.playerEconomy) this.playerEcon = { ...data.playerEconomy };
    if (data.aiEconomy)     this.aiEcon     = { ...data.aiEconomy };
    this.phases   = data.phases   ?? [];
    this.triggers = data.triggers ?? [];
    this.areas    = data.areas    ?? [];

    const newW = data.mapW ?? MAP_W;
    const newH = data.mapH ?? MAP_H;
    if (newW !== this.mapW || newH !== this.mapH) {
      this.mapW = newW; this.mapH = newH;
      this.tileRT.destroy();
      this.tileRT = this.add.renderTexture(0, 0, newW * TILE, newH * TILE).setOrigin(0, 0);
      this.cameras.main.setBounds(0, 0, newW * TILE, newH * TILE);
      this.drawGrid();
    }
    if (Array.isArray(data.tiles) && data.tiles.length === newW * newH) {
      this.tileData = new Uint8Array(data.tiles);
    } else {
      this.tileData = new Uint8Array(newW * newH);
      this.tileData.fill(TileType.Grass);
    }
    this.redrawAllTiles();
    this.minimap.updateTerrain(this.tileData, this.mapW, this.mapH);
    this.minimapDirty = false;

    for (const obj of (data.objects ?? [])) { this.objects.push(obj); this.createObjSprite(obj); }
    this.drawAreas();
    if (this.activeTab === 'campaign') { this.campaignPanel?.build(); }
  }

  // ── Story export ─────────────────────────────────────────────────────────────

  private exportStoryTS(): void {
    const { code, fileBase } = this.buildStoryCode();
    this.download(`${fileBase}.ts`, code, 'text/plain');
  }

  private async saveToGame(): Promise<void> {
    const { code, fnName, fileBase } = this.buildStoryCode();
    try {
      const res = await fetch('/__editor/save-map', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mapId: this.mapId, fnName, fileBase, label: this.mapTitle, code }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      alert(`Збережено: ${data.mapFile}\nКарта "${this.mapTitle}" (${this.mapId}) зареєстрована в грі.\nПерезавантажте сторінку без ?editor, щоб запустити її через меню Сценарію.`);
    } catch (err) {
      alert(`Не вдалося зберегти в гру: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  private buildStoryCode(): { code: string; fnName: string; fileBase: string } {
    const playerMarker = this.objects.find(o => o.type === 'marker' && o.kind === 'start_player');
    const aiMarker     = this.objects.find(o => o.type === 'marker' && o.kind === 'start_ai');
    const goldMines    = this.objects.filter(o => o.type === 'resource' && o.kind === 'gold');
    const salts        = this.objects.filter(o => o.type === 'resource' && o.kind === 'salt');
    const buildings    = this.objects.filter(o => o.type === 'building');
    const units        = this.objects.filter(o => o.type === 'unit');
    const landmarks    = this.objects.filter(o => o.type === 'landmark');

    const playerBase = playerMarker ? `{ tx: ${playerMarker.tx}, ty: ${playerMarker.ty} }` : `{ tx: 10, ty: 10 }`;
    const aiBase     = aiMarker     ? `{ tx: ${aiMarker.tx}, ty: ${aiMarker.ty} }`     : `{ tx: ${this.mapW - 15}, ty: ${this.mapH - 15} }`;

    const tilesArr = Array.from(this.tileData).join(',');

    const phasesStr = JSON.stringify(this.phases.map(ph => ({
      id: ph.id, title: ph.title,
      objectives: ph.objectives.map(ob => ({ id: ob.id, title: ob.title, optional: ob.optional, description: ob.description })),
      restrictions: ph.buildAllowed || ph.trainAllowed ? {
        buildAllowed: ph.buildAllowed ? ph.buildAllowed.split(',').map(s => s.trim()).filter(Boolean) : undefined,
        trainAllowed: ph.trainAllowed ? ph.trainAllowed.split(',').map(s => s.trim()).filter(Boolean) : undefined,
        defaultBuildReason: ph.defaultBuildReason,
      } : undefined,
    })), null, 4);

    const triggersStr = JSON.stringify(this.triggers.map(tr => {
      const area = tr.areaId ? this.areas.find(a => a.id === tr.areaId) : undefined;
      return {
        id: tr.id, phase: tr.phase || undefined, on: tr.on, once: tr.once,
        delayMs: tr.delayMs,
        area: area ? { id: area.id, x: area.x, y: area.y, radius: area.radius } : undefined,
        events: tr.events.map(ev => this.convertEvent(ev)),
      };
    }), null, 4);

    const fnName = `create${this.toPascal(this.mapId)}`;
    const fileBase = this.toCamel(this.mapId);

    const code = `import { TileMap, TileType } from '../../world/TileMap';
import type { StoryMapDefinition } from '../types';
import { MAP_W, MAP_H } from '../../config';

// Generated by Sloboda RTS Level Editor

const MAP_TILES = [${tilesArr}];

export function ${fnName}(seed: number): StoryMapDefinition {
  const map = new TileMap();
  MAP_TILES.forEach((t, i) => {
    const tx = i % ${this.mapW}, ty = Math.floor(i / ${this.mapW});
    if (tx < MAP_W && ty < MAP_H) map.set(tx, ty, t as TileType);
  });

  return {
    id: '${this.mapId}' as any,
    title: '${this.mapTitle}',
    layout: {
      map,
      playerBase: ${playerBase},
      aiBase:     ${aiBase},
      goldMines: ${JSON.stringify(goldMines.map(o => ({ tx: o.tx, ty: o.ty })))},
      trees: [],
      decals: [],
    },
    initialPhase: '${this.initialPhase}',
    playerEconomy: ${JSON.stringify(this.playerEcon)},
    aiEconomy:     ${JSON.stringify(this.aiEcon)},
    startingBuildings: ${JSON.stringify(buildings.map(o => ({ kind: o.kind, side: o.side === 'player' ? 'player' : 'ai', race: o.race, tx: o.tx, ty: o.ty, instant: true })), null, 6)},
    startingUnits: ${JSON.stringify(units.map(o => ({ kind: o.kind, side: o.side === 'player' ? 'player' : 'ai', race: o.race === 'neutral' ? 'alliance' : o.race, x: o.x, y: o.y, groupId: o.groupId, hpMul: o.hpMul, atkMul: o.atkMul, customName: o.customName })), null, 6)},
    startingResources: [
      ${goldMines.map(o => `{ type: 'gold', tx: ${o.tx}, ty: ${o.ty} }`).join(',\n      ')},
      ${salts.map(o => `{ type: 'salt', tx: ${o.tx}, ty: ${o.ty} }`).join(',\n      ')}
    ],
    landmarks: ${JSON.stringify(landmarks.map(o => ({ id: o.customName || o.kind, kind: 'image', x: o.x, y: o.y, label: o.customName || '', textureKey: o.kind, displayWidth: 150, displayHeight: 150 })), null, 6)},
    phases: ${phasesStr},
    triggers: ${triggersStr},
    ${this.enemyStatMul.hp !== 1 || this.enemyStatMul.atk !== 1 ? `enemyStatMultiplier: { hp: ${this.enemyStatMul.hp}, atk: ${this.enemyStatMul.atk} },` : ''}
  };
}
`;
    return { code, fnName, fileBase };
  }

  private convertEvent(ev: EditorEvent): unknown {
    if (ev.type === 'showDialogue') return { type: 'showDialogue', lines: ev.lines };
    if (ev.type === 'setPhase') return { type: 'setPhase', phase: ev.phaseId };
    if (ev.type === 'setFlag') return { type: 'setFlag', flag: ev.flag, value: ev.value };
    if (ev.type === 'setObjectiveStatus') return { type: 'setObjectiveStatus', objectiveId: ev.objectiveId, status: ev.status };
    if (ev.type === 'spawnUnits') return { type: 'spawnUnits', groupId: ev.groupId, units: ev.units };
    if (ev.type === 'commandGroup') return { type: 'commandGroup', groupId: ev.groupId, command: { type: ev.command, x: ev.x, y: ev.y } };
    if (ev.type === 'revealArea') return { type: 'revealArea', x: ev.x, y: ev.y, radiusTiles: ev.radiusTiles };
    if (ev.type === 'endGame') return { type: 'endGame', win: ev.win };
    if (ev.type === 'showMessage') return { type: 'showMessage', text: ev.text };
    if (ev.type === 'grantResources') return { type: 'grantResources', side: ev.side, gold: ev.gold, lumber: ev.lumber, salt: ev.salt, food: ev.food };
    if (ev.type === 'focusCamera') return { type: 'focusCamera', beat: { x: ev.x, y: ev.y, lockMs: ev.lockMs } };
    if (ev.type === 'setAtmosphere') return { type: 'setAtmosphere', tone: ev.tone, durationMs: ev.durationMs };
    if (ev.type === 'setLandmarkVisible') return { type: 'setLandmarkVisible', id: ev.id, visible: ev.visible };
    if (ev.type === 'setClock') return { type: 'setClock', label: ev.label, durationMs: ev.durationMs, icon: ev.icon };
    if (ev.type === 'clearClock') return { type: 'clearClock' };
    if (ev.type === 'setDayPhase') return { type: 'setDayPhase', phase: ev.phase };
    return ev;
  }

  private toPascal(s: string): string {
    return s.replace(/([-_][a-z])/gi, g => g[1].toUpperCase()).replace(/^[a-z]/, c => c.toUpperCase());
  }

  private toCamel(s: string): string {
    const pascal = this.toPascal(s);
    return pascal.charAt(0).toLowerCase() + pascal.slice(1);
  }

  private download(name: string, content: string, mime: string): void {
    const url = URL.createObjectURL(new Blob([content], { type: mime }));
    const a = document.createElement('a');
    a.href = url; a.download = name; a.click();
    URL.revokeObjectURL(url);
  }
}
