import Phaser from 'phaser';
import { Race, Side } from '../config';

export type EconResource = 'gold' | 'lumber' | 'salt' | 'food';

export interface EconCost {
  gold?: number;
  lumber?: number;
  salt?: number;
  food?: number;
}

export interface PlayerState {
  side: Side;
  race: Race;
  gold: number;
  lumber: number;
  salt: number;
  food: number;     // їжа — видобувний ресурс (полювання, згодом поля)
  pop: number;      // зайняте населення
  popCap: number;   // ліміт населення (хати/хутір)
}

export class Economy {
  players: Record<number, PlayerState> = {};
  events = new Phaser.Events.EventEmitter();

  register(side: Side, race: Race, gold = 400, lumber = 200, cap = 5, salt = 0, food = 0): void {
    this.players[side] = { side, race, gold, lumber, salt, food, pop: 0, popCap: cap };
  }

  get(side: Side): PlayerState { return this.players[side]; }

  canAfford(side: Side, cost: EconCost): boolean {
    const p = this.players[side];
    return p.gold >= (cost.gold ?? 0)
      && p.lumber >= (cost.lumber ?? 0)
      && p.salt >= (cost.salt ?? 0)
      && p.food >= (cost.food ?? 0);
  }

  /** Чого саме не вистачає — для повідомлень гравцю. */
  missing(side: Side, cost: EconCost): EconResource[] {
    const p = this.players[side];
    const out: EconResource[] = [];
    if (p.gold < (cost.gold ?? 0)) out.push('gold');
    if (p.lumber < (cost.lumber ?? 0)) out.push('lumber');
    if (p.salt < (cost.salt ?? 0)) out.push('salt');
    if (p.food < (cost.food ?? 0)) out.push('food');
    return out;
  }

  /** Скільки саме не вистачає кожного ресурсу — для деталізованих повідомлень. */
  missingAmounts(side: Side, cost: EconCost): { res: EconResource; need: number }[] {
    const p = this.players[side];
    const out: { res: EconResource; need: number }[] = [];
    if (p.gold < (cost.gold ?? 0)) out.push({ res: 'gold', need: (cost.gold ?? 0) - p.gold });
    if (p.lumber < (cost.lumber ?? 0)) out.push({ res: 'lumber', need: (cost.lumber ?? 0) - p.lumber });
    if (p.salt < (cost.salt ?? 0)) out.push({ res: 'salt', need: (cost.salt ?? 0) - p.salt });
    if (p.food < (cost.food ?? 0)) out.push({ res: 'food', need: (cost.food ?? 0) - p.food });
    return out;
  }

  spend(side: Side, cost: EconCost): boolean {
    if (!this.canAfford(side, cost)) return false;
    const p = this.players[side];
    p.gold -= cost.gold ?? 0;
    p.lumber -= cost.lumber ?? 0;
    p.salt -= cost.salt ?? 0;
    p.food -= cost.food ?? 0;
    this.events.emit('changed', side);
    return true;
  }

  deposit(side: Side, type: EconResource, amount: number): void {
    this.players[side][type] += amount;
    this.events.emit('changed', side);
  }

  addCap(side: Side, n: number): void {
    this.players[side].popCap = Math.min(100, this.players[side].popCap + n);
    this.events.emit('changed', side);
  }
  removeCap(side: Side, n: number): void {
    this.players[side].popCap = Math.max(0, this.players[side].popCap - n);
    this.events.emit('changed', side);
  }
  addPop(side: Side, n: number): void {
    this.players[side].pop += n;
    this.events.emit('changed', side);
  }
  removePop(side: Side, n: number): void {
    this.players[side].pop = Math.max(0, this.players[side].pop - n);
    this.events.emit('changed', side);
  }
  hasPopRoom(side: Side, need: number): boolean {
    const p = this.players[side];
    return p.pop + need <= p.popCap;
  }
}
