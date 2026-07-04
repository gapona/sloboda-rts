export const TILE = 32;
export const MAP_W = 104;
export const MAP_H = 76;
export const WORLD_W = TILE * MAP_W;
export const WORLD_H = TILE * MAP_H;

export const VIEW_W = 1280;
export const VIEW_H = 720;

export const COLORS = {
  // степова палітра Слобожанщини
  grass: 0x73833e,
  grass2: 0x839347,
  forest: 0x2e5527,
  forestDark: 0x16300f,
  stone: 0x6a6258,
  stoneDark: 0x322e2a,
  water: 0x2e6e8e,
  waterLight: 0x5eaece,
  dirt: 0x8a6a3a,
  goldMine: 0xd9ad3d,
  allianceTeam: 0x4a9ade,   // слобожани
  hordeTeam: 0xdea040,      // татари
  neutral: 0xaaaaaa,
  uiBg: 0x161411,
  uiPanel: 0x2a2119,
  uiBorder: 0x7a6243,
  uiAccent: 0xffd36a,
  hpGreen: 0x3ad24a,
  hpYellow: 0xd2c43a,
  hpRed: 0xd23a3a,
  selection: 0xffffff,
  ghostOk: 0x44ff44,
  ghostBad: 0xff4444,
  warning: 0xff6644
};

export type Race = 'alliance' | 'horde';
export type Difficulty = 'easy' | 'normal' | 'hard';
export type GameMode = 'skirmish' | 'story';
export type StoryMapId = 'engine-demo' | 'persha-sloboda' | 'custom-map';

export interface SkirmishLaunchConfig {
  mode: 'skirmish';
  playerRace: Race;
  difficulty: Difficulty;
  seed?: number;
}

export interface StoryLaunchConfig {
  mode: 'story';
  playerRace: Race;
  difficulty: Difficulty;
  storyMapId: StoryMapId;
  seed?: number;
}

export type GameLaunchConfig = SkirmishLaunchConfig | StoryLaunchConfig;

export const STORY_MAP_LABEL: Record<StoryMapId, string> = {
  'custom-map': 'Нова карта',
  'engine-demo': 'Пепельная корона (демо движка)',
  'persha-sloboda': 'Сценарій 1: Перша слобода'
};

export const STORY_MODE_DEFAULTS = {
  mode: 'story',
  playerRace: 'alliance',
  difficulty: 'normal',
  storyMapId: 'persha-sloboda'
} as const satisfies StoryLaunchConfig;

export const DIFFICULTY = {
  easy: {
    label: 'Легко',
    aiDelayMs: 1200,
    attackScore: 7,
    targetWorkers: 7,
    incomeBias: 0.95,
    townhallQueueCap: 1,
    barracksQueueCap: 1,
    workshopQueueCap: 1,
    attackWaveMinUnits: 4,
    regroupMs: 12000,
    regroupGrowth: 3,
    defenseRadiusTiles: 11,
    defenseHoldMs: 14000,
    caravanOpportunityRadiusTiles: 5
  },
  normal: {
    label: 'Обычно',
    aiDelayMs: 750,
    attackScore: 9,
    targetWorkers: 10,
    incomeBias: 1,
    townhallQueueCap: 2,
    barracksQueueCap: 2,
    workshopQueueCap: 1,
    attackWaveMinUnits: 5,
    regroupMs: 9500,
    regroupGrowth: 3,
    defenseRadiusTiles: 13,
    defenseHoldMs: 12000,
    caravanOpportunityRadiusTiles: 6
  },
  hard: {
    label: 'Сложно',
    aiDelayMs: 520,
    attackScore: 11,
    targetWorkers: 13,
    incomeBias: 1.1,
    townhallQueueCap: 2,
    barracksQueueCap: 3,
    workshopQueueCap: 1,
    attackWaveMinUnits: 6,
    regroupMs: 6500,
    regroupGrowth: 2,
    defenseRadiusTiles: 15,
    defenseHoldMs: 10000,
    caravanOpportunityRadiusTiles: 7
  }
} as const;

