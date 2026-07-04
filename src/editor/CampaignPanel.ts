import type {
  EditorPhase, EditorObjective, EditorTrigger, EditorEvent,
  EditorDialogueLine, EditorSpawnUnit, EditorArea, TriggerEventType
} from './types';

export interface CampaignData {
  phases: EditorPhase[];
  triggers: EditorTrigger[];
  areas: EditorArea[];
  mapId: string;
  mapTitle: string;
  initialPhase: string;
  enemyStatMul: { hp: number; atk: number };
  playerEcon: { gold: number; lumber: number; salt: number; food: number };
  aiEcon: { gold: number; lumber: number; salt: number; food: number };
}

export interface CampaignCallbacks {
  getMapSize(): { w: number; h: number };
  onResizeMap(w: number, h: number): void;
  onAreasChanged(): void;
  onMapIdChange(id: string): void;
  onInitialPhaseChange(phase: string): void;
}

let _tid = 1;
const newId = (prefix: string) => `${prefix}_${_tid++}`;

function el<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Partial<{ style: string; className: string; textContent: string; type: string; value: string; placeholder: string; checked: boolean }> = {}): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (attrs.style) e.style.cssText = attrs.style;
  if (attrs.className) e.className = attrs.className;
  if (attrs.textContent) e.textContent = attrs.textContent;
  if ('type' in attrs && (e as HTMLInputElement).type !== undefined) (e as HTMLInputElement).type = attrs.type!;
  if ('value' in attrs && attrs.value !== undefined) (e as HTMLInputElement).value = attrs.value;
  if (attrs.placeholder) (e as HTMLInputElement).placeholder = attrs.placeholder;
  if (attrs.checked !== undefined) (e as HTMLInputElement).checked = attrs.checked;
  return e;
}

function rowInput(label: string, value: string, onChange: (v: string) => void, type = 'text'): HTMLElement {
  const row = el('div', { style: 'margin-bottom:6px' });
  const lbl = el('label', { style: 'color:#888;font-size:11px;display:block;margin-bottom:2px', textContent: label });
  const inp = el('input', { type, value, style: 'background:#2a1f10;border:1px solid #5a4020;color:#fff;padding:3px 6px;border-radius:2px;font-size:12px;width:100%;box-sizing:border-box' });
  inp.addEventListener('input', () => onChange(inp.value));
  row.appendChild(lbl);
  row.appendChild(inp);
  return row;
}

function sectionEl(title: string): { wrap: HTMLElement; body: HTMLElement } {
  const wrap = el('details', { style: 'border:1px solid #3a2a14;border-radius:3px;margin-bottom:6px' });
  (wrap as HTMLDetailsElement).open = true;
  const sum = el('summary', { style: 'cursor:pointer;padding:6px 8px;color:#ffd36a;font-size:12px;font-weight:bold;background:#2a1a08;list-style:none', textContent: title });
  const body = el('div', { style: 'padding:8px' });
  wrap.appendChild(sum);
  wrap.appendChild(body);
  return { wrap, body };
}

function btn(text: string, color: string, onClick: () => void): HTMLButtonElement {
  const b = el('button', { textContent: text, style: `background:${color};border:1px solid #7a6243;color:#ffd36a;padding:3px 8px;border-radius:3px;cursor:pointer;font-size:11px` }) as HTMLButtonElement;
  b.addEventListener('click', (e) => { e.stopPropagation(); onClick(); });
  return b;
}

// ── Modal helper ─────────────────────────────────────────────────────────────

function openModal(title: string, body: HTMLElement, onSave: () => void): void {
  const overlay = el('div', { style: 'position:fixed;inset:0;background:#0009;z-index:2000;display:flex;align-items:center;justify-content:center' });
  const modal = el('div', { style: 'background:#1a1208;border:1px solid #7a6243;border-radius:4px;padding:16px;width:660px;max-width:95vw;max-height:85vh;overflow-y:auto;position:relative' });

  const ttl = el('div', { style: 'color:#ffd36a;font-size:15px;font-weight:bold;margin-bottom:12px', textContent: title });
  modal.appendChild(ttl);
  modal.appendChild(body);

  const foot = el('div', { style: 'display:flex;gap:8px;margin-top:14px;justify-content:flex-end' });
  const saveB = btn('Зберегти', '#3d5a1c', () => { onSave(); overlay.remove(); });
  saveB.style.borderColor = '#7a9a43';
  saveB.style.color = '#cef';
  const cancelB = btn('Скасувати', '#3a2a14', () => overlay.remove());
  foot.appendChild(saveB);
  foot.appendChild(cancelB);
  modal.appendChild(foot);

  overlay.appendChild(modal);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  document.body.appendChild(overlay);
}

// ── Dialogue editor ──────────────────────────────────────────────────────────

