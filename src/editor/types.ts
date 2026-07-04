export interface EditorDialogueLine {
  speaker: string;
  text: string;
  portrait?: string;
  durationMs?: number;
  requireContinue?: boolean;
}

export interface EditorObjective {
  id: string;
  title: string;
  description?: string;
  optional?: boolean;
}

export interface EditorPhase {
  id: string;
  title: string;
  objectives: EditorObjective[];
  buildAllowed?: string;   // comma-separated building kinds, empty = all
  trainAllowed?: string;   // comma-separated unit kinds, empty = all
  defaultBuildReason?: string;
}

export type TriggerEventType =
  | 'state' | 'timer' | 'unitKilled' | 'buildingDestroyed'
  | 'buildingCompleted' | 'unitTrained' | 'areaEntered'
  | 'caravanResolved' | 'animalKilled';

export interface EditorSpawnUnit {
  kind: string;
  side: 'player' | 'ai' | 'neutral';
  race?: string;
  x: number;
  y: number;
  speedMul?: number;
  hpMul?: number;
  atkMul?: number;
  customName?: string;
}

export type EditorEvent =
  | { type: 'showDialogue'; lines: EditorDialogueLine[] }
  | { type: 'setPhase'; phaseId: string }
  | { type: 'setFlag'; flag: string; value: boolean }
  | { type: 'setObjectiveStatus'; objectiveId: string; status: 'hidden' | 'active' | 'completed' | 'failed' }
  | { type: 'spawnUnits'; groupId: string; units: EditorSpawnUnit[] }
  | { type: 'commandGroup'; groupId: string; command: 'move' | 'attackMove' | 'retreat' | 'despawn'; x?: number; y?: number }
  | { type: 'revealArea'; x: number; y: number; radiusTiles: number }
  | { type: 'endGame'; win: boolean }
  | { type: 'showMessage'; text: string }
  | { type: 'grantResources'; side: 'player' | 'ai'; gold?: number; lumber?: number; salt?: number; food?: number }
  | { type: 'setAtmosphere'; tone: 'normal' | 'ashen' | 'forbidden' | 'night'; durationMs?: number }
  | { type: 'focusCamera'; x: number; y: number; lockMs?: number }
  | { type: 'setLandmarkVisible'; id: string; visible: boolean }
  | { type: 'setClock'; label: string; durationMs: number; icon?: string }
  | { type: 'clearClock' }
  | { type: 'setDayPhase'; phase: 'day' | 'night' };

export interface EditorTrigger {
  id: string;
  label: string;
  phase?: string;
  on: TriggerEventType;
  once: boolean;
  delayMs?: number;
  areaId?: string;
  events: EditorEvent[];
}

export interface EditorArea {
  id: string;
  label: string;
  x: number;
  y: number;
  radius: number;
  side?: 'player' | 'ai' | 'neutral';
}

export interface EditorObj {
  id: string;
  type: 'building' | 'resource' | 'unit' | 'animal' | 'landmark' | 'marker';
  kind: string;
  race: 'alliance' | 'horde' | 'neutral';
  side: 'player' | 'ai' | 'neutral';
  tx: number;
  ty: number;
  x: number;
  y: number;
  amount?: number;
  customName?: string;
  groupId?: string;
  speedMul?: number;
  hpMul?: number;
  atkMul?: number;
}

export interface EditorMapData {
  id: string;
  title: string;
  mapW: number;
  mapH: number;
  tiles: number[];
  objects: EditorObj[];
  playerEconomy: { gold: number; lumber: number; salt: number; food: number };
  aiEconomy: { gold: number; lumber: number; salt: number; food: number };
  initialPhase: string;
  phases: EditorPhase[];
  triggers: EditorTrigger[];
  areas: EditorArea[];
  enemyStatMul: { hp: number; atk: number };
}

export const TILE_COLORS: Record<number, number> = {
  0: 0x73833e,
  1: 0x839347,
  2: 0x2e5527,
  3: 0x6a6258,
  4: 0x2e6e8e,
  5: 0x8a6a3a,
};