export const SKIRMISH_CONFIG = {
  start: {
    gold: 430,
    lumber: 230,
    salt: 15,
    food: 140,
    workers: 4,
    fighters: [
      { kind: 'footman', count: 3 },  // козаки
      { kind: 'knight', count: 1 }    // сердюк
    ] as ReadonlyArray<{ kind: 'footman' | 'archer' | 'knight'; count: number }>,
    mainBuilding: 'townhall',
    workerOffsetX: -66,
    workerOffsetY: 76,
    workerSpacingX: 28
  },
  rules: {
    elimination: 'allBuildings'
  },
  caravans: {
    enabled: true
  }
} as const;

export const RACE_COLOR: Record<Race, number> = {
  alliance: COLORS.allianceTeam,
  horde: COLORS.hordeTeam
};

// Внутрішні id 'alliance'/'horde' збережені (на них зав'язані шляхи арту);
// презентаційний шар — слобожани й татари.
export const RACE_LABEL: Record<Race, string> = {
  alliance: 'Слобожани',
  horde: 'Татари'
};

export const CAMERA_SPEED = 760;
export const CAMERA_ZOOM = 1.5;
export const EDGE_SCROLL_PX = 18;

export const VISUALS = {
  shakeScale: 0.82,
  maxPersistentDecals: 46,
  maxFloatingTexts: 36,
  particleBudgetPerSecond: 760,
  ambientEveryMs: 360,
  ambientLeafChance: 0.42,
  ambientMistChance: 0.28,
  stepDustMs: 230,
  projectileTrailMs: 42,
  battleDecalFadeMs: 14000
} as const;

export const FEEL = {
  cameraSmoothing: 0.16,
  cameraFriction: 0.82,
  commandPulseMs: 520,
  arrivalRadius: 13,
  gatherWorkPulseMs: 620,
  buildWorkPulseMs: 720
} as const;

type Cost = { gold: number; lumber: number; salt?: number; food?: number };
export type CostDef = Cost;
type RaceLabels = Record<Race, string>;

export const UNIT = {
  worker: {
    hp: 42, speed: 94, size: 14, atk: 4, range: 24, cooldown: 1150, sight: 6,
    cost: { gold: 50, lumber: 0, food: 5 }, food: 1, build: 10500, score: 1,
    producer: 'townhall', requires: undefined, splashRadius: 0, bonusVsBuilding: 0, hotkey: 'E',
    labelByRace: { alliance: 'Селянин', horde: 'Чура' }
  },
  footman: {
    hp: 86, speed: 76, size: 16, atk: 11, range: 28, cooldown: 950, sight: 7,
    cost: { gold: 80, lumber: 0, food: 10 }, food: 1, build: 14500, score: 2,
    producer: 'barracks', requires: undefined, splashRadius: 0, bonusVsBuilding: 0, hotkey: 'F',
    labelByRace: { alliance: 'Козак', horde: 'Аскер' }
  },
  archer: {
    hp: 52, speed: 82, size: 14, atk: 8, range: 168, cooldown: 1350, sight: 8,
    cost: { gold: 70, lumber: 40, food: 10, salt: 5 }, food: 1, build: 15500, score: 2,
    producer: 'barracks', requires: undefined, splashRadius: 0, bonusVsBuilding: 0, hotkey: 'A',
    labelByRace: { alliance: 'Стрілець', horde: 'Лучник' }
  },
  knight: {
    hp: 132, speed: 112, size: 20, atk: 18, range: 30, cooldown: 950, sight: 8,
    cost: { gold: 145, lumber: 35, food: 15 }, food: 2, build: 21000, score: 4,
    producer: 'barracks', requires: 'workshop', splashRadius: 0, bonusVsBuilding: 0, hotkey: 'K',
    labelByRace: { alliance: 'Сердюк', horde: 'Джигіт' }
  },
  catapult: {
    hp: 115, speed: 54, size: 24, atk: 28, range: 230, cooldown: 2450, sight: 9,
    cost: { gold: 170, lumber: 110, salt: 25 }, food: 3, build: 26500, score: 6,
    producer: 'workshop', requires: undefined, splashRadius: 52, bonusVsBuilding: 22, hotkey: 'C',
    labelByRace: { alliance: 'Гармата', horde: 'Тарань' }
  },
  kharakternyk: {
    hp: 130, speed: 86, size: 16, atk: 15, range: 30, cooldown: 900, sight: 11,
    cost: { gold: 240, lumber: 0, salt: 40, food: 20 }, food: 2, build: 30000, score: 7,
    producer: 'townhall', requires: undefined, splashRadius: 0, bonusVsBuilding: 0, hotkey: 'C',
    heroOnly: true,
    labelByRace: { alliance: 'Характерник', horde: 'Баксы' }
  }
} as const satisfies Record<string, {
  hp: number;
  speed: number;
  size: number;
  atk: number;
  range: number;
  cooldown: number;
  sight: number;
  cost: Cost;
  food: number;
  build: number;
  score: number;
  producer: string;
  requires?: string;
  heroOnly?: boolean;
  splashRadius?: number;
  bonusVsBuilding?: number;
  hotkey: string;
  labelByRace: RaceLabels;
}>;