function buildDialogueEditor(lines: EditorDialogueLine[]): HTMLElement {
  const wrap = el('div');
  const listEl = el('div', { style: 'margin-bottom:6px' });
  wrap.appendChild(listEl);

  const renderList = () => {
    listEl.innerHTML = '';
    lines.forEach((line, i) => {
      const row = el('div', { style: 'background:#2a1a08;border:1px solid #3a2a14;border-radius:3px;padding:6px 8px;margin-bottom:4px' });

      const head = el('div', { style: 'display:flex;gap:6px;margin-bottom:4px;align-items:center' });
      const spk = el('input', { value: line.speaker, placeholder: 'Мовець', style: 'background:#1a1208;border:1px solid #5a4020;color:#ffd36a;padding:2px 5px;border-radius:2px;font-size:11px;width:120px' });
      spk.addEventListener('input', () => { line.speaker = spk.value; });

      const portrait = el('input', { value: line.portrait ?? '', placeholder: 'Портрет (напр. otaman)', style: 'background:#1a1208;border:1px solid #5a4020;color:#ccc;padding:2px 5px;border-radius:2px;font-size:11px;width:140px' });
      portrait.addEventListener('input', () => { line.portrait = portrait.value || undefined; });

      const dur = el('input', { type: 'number', value: String(line.durationMs ?? ''), placeholder: 'ms', style: 'background:#1a1208;border:1px solid #5a4020;color:#ccc;padding:2px 5px;border-radius:2px;font-size:11px;width:70px' });
      dur.addEventListener('input', () => { line.durationMs = parseInt(dur.value) || undefined; });

      const contLabel = el('label', { style: 'display:flex;align-items:center;gap:3px;color:#888;font-size:11px' });
      const contChk = el('input', { type: 'checkbox', checked: !!line.requireContinue }) as HTMLInputElement;
      contChk.addEventListener('change', () => { line.requireContinue = contChk.checked || undefined; });
      contLabel.appendChild(contChk);
      contLabel.appendChild(el('span', { textContent: 'Далі' }));

      const delB = btn('✕', '#5a1010', () => { lines.splice(i, 1); renderList(); });
      delB.style.padding = '2px 6px';
      delB.style.marginLeft = 'auto';

      head.appendChild(spk);
      head.appendChild(portrait);
      head.appendChild(dur);
      head.appendChild(contLabel);
      head.appendChild(delB);
      row.appendChild(head);

      const textArea = document.createElement('textarea');
      textArea.value = line.text;
      textArea.style.cssText = 'background:#1a1208;border:1px solid #5a4020;color:#fff;padding:4px 6px;border-radius:2px;font-size:12px;width:100%;box-sizing:border-box;min-height:48px;resize:vertical';
      textArea.addEventListener('input', () => { line.text = textArea.value; });
      row.appendChild(textArea);

      listEl.appendChild(row);
    });
  };

  renderList();
  const addB = btn('+ Рядок діалогу', '#2a3a14', () => {
    lines.push({ speaker: '', text: '' });
    renderList();
  });
  wrap.appendChild(addB);
  return wrap;
}

// ── Event editor ─────────────────────────────────────────────────────────────

