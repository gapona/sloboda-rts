import { SIDE, TILE, type StoryMapId } from '../../config';
import { generateSlobodaSnakeMap, type SnakeNode } from '../../world/MapGenerator';
import type { StoryMapDefinition, StoryScriptedUnit } from '../types';

/**
 * СЦЕНАРІЙ 1 — «ПЕРША СЛОБОДА»
 *
 * Мапа — серпантин-«змійка», з усіх боків обведений лісом. Кожна кімната
 * шляху — це окрема подія сценарію; гравець проходить їх послідовно:
 *
 *  старт степом → нічний табір (вовки) → городище (закладини) →
 *  поворот на південь (перший набіг) → солеварня (татарський пост,
 *  валка чумаків) → хата характерника (кургани) → хутір сусідів (ясир) →
 *  татарський стан (фінал).
 *
 * Чотири акти StoryController лишаються тими самими, лише прив'язані
 * до нових кімнат:
 *  1. doroha     — від старту до городища: полювання, ніч із вовками,
 *                  зустріч із чумацькою валкою, вершник на обрії
 *  2. horodysche — закладини хутора на городищі (містичний біт №1)
 *  3. susidy     — солеварня під татарським постом (валка чумаків під
 *                  ударом на тому ж шляху), хата характерника й кургани
 *                  (містичний біт №2)
 *  4. yasyr      — хутір сусідів спалено, конвой з ясиром іде шляхом до
 *                  стану; фінал біля баби на городищі (містичний біт №3)
 *
 * Татари — не фракція з базою: пости, рейди й конвой, усе скриптоване.
 */

type UnitSpec = [kind: StoryScriptedUnit['kind'], dx: number, dy: number];

function worldPoint(tx: number, ty: number): { x: number; y: number } {
  return { x: tx * TILE + TILE / 2, y: ty * TILE + TILE / 2 };
}

function band(
  x: number, y: number, side: typeof SIDE.player | typeof SIDE.ai, race: 'alliance' | 'horde', specs: UnitSpec[]
): StoryScriptedUnit[] {
  return specs.map(([kind, dx, dy]) => ({ kind, side, race, x: x + dx, y: y + dy }));
}

/** Сповільнює групу юнітів (напр. конвой з ясиром, що тягнеться повільно). */
function slow(units: StoryScriptedUnit[], mul: number): StoryScriptedUnit[] {
  return units.map((u) => ({ ...u, speedMul: mul }));
}