export const BUILDING = {
  townhall: {
    hp: 950, size: 3, sight: 8, cost: { gold: 400, lumber: 200 }, food: 6, build: 24000,
    accepts: ['gold', 'lumber', 'salt', 'food'], attack: 0, range: 0, cooldown: 0, hotkey: 'H',
    labelByRace: { alliance: 'Хутір', horde: 'Ставка' }
  },
  farm: {
    hp: 420, size: 2, sight: 4, cost: { gold: 80, lumber: 40 }, food: 5, build: 11500,
    accepts: [], attack: 0, range: 0, cooldown: 0, hotkey: 'F',
    labelByRace: { alliance: 'Хата', horde: 'Юрта' }
  },
  barracks: {
    hp: 650, size: 3, sight: 6, cost: { gold: 155, lumber: 85 }, food: 0, build: 18000,
    accepts: [], attack: 0, range: 0, cooldown: 0, hotkey: 'B',
    labelByRace: { alliance: 'Курінь', horde: 'Кіш' }
  },
  workshop: {
    hp: 620, size: 3, sight: 6, cost: { gold: 170, lumber: 120 }, food: 0, build: 21000,
    accepts: [], attack: 0, range: 0, cooldown: 0, hotkey: 'W',
    labelByRace: { alliance: 'Кузня', horde: 'Обоз' }
  },
  tower: {
    hp: 470, size: 2, sight: 9, cost: { gold: 120, lumber: 100 }, food: 0, build: 16500,
    accepts: [], attack: 12, range: 190, cooldown: 1200, hotkey: 'T',
    labelByRace: { alliance: 'Дозорна вежа', horde: 'Сторожова вежа' }
  },
  field: {
    hp: 260, size: 2, sight: 3, cost: { gold: 40, lumber: 60 }, food: 0, build: 10000,
    accepts: [], attack: 0, range: 0, cooldown: 0, hotkey: 'O',
    labelByRace: { alliance: 'Поле', horde: 'Лан' }
  }
} as const satisfies Record<string, {
  hp: number;
  size: number;
  sight: number;
  cost: Cost;
  food: number;
  build: number;
  accepts: readonly string[];
  attack?: number;
  range?: number;
  cooldown?: number;
  hotkey: string;
  labelByRace: RaceLabels;
}>;

export const RESOURCE = {
  mineAmount: 1800,
  treeAmount: 180,
  saltAmount: 900,
  workerCarry: 10,
  gatherTime: 1650,
  carcassRotMs: 150000,  // туша псується, якщо її не розібрати
  fieldFoodAmount: 4,        // скільки їжі дає поле за тік
  fieldFoodIntervalMs: 6000  // інтервал тіку врожаю поля
};