function buildEventEditor(event: EditorEvent): HTMLElement {
  const wrap = el('div', { style: 'padding:6px 0' });

  if (event.type === 'showDialogue') {
    const dlg = event as Extract<EditorEvent, { type: 'showDialogue' }>;
    const h = el('div', { style: 'color:#888;font-size:11px;margin-bottom:4px', textContent: 'Діалог:' });
    wrap.appendChild(h);
    wrap.appendChild(buildDialogueEditor(dlg.lines));
    return wrap;
  }

  if (event.type === 'setPhase') {
    const ev = event as Extract<EditorEvent, { type: 'setPhase' }>;
    wrap.appendChild(rowInput('ID фази', ev.phaseId ?? '', (v) => { ev.phaseId = v; }));
    return wrap;
  }

  if (event.type === 'setFlag') {
    const ev = event as Extract<EditorEvent, { type: 'setFlag' }>;
    wrap.appendChild(rowInput('Прапор', ev.flag ?? '', (v) => { ev.flag = v; }));
    const vrow = el('div', { style: 'margin-bottom:6px;display:flex;align-items:center;gap:8px' });
    const vchk = el('input', { type: 'checkbox', checked: !!ev.value }) as HTMLInputElement;
    vchk.addEventListener('change', () => { ev.value = vchk.checked; });
    vrow.appendChild(el('label', { style: 'color:#888;font-size:11px', textContent: 'Значення true:' }));
    vrow.appendChild(vchk);
    wrap.appendChild(vrow);
    return wrap;
  }

  if (event.type === 'setObjectiveStatus') {
    const ev = event as Extract<EditorEvent, { type: 'setObjectiveStatus' }>;
    wrap.appendChild(rowInput('ID завдання', ev.objectiveId ?? '', (v) => { ev.objectiveId = v; }));
    wrap.appendChild(rowInput('Статус (active/completed/failed/hidden)', ev.status ?? 'active', (v) => { (ev as any).status = v; }));
    return wrap;
  }

  if (event.type === 'endGame') {
    const ev = event as Extract<EditorEvent, { type: 'endGame' }>;
    const row = el('div', { style: 'display:flex;align-items:center;gap:8px' });
    const chk = el('input', { type: 'checkbox', checked: ev.win }) as HTMLInputElement;
    chk.addEventListener('change', () => { ev.win = chk.checked; });
    row.appendChild(el('label', { style: 'color:#888;font-size:11px', textContent: 'Перемога (win):' }));
    row.appendChild(chk);
    wrap.appendChild(row);
    return wrap;
  }

  if (event.type === 'showMessage') {
    const ev = event as Extract<EditorEvent, { type: 'showMessage' }>;
    wrap.appendChild(rowInput('Текст повідомлення', ev.text ?? '', (v) => { ev.text = v; }));
    return wrap;
  }

  if (event.type === 'revealArea') {
    const ev = event as Extract<EditorEvent, { type: 'revealArea' }>;
    wrap.appendChild(rowInput('X (world)', String(ev.x ?? 0), (v) => { ev.x = parseFloat(v) || 0; }, 'number'));
    wrap.appendChild(rowInput('Y (world)', String(ev.y ?? 0), (v) => { ev.y = parseFloat(v) || 0; }, 'number'));
    wrap.appendChild(rowInput('Радіус (tiles)', String(ev.radiusTiles ?? 10), (v) => { ev.radiusTiles = parseInt(v) || 10; }, 'number'));
    return wrap;
  }

  if (event.type === 'grantResources') {
    const ev = event as Extract<EditorEvent, { type: 'grantResources' }>;
    wrap.appendChild(rowInput('Сторона (player/ai)', ev.side ?? 'player', (v) => { (ev as any).side = v; }));
    wrap.appendChild(rowInput('Золото', String(ev.gold ?? ''), (v) => { ev.gold = parseInt(v) || undefined; }, 'number'));
    wrap.appendChild(rowInput('Дерево', String(ev.lumber ?? ''), (v) => { ev.lumber = parseInt(v) || undefined; }, 'number'));
    wrap.appendChild(rowInput('Сіль', String(ev.salt ?? ''), (v) => { ev.salt = parseInt(v) || undefined; }, 'number'));
    wrap.appendChild(rowInput('Їжа', String(ev.food ?? ''), (v) => { ev.food = parseInt(v) || undefined; }, 'number'));
    return wrap;
  }

  if (event.type === 'focusCamera') {
    const ev = event as Extract<EditorEvent, { type: 'focusCamera' }>;
    wrap.appendChild(rowInput('X', String(ev.x ?? 0), (v) => { ev.x = parseFloat(v) || 0; }, 'number'));
    wrap.appendChild(rowInput('Y', String(ev.y ?? 0), (v) => { ev.y = parseFloat(v) || 0; }, 'number'));
    wrap.appendChild(rowInput('Блокування ms', String(ev.lockMs ?? ''), (v) => { ev.lockMs = parseInt(v) || undefined; }, 'number'));
    return wrap;
  }

  if (event.type === 'setAtmosphere') {
    const ev = event as Extract<EditorEvent, { type: 'setAtmosphere' }>;
    wrap.appendChild(rowInput('Тон (normal/ashen/forbidden/night)', ev.tone ?? 'normal', (v) => { (ev as any).tone = v; }));
    wrap.appendChild(rowInput('Тривалість ms (опц.)', String(ev.durationMs ?? ''), (v) => { ev.durationMs = parseInt(v) || undefined; }, 'number'));
    return wrap;
  }

  if (event.type === 'spawnUnits') {
    const ev = event as Extract<EditorEvent, { type: 'spawnUnits' }>;
    wrap.appendChild(rowInput('Group ID', ev.groupId ?? '', (v) => { ev.groupId = v; }));
    const unitList = el('div');
    const renderUnits = () => {
      unitList.innerHTML = '';
      (ev.units ?? []).forEach((u, i) => {
        const ur = el('div', { style: 'background:#1a1208;border:1px solid #3a2a14;padding:5px;border-radius:2px;margin-bottom:3px' });
        const line1 = el('div', { style: 'display:flex;gap:4px;flex-wrap:wrap;align-items:center;margin-bottom:3px' });

        const kindIn = el('input', { value: u.kind, placeholder: 'kind', style: 'width:80px;background:#0a0804;border:1px solid #5a4020;color:#ffd36a;padding:2px 4px;font-size:11px;border-radius:2px' });
        kindIn.addEventListener('input', () => { u.kind = kindIn.value; });

        const raceIn = el('input', { value: u.race ?? '', placeholder: 'race', style: 'width:80px;background:#0a0804;border:1px solid #5a4020;color:#ccc;padding:2px 4px;font-size:11px;border-radius:2px' });
        raceIn.addEventListener('input', () => { u.race = raceIn.value || undefined; });

        const sideIn = el('input', { value: u.side, placeholder: 'side', style: 'width:80px;background:#0a0804;border:1px solid #5a4020;color:#ccc;padding:2px 4px;font-size:11px;border-radius:2px' });
        sideIn.addEventListener('input', () => { (u as any).side = sideIn.value; });

        const xIn = el('input', { type: 'number', value: String(u.x), placeholder: 'x', style: 'width:64px;background:#0a0804;border:1px solid #5a4020;color:#ccc;padding:2px 4px;font-size:11px;border-radius:2px' });
        xIn.addEventListener('input', () => { u.x = parseFloat(xIn.value) || 0; });

        const yIn = el('input', { type: 'number', value: String(u.y), placeholder: 'y', style: 'width:64px;background:#0a0804;border:1px solid #5a4020;color:#ccc;padding:2px 4px;font-size:11px;border-radius:2px' });
        yIn.addEventListener('input', () => { u.y = parseFloat(yIn.value) || 0; });

        const delB = btn('✕', '#5a1010', () => { ev.units.splice(i, 1); renderUnits(); });
        delB.style.padding = '2px 6px';

        for (const inp of [kindIn, raceIn, sideIn, xIn, yIn]) line1.appendChild(inp);
        line1.appendChild(delB);
        ur.appendChild(line1);
        unitList.appendChild(ur);
      });
    };
    renderUnits();
    wrap.appendChild(unitList);
    const addUnitB = btn('+ Юніт', '#2a3a14', () => {
      if (!ev.units) (ev as any).units = [];
      ev.units.push({ kind: 'footman', side: 'ai', race: 'horde', x: 0, y: 0 });
      renderUnits();
    });
    wrap.appendChild(addUnitB);
    return wrap;
  }

  if (event.type === 'commandGroup') {
    const ev = event as Extract<EditorEvent, { type: 'commandGroup' }>;
    wrap.appendChild(rowInput('Group ID', ev.groupId ?? '', (v) => { ev.groupId = v; }));
    wrap.appendChild(rowInput('Команда (move/attackMove/retreat/despawn)', ev.command ?? 'move', (v) => { (ev as any).command = v; }));
    wrap.appendChild(rowInput('X', String(ev.x ?? ''), (v) => { ev.x = parseFloat(v) || undefined; }, 'number'));
    wrap.appendChild(rowInput('Y', String(ev.y ?? ''), (v) => { ev.y = parseFloat(v) || undefined; }, 'number'));
    return wrap;
  }

  if (event.type === 'setLandmarkVisible') {
    const ev = event as Extract<EditorEvent, { type: 'setLandmarkVisible' }>;
    wrap.appendChild(rowInput('Landmark ID', ev.id ?? '', (v) => { ev.id = v; }));
    const row = el('div', { style: 'display:flex;align-items:center;gap:8px' });
    const chk = el('input', { type: 'checkbox', checked: ev.visible }) as HTMLInputElement;
    chk.addEventListener('change', () => { ev.visible = chk.checked; });
    row.appendChild(el('label', { style: 'color:#888;font-size:11px', textContent: 'Видимий:' }));
    row.appendChild(chk);
    wrap.appendChild(row);
    return wrap;
  }

  if (event.type === 'setClock') {
    const ev = event as Extract<EditorEvent, { type: 'setClock' }>;
    wrap.appendChild(rowInput('Мітка', ev.label ?? '', (v) => { ev.label = v; }));
    wrap.appendChild(rowInput('Тривалість ms', String(ev.durationMs ?? 0), (v) => { ev.durationMs = parseInt(v) || 0; }, 'number'));
    wrap.appendChild(rowInput('Іконка', ev.icon ?? '🌙', (v) => { ev.icon = v; }));
    return wrap;
  }

  // clearClock, setDayPhase — simple
  if (event.type === 'setDayPhase') {
    const ev = event as Extract<EditorEvent, { type: 'setDayPhase' }>;
    wrap.appendChild(rowInput('Фаза (day/night)', ev.phase ?? 'day', (v) => { (ev as any).phase = v; }));
    return wrap;
  }

  wrap.appendChild(el('div', { style: 'color:#666;font-size:11px', textContent: `(${event.type} — поля редагуємо в JSON)` }));
  return wrap;
}