export function createPershaSloboda(seed: number): StoryMapDefinition {
  // ── ГЕОГРАФІЯ: серпантин-«змійка» з девʼяти кімнат ───────────────────
  const nStart: SnakeNode = { tx: 8, ty: 10, r: 6 };       // валка заходить зі степу
  const nHunt: SnakeNode = { tx: 24, ty: 10, r: 5 };       // гайок — полювання
  const nNight: SnakeNode = { tx: 42, ty: 10, r: 5 };      // нічний табір
  const nBaba: SnakeNode = { tx: 58, ty: 10, r: 5 };       // кам'яна баба — окрема, самотня в степу
  const nMeet: SnakeNode = { tx: 74, ty: 10, r: 5 };       // зустріч із чумацькою валкою
  const nHorodysche: SnakeNode = { tx: 92, ty: 10, r: 7 }; // городище — тут стане слобода
  const nTurnSouth: SnakeNode = { tx: 92, ty: 34, r: 5 };  // поворот на південь
  const nSaltWorks: SnakeNode = { tx: 64, ty: 34, r: 5 };  // солеварня
  const nKharHut: SnakeNode = { tx: 34, ty: 34, r: 6 };    // хата характерника
  const nNeighbors: SnakeNode = { tx: 34, ty: 60, r: 5 };  // хутір сусідів
  const nStan: SnakeNode = { tx: 92, ty: 60, r: 7 };       // татарський стан

  const path: SnakeNode[] = [nStart, nHunt, nNight, nBaba, nMeet, nHorodysche, nTurnSouth, nSaltWorks, nKharHut, nNeighbors, nStan];

  // бічні «кишені» — вовче лігво й кургани, осторонь головного шляху
  const wolfDenNode: SnakeNode = { tx: 86, ty: 21, r: 4 };
  const wolfDenFrom: SnakeNode = { tx: 92, ty: 21, r: 5 };
  const kurhanyNode: SnakeNode = { tx: 34, ty: 26, r: 4 };
  const kurhanyFrom: SnakeNode = { tx: 34, ty: 30, r: 6 };
  // схований тайник чумаків — відгалуження на південь біля зустрічі з валкою
  const cacheNode: SnakeNode = { tx: 74, ty: 26, r: 4 };
  const cacheFrom: SnakeNode = { tx: 74, ty: 16, r: 5 };
  // засідка — глухий закуток між солеварнею і хатою характерника
  const ambushNode: SnakeNode = { tx: 50, ty: 46, r: 4 };
  const ambushFrom: SnakeNode = { tx: 50, ty: 34, r: 5 };

  const layout = generateSlobodaSnakeMap(seed, path, {
    playerBase: { tx: nHorodysche.tx, ty: nHorodysche.ty },
    aiBase: { tx: nStan.tx, ty: nStan.ty },
    pockets: [
      { from: wolfDenFrom, to: wolfDenNode },
      { from: kurhanyFrom, to: kurhanyNode },
      { from: cacheFrom, to: cacheNode },
      { from: ambushFrom, to: ambushNode }
    ],
    goldMines: [
      { tx: nHorodysche.tx - 5, ty: nHorodysche.ty - 4 },
      { tx: nHorodysche.tx, ty: nHorodysche.ty + 7 }
    ]
  });

  // ── ТОЧКИ ПОДІЙ ───────────────────────────────────────────────────────
  const startPt = worldPoint(nStart.tx, nStart.ty);
  const huntCamp = worldPoint(nHunt.tx, nHunt.ty);
  const nightCamp = worldPoint(nNight.tx, nNight.ty);
  const horodysche = worldPoint(nHorodysche.tx, nHorodysche.ty);
  const turnSouth = worldPoint(nTurnSouth.tx, nTurnSouth.ty);
  const saltWorks = worldPoint(nSaltWorks.tx, nSaltWorks.ty);
  const kharHut = worldPoint(nKharHut.tx, nKharHut.ty);
  const neighborKhutir = worldPoint(nNeighbors.tx, nNeighbors.ty);
  const stan = worldPoint(nStan.tx, nStan.ty);
  const denSpot = worldPoint(wolfDenNode.tx, wolfDenNode.ty);
  const kurhany = worldPoint(kurhanyNode.tx, kurhanyNode.ty);
  const cacheSpot = worldPoint(cacheNode.tx, cacheNode.ty);
  const ambushPocket = worldPoint(ambushNode.tx, ambushNode.ty);

  // зустріч із чумацькою валкою (Акт 1) — окрема кімната між бабою і городищем
  const meetPt = worldPoint(nMeet.tx, nMeet.ty);
  // вершник на обрії — з'являється вже після закладин, біля городища
  const scoutHill = worldPoint(nHorodysche.tx + 4, nHorodysche.ty - 2);
  // місце полювання — гайок між стартом і нічним табором
  const huntSpot = { x: huntCamp.x, y: huntCamp.y };

  // кам'яна баба — самотня в степу, між нічним табором і городищем
  const babaPt = { x: nBaba.tx * TILE + TILE / 2, y: (nBaba.ty - 2) * TILE + TILE / 2 };

  // засідка на валку — далі за солеварню, ближче до хати характерника
  const ambushSpot = worldPoint(nSaltWorks.tx - 14, nSaltWorks.ty);

  const O = 'Отаман Яків Остряниця';
  const D = 'Дід Панас';
  const X = 'Характерник Молош';
  const CH = 'Чумак Гнат';

  return {
    id: 'persha-sloboda' as StoryMapId,
    title: 'Перша слобода',
    layout,
    initialPhase: 'doroha',
    playerEconomy: { gold: 120, lumber: 60, foodCap: 10, salt: 0, food: 60 },
    aiEconomy: { gold: 0, lumber: 0, foodCap: 100 },
    startingBuildings: [],
    startingUnits: [
      // отаман Остряниця — на чолі валки, сильніший за звичайного козака; його смерть = поразка
      { kind: 'footman', side: SIDE.player, race: 'alliance', x: startPt.x + 0, y: startPt.y - 10, groupId: 'ataman', hpMul: 2.4, atkMul: 1.8, customName: O },
      // валка: 3 стрільці (козаки з мушкетами), 4 селянина
      ...band(startPt.x, startPt.y, SIDE.player, 'alliance', [
        ['archer', -30, 14], ['archer', 30, 14],
        ['archer', 0, 36],
        ['worker', -44, 56], ['worker', -15, 60], ['worker', 15, 60], ['worker', 44, 56]
      ])
    ],
    startingResources: [
      ...layout.goldMines.map((m) => ({ type: 'gold' as const, tx: m.tx - 1, ty: m.ty - 1 })),
      ...layout.trees.map((t) => ({ type: 'lumber' as const, tx: t.tx, ty: t.ty })),
      { type: 'salt', tx: Math.floor(saltWorks.x / TILE), ty: Math.floor(saltWorks.y / TILE) }
    ],
    landmarks: [
      { id: 'lm_horodysche', kind: 'image', x: horodysche.x, y: horodysche.y, label: 'Старе городище', textureKey: 'sloboda_ruins', displayWidth: 150, displayHeight: 150, color: 0xd8c09a },
      { id: 'lm_baba', kind: 'image', x: babaPt.x, y: babaPt.y, label: 'Камʼяна баба', textureKey: 'sloboda_fog_shrine', displayWidth: 110, displayHeight: 110, color: 0xc8b894, visible: false },
      { id: 'lm_saltworks', kind: 'image', x: saltWorks.x, y: saltWorks.y - TILE, label: 'Солеварня', textureKey: 'sloboda_saltmine', displayWidth: 120, displayHeight: 120, visible: false },
      { id: 'lm_khar_hut', kind: 'image', x: kharHut.x, y: kharHut.y, label: 'Хата в глушині', textureKey: 'sloboda_kharakternyk_hut', displayWidth: 110, displayHeight: 110, visible: false },
      { id: 'lm_kurhany', kind: 'chapel', x: kurhany.x, y: kurhany.y, label: 'Кургани', color: 0x8a98b8, visible: false },
      { id: 'lm_stan', kind: 'image', x: stan.x, y: stan.y, label: 'Татарський стан', textureKey: 'sloboda_enemy_camp', displayWidth: 160, displayHeight: 160, visible: false },
      { id: 'lm_neighbors', kind: 'image', x: neighborKhutir.x, y: neighborKhutir.y, label: 'Хутір сусідів', textureKey: 'sloboda_neutral_hut', displayWidth: 110, displayHeight: 110, visible: false }
    ],

    townhallSite: { tx: nHorodysche.tx - 1, ty: nHorodysche.ty - 1 },
    saltCollectionPoint: { x: saltWorks.x, y: saltWorks.y - TILE },
    enemyStatMultiplier: { hp: 0.75, atk: 0.8 },

    phases: [
      // ════════ АКТ 1 — ДОРОГА ════════
      {
        id: 'doroha',
        title: 'Дорога',
        restrictions: {
          buildAllowed: [],
          trainAllowed: [],
          defaultBuildReason: 'Спершу дійдіть до городища — будуватись посеред степу не можна.',
          defaultTrainReason: 'Вся валка вже тут. Людей більше не стане, поки не осядемо.'
        },
        objectives: [
          {
            id: 'obj_reach',
            title: 'Дійти до старого городища',
            description: 'Ведіть валку вздовж шляху на схід. Степ не любить, коли поспішають, але й баритись не дає.',
            subObjectives: [
              { id: 'sub_hunt', title: 'Здобути дичину (оленя або вепра) і розібрати тушу на їжу', condition: { type: 'flag', flag: 'hunted' } },
              { id: 'sub_night', title: 'Пережити ніч', condition: { type: 'flag', flag: 'dawn' } }
            ]
          }
        ],
        enterEvents: [
          { type: 'setDayPhase', phase: 'day' },
          { type: 'revealArea', x: startPt.x, y: startPt.y, radiusTiles: 9 },
          { type: 'focusCamera', beat: { x: startPt.x, y: startPt.y, durationMs: 900 } },
          { type: 'showDialogue', lines: [
            { speaker: O, portrait: 'otaman', text: 'Ось він, край. Далі — Дике поле. Шлях вузький, лісом обведений — хто дійде до городища, той і житиме.', requireContinue: true },
            { speaker: D, portrait: 'selyanyn', text: 'Харчів — на три дні, отамане. Попереду, кажуть, є гайок — там і вода, і звір ходить.', requireContinue: true },
            { speaker: O, portrait: 'otaman', text: 'Дійдемо до гайка — стане видно. Рушаймо, поки світло.', durationMs: 7000 }
          ] },
          // татарський пост біля солеварні стоїть від самого початку (не чекає на 300 дерева) —
          // ховається в тумані війни, гравець дізнається про нього в Акті 3
          { type: 'setFlag', flag: 'salt_post_spawned', value: true },
          { type: 'spawnUnits', groupId: 'salt_post', units: band(saltWorks.x, saltWorks.y + TILE * 2, SIDE.ai, 'horde', [
            ['footman', -28, 0], ['footman', 28, 0], ['archer', 0, -26], ['archer', 0, 26]
          ]) },
          // Дичина, вовче лігво й нічна стая вже живуть у степу — не зʼявляються в момент події
          { type: 'spawnAnimals', animals: [
            { kind: 'boar', x: huntSpot.x, y: huntSpot.y },
            { kind: 'deer', x: huntSpot.x + TILE * 2, y: huntSpot.y + TILE },
            { kind: 'deer', x: huntSpot.x - TILE, y: huntSpot.y + TILE * 2 },
            { kind: 'wolf', x: nightCamp.x - TILE * 4, y: nightCamp.y - TILE * 2 },
            { kind: 'wolf', x: nightCamp.x + TILE * 4, y: nightCamp.y - TILE * 2 },
            { kind: 'wolf', x: nightCamp.x - TILE * 3, y: nightCamp.y + TILE * 3 },
            { kind: 'wolf', x: nightCamp.x + TILE * 3, y: nightCamp.y + TILE * 3 },
            { kind: 'wolf_den', x: denSpot.x, y: denSpot.y },
            { kind: 'wolf', x: denSpot.x + TILE, y: denSpot.y },
            { kind: 'wolf', x: denSpot.x - TILE, y: denSpot.y + TILE },
            { kind: 'wolf', x: denSpot.x, y: denSpot.y - TILE }
          ] }
        ]
      },

      // ════════ АКТ 2 — ГОРОДИЩЕ ════════
      {
        id: 'horodysche',
        title: 'Городище',
        restrictions: {
          buildAllowed: ['townhall', 'farm', 'field', 'tower', 'barracks'],
          trainAllowed: ['worker', 'footman'],
          buildReasons: { workshop: 'До гармат ще дожити треба.' },
          trainReasons: { archer: 'Мушкети чумаки привезуть пізніше.', knight: 'Сердюків наймемо, як стане сіль і слава.', kharakternyk: 'Такого не наймеш. Такий сам приходить.' },
          defaultTrainReason: 'Спершу — дах над головою.'
        },
        objectives: [
          {
            id: 'obj_settle',
            title: 'Закласти слободу',
            description: 'Городище старе, та вали ще держать. Тут і станемо.',
            subObjectives: [
              { id: 'sub_hall', title: 'Збудувати хутір', condition: { type: 'buildingCount', side: SIDE.player, kind: 'townhall', completed: true, count: 1 } },
              { id: 'sub_workers', title: 'Зібрати 8 селян', condition: { type: 'unitCount', side: SIDE.player, kind: 'worker', count: 8 } },
              { id: 'sub_lumber', title: 'Запасти 300 дерева', condition: { type: 'resourceCount', side: SIDE.player, resource: 'lumber', count: 300 } }
            ]
          },
          {
            id: 'obj_den',
            title: 'Розорити вовче лігво',
            description: 'Вовки тягають самотніх. Лігво в гайку на південь від городища.',
            optional: true,
            subObjectives: [
              { id: 'sub_den', title: 'Лігво зруйноване', condition: { type: 'flag', flag: 'den_razed' } }
            ]
          }
        ],
        enterEvents: [
          { type: 'setAtmosphere', tone: 'normal' },
          { type: 'focusCamera', beat: { x: horodysche.x, y: horodysche.y, durationMs: 1100 } },
          { type: 'showDialogue', lines: [
            { speaker: D, portrait: 'selyanyn', text: 'Городище... Вали ще держать, і криниця, певно, жива.', requireContinue: true },
            { speaker: O, portrait: 'otaman', text: 'Дим над цими стінами востаннє бачили, кажуть, за дідів наших дідів. Тепер — наш дим.', durationMs: 7500 }
          ] },
          { type: 'grantResources', side: SIDE.player, gold: 280, lumber: 220, food: 60 },
          { type: 'showMessage', text: 'Обоз розпаковано: припаси зараховано. Закладайте хутір на городищі.' }
        ]
      },

      // ════════ АКТ 3 — СУСІДИ ════════
      {
        id: 'susidy',
        title: 'Сусіди',
        restrictions: {
          buildAllowed: ['townhall', 'farm', 'field', 'tower', 'barracks'],
          trainAllowed: ['worker', 'footman', 'archer'],
          buildReasons: { workshop: 'До гармат ще дожити треба.' },
          trainReasons: { knight: 'Сердюків наймемо, як стане сіль і слава.', kharakternyk: 'Такого не наймеш. Такий сам приходить.' }
        },
        objectives: [
          {
            id: 'obj_salt',
            title: 'Відбити солеварню',
            description: 'Без солі зима зʼїсть слободу. Солеварню за поворотом шляху на південь стереже татарський пост.',
            subObjectives: [
              { id: 'sub_salt_post', title: 'Пост розбито', condition: { all: [ { type: 'flag', flag: 'salt_post_spawned' }, { type: 'groupCount', groupId: 'salt_post', count: 0 } ] } }
            ]
          },
          {
            id: 'obj_khar',
            title: 'Знайти хату в глушині',
            description: 'Чумаки казали: далі шляхом, на заході, живе в лісі такий, що вовки його обходять.',
            subObjectives: [
              { id: 'sub_khar_found', title: 'Хату знайдено', condition: { type: 'flag', flag: 'khar_found' } },
              { id: 'sub_kurhany', title: 'Розорити стан на курганах', condition: { all: [ { type: 'flag', flag: 'kurhany_spawned' }, { type: 'groupCount', groupId: 'kurhany_post', count: 0 } ] } }
            ]
          },
          {
            id: 'obj_valka',
            title: 'Оборонити чумацьку валку',
            description: 'Тим самим шляхом повз солеварню йдуть чумаки. Татари теж це знають.',
            optional: true,
            subObjectives: [
              { id: 'sub_valka', title: 'Валка пройшла живою', condition: { type: 'flag', flag: 'chumaky_saved' } }
            ]
          }
        ],
        enterEvents: [
          { type: 'setLandmarkVisible', id: 'lm_saltworks', visible: true },
          { type: 'setLandmarkVisible', id: 'lm_khar_hut', visible: true },
          { type: 'revealArea', x: saltWorks.x, y: saltWorks.y, radiusTiles: 7 },
          { type: 'showDialogue', lines: [
            { speaker: O, portrait: 'otaman', text: 'Слобода стоїть — тепер їй жити треба. Сіль, сусіди і той, про кого чумаки шепотіли.', requireContinue: true },
            { speaker: D, portrait: 'selyanyn', text: 'За поворотом шляху — солеварня, а коло неї татарський пост. Невеликий, та лихий. А хата того... характерника — далі на заході.', durationMs: 9500 }
          ] }
        ]
      },

      // ════════ АКТ 4 — ЯСИР ════════
      {
        id: 'yasyr',
        title: 'Ясир',
        restrictions: {
          buildAllowed: ['townhall', 'farm', 'field', 'tower', 'barracks'],
          trainAllowed: ['worker', 'footman', 'archer', 'knight'],
          trainReasons: { kharakternyk: 'Такого не наймеш. Такий сам приходить.' }
        },
        objectives: [
          {
            id: 'obj_rescue',
            title: 'Відбити ясир',
            description: 'Татари розорили хутір сусідів і ведуть людей шляхом до стану. Перехопіть конвой на шляху — або беріть стан.',
            subObjectives: [
              { id: 'sub_convoy', title: 'Конвой розбито', condition: { all: [ { type: 'flag', flag: 'convoy_spawned' }, { type: 'groupCount', groupId: 'yasyr_convoy', count: 0 }, { type: 'groupCount', groupId: 'stan_garrison', count: 0 } ] } },
              { id: 'sub_freed', title: 'Людей звільнено', condition: { type: 'flag', flag: 'yasyr_freed' } }
            ]
          },
          {
            id: 'obj_winter',
            title: 'Запас на зиму',
            description: 'Зима не питає. 300 їжі та 120 солі в коморі — інакше слобода не доживе до весни.',
            subObjectives: [
              { id: 'sub_food', title: '300 їжі', condition: { type: 'resourceCount', side: SIDE.player, resource: 'food', count: 300 } },
              { id: 'sub_salt', title: '120 солі', condition: { type: 'resourceCount', side: SIDE.player, resource: 'salt', count: 120 } }
            ]
          }
        ],
        enterEvents: [
          { type: 'setLandmarkVisible', id: 'lm_stan', visible: true },
          { type: 'setLandmarkVisible', id: 'lm_neighbors', visible: true },
          { type: 'setAtmosphere', tone: 'ashen', durationMs: 14000 },
          { type: 'revealArea', x: neighborKhutir.x, y: neighborKhutir.y, radiusTiles: 8 },
          { type: 'playFx', kind: 'fire', x: neighborKhutir.x + 14, y: neighborKhutir.y - 8 },
          { type: 'playFx', kind: 'smoke', x: neighborKhutir.x - 10, y: neighborKhutir.y - 24 },
          { type: 'focusCamera', beat: { x: neighborKhutir.x, y: neighborKhutir.y, durationMs: 1400 } },
          { type: 'setFlag', flag: 'convoy_spawned', value: true },
          // шлях конвою видний на мінімапі без туману — щоб гравець бачив, куди ведуть ясир
          { type: 'revealArea', x: worldPoint(50, nNeighbors.ty).x, y: worldPoint(50, nNeighbors.ty).y, radiusTiles: 6 },
          { type: 'revealArea', x: worldPoint(70, nNeighbors.ty).x, y: worldPoint(70, nNeighbors.ty).y, radiusTiles: 6 },
          { type: 'revealArea', x: stan.x, y: stan.y, radiusTiles: 7 },
          // конвой тягнеться повільно (вʼязні пішки) — є час наздогнати його на шляху до стану
          { type: 'spawnUnits', groupId: 'yasyr_convoy', units: slow(band(neighborKhutir.x, neighborKhutir.y, SIDE.ai, 'horde', [
            ['knight', -30, 0], ['knight', 30, 0], ['footman', 0, -24], ['archer', 0, 28]
          ]), 0.35) },
          // полонені — йдуть з конвоєм, звільняться, коли конвой і стан розбито (t_rescue)
          { type: 'spawnUnits', groupId: 'yasyr_captives', units: slow(band(neighborKhutir.x, neighborKhutir.y + TILE * 1.5, SIDE.ai, 'alliance', [
            ['worker', -12, 0], ['worker', 12, 0]
          ]), 0.35) },
          { type: 'commandGroup', groupId: 'yasyr_convoy', command: { type: 'move', x: stan.x, y: stan.y } },
          { type: 'commandGroup', groupId: 'yasyr_captives', command: { type: 'move', x: stan.x, y: stan.y } },
          { type: 'showDialogue', lines: [
            { speaker: X, portrait: 'kharakternyk', text: 'Чуєш? Я чую. Дим над сусідами — і кроки в кайданах. Ведуть людей шляхом до стану.', requireContinue: true },
            { speaker: O, portrait: 'otaman', text: 'Конвой повільний — наздоженем на шляху. А не встигнем — візьмемо стан. Ясир додому вернеться так чи так.', durationMs: 9000 }
          ] },
          { type: 'showMessage', text: 'Конвой іде шляхом до стану. Перехопіть його — або готуйте штурм.' }
        ]
      }
    ],

    triggers: [
      // ───── АКТ 1 ─────
      {
        id: 't_hunt_area', phase: 'doroha', on: 'areaEntered', once: true,
        area: { id: 'a_hunt', x: huntCamp.x - TILE * 6, y: huntCamp.y, radius: TILE * 3, side: SIDE.player },
        events: [
          { type: 'showDialogue', lines: [
            { speaker: D, portrait: 'selyanyn', text: 'Ось і гайок. Слід вепра — свіжий, отамане. Тут і станемо на постріл.', durationMs: 6500 }
          ] },
          { type: 'showMessage', text: 'ПКМ по звіру — полювання. Селяни розберуть тушу на їжу.' }
        ]
      },
      {
        id: 't_hunted', phase: 'doroha', on: 'resourceGathered', once: true,
        condition: { all: [ { type: 'event', eventType: 'resourceGathered', side: SIDE.player }, { type: 'flag', flag: 'hunt_counted', value: false } ] },
        events: [
          { type: 'setFlag', flag: 'hunted', value: true },
          { type: 'setFlag', flag: 'hunt_counted', value: true },
          { type: 'showDialogue', lines: [
            { speaker: D, portrait: 'selyanyn', text: 'Є мʼясо! Діти сьогодні спатимуть ситі. Степ годує тих, хто вміє просити.', durationMs: 7000 }
          ] }
        ]
      },
      {
        id: 't_night', phase: 'doroha', on: 'areaEntered', once: true,
        area: { id: 'a_camp', x: nightCamp.x - TILE * 7, y: nightCamp.y, radius: TILE * 3, side: SIDE.player },
        events: [
          { type: 'setAtmosphere', tone: 'night' },
          { type: 'showDialogue', lines: [
            { speaker: O, portrait: 'otaman', text: 'Смеркає. Стаємо табором — вози в коло, вогонь малий. Степ уночі не наш.', requireContinue: true },
            { speaker: D, portrait: 'selyanyn', text: 'Чуєте?.. Виють. Близько.', durationMs: 6000 }
          ] },
          { type: 'showMessage', text: 'Ніч. Тримайте селян біля бійців — вовки йдуть на вогонь.' },
          { type: 'setFlag', flag: 'night_started', value: true },
          { type: 'setClock', label: 'Ніч — світає через', durationMs: 50000, icon: '🌙' },
          { type: 'setDayPhase', phase: 'night' }
        ]
      },
      {
        id: 't_wolves_attack', phase: 'doroha', on: 'state', once: true,
        condition: { type: 'flagAgeMs', flag: 'night_started', ms: 4000 },
        events: [
          { type: 'playFx', kind: 'dust', x: nightCamp.x - TILE * 4, y: nightCamp.y - TILE * 2 },
          { type: 'showMessage', text: 'Вовки з темряви!' }
        ]
      },
      {
        id: 't_dawn', phase: 'doroha', on: 'state', once: true,
        condition: { type: 'flagAgeMs', flag: 'night_started', ms: 50000 },
        events: [
          { type: 'setFlag', flag: 'dawn', value: true },
          { type: 'setAtmosphere', tone: 'normal' },
          { type: 'clearClock' },
          { type: 'setDayPhase', phase: 'day' },
          { type: 'showDialogue', lines: [
            { speaker: D, portrait: 'selyanyn', text: 'Світає... Перебули. У степу найстрашніше не вовки, отамане. Найстрашніше — що далі вже нікуди вертатись.', durationMs: 9000 }
          ] }
        ]
      },
      {
        id: 't_baba', phase: 'doroha', on: 'areaEntered', once: true,
        area: { id: 'a_baba', x: babaPt.x, y: babaPt.y, radius: TILE * 4, side: SIDE.player },
        events: [
          { type: 'setLandmarkVisible', id: 'lm_baba', visible: true },
          { type: 'setAtmosphere', tone: 'ashen', durationMs: 9000 },
          { type: 'playFx', kind: 'mist', x: babaPt.x, y: babaPt.y },
          { type: 'focusCamera', beat: { x: babaPt.x, y: babaPt.y, durationMs: 1100 } },
          { type: 'showDialogue', lines: [
            { speaker: D, portrait: 'selyanyn', text: 'Стійте... Гляньте. Камʼяна баба, сама-самісінька серед степу. Хто ж її тут лишив?', requireContinue: true },
            { speaker: O, portrait: 'otaman', text: 'Степовий знак. Такі ставлять, де давні шляхи сходились — або де лежить те, чого краще не чіпати.', requireContinue: true },
            { speaker: D, portrait: 'selyanyn', text: 'Кістки тут, під дерном. Старі-старі. Земля не порожня, отамане. Ходімо — баба не любить, коли на неї довго дивляться.', durationMs: 9000 }
          ] },
          { type: 'showMessage', text: 'Камʼяна баба: перший знак, що ця земля вже комусь належала.' }
        ]
      },
      {
        id: 't_chumaky_meet', phase: 'doroha', on: 'areaEntered', once: true,
        area: { id: 'a_meet', x: meetPt.x, y: meetPt.y, radius: TILE * 4, side: SIDE.player },
        events: [
          { type: 'spawnCaravan', route: [
            worldPoint(nMeet.tx + 4, 10),
            meetPt,
            worldPoint(nBaba.tx + 1, 10)
          ] },
          { type: 'revealArea', x: meetPt.x, y: meetPt.y, radiusTiles: 6 },
          { type: 'showDialogue', lines: [
            { speaker: CH, portrait: 'kozak', text: 'Гей, людоньки! На городище йдете? Місце добре, та не порожнє — самі побачите.', requireContinue: true },
            { speaker: CH, portrait: 'kozak', text: 'Цим шляхом далі — солеварня за поворотом, тільки тепер там татарва стоїть. А ще далі, в глушині, хата є — там такий живе, що й вовки його двір обходять.', requireContinue: true },
            { speaker: O, portrait: 'otaman', text: 'Дякую за слово, чумаче. Шлях вам рівний.', durationMs: 6000 }
          ] }
        ]
      },
      {
        id: 't_chumaky_meet_looted', phase: 'doroha', on: 'caravanResolved', once: true,
        condition: { type: 'event', eventType: 'caravanResolved', outcome: 'destroyed', bySide: SIDE.player },
        events: [
          { type: 'setFlag', flag: 'chumaky_saved', value: false },
          { type: 'grantResources', side: SIDE.player, salt: 40 },
          { type: 'showDialogue', lines: [
            { speaker: D, portrait: 'selyanyn', text: 'Отамане... то ж чумак Гнат був, з яким щойно балакали. Сіль у возі лишилась — та про таке шлях памʼятає.', durationMs: 9000 }
          ] }
        ]
      },
      {
        id: 't_cache_found', phase: 'doroha', on: 'areaEntered', once: true,
        area: { id: 'a_cache', x: cacheSpot.x, y: cacheSpot.y, radius: TILE * 3, side: SIDE.player },
        events: [
          { type: 'revealArea', x: cacheSpot.x, y: cacheSpot.y, radiusTiles: 5 },
          { type: 'playFx', kind: 'dust', x: cacheSpot.x, y: cacheSpot.y },
          { type: 'grantResources', side: SIDE.player, gold: 60, lumber: 80 },
          { type: 'showDialogue', lines: [
            { speaker: D, portrait: 'selyanyn', text: 'Гляньте, отамане — схованка. Чумаки, певно, ховали від лихих очей, та не вернулись. Тепер це нам у дорогу.', durationMs: 8000 }
          ] },
          { type: 'showMessage', text: 'Знайдено тайник: +60 золота, +80 дерева.' }
        ]
      },
      {
        id: 't_arrive', phase: 'doroha', on: 'areaEntered', once: true,
        area: { id: 'a_horodysche', x: horodysche.x, y: horodysche.y, radius: TILE * 5.5, side: SIDE.player },
        condition: { all: [ { type: 'flag', flag: 'dawn' } ] },
        events: [
          { type: 'setObjectiveStatus', objectiveId: 'obj_reach', status: 'completed' },
          { type: 'setPhase', phase: 'horodysche' }
        ]
      },

      // ───── АКТ 2 ─────
      {
        id: 't_scout', phase: 'horodysche', on: 'timer', once: true, delayMs: 10000,
        events: [
          { type: 'spawnUnits', groupId: 'tatar_scout', units: band(scoutHill.x, scoutHill.y, SIDE.ai, 'horde', [['knight', 0, 0]]) },
          { type: 'focusCamera', beat: { x: scoutHill.x, y: scoutHill.y, durationMs: 1300, lockMs: 1300 } },
          { type: 'playFx', kind: 'dust', x: scoutHill.x, y: scoutHill.y },
          { type: 'showDialogue', lines: [
            { speaker: O, portrait: 'otaman', text: 'На обрії. Бачиш? Один. Подивився — і нема. Тепер вони знають, що ми тут стали.', durationMs: 8000 }
          ] },
          { type: 'commandGroup', groupId: 'tatar_scout', command: { type: 'retreat', x: stan.x, y: stan.y, despawnAfterMs: 9000 } }
        ]
      },
      {
        id: 't_den_razed', on: 'animalKilled', once: true,
        condition: { type: 'event', eventType: 'animalKilled', animalKind: 'wolf_den' },
        events: [
          { type: 'setFlag', flag: 'den_razed', value: true },
          { type: 'setObjectiveStatus', objectiveId: 'obj_den', status: 'completed' },
          { type: 'showDialogue', lines: [
            { speaker: 'Дід Панас', portrait: 'selyanyn', text: 'Лігво розорили. Ліс наш — і дрова, і дичина, і тиша.', durationMs: 7000 }
          ] }
        ]
      },
      {
        id: 't_townhall_built_hide_ruins', phase: 'horodysche', on: 'buildingCompleted', once: true,
        condition: { type: 'event', eventType: 'buildingCompleted', side: SIDE.player, kind: 'townhall' },
        events: [
          { type: 'setLandmarkVisible', id: 'lm_horodysche', visible: false }
        ]
      },
      {
        id: 't_founding', phase: 'horodysche', on: 'buildingCompleted', once: true,
        condition: { type: 'event', eventType: 'buildingCompleted', side: SIDE.player, kind: 'townhall' },
        events: [
          { type: 'playFx', kind: 'glow', x: horodysche.x, y: horodysche.y },
          { type: 'focusCamera', beat: { x: horodysche.x, y: horodysche.y, durationMs: 1000 } },
          { type: 'showDialogue', lines: [
            { speaker: O, portrait: 'otaman', text: 'Стоїть! Перший дах на цій землі — хто знає, за скільки літ.', requireContinue: true },
            { speaker: D, portrait: 'selyanyn', text: 'Тепер це не городище, отамане. Тепер це слобода. Наша.', durationMs: 7500 }
          ] },
          { type: 'showMessage', text: 'Слободу засновано! Зводьте хати, збирайте людей — і стережіться: татари вже знають про нас.' }
        ]
      },
      {
        id: 't_first_raid', phase: 'horodysche', on: 'buildingCompleted', once: true, delayMs: 32000,
        condition: { type: 'event', eventType: 'buildingCompleted', side: SIDE.player, kind: 'townhall' },
        events: [
          { type: 'spawnUnits', groupId: 'raid1', units: band(turnSouth.x, turnSouth.y - TILE * 2, SIDE.ai, 'horde', [['knight', 0, 0], ['knight', 26, 14]]) },
          { type: 'commandGroup', groupId: 'raid1', command: { type: 'attackMove', x: horodysche.x, y: horodysche.y } },
          { type: 'showMessage', text: 'Татарва з полудня, шляхом! Бережіть селян на узліссі.' },
          { type: 'showDialogue', lines: [
            { speaker: O, portrait: 'otaman', text: 'Двоє. Не набіг — проба. Дивляться, чи вміємо кусатись. Покажемо.', durationMs: 7000 }
          ] }
        ]
      },
      {
        id: 't_raid1_dead', phase: 'horodysche', on: 'state', once: true,
        condition: { all: [ { type: 'event', eventType: 'state' }, { type: 'flagAgeMs', flag: 'raid1_note', ms: 1, value: false }, { type: 'groupCount', groupId: 'raid1', count: 0 }, { type: 'buildingCount', side: SIDE.player, kind: 'townhall', completed: true, count: 1 } ] },
        events: [ { type: 'setFlag', flag: 'raid1_note', value: true } ]
      },
      {
        id: 't_settle_done', phase: 'horodysche', on: 'state', once: true,
        condition: { all: [
          { type: 'buildingCount', side: SIDE.player, kind: 'townhall', completed: true, count: 1 },
          { type: 'unitCount', side: SIDE.player, kind: 'worker', count: 8 },
          { type: 'resourceCount', side: SIDE.player, resource: 'lumber', count: 300 }
        ] },
        events: [
          { type: 'setObjectiveStatus', objectiveId: 'obj_settle', status: 'completed' },
          { type: 'setPhase', phase: 'susidy' }
        ]
      },

      // ───── АКТ 3 ─────
      {
        id: 't_neighbors_visit', on: 'areaEntered', once: true,
        area: { id: 'a_neighbors', x: neighborKhutir.x, y: neighborKhutir.y, radius: TILE * 4, side: SIDE.player },
        condition: { not: { type: 'flag', flag: 'convoy_spawned' } },
        events: [
          { type: 'setLandmarkVisible', id: 'lm_neighbors', visible: true },
          { type: 'setFlag', flag: 'neighbors_met', value: true },
          { type: 'grantResources', side: SIDE.player, food: 30, salt: 10 },
          { type: 'showDialogue', lines: [
            { speaker: D, portrait: 'selyanyn', text: 'Хутір! Тут люди є, отамане — і досі живі. Гляньте, виходять.', requireContinue: true },
            { speaker: CH, portrait: 'kozak', text: 'Сусіди! Чули про вас від чумаків. Тримайте — їжа і трохи солі, чим багаті. Тут спокійно... поки що.', durationMs: 9000 }
          ] },
          { type: 'showMessage', text: 'Хутір сусідів: подарунок — 30 їжі, 10 солі.' }
        ]
      },
      {
        id: 't_ambush_pocket', phase: 'susidy', on: 'areaEntered', once: true,
        area: { id: 'a_ambush', x: ambushPocket.x, y: ambushPocket.y, radius: TILE * 3, side: SIDE.player },
        events: [
          { type: 'spawnUnits', groupId: 'ambush_pocket', units: band(ambushPocket.x, ambushPocket.y - TILE * 2, SIDE.ai, 'horde', [
            ['footman', -16, 0], ['archer', 16, 0]
          ]) },
          { type: 'commandGroup', groupId: 'ambush_pocket', command: { type: 'attackMove', x: ambushPocket.x, y: ambushPocket.y } },
          { type: 'showMessage', text: 'Засідка! Татари чекали в глухому закутку.' }
        ]
      },
      {
        id: 't_khar_found', phase: 'susidy', on: 'areaEntered', once: true,
        area: { id: 'a_khar', x: kharHut.x, y: kharHut.y, radius: TILE * 4, side: SIDE.player },
        events: [
          { type: 'setFlag', flag: 'khar_found', value: true },
          { type: 'setLandmarkVisible', id: 'lm_kurhany', visible: true },
          { type: 'revealArea', x: kurhany.x, y: kurhany.y, radiusTiles: 6 },
          { type: 'setFlag', flag: 'kurhany_spawned', value: true },
          { type: 'spawnUnits', groupId: 'kurhany_post', units: band(kurhany.x, kurhany.y, SIDE.ai, 'horde', [
            ['footman', -26, -8], ['footman', 26, -8], ['archer', -12, 22], ['knight', 14, 22]
          ]) },
          { type: 'setAtmosphere', tone: 'forbidden', durationMs: 10000 },
          { type: 'showDialogue', lines: [
            { speaker: X, portrait: 'kharakternyk', text: 'Я знав, що прийдете. Земля переказала — кроки в ній чути за день.', requireContinue: true },
            { speaker: X, portrait: 'kharakternyk', text: 'Поможу вам. Та спершу — он там, на курганах, татарва стала. На курганах не стоять. Там сплять. Розженіть їх — і я ваш.', durationMs: 11000 }
          ] }
        ]
      },
      {
        id: 't_kurhany_clear', phase: 'susidy', on: 'state', once: true,
        condition: { all: [ { type: 'flag', flag: 'kurhany_spawned' }, { type: 'groupCount', groupId: 'kurhany_post', count: 0 } ] },
        events: [
          { type: 'setAtmosphere', tone: 'forbidden', durationMs: 12000 },
          { type: 'playFx', kind: 'mist', x: kurhany.x, y: kurhany.y },
          { type: 'playFx', kind: 'glow', x: kurhany.x, y: kurhany.y - 14 },
          { type: 'spawnUnits', groupId: 'khar_join', units: [ { kind: 'kharakternyk', side: SIDE.player, race: 'alliance', x: kharHut.x + TILE, y: kharHut.y + TILE } ] },
          { type: 'showDialogue', lines: [
            { speaker: X, portrait: 'kharakternyk', text: 'Чуєте, як тихо стало? То не тиша. То подяка. Старі тут лежать — старші за бабу на вашому городищі.', requireContinue: true },
            { speaker: X, portrait: 'kharakternyk', text: 'Я з вами. Туманець насилати вмію — імла густа, у ній вовк сліпне і татарин коня не втримає. Натисніть T — побачите.', durationMs: 10000 }
          ] },
          { type: 'showMessage', text: 'Характерник приєднався! Здібність «Туманець» — клавіша T.' }
        ]
      },
      {
        id: 't_valka', phase: 'susidy', on: 'state', once: true, delayMs: 50000,
        condition: { type: 'elapsedMs', ms: 50000 },
        events: [
          { type: 'spawnCaravan', route: [
            turnSouth,
            worldPoint(nTurnSouth.tx - 6, nTurnSouth.ty),
            saltWorks,
            worldPoint(nSaltWorks.tx - 8, nSaltWorks.ty),
            kharHut
          ] },
          { type: 'setFlag', flag: 'valka_underway', value: true },
          { type: 'showMessage', text: 'Чумацька валка виходить на шлях повз солеварню.' }
        ]
      },
      {
        id: 't_valka_raiders', phase: 'susidy', on: 'state', once: true,
        condition: { type: 'flagAgeMs', flag: 'valka_underway', ms: 29000 },
        events: [
          { type: 'spawnUnits', groupId: 'valka_raiders', units: band(ambushSpot.x, ambushSpot.y - TILE * 4, SIDE.ai, 'horde', [
            ['knight', 0, 0], ['knight', 24, 12], ['knight', -24, 12]
          ]) },
          { type: 'commandGroup', groupId: 'valka_raiders', command: { type: 'attackCaravan' } },
          { type: 'focusCamera', beat: { x: ambushSpot.x, y: ambushSpot.y, durationMs: 1200 } },
          { type: 'showDialogue', lines: [
            { speaker: D, portrait: 'selyanyn', text: 'Татари ріжуть валку на шляху, за солеварнею! Як не поможемо — хто нам потім сіль возитиме?', durationMs: 8000 }
          ] },
          { type: 'showMessage', text: 'Джигіти напали на валку! Встигніть — і чумаки цього не забудуть.' }
        ]
      },
      {
        id: 't_valka_saved', phase: 'susidy', on: 'caravanResolved', once: true,
        condition: { type: 'event', eventType: 'caravanResolved', outcome: 'escaped' },
        events: [
          { type: 'setFlag', flag: 'chumaky_saved', value: true },
          { type: 'grantResources', side: SIDE.player, salt: 60, gold: 40 },
          { type: 'showDialogue', lines: [
            { speaker: CH, portrait: 'kozak', text: 'Живі! Ваші шаблі — наша сіль. Тримайте задаток, і скільки шлях стоїть — частка ваша.', durationMs: 9000 }
          ] }
        ]
      },
      {
        id: 't_valka_gift2', phase: 'yasyr', on: 'state', once: true,
        condition: { all: [ { type: 'flag', flag: 'chumaky_saved' }, { type: 'elapsedMs', ms: 60000 } ] },
        events: [
          { type: 'grantResources', side: SIDE.player, salt: 50 },
          { type: 'showMessage', text: 'Чумаки лишили сіль біля воріт — слово тримають.' }
        ]
      },
      {
        id: 't_valka_dead', phase: 'susidy', on: 'caravanResolved', once: true,
        condition: { type: 'event', eventType: 'caravanResolved', outcome: 'destroyed', bySide: SIDE.ai },
        events: [
          { type: 'setObjectiveStatus', objectiveId: 'obj_valka', status: 'failed' },
          { type: 'showDialogue', lines: [
            { speaker: D, portrait: 'selyanyn', text: 'Не встигли... Воли в крові, сіль у пилюці. Степ такого не забуває — і люди теж.', durationMs: 8500 }
          ] }
        ]
      },
      {
        id: 't_valka_looted', phase: 'susidy', on: 'caravanResolved', once: true,
        condition: { type: 'event', eventType: 'caravanResolved', outcome: 'destroyed', bySide: SIDE.player },
        events: [
          { type: 'setObjectiveStatus', objectiveId: 'obj_valka', status: 'failed' },
          { type: 'grantResources', side: SIDE.player, salt: 70 },
          { type: 'showDialogue', lines: [
            { speaker: D, portrait: 'selyanyn', text: 'Отамане... то ж чумаки були. Сіль у возах лишилась — наша тепер. Та про таке шлях памʼятає.', durationMs: 9000 }
          ] }
        ]
      },
      {
        id: 't_susidy_done', phase: 'susidy', on: 'state', once: true,
        condition: { all: [
          { type: 'flag', flag: 'salt_post_spawned' },
          { type: 'groupCount', groupId: 'salt_post', count: 0 },
          { type: 'flag', flag: 'khar_found' },
          { type: 'groupCount', groupId: 'kurhany_post', count: 0 }
        ] },
        events: [
          { type: 'setObjectiveStatus', objectiveId: 'obj_salt', status: 'completed' },
          { type: 'setObjectiveStatus', objectiveId: 'obj_khar', status: 'completed' },
          { type: 'setPhase', phase: 'yasyr' }
        ]
      },

      // ───── АКТ 4 ─────
      {
        id: 't_convoy_arrived', phase: 'yasyr', on: 'areaEntered', once: true,
        area: { id: 'a_stan', x: stan.x, y: stan.y, radius: TILE * 4.5, side: SIDE.ai },
        events: [
          { type: 'setFlag', flag: 'convoy_arrived', value: true },
          { type: 'spawnUnits', groupId: 'stan_garrison', units: band(stan.x, stan.y + TILE, SIDE.ai, 'horde', [
            ['footman', -30, 0], ['footman', 30, 0], ['archer', -14, -26], ['archer', 14, -26], ['knight', 0, 30]
          ]) },
          { type: 'showDialogue', lines: [
            { speaker: X, portrait: 'kharakternyk', text: 'Дійшли до стану. Тепер їх там більше — та й поспіху вже нема. Зберіть силу, отамане. Стан візьмемо, людей вернемо.', durationMs: 9500 }
          ] }
        ]
      },
      {
        id: 't_rescue', phase: 'yasyr', on: 'state', once: true,
        condition: { all: [
          { type: 'flag', flag: 'convoy_spawned' },
          { type: 'groupCount', groupId: 'yasyr_convoy', count: 0 },
          { type: 'groupCount', groupId: 'stan_garrison', count: 0 }
        ] },
        events: [
          { type: 'setFlag', flag: 'yasyr_freed', value: true },
          { type: 'commandGroup', groupId: 'yasyr_captives', command: { type: 'despawn' } },
          { type: 'spawnUnits', groupId: 'freed', units: band(stan.x - TILE * 2, stan.y + TILE * 2, SIDE.player, 'alliance', [
            ['worker', 0, 0], ['worker', 26, 10], ['worker', -26, 10]
          ]) },
          { type: 'commandGroup', groupId: 'freed', command: { type: 'move', x: horodysche.x, y: horodysche.y } },
          { type: 'showDialogue', lines: [
            { speaker: D, portrait: 'selyanyn', text: 'Живі! Худі, биті — а живі. Йдуть до нас, отамане. Тепер вони наші, а ми їхні.', durationMs: 8000 }
          ] },
          { type: 'showMessage', text: 'Ясир звільнено! Люди йдуть до слободи. Лишився запас на зиму.' }
        ]
      },
      {
        id: 't_victory', phase: 'yasyr', on: 'state', once: true,
        condition: { all: [
          { type: 'flag', flag: 'yasyr_freed' },
          { type: 'resourceCount', side: SIDE.player, resource: 'food', count: 300 },
          { type: 'resourceCount', side: SIDE.player, resource: 'salt', count: 120 }
        ] },
        events: [
          { type: 'setAtmosphere', tone: 'forbidden', durationMs: 9000 },
          { type: 'focusCamera', beat: { x: babaPt.x, y: babaPt.y, durationMs: 1500 } },
          { type: 'playFx', kind: 'mist', x: babaPt.x, y: babaPt.y },
          { type: 'showDialogue', lines: [
            { speaker: X, portrait: 'kharakternyk', text: 'Бачите бабу? Вона вже не питає, чого ви прийшли.', requireContinue: true },
            { speaker: O, portrait: 'otaman', text: 'Земля памʼятає всіх, хто тут був. Тепер памʼятатиме й нас.', requireContinue: true }
          ] },
          { type: 'endGame', win: true, lines: [
            { text: 'Перша зима прийшла — і слобода вистояла.' },
            { text: 'Чумаки звуть це місце добрим. Шлях знов живий.', flag: 'chumaky_saved' },
            { text: 'Чумаки обходять слободу десятою дорогою: шлях памʼятає кров.', flag: 'chumaky_saved', value: false },
            { text: 'А баба на городищі дивиться в степ. Чекає весни. Як і всі.' }
          ] }
        ]
      },
      {
        id: 't_defeat', on: 'buildingDestroyed', once: true,
        condition: { type: 'event', eventType: 'buildingDestroyed', side: SIDE.player, kind: 'townhall' },
        events: [
          { type: 'endGame', win: false, lines: [
            { text: 'Хутір упав. Степ забрав і цю спробу — як забирав інші.' },
            { text: 'Та городище лишилось. Хтось прийде знову.' }
          ] }
        ]
      },
      {
        id: 't_ataman_death', on: 'state', once: true,
        condition: { type: 'groupCount', groupId: 'ataman', count: 0 },
        events: [
          { type: 'endGame', win: false, lines: [
            { text: 'Отаман Остряниця упав у бою. Без нього валка — просто люди серед степу.' },
            { text: 'Степ забрав і цю спробу — як забирав інші.' }
          ] }
        ]
      }
    ]
  };
}