// ── ДИКІ ЗВІРІ (полювання) ────────────────────────────────────────────────────
export type AnimalKind = 'deer' | 'boar' | 'wolf' | 'wolf_den';

export interface AnimalDef {
  hp: number;
  speed: number;       // 0 = статичний (лігво)
  fleeSpeed: number;
  fleeMs: number;      // 0 = не тікає (хижак)
  radius: number;
  foodAmount: number;  // 0 = туші не лишає
  texture: string;
  label: string;
  predator: boolean;
  retaliates: boolean; // огризається на кривдника замість втечі (вепр)
  atk: number;
  atkCooldownMs: number;
  aggroRange: number;  // px
  leashRange: number;  // px від домівки
}

export const ANIMAL: Record<AnimalKind, AnimalDef> & {
  wanderRadiusTiles: number; restMinMs: number; restMaxMs: number;
  denRespawnMs: number; denMaxWolves: number; packAssistRange: number; retaliateMs: number;
} = {
  deer: { hp: 34, speed: 60, fleeSpeed: 175, fleeMs: 2600, radius: 12, foodAmount: 90,  texture: 'animal_deer', label: 'Олень', predator: false, retaliates: false, atk: 0, atkCooldownMs: 0, aggroRange: 0, leashRange: 0 },
  boar: { hp: 85, speed: 42, fleeSpeed: 120, fleeMs: 2000, radius: 13, foodAmount: 160, texture: 'animal_boar', label: 'Вепр',  predator: false, retaliates: true, atk: 11, atkCooldownMs: 1100, aggroRange: 0, leashRange: 0 },
  wolf: { hp: 46, speed: 74, fleeSpeed: 0, fleeMs: 0, radius: 12, foodAmount: 35, texture: 'animal_wolf', label: 'Вовк', predator: true, retaliates: false, atk: 7, atkCooldownMs: 950, aggroRange: 32 * 5.5, leashRange: 32 * 11 },
  wolf_den: { hp: 150, speed: 0, fleeSpeed: 0, fleeMs: 0, radius: 18, foodAmount: 0, texture: 'wolf_den', label: 'Вовче лігво', predator: false, retaliates: false, atk: 0, atkCooldownMs: 0, aggroRange: 0, leashRange: 0 },
  wanderRadiusTiles: 5,
  restMinMs: 1200,
  restMaxMs: 4200,
  retaliateMs: 8000,     // вепр огризається стільки, поки не загубить кривдника
  denRespawnMs: 70000,   // лігво поволі поповнює зграю, поки стоїть
  denMaxWolves: 3,
  packAssistRange: 32 * 7
};

export const CARAVAN_CONFIG = {
  hp: 150,
  speed: 46,
  radius: 28,
  sight: 0,
  // чумацька валка везе сіль і трохи грошей
  reward: { gold: 55, salt: 60 },
  firstSpawnMs: { min: 75000, max: 135000 },
  repeatSpawnMs: { min: 180000, max: 300000 },
  debugSpawnMs: { min: 6000, max: 10000 },
  maxActive: 1,
  enabledInSkirmish: true,
  enabledInStory: false
} as const;

export const FOG = {
  updateMs: 220
};

// ── ЗДІБНОСТІ ─────────────────────────────────────────────────────────────────
export const TUMANETS = {
  radius: 32 * 3.4,
  durationMs: 6500,
  slowFactor: 0.42,
  cooldownMs: 24000,
  castRange: 32 * 7
} as const;

export const AI_TICK_MS = 600;

export const UNIT_KINDS = ['worker', 'footman', 'archer', 'knight', 'catapult', 'kharakternyk'] as const;
export type UnitKind = typeof UNIT_KINDS[number];

export const BUILDING_KINDS = ['townhall', 'farm', 'barracks', 'workshop', 'tower', 'field'] as const;
export type BuildingKind = typeof BUILDING_KINDS[number];

export const SIDE = { player: 0, ai: 1, neutral: 2 } as const;
export type Side = 0 | 1 | 2;