// ── CampaignPanel ─────────────────────────────────────────────────────────────

export class CampaignPanel {
  private container: HTMLElement;
  private data: CampaignData;
  private cb: CampaignCallbacks;

  constructor(container: HTMLElement, data: CampaignData, callbacks: CampaignCallbacks) {
    this.container = container;
    this.data = data;
    this.cb = callbacks;
  }

  build(): void {
    const c = this.container;
    c.innerHTML = '';
    c.appendChild(this.buildMapSettings());
    c.appendChild(this.buildEconomy());
    c.appendChild(this.buildPhases());
    c.appendChild(this.buildAreas());
    c.appendChild(this.buildTriggers());
  }

  // ── Map Settings ────────────────────────────────────────────────────────────

  private buildMapSettings(): HTMLElement {
    const { wrap, body } = sectionEl('⚙ Налаштування карти');

    body.appendChild(rowInput('ID карти', this.data.mapId, (v) => { this.data.mapId = v; this.cb.onMapIdChange(v); }));
    body.appendChild(rowInput('Початкова фаза', this.data.initialPhase, (v) => { this.data.initialPhase = v; this.cb.onInitialPhaseChange(v); }));

    const size = this.cb.getMapSize();
    const sizeRow = el('div', { style: 'display:flex;gap:6px;align-items:flex-end;margin-bottom:6px' });
    const wLbl = el('div', { style: 'flex:1' });
    wLbl.appendChild(el('label', { style: 'color:#888;font-size:11px;display:block;margin-bottom:2px', textContent: 'Ширина (tiles):' }));
    const wIn = el('input', { type: 'number', value: String(size.w), style: 'background:#2a1f10;border:1px solid #5a4020;color:#fff;padding:3px 5px;border-radius:2px;font-size:12px;width:100%;box-sizing:border-box' });
    wLbl.appendChild(wIn);

    const hLbl = el('div', { style: 'flex:1' });
    hLbl.appendChild(el('label', { style: 'color:#888;font-size:11px;display:block;margin-bottom:2px', textContent: 'Висота (tiles):' }));
    const hIn = el('input', { type: 'number', value: String(size.h), style: 'background:#2a1f10;border:1px solid #5a4020;color:#fff;padding:3px 5px;border-radius:2px;font-size:12px;width:100%;box-sizing:border-box' });
    hLbl.appendChild(hIn);

    const resizeB = btn('Застосувати', '#3a2a14', () => {
      const w = parseInt(wIn.value) || size.w;
      const h = parseInt(hIn.value) || size.h;
      if (w > 0 && h > 0 && (w !== size.w || h !== size.h)) {
        if (confirm(`Змінити розмір карти на ${w}×${h}? Частина тайлів поза межами буде обрізана.`))
          this.cb.onResizeMap(w, h);
      }
    });
    sizeRow.appendChild(wLbl);
    sizeRow.appendChild(hLbl);
    sizeRow.appendChild(resizeB);
    body.appendChild(sizeRow);

    const mulRow = el('div', { style: 'display:flex;gap:6px' });
    const addMul = (lbl: string, key: 'hp' | 'atk') => {
      const d = el('div', { style: 'flex:1' });
      d.appendChild(el('label', { style: 'color:#888;font-size:11px;display:block;margin-bottom:2px', textContent: lbl }));
      const inp = el('input', { type: 'number', value: String(this.data.enemyStatMul[key]), style: 'background:#2a1f10;border:1px solid #5a4020;color:#fff;padding:3px 5px;border-radius:2px;font-size:12px;width:100%;box-sizing:border-box' });
      inp.step = '0.1';
      inp.addEventListener('input', () => { this.data.enemyStatMul[key] = parseFloat(inp.value) || 1; });
      d.appendChild(inp);
      mulRow.appendChild(d);
    };
    addMul('HP вороги ×', 'hp');
    addMul('ATK вороги ×', 'atk');
    body.appendChild(el('label', { style: 'color:#888;font-size:10px;display:block;margin:4px 0 2px', textContent: 'Множники складності (AI):' }));
    body.appendChild(mulRow);

    return wrap;
  }

