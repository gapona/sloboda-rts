import Phaser from 'phaser';
import { ANIMAL, AnimalKind, SIDE, TILE, WORLD_W, WORLD_H } from '../config';
import { HealthBar, IEntity, newEntityId } from './Entity';
import type { TileMap } from '../world/TileMap';

/**
 * Дикий звір (олень / вепр). Нейтральний, не агриться сам:
 * бродить навколо рідної точки, при пораненні тікає від кривдника.
 * Смерть обробляє GameScene.dealDamage → спавнить тушу (ResourceNode 'food').
 */
export class Animal implements IEntity {
  readonly id = newEntityId();
  readonly kind = 'animal' as const;
  readonly side = SIDE.neutral;
  readonly animalKind: AnimalKind;
  readonly sprite: Phaser.GameObjects.Sprite;
  readonly hb: HealthBar;

  hp: number;
  maxHp: number;
  alive = true;
  sight = 0;
  radius: number;
  killedBy: IEntity | null = null;

  /** Хижак: поточна жертва (керує GameScene.updateAnimals). */
  huntTarget: IEntity | null = null;
  /** Туманець: уповільнення (за scene.time.now). */
  slowUntilMs = 0;
  slowFactor = 1;
  lastBiteMs = 0;
  /** Вепр: до якого моменту (nowMs) огризається на кривдника, поки не загубить його. */
  retaliateUntilMs = 0;
  /** Лігво: коли народжує наступного вовка (time.now). */
  nextRespawnMs = 0;

  private map: TileMap;
  homeX: number;
  homeY: number;
  private targetX: number;
  private targetY: number;
  private restMs = 0;
  private fleeUntilMs = 0;
  private nowMs = 0;

  constructor(scene: Phaser.Scene, map: TileMap, x: number, y: number, kindId: AnimalKind) {
    this.animalKind = kindId;
    this.map = map;
    const def = ANIMAL[kindId];
    this.hp = def.hp;
    this.maxHp = def.hp;
    this.radius = def.radius;
    this.homeX = x;
    this.homeY = y;
    this.targetX = x;
    this.targetY = y;

    this.sprite = scene.add.sprite(x, y, def.texture)
      .setDepth(28)
      .setOrigin(0.5, 0.78);
    this.sprite.setData('entity', this);

    // легке «дихання»
    scene.tweens.add({
      targets: this.sprite,
      scaleY: { from: 1, to: 1.04 },
      duration: 900 + Math.random() * 500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    this.hb = new HealthBar(scene, this, def.speed === 0 ? 40 : 26);
    if (def.speed > 0) this.pickWanderTarget();
  }

  get x(): number { return this.sprite.x; }
  get y(): number { return this.sprite.y; }
  set x(v: number) { this.sprite.x = v; }
  set y(v: number) { this.sprite.y = v; }

  setVisible(v: boolean): void {
    this.sprite.setVisible(v);
    this.hb.setVisible(v && this.hp < this.maxHp);
  }

  private get fleeing(): boolean { return this.nowMs < this.fleeUntilMs; }

  update(dt: number): void {
    this.nowMs += dt;
    this.hb.update();
    if (!this.alive) return;
    const defStatic = ANIMAL[this.animalKind];
    if (defStatic.speed === 0) return;

    // хижак на полюванні: ціль веде GameScene, тут лише ноги
    if (this.huntTarget) {
      if (!this.huntTarget.alive) { this.huntTarget = null; }
      else {
        this.targetX = this.huntTarget.x;
        this.targetY = this.huntTarget.y;
        this.restMs = 0;
      }
    }

    if (this.restMs > 0 && !this.fleeing) {
      this.restMs -= dt;
      return;
    }

    const def = ANIMAL[this.animalKind];
    let speed = this.fleeing ? def.fleeSpeed : def.speed;
    if (this.sprite.scene.time.now < this.slowUntilMs) speed *= this.slowFactor;
    const step = (speed * dt) / 1000;
    const dx = this.targetX - this.x;
    const dy = this.targetY - this.y;
    const d = Math.hypot(dx, dy);

    if (d <= step) {
      this.x = this.targetX;
      this.y = this.targetY;
      if (this.huntTarget) return; // стоїмо впритул до жертви, кусає GameScene
      if (this.fleeing) this.fleeUntilMs = 0;
      this.restMs = ANIMAL.restMinMs + Math.random() * (ANIMAL.restMaxMs - ANIMAL.restMinMs);
      this.pickWanderTarget();
      return;
    }

    const nx = Phaser.Math.Clamp(this.x + (dx / d) * step, this.radius, WORLD_W - this.radius);
    const ny = Phaser.Math.Clamp(this.y + (dy / d) * step, this.radius, WORLD_H - this.radius);
    if (!this.walkableAt(nx, ny)) {
      this.pickWanderTarget();
      return;
    }
    this.x = nx;
    this.y = ny;
    if (Math.abs(dx) > 1) this.sprite.setFlipX(dx < 0);
    this.sprite.setDepth(28 + this.y / 10000);
  }

  takeDamage(amount: number, from?: IEntity): void {
    if (!this.alive) return;
    this.hp -= amount;
    this.killedBy = from ?? this.killedBy;
    this.hb.update(true);
    if (this.hp <= 0) {
      this.alive = false;
      return;
    }
    // хижаки не тікають — кусаються (контратакою керує GameScene)
    if (ANIMAL[this.animalKind].predator || ANIMAL[this.animalKind].speed === 0) return;
    // вепр огризається на кривдника замість втечі (контратакою керує GameScene)
    if (ANIMAL[this.animalKind].retaliates && from) {
      this.huntTarget = from;
      this.retaliateUntilMs = this.sprite.scene.time.now + ANIMAL.retaliateMs;
      this.restMs = 0;
      return;
    }
    // тікаємо від кривдника
    if (from) {
      const def = ANIMAL[this.animalKind];
      const ang = Math.atan2(this.y - from.y, this.x - from.x) + (Math.random() - 0.5) * 0.9;
      const dist = TILE * (6 + Math.random() * 4);
      const fx = this.x + Math.cos(ang) * dist;
      const fy = this.y + Math.sin(ang) * dist;
      if (this.walkableAt(fx, fy)) {
        this.targetX = fx;
        this.targetY = fy;
      } else {
        this.pickWanderTarget();
      }
      this.fleeUntilMs = this.nowMs + def.fleeMs;
      this.restMs = 0;
      // нова «домівка» — куди втік
      this.homeX = fx;
      this.homeY = fy;
    }
  }

  destroy(): void {
    this.alive = false;
    const scene = this.sprite.scene;
    scene.tweens.killTweensOf(this.sprite);
    this.hb.destroy();
    this.sprite.destroy();
  }

  private pickWanderTarget(): void {
    for (let i = 0; i < 8; i++) {
      const ang = Math.random() * Math.PI * 2;
      const dist = TILE * (1.5 + Math.random() * ANIMAL.wanderRadiusTiles);
      const tx = this.homeX + Math.cos(ang) * dist;
      const ty = this.homeY + Math.sin(ang) * dist;
      if (this.walkableAt(tx, ty)) {
        this.targetX = tx;
        this.targetY = ty;
        return;
      }
    }
    this.targetX = this.x;
    this.targetY = this.y;
  }

  private walkableAt(px: number, py: number): boolean {
    const tx = Math.floor(px / TILE);
    const ty = Math.floor(py / TILE);
    return this.map.inBounds(tx, ty) && this.map.isWalkable(tx, ty);
  }
}
