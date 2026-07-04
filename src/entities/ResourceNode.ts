import Phaser from 'phaser';
import { IEntity, newEntityId, HealthBar } from './Entity';
import { Side, SIDE, RESOURCE, TILE } from '../config';

const SALT_DISPLAY_SIZE = 76;
const CARCASS_DISPLAY = { width: 42, height: 30 };

export type ResourceType = 'gold' | 'lumber' | 'salt' | 'food';

const TREE_DISPLAY_SIZE = TILE * 1.5;
const GOLDMINE_DISPLAY_SIZE = 96;
const TREE_LOG_DISPLAY = { width: 49, height: 29 };

export class ResourceNode implements IEntity {
  readonly id = newEntityId();
  readonly kind = 'resource' as const;
  readonly side: Side = SIDE.neutral;
  readonly resourceType: ResourceType;
  readonly sprite: Phaser.GameObjects.Sprite;
  hp = 1;
  maxHp = 1;
  alive = true;
  sight = 0;
  radius: number;
  amount: number;
  tileW: number;
  tileH: number;
  tx: number;
  ty: number;
  hb: HealthBar;
  private logDecal: Phaser.GameObjects.Image | null = null;

  constructor(scene: Phaser.Scene, tx: number, ty: number, type: ResourceType, amountOverride?: number) {
    this.resourceType = type;
    this.tx = tx;
    this.ty = ty;
    if (type === 'salt') {
      // соляне джерело: 2x2, видобувається як дерево (робітник поруч)
      this.tileW = 2; this.tileH = 2;
      const key = scene.textures.exists('salt_deposit') ? 'salt_deposit' : 'goldmine';
      this.sprite = scene.add.sprite(tx * TILE + TILE, ty * TILE + TILE, key);
      this.sprite.setDisplaySize(SALT_DISPLAY_SIZE, SALT_DISPLAY_SIZE);
      this.amount = amountOverride ?? RESOURCE.saltAmount;
      this.radius = TILE * 1.1;
    } else if (type === 'food') {
      // туша: 1x1, не блокує прохід, з часом псується
      this.tileW = 1; this.tileH = 1;
      const key = scene.textures.exists('carcass') ? 'carcass' : 'px_debris_1';
      this.sprite = scene.add.sprite(tx * TILE + TILE / 2, ty * TILE + TILE / 2, key);
      this.sprite.setDisplaySize(CARCASS_DISPLAY.width, CARCASS_DISPLAY.height);
      this.amount = amountOverride ?? 80;
      this.radius = TILE * 0.5;
      scene.time.delayedCall(RESOURCE.carcassRotMs, () => {
        if (this.alive) {
          this.sprite.setData('entity', null);
          this.alive = false;
          this.hb.destroy();
          this.fadeOut(scene, this.sprite, 0, 1200);
        }
      });
    } else if (type === 'gold') {
      this.tileW = 3; this.tileH = 3;
      this.sprite = scene.add.sprite(tx * TILE + TILE * 1.5, ty * TILE + TILE * 1.5, 'goldmine');
      this.applyResourceDisplaySize();
      this.amount = RESOURCE.mineAmount;
      this.radius = TILE * 1.4;
      const baseScaleX = this.sprite.scaleX;
      const baseScaleY = this.sprite.scaleY;
      scene.tweens.add({
        targets: this.sprite,
        scaleX: { from: baseScaleX, to: baseScaleX * 1.018 },
        scaleY: { from: baseScaleY, to: baseScaleY * 1.012 },
        duration: 1800,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    } else {
      this.tileW = 1; this.tileH = 1;
      this.sprite = scene.add.sprite(tx * TILE + TILE / 2, ty * TILE + TILE / 2, 'tree');
      this.amount = RESOURCE.treeAmount;
      this.radius = TILE * 0.45;
      // Origin at bottom so sway rotates the crown, not the base
      this.sprite.setOrigin(0.5, 0.9);
      this.sprite.setDisplaySize(TREE_DISPLAY_SIZE, TREE_DISPLAY_SIZE);
      // Gentle sway tween
      scene.tweens.add({
        targets: this.sprite,
        rotation: { from: -0.03, to: 0.03 },
        duration: 1800 + Math.random() * 1200,
        yoyo: true,
        repeat: -1,
        delay: Math.random() * 2000,
        ease: 'Sine.easeInOut'
      });
    }
    this.sprite.setDepth((type === 'gold' || type === 'salt' ? 5 : 6) + this.sprite.y / 10000);
    this.sprite.setData('entity', this);
    this.maxHp = this.amount;
    this.hp = this.amount;
    this.hb = new HealthBar(scene, this, type === 'gold' ? 64 : type === 'salt' ? 52 : 30);
  }

  get x(): number { return this.sprite.x; }
  get y(): number { return this.sprite.y; }
  get visualRadius(): number { return Math.max(this.sprite.displayWidth, this.sprite.displayHeight) / 2; }

  harvest(n: number): number {
    const got = Math.min(n, this.amount);
    this.amount -= got;
    this.hp = this.amount;
    this.updateResourceTexture();
    this.hb.update(true);
    if (this.amount <= 0) this.destroy();
    return got;
  }

  takeDamage(): void { /* invulnerable */ }

  private updateResourceTexture(): void {
    if (this.resourceType !== 'gold') return;
    const frac = this.amount / this.maxHp;
    const key = frac < 0.32 ? 'goldmine_depleted' : frac < 0.62 ? 'goldmine_damaged' : 'goldmine';
    if (this.sprite.scene.textures.exists(key) && this.sprite.texture.key !== key) {
      this.sprite.setTexture(key);
      this.applyResourceDisplaySize();
    }
  }

  private applyResourceDisplaySize(): void {
    if (this.resourceType === 'gold') {
      this.sprite.setDisplaySize(GOLDMINE_DISPLAY_SIZE, GOLDMINE_DISPLAY_SIZE);
      return;
    }
    this.sprite.setDisplaySize(TREE_DISPLAY_SIZE, TREE_DISPLAY_SIZE);
  }

  private fadeOut(scene: Phaser.Scene, targets: Phaser.GameObjects.GameObject | Phaser.GameObjects.GameObject[], delay: number, duration: number): void {
    scene.tweens.add({
      targets,
      alpha: 0,
      duration,
      delay,
      ease: 'Cubic.easeIn',
      onComplete: () => {
        for (const target of Array.isArray(targets) ? targets : [targets]) target.destroy();
      }
    });
  }

  private addTreeLogDecal(scene: Phaser.Scene): Phaser.GameObjects.Image | null {
    if (!scene.textures.exists('tree_log')) return null;
    const decal = scene.add.image(this.sprite.x + TILE * 0.22, this.sprite.y + TILE * 0.3, 'tree_log')
      .setDisplaySize(TREE_LOG_DISPLAY.width, TREE_LOG_DISPLAY.height);
    decal.setDepth(this.sprite.depth + 0.01);
    decal.setRotation(-0.12);
    decal.setData('entity', null);
    return decal;
  }

  destroy(): void {
    if (!this.alive) return;
    this.alive = false;
    this.hb.destroy();
    const scene = this.sprite.scene;
    scene.tweens.killTweensOf(this.sprite);
    if (this.resourceType === 'gold' && scene.textures.exists('goldmine_depleted')) {
      this.sprite.setTexture('goldmine_depleted');
      this.applyResourceDisplaySize();
      this.sprite.setData('entity', null);
      this.sprite.setAlpha(1);
      this.fadeOut(scene, this.sprite, 6500, 900);
      return;
    }
    if (this.resourceType === 'lumber' && scene.textures.exists('tree_stump')) {
      this.sprite.setTexture('tree_stump');
      this.sprite.setOrigin(0.5, 0.8);
      this.applyResourceDisplaySize();
      this.sprite.setRotation(0);
      this.sprite.setAlpha(1);
      this.sprite.setData('entity', null);
      this.logDecal = this.addTreeLogDecal(scene);
      this.fadeOut(scene, this.logDecal ? [this.sprite, this.logDecal] : this.sprite, 4500, 700);
      return;
    }
    if (this.resourceType === 'lumber') {
      this.logDecal = this.addTreeLogDecal(scene);
      if (this.logDecal) {
        this.sprite.destroy();
        this.fadeOut(scene, this.logDecal, 4500, 700);
        return;
      }
    }
    this.sprite.destroy();
  }
}