  // ── Economy ─────────────────────────────────────────────────────────────────

  private buildEconomy(): HTMLElement {
    const { wrap, body } = sectionEl('💰 Стартова економіка');

    const table = el('div', { style: 'display:grid;grid-template-columns:1fr 1fr;gap:8px' });
    const makeEconCol = (title: string, econ: { gold: number; lumber: number; salt: number; food: number }) => {
      const col = el('div');
      col.appendChild(el('div', { style: 'color:#7a6243;font-size:10px;text-transform:uppercase;margin-bottom:4px', textContent: title }));
      const keys: (keyof typeof econ)[] = ['gold', 'lumber', 'salt', 'food'];
      const labels = ['Золото', 'Дерево', 'Сіль', 'Їжа'];
      keys.forEach((k, i) => {
        const row = el('div', { style: 'display:flex;align-items:center;gap:4px;margin-bottom:3px' });
        row.appendChild(el('label', { style: 'color:#888;font-size:11px;width:48px;flex-shrink:0', textContent: labels[i] + ':' }));
        const inp = el('input', { type: 'number', value: String(econ[k]), style: 'background:#2a1f10;border:1px solid #5a4020;color:#fff;padding:2px 4px;border-radius:2px;font-size:11px;width:70px' });
        inp.addEventListener('input', () => { (econ as any)[k] = parseInt(inp.value) || 0; });
        row.appendChild(inp);
        col.appendChild(row);
      });
      return col;
    };
    table.appendChild(makeEconCol('Гравець', this.data.playerEcon));
    table.appendChild(makeEconCol('AI', this.data.aiEcon));
    body.appendChild(table);

    return wrap;
  }

  // ── Phases ──────────────────────────────────────────────────────────────────

  private buildPhases(): HTMLElement {
    const { wrap, body } = sectionEl('📋 Акти (фази)');
    const list = el('div');
    body.appendChild(list);

    const render = () => {
      list.innerHTML = '';
      this.data.phases.forEach((ph, i) => {
        const row = el('div', { style: 'display:flex;align-items:center;gap:4px;margin-bottom:3px;background:#2a1a08;padding:4px 6px;border-radius:3px' });
        row.appendChild(el('span', { style: 'color:#ccc;font-size:11px;flex:1', textContent: `${ph.id}: ${ph.title}` }));
        row.appendChild(btn('Ред.', '#3a2a14', () => this.openPhaseModal(ph, render)));
        row.appendChild(btn('↑', '#2a1f10', () => { if (i > 0) { [this.data.phases[i - 1], this.data.phases[i]] = [ph, this.data.phases[i - 1]]; render(); } }));
        row.appendChild(btn('✕', '#5a1010', () => { this.data.phases.splice(i, 1); render(); }));
        list.appendChild(row);
      });
    };
    render();
    body.appendChild(btn('+ Новий акт', '#2a3a14', () => {
      this.data.phases.push({ id: newId('phase'), title: 'Новий акт', objectives: [] });
      render();
    }));
    return wrap;
  }

  private openPhaseModal(ph: EditorPhase, onClose: () => void): void {
    const body = el('div');
    body.appendChild(rowInput('ID фази', ph.id, (v) => { ph.id = v; }));
    body.appendChild(rowInput('Назва', ph.title, (v) => { ph.title = v; }));
    body.appendChild(rowInput('Дозволені будівлі (через кому, порожньо=всі)', ph.buildAllowed ?? '', (v) => { ph.buildAllowed = v || undefined; }));
    body.appendChild(rowInput('Дозволені юніти (через кому, порожньо=всі)', ph.trainAllowed ?? '', (v) => { ph.trainAllowed = v || undefined; }));
    body.appendChild(rowInput('Причина обмеження (за замовч.)', ph.defaultBuildReason ?? '', (v) => { ph.defaultBuildReason = v || undefined; }));

    // Objectives
    body.appendChild(el('div', { style: 'color:#ffd36a;font-size:12px;font-weight:bold;margin:10px 0 4px', textContent: 'Завдання:' }));
    const objList = el('div');
    body.appendChild(objList);

    const renderObjs = () => {
      objList.innerHTML = '';
      ph.objectives.forEach((ob, i) => {
        const row = el('div', { style: 'background:#2a1a08;border:1px solid #3a2a14;padding:5px;border-radius:2px;margin-bottom:3px' });
        const line1 = el('div', { style: 'display:flex;gap:4px;align-items:center;margin-bottom:3px' });
        const idIn = el('input', { value: ob.id, placeholder: 'ID', style: 'width:100px;background:#1a1208;border:1px solid #5a4020;color:#ffd36a;padding:2px 4px;font-size:11px;border-radius:2px' });
        idIn.addEventListener('input', () => { ob.id = idIn.value; });
        const ttIn = el('input', { value: ob.title, placeholder: 'Назва', style: 'flex:1;background:#1a1208;border:1px solid #5a4020;color:#ccc;padding:2px 4px;font-size:11px;border-radius:2px' });
        ttIn.addEventListener('input', () => { ob.title = ttIn.value; });
        const optLbl = el('label', { style: 'display:flex;align-items:center;gap:3px;color:#888;font-size:11px;white-space:nowrap' });
        const optChk = el('input', { type: 'checkbox', checked: !!ob.optional }) as HTMLInputElement;
        optChk.addEventListener('change', () => { ob.optional = optChk.checked || undefined; });
        optLbl.appendChild(optChk);
        optLbl.appendChild(el('span', { textContent: 'Необ.' }));
        const delB = btn('✕', '#5a1010', () => { ph.objectives.splice(i, 1); renderObjs(); });
        delB.style.padding = '2px 5px';
        line1.appendChild(idIn); line1.appendChild(ttIn); line1.appendChild(optLbl); line1.appendChild(delB);
        row.appendChild(line1);
        const descIn = el('input', { value: ob.description ?? '', placeholder: 'Опис (необов\'язково)', style: 'width:100%;box-sizing:border-box;background:#1a1208;border:1px solid #5a4020;color:#999;padding:2px 4px;font-size:11px;border-radius:2px' });
        descIn.addEventListener('input', () => { ob.description = descIn.value || undefined; });
        row.appendChild(descIn);
        objList.appendChild(row);
      });
    };
    renderObjs();
    body.appendChild(btn('+ Завдання', '#2a3a14', () => { ph.objectives.push({ id: newId('obj'), title: 'Нове завдання' }); renderObjs(); }));

    openModal(`Акт: ${ph.title}`, body, onClose);
  }

  // ── Areas ───────────────────────────────────────────────────────────────────

  private buildAreas(): HTMLElement {
    const { wrap, body } = sectionEl('⭕ Ігрові зони (для тригерів)');
    body.appendChild(el('div', { style: 'color:#666;font-size:11px;margin-bottom:6px', textContent: 'Зони розміщуються інструментом "Область" у палітрі.' }));
    const list = el('div');
    body.appendChild(list);

    const render = () => {
      list.innerHTML = '';
      this.data.areas.forEach((a, i) => {
        const row = el('div', { style: 'display:flex;align-items:center;gap:4px;margin-bottom:2px;background:#2a1a08;padding:3px 5px;border-radius:3px' });
        row.appendChild(el('span', { style: 'color:#ffff88;font-size:10px;font-family:monospace', textContent: a.id }));
        row.appendChild(el('span', { style: 'color:#aaa;font-size:11px;flex:1;overflow:hidden', textContent: ' ' + a.label }));
        row.appendChild(btn('✕', '#5a1010', () => { this.data.areas.splice(i, 1); this.cb.onAreasChanged(); render(); }));
        list.appendChild(row);
      });
    };
    render();
    return wrap;
  }

  // ── Triggers ─────────────────────────────────────────────────────────────────

  private buildTriggers(): HTMLElement {
    const { wrap, body } = sectionEl('⚡ Тригери');
    const list = el('div');
    body.appendChild(list);

    const render = () => {
      list.innerHTML = '';
      this.data.triggers.forEach((tr, i) => {
        const row = el('div', { style: 'display:flex;align-items:center;gap:4px;margin-bottom:3px;background:#2a1a08;padding:4px 6px;border-radius:3px' });
        const info = el('div', { style: 'flex:1;overflow:hidden' });
        info.appendChild(el('div', { style: 'color:#ffd36a;font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis', textContent: tr.label }));
        info.appendChild(el('div', { style: 'color:#666;font-size:10px', textContent: `${tr.on}${tr.phase ? ' · ' + tr.phase : ''}${tr.once ? ' · once' : ''}` }));
        row.appendChild(info);
        row.appendChild(btn('Ред.', '#3a2a14', () => this.openTriggerModal(tr, render)));
        row.appendChild(btn('✕', '#5a1010', () => { this.data.triggers.splice(i, 1); render(); }));
        list.appendChild(row);
      });
    };
    render();
    body.appendChild(btn('+ Тригер', '#2a3a14', () => {
      this.data.triggers.push({ id: newId('t'), label: 'Новий тригер', on: 'timer', once: true, events: [] });
      render();
    }));
    return wrap;
  }

  private openTriggerModal(tr: EditorTrigger, onClose: () => void): void {
    const body = el('div');

    body.appendChild(rowInput('Назва (редактор)', tr.label, (v) => { tr.label = v; }));
    body.appendChild(rowInput('ID тригера', tr.id, (v) => { tr.id = v; }));

    // Event type select
    const onRow = el('div', { style: 'margin-bottom:6px;display:flex;gap:8px;align-items:center' });
    const EVENT_TYPES: TriggerEventType[] = ['state', 'timer', 'unitKilled', 'buildingDestroyed', 'buildingCompleted', 'unitTrained', 'areaEntered', 'caravanResolved', 'animalKilled'];
    onRow.appendChild(el('label', { style: 'color:#888;font-size:11px;white-space:nowrap', textContent: 'Подія:' }));
    const onSel = document.createElement('select');
    onSel.style.cssText = 'background:#2a1f10;border:1px solid #5a4020;color:#fff;padding:2px 6px;border-radius:2px;font-size:12px;flex:1';
    for (const t of EVENT_TYPES) {
      const opt = document.createElement('option');
      opt.value = t; opt.textContent = t; opt.selected = tr.on === t;
      onSel.appendChild(opt);
    }
    onSel.addEventListener('change', () => { tr.on = onSel.value as TriggerEventType; });
    onRow.appendChild(onSel);
    body.appendChild(onRow);

    body.appendChild(rowInput('Фаза (порожньо = всі)', tr.phase ?? '', (v) => { tr.phase = v || undefined; }));
    body.appendChild(rowInput('Область ID (якщо areaEntered)', tr.areaId ?? '', (v) => { tr.areaId = v || undefined; }));
    body.appendChild(rowInput('Затримка ms', String(tr.delayMs ?? ''), (v) => { tr.delayMs = parseInt(v) || undefined; }, 'number'));

    const onceRow = el('div', { style: 'display:flex;align-items:center;gap:8px;margin-bottom:6px' });
    const onceChk = el('input', { type: 'checkbox', checked: tr.once }) as HTMLInputElement;
    onceChk.addEventListener('change', () => { tr.once = onceChk.checked; });
    onceRow.appendChild(el('label', { style: 'color:#888;font-size:11px', textContent: 'Один раз (once):' }));
    onceRow.appendChild(onceChk);
    body.appendChild(onceRow);

    // Events list
    body.appendChild(el('div', { style: 'color:#ffd36a;font-size:12px;font-weight:bold;margin:10px 0 4px', textContent: 'Дії (events):' }));
    const evList = el('div');
    body.appendChild(evList);

    const EVENT_OPTS = [
      'showDialogue', 'setPhase', 'setFlag', 'setObjectiveStatus',
      'spawnUnits', 'commandGroup', 'revealArea', 'endGame',
      'showMessage', 'grantResources', 'focusCamera', 'setAtmosphere',
      'setLandmarkVisible', 'setClock', 'clearClock', 'setDayPhase'
    ];

    const renderEvents = () => {
      evList.innerHTML = '';
      tr.events.forEach((ev, i) => {
        const card = el('div', { style: 'background:#2a1a08;border:1px solid #3a2a14;border-radius:3px;padding:6px;margin-bottom:4px' });
        const head = el('div', { style: 'display:flex;align-items:center;gap:4px;margin-bottom:4px' });
        head.appendChild(el('span', { style: 'color:#ffd36a;font-size:11px;font-weight:bold', textContent: ev.type }));
        const upB = btn('↑', '#2a1f10', () => { if (i > 0) { [tr.events[i - 1], tr.events[i]] = [ev, tr.events[i - 1]]; renderEvents(); } });
        upB.style.padding = '1px 5px';
        const delB = btn('✕', '#5a1010', () => { tr.events.splice(i, 1); renderEvents(); });
        delB.style.padding = '1px 5px';
        delB.style.marginLeft = 'auto';
        head.appendChild(upB); head.appendChild(delB);
        card.appendChild(head);
        card.appendChild(buildEventEditor(ev));
        evList.appendChild(card);
      });
    };
    renderEvents();

    const addEvRow = el('div', { style: 'display:flex;gap:6px;align-items:center;margin-top:4px' });
    const evSel = document.createElement('select');
    evSel.style.cssText = 'background:#2a1f10;border:1px solid #5a4020;color:#fff;padding:2px 6px;border-radius:2px;font-size:12px;flex:1';
    for (const t of EVENT_OPTS) {
      const opt = document.createElement('option');
      opt.value = t; opt.textContent = t;
      evSel.appendChild(opt);
    }
    addEvRow.appendChild(evSel);
    addEvRow.appendChild(btn('+ Дія', '#2a3a14', () => {
      const type = evSel.value as EditorEvent['type'];
      let newEv: EditorEvent;
      if (type === 'showDialogue') newEv = { type, lines: [] };
      else if (type === 'setPhase') newEv = { type, phaseId: '' };
      else if (type === 'setFlag') newEv = { type, flag: '', value: true };
      else if (type === 'setObjectiveStatus') newEv = { type, objectiveId: '', status: 'active' };
      else if (type === 'spawnUnits') newEv = { type, groupId: '', units: [] };
      else if (type === 'commandGroup') newEv = { type, groupId: '', command: 'move', x: 0, y: 0 };
      else if (type === 'revealArea') newEv = { type, x: 0, y: 0, radiusTiles: 10 };
      else if (type === 'endGame') newEv = { type, win: true };
      else if (type === 'showMessage') newEv = { type, text: '' };
      else if (type === 'grantResources') newEv = { type, side: 'player' };
      else if (type === 'focusCamera') newEv = { type, x: 0, y: 0 };
      else if (type === 'setAtmosphere') newEv = { type, tone: 'normal' };
      else if (type === 'setLandmarkVisible') newEv = { type, id: '', visible: true };
      else if (type === 'setClock') newEv = { type, label: '', durationMs: 60000 };
      else if (type === 'clearClock') newEv = { type };
      else newEv = { type: 'setDayPhase', phase: 'day' };
      tr.events.push(newEv);
      renderEvents();
    }));
    body.appendChild(addEvRow);

    openModal(`Тригер: ${tr.label}`, body, onClose);
  }
}
