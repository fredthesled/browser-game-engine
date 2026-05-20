// ============================================================================
// games/drift/scenes/match.js
// ============================================================================
//
// DriftMatchScene — Primary gameplay scene for Drift.
//
// Layout is fully parametric: all pixel coordinates are computed from canvas
// dimensions at enter(), so the same drawing code serves both regular
// (landscape 900x600) and compact (portrait 540x900) orientations.
//
// State machine: 'traveling' | 'encounter_active'
// Win / loss transition to DriftGameOverScene via a one-frame deferred scene
// swap (_pendingScene) so the final state renders before transitioning.
//
// Crew AI is deferred. In v1 crew are static display elements; outcomes from
// encounter externals (lose_crew, gain_crew) update status immediately.
// See _redistributeCrew() stub for where the AI session's output lands.
//
// Depends on: Engine.Scene, Engine.audio, Engine.input, Engine.Narrative,
//             PauseOverlay, DRIFT_ENCOUNTER_SOURCES (encounters/sources.js)
// Registered in: scenes/_registry.md
//
// ============================================================================

// ----------------------------------------------------------------------------
// Layout builders
// All drawing code reads exclusively from the layout object returned here.
// ----------------------------------------------------------------------------

function _driftBuildLayout(canvas) {
  const W = canvas.width, H = canvas.height;
  return H > W ? _driftLayoutCompact(W, H) : _driftLayoutRegular(W, H);
}

function _driftLayoutRegular(W, H) {
  const sx = Math.floor(W * 0.63);
  return {
    isCompact:      false,
    shipPanel:      { x: 0,  y: 0, w: sx,     h: H },
    encounterPanel: { x: sx, y: 0, w: W - sx, h: H },
    ..._driftShipHorizontal(sx, H),
  };
}

function _driftLayoutCompact(W, H) {
  const sy = Math.floor(H * 0.40);
  return {
    isCompact:      true,
    shipPanel:      { x: 0, y: 0,  w: W, h: sy     },
    encounterPanel: { x: 0, y: sy, w: W, h: H - sy },
    ..._driftShipVertical(W, sy),
  };
}

// Rooms left-to-right: Helm (nose) → Engines (tail).
function _driftShipHorizontal(pw, ph) {
  const IDS    = ['helm','weapons','shields','medical','engines'];
  const LABELS = ['HELM','WEAPONS','SHIELDS','MED BAY','ENGINES'];
  const RW = 78, RH = 112, HW = 16, PAD = 12, CR = 9;
  const bw = IDS.length * RW + (IDS.length - 1) * HW + PAD * 2;
  const bh = RH + PAD * 2;
  const bx = Math.floor((pw - bw) / 2);
  const by = Math.floor(ph / 2 - bh / 2) + 8;
  const rooms = [], halls = [];
  for (let i = 0; i < IDS.length; i++) {
    const rx = bx + PAD + i * (RW + HW), ry = by + PAD;
    rooms.push({ id: IDS[i], label: LABELS[i], rect: { x: rx, y: ry, w: RW, h: RH },
      crewSlots: [{ x: rx + Math.floor(RW*.28), y: ry + Math.floor(RH*.64) },
                  { x: rx + Math.floor(RW*.72), y: ry + Math.floor(RH*.64) }] });
    if (i < IDS.length - 1)
      halls.push({ x: rx + RW, y: ry + Math.floor(RH*.28), w: HW, h: Math.floor(RH*.44) });
  }
  return { bodyRect: { x: bx, y: by, w: bw, h: bh }, rooms, hallways: halls,
    hullBar: { x: bx, y: by - 32, w: bw, h: 18 },
    sectorStrip: { x: bx, y: by + bh + 12, w: bw, h: 20 }, crewRadius: CR };
}

// Rooms top-to-bottom: Helm (nose/top) → Engines (tail/bottom).
function _driftShipVertical(pw, ph) {
  const IDS    = ['helm','weapons','shields','medical','engines'];
  const LABELS = ['HELM','WEAPONS','SHIELDS','MED BAY','ENGINES'];
  const RW = 110, RH = 50, HH = 12, PAD = 10, CR = 8;
  const bw = RW + PAD * 2;
  const bh = IDS.length * RH + (IDS.length - 1) * HH + PAD * 2;
  const bx = Math.floor((pw - bw) / 2);
  const by = Math.floor((ph - bh) / 2) + 12;
  const rooms = [], halls = [];
  for (let i = 0; i < IDS.length; i++) {
    const rx = bx + PAD, ry = by + PAD + i * (RH + HH);
    rooms.push({ id: IDS[i], label: LABELS[i], rect: { x: rx, y: ry, w: RW, h: RH },
      crewSlots: [{ x: rx + Math.floor(RW*.30), y: ry + Math.floor(RH*.62) },
                  { x: rx + Math.floor(RW*.70), y: ry + Math.floor(RH*.62) }] });
    if (i < IDS.length - 1)
      halls.push({ x: rx + Math.floor(RW*.28), y: ry + RH, w: Math.floor(RW*.44), h: HH });
  }
  return { bodyRect: { x: bx, y: by, w: bw, h: bh }, rooms, hallways: halls,
    hullBar: { x: bx, y: by - 26, w: bw, h: 16 },
    sectorStrip: { x: bx, y: by + bh + 8, w: bw, h: 16 }, crewRadius: CR };
}

// ----------------------------------------------------------------------------
// DriftMatchScene
// ----------------------------------------------------------------------------

class DriftMatchScene extends Engine.Scene {
  constructor(game) {
    super();
    this._game   = game;
    this._layout = null;
    this._pause  = null;

    this._hull       = 10;
    this._maxHull    = 10;
    this._totalSectors     = 5;
    this._sectorsCompleted = 0;

    // Crew: one per room except Medical Bay starts empty.
    this._crew = [
      { id: 0, color: '#e05858', roomId: 'helm',    status: 'active' },
      { id: 1, color: '#50d878', roomId: 'weapons', status: 'active' },
      { id: 2, color: '#5090e0', roomId: 'shields', status: 'active' },
      { id: 3, color: '#e0c050', roomId: 'engines', status: 'active' },
    ];

    this._matchState     = 'traveling';
    this._travelTimer    = 0;
    this._travelDuration = 5;

    // Encounter state
    this._narrative      = null;
    this._encLines       = [];
    this._encChoices     = [];
    this._encPhase       = null; // 'reading' | 'choosing' | 'done'
    this._encOutcomes    = [];
    this._encLabel       = '';
    this._choicePrevLeft = false;
    this._choiceHoverIdx = -1;
    this._continueHover  = false;

    this._pendingScene = null;
  }

  enter() {
    this._layout = _driftBuildLayout(this._game.canvas);
    this._pause  = new PauseOverlay(this._game, {
      onQuit: () => this._game.setScene(new DriftMenuScene(this._game)),
    });
    Engine.audio.register('blip',     'blipSelect');
    Engine.audio.register('confirm',  'powerUp');
    Engine.audio.register('damage',   'hitHurt');
    Engine.audio.register('alert',    'laserShoot');
    Engine.audio.register('progress', 'pickupCoin');
  }

  exit() { this._narrative = null; }

  // --------------------------------------------------------------------------
  // Update
  // --------------------------------------------------------------------------

  update(dt) {
    super.update(dt);
    this._pause.update(dt);
    if (this._pause.isPaused()) return;
    if (this._pendingScene) {
      const next = this._pendingScene;
      this._pendingScene = null;
      this._game.setScene(next);
      return;
    }
    if (this._matchState === 'traveling')        this._updateTravel(dt);
    else if (this._matchState === 'encounter_active') this._updateEncounter();
  }

  _updateTravel(dt) {
    this._travelTimer += dt;
    if (this._travelTimer >= this._travelDuration) {
      this._travelTimer = 0;
      this._startEncounter(this._sectorsCompleted);
    }
  }

  // --------------------------------------------------------------------------
  // Encounter lifecycle
  // --------------------------------------------------------------------------

  _startEncounter(idx) {
    const enc = DRIFT_ENCOUNTER_SOURCES[idx];
    if (!enc) return;
    Engine.audio.play('alert');

    this._encLabel    = enc.label;
    this._encLines    = [];
    this._encChoices  = [];
    this._encPhase    = 'reading';
    this._encOutcomes = [];

    this._narrative = new Engine.Narrative(enc.source);

    // Bind all four externals defensively regardless of what this story declares.
    this._narrative.bindExternal('damage_hull', (n) => {
      this._encOutcomes.push({ type: 'damage_hull', amount: n });
    });
    this._narrative.bindExternal('heal_hull', (n) => {
      this._encOutcomes.push({ type: 'heal_hull', amount: n });
    });
    this._narrative.bindExternal('lose_crew', (room) => {
      this._encOutcomes.push({ type: 'lose_crew', roomName: room });
    });
    this._narrative.bindExternal('gain_crew', () => {
      this._encOutcomes.push({ type: 'gain_crew' });
    });

    this._narrative.setVar('crew_in_helm',    this._crewCountIn('helm'));
    this._narrative.setVar('crew_in_weapons', this._crewCountIn('weapons'));
    this._narrative.setVar('crew_in_shields', this._crewCountIn('shields'));
    this._narrative.setVar('crew_in_medical', this._crewCountIn('medical'));
    this._narrative.setVar('crew_in_engines', this._crewCountIn('engines'));
    this._narrative.setVar('hull',            this._hull);
    this._narrative.setVar('crew_total',      this._activeCrewCount());

    this._matchState = 'encounter_active';
    this._advanceNarrative();
  }

  _advanceNarrative() {
    if (!this._narrative) return;
    const lines = this._narrative.continue();
    for (const l of lines) {
      const t = (l.text || '').trim();
      if (t) this._encLines.push(t);
    }
    const choices = this._narrative.getChoices();
    if (choices.length > 0) {
      this._encChoices = choices;
      this._encPhase   = 'choosing';
    } else if (this._narrative.hasEnded) {
      this._encChoices = [];
      this._encPhase   = 'done';
    } else {
      // Ink has more content without a choice gate — continue automatically.
      this._advanceNarrative();
    }
  }

  _resolveEncounter() {
    let tookDamage = false;
    for (const o of this._encOutcomes) {
      if (o.type === 'damage_hull') {
        this._hull = Math.max(0, this._hull - o.amount);
        tookDamage = true;
      } else if (o.type === 'heal_hull') {
        this._hull = Math.min(this._maxHull, this._hull + o.amount);
      } else if (o.type === 'lose_crew') {
        this._loseCrewInRoom(o.roomName);
      } else if (o.type === 'gain_crew') {
        this._gainCrew();
      }
    }
    if (tookDamage) Engine.audio.play('damage');

    this._sectorsCompleted++;
    this._narrative   = null;
    this._encOutcomes = [];

    // ---- CREW AI STUB -------------------------------------------------------
    // Replace with the crew-autonomy AI session's output when implemented.
    // Should inspect room assignments and move crew to critical vacancies.
    // this._redistributeCrew();
    // ---- END STUB -----------------------------------------------------------

    if (this._hull <= 0) {
      this._pendingScene = new DriftGameOverScene(
        this._game, 'loss_hull', this._hull, this._activeCrewCount());
      this._matchState = 'traveling';
      return;
    }
    if (this._activeCrewCount() <= 0) {
      this._pendingScene = new DriftGameOverScene(
        this._game, 'loss_crew', this._hull, 0);
      this._matchState = 'traveling';
      return;
    }
    if (this._sectorsCompleted >= this._totalSectors) {
      Engine.audio.play('progress');
      this._pendingScene = new DriftGameOverScene(
        this._game, 'win', this._hull, this._activeCrewCount());
      this._matchState = 'traveling';
      return;
    }
    Engine.audio.play('progress');
    this._matchState = 'traveling';
  }

  // --------------------------------------------------------------------------
  // Encounter input
  // --------------------------------------------------------------------------

  _updateEncounter() {
    const m    = Engine.input.mouse;
    const ep   = this._layout.encounterPanel;
    const left = m.left;

    if (this._encPhase === 'choosing') {
      const rects    = this._choiceButtonRects(ep);
      let newHoverIdx = -1;
      for (let i = 0; i < rects.length; i++) {
        const br  = rects[i];
        const hit = m.x >= br.x && m.x <= br.x + br.w &&
                    m.y >= br.y && m.y <= br.y + br.h;
        if (hit) {
          newHoverIdx = i;
          if (left && !this._choicePrevLeft) {
            Engine.audio.play('confirm');
            this._narrative.choose(this._encChoices[i].index);
            this._encChoices = []; this._encPhase = 'reading';
            this._choiceHoverIdx = -1;
            this._advanceNarrative();
            this._choicePrevLeft = left;
            return;
          }
        }
      }
      if (newHoverIdx !== this._choiceHoverIdx) {
        if (newHoverIdx >= 0) Engine.audio.play('blip');
        this._choiceHoverIdx = newHoverIdx;
      }

    } else if (this._encPhase === 'done') {
      const br  = this._continueButtonRect(ep);
      const hit = m.x >= br.x && m.x <= br.x + br.w &&
                  m.y >= br.y && m.y <= br.y + br.h;
      if (hit && !this._continueHover) Engine.audio.play('blip');
      this._continueHover = hit;
      if (hit && left && !this._choicePrevLeft) {
        Engine.audio.play('confirm');
        this._resolveEncounter();
      }
    }
    this._choicePrevLeft = left;
  }

  // --------------------------------------------------------------------------
  // Crew helpers
  // --------------------------------------------------------------------------

  _crewCountIn(roomId) {
    return this._crew.filter(c => c.status === 'active' && c.roomId === roomId).length;
  }

  _activeCrewCount() {
    return this._crew.filter(c => c.status === 'active').length;
  }

  // Incapacitates one active crew member in roomName, falling back to the
  // nearest occupied room if that room is empty.
  _loseCrewInRoom(roomName) {
    let t = this._crew.find(c => c.status === 'active' && c.roomId === roomName);
    if (!t) {
      for (const id of ['weapons','shields','helm','engines','medical']) {
        t = this._crew.find(c => c.status === 'active' && c.roomId === id);
        if (t) break;
      }
    }
    if (t) t.status = 'incapacitated';
  }

  // Adds a crew member to Medical Bay, capped at 8 total.
  _gainCrew() {
    if (this._crew.length >= 8) return;
    const EXTRA = ['#e058a0','#a050e0','#50d0d0','#d08050'];
    this._crew.push({
      id: this._crew.length,
      color: EXTRA[(this._crew.length - 4) % EXTRA.length],
      roomId: 'medical', status: 'active',
    });
  }

  // --------------------------------------------------------------------------
  // Draw
  // --------------------------------------------------------------------------

  draw(ctx) {
    ctx.fillStyle = '#08080f';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    this._drawShipPanel(ctx);
    this._drawEncounterPanel(ctx);
    this._drawPanelDivider(ctx);
    this._pause.draw(ctx);
    super.draw(ctx);
  }

  _drawPanelDivider(ctx) {
    const ep = this._layout.encounterPanel;
    ctx.strokeStyle = '#1e1e38'; ctx.lineWidth = 1;
    ctx.beginPath();
    if (this._layout.isCompact) {
      ctx.moveTo(0, ep.y + 0.5); ctx.lineTo(ctx.canvas.width, ep.y + 0.5);
    } else {
      ctx.moveTo(ep.x + 0.5, 0); ctx.lineTo(ep.x + 0.5, ctx.canvas.height);
    }
    ctx.stroke();
  }

  _drawShipPanel(ctx) {
    const layout = this._layout;
    this._drawHullBar(ctx, layout);
    this._drawShipBody(ctx, layout);
    this._drawSectorStrip(ctx, layout);
    if (this._matchState === 'encounter_active') {
      const sp = layout.shipPanel;
      ctx.fillStyle = 'rgba(0,0,8,0.38)';
      ctx.fillRect(sp.x, sp.y, sp.w, sp.h);
    }
  }

  _drawHullBar(ctx, layout) {
    const bar   = layout.hullBar;
    const COUNT = this._maxHull;
    const lblW  = Math.floor(bar.w * 0.10);
    const fs    = Math.max(8, Math.floor(bar.h * 0.70));
    ctx.font = `${fs}px monospace`;
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#383858';
    ctx.fillText('HULL', bar.x, bar.y + bar.h / 2);
    const px0  = bar.x + lblW;
    const avail = bar.w - lblW;
    const GAP  = 2;
    const pw   = Math.floor((avail - GAP * (COUNT - 1)) / COUNT);
    const ratio = this._hull / this._maxHull;
    for (let i = 0; i < COUNT; i++) {
      const filled = i < this._hull;
      ctx.fillStyle = !filled ? '#151525'
        : ratio > 0.6 ? '#40d060'
        : ratio > 0.3 ? '#d0b040'
        : '#d04040';
      ctx.fillRect(px0 + i * (pw + GAP), bar.y, pw, bar.h);
    }
  }

  _drawShipBody(ctx, layout) {
    const body = layout.bodyRect;
    ctx.fillStyle = '#10102a';
    ctx.fillRect(body.x, body.y, body.w, body.h);
    ctx.strokeStyle = '#252550'; ctx.lineWidth = 1;
    ctx.strokeRect(body.x + .5, body.y + .5, body.w - 1, body.h - 1);

    for (const hall of layout.hallways) {
      ctx.fillStyle = '#0c0c20';
      ctx.fillRect(hall.x, hall.y, hall.w, hall.h);
      ctx.strokeStyle = '#202045'; ctx.lineWidth = 1;
      ctx.strokeRect(hall.x + .5, hall.y + .5, hall.w - 1, hall.h - 1);
    }

    for (const room of layout.rooms) {
      const r = room.rect;
      ctx.fillStyle = '#0d0d22';
      ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.strokeStyle = '#2a2a58'; ctx.lineWidth = 1;
      ctx.strokeRect(r.x + .5, r.y + .5, r.w - 1, r.h - 1);
      const fs = Math.max(7, Math.floor(r.h * 0.13));
      ctx.fillStyle = '#404068'; ctx.font = `${fs}px monospace`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      ctx.fillText(room.label, r.x + r.w / 2, r.y + Math.floor(r.h * 0.09));
    }
    this._drawCrew(ctx, layout);
  }

  _drawCrew(ctx, layout) {
    const R       = layout.crewRadius;
    const roomMap = Object.fromEntries(layout.rooms.map(r => [r.id, r]));
    const placed  = Object.fromEntries(layout.rooms.map(r => [r.id, 0]));
    for (const crew of this._crew) {
      if (crew.status !== 'active') continue;
      const room = roomMap[crew.roomId];
      if (!room) continue;
      const slot = room.crewSlots[placed[crew.roomId]++ % room.crewSlots.length];
      ctx.beginPath();
      ctx.arc(slot.x, slot.y, R, 0, Math.PI * 2);
      ctx.fillStyle = crew.color; ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 1; ctx.stroke();
    }
  }

  _drawSectorStrip(ctx, layout) {
    const strip = layout.sectorStrip;
    const fs    = Math.max(8, Math.floor(strip.h * 0.75));
    ctx.font = `${fs}px monospace`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const mx = strip.x + strip.w / 2, my = strip.y + strip.h / 2;
    if (this._matchState === 'traveling') {
      const prog = Math.min(1, this._travelTimer / this._travelDuration);
      ctx.fillStyle = '#101025'; ctx.fillRect(strip.x, strip.y, strip.w, strip.h);
      ctx.fillStyle = '#1a1a3a'; ctx.fillRect(strip.x, strip.y, Math.floor(strip.w * prog), strip.h);
      ctx.fillStyle = '#383858';
      ctx.fillText(`SECTOR ${this._sectorsCompleted + 1} OF ${this._totalSectors}  \u00b7  TRANSIT`, mx, my);
    } else {
      ctx.fillStyle = '#180d2a'; ctx.fillRect(strip.x, strip.y, strip.w, strip.h);
      ctx.fillStyle = '#583878';
      ctx.fillText(`SECTOR ${this._sectorsCompleted + 1} OF ${this._totalSectors}  \u00b7  ENCOUNTER`, mx, my);
    }
  }

  // --------------------------------------------------------------------------
  // Encounter panel
  // --------------------------------------------------------------------------

  _drawEncounterPanel(ctx) {
    const ep = this._layout.encounterPanel;
    ctx.fillStyle = '#090915';
    ctx.fillRect(ep.x, ep.y, ep.w, ep.h);
    if (this._matchState === 'traveling') this._drawTravelStatus(ctx, ep);
    else                                   this._drawEncounterContent(ctx, ep);
  }

  _drawTravelStatus(ctx, ep) {
    const cx = ep.x + ep.w / 2, cy = ep.y + ep.h / 2;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `${Math.max(10, Math.floor(ep.h * 0.055))}px monospace`;
    ctx.fillStyle = '#282848';
    ctx.fillText(`SECTOR ${this._sectorsCompleted + 1} OF ${this._totalSectors}`, cx, cy - ep.h * 0.07);
    ctx.font = `${Math.max(9, Math.floor(ep.h * 0.038))}px monospace`;
    ctx.fillStyle = '#1e1e38';
    ctx.fillText('TRANSIT  \u00b7  SYSTEMS NOMINAL', cx, cy + ep.h * 0.04);
    const prog = Math.min(1, this._travelTimer / this._travelDuration);
    const N = 5, DR = 3, DG = 14;
    const sx = cx - ((N - 1) * DG) / 2, dy = cy + ep.h * 0.14;
    for (let i = 0; i < N; i++) {
      ctx.beginPath();
      ctx.arc(sx + i * DG, dy, DR, 0, Math.PI * 2);
      ctx.fillStyle = i < Math.floor(prog * N) ? '#383870' : '#141428';
      ctx.fill();
    }
  }

  _drawEncounterContent(ctx, ep) {
    const PAD   = Math.max(10, Math.floor(ep.w * 0.07));
    const textX = ep.x + PAD;
    const textW = ep.w - PAD * 2;

    // Label
    const lfs = Math.max(9, Math.floor(ep.h * 0.040));
    ctx.font = `${lfs}px monospace`;
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillStyle = '#505078';
    ctx.fillText(this._encLabel.toUpperCase(), textX, ep.y + PAD);

    // Separator
    const sepY = ep.y + PAD + lfs + 6;
    ctx.strokeStyle = '#1c1c38'; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(ep.x + PAD, sepY); ctx.lineTo(ep.x + ep.w - PAD, sepY);
    ctx.stroke();

    // Narrative text
    const textTop  = sepY + 8;
    const textBot  = ep.y + ep.h - this._bottomReserve(ep);
    const linefs   = Math.max(9, Math.floor(ep.h * 0.034));
    const lineH    = Math.floor(linefs * 1.60);
    const maxLines = Math.floor((textBot - textTop) / lineH);
    ctx.font = `${linefs}px monospace`;
    ctx.fillStyle = '#9898b8';
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';

    const allWrapped = [];
    for (const raw of this._encLines)
      for (const wl of this._wrapLine(raw, textW, ctx)) allWrapped.push(wl);
    const visible = allWrapped.slice(-maxLines);
    for (let i = 0; i < visible.length; i++)
      ctx.fillText(visible[i], textX, textTop + i * lineH);

    if (this._encPhase === 'choosing') this._drawChoiceButtons(ctx, ep);
    else if (this._encPhase === 'done') this._drawContinueButton(ctx, ep);
  }

  _bottomReserve(ep) { return Math.max(72, Math.floor(ep.h * 0.28)); }

  _choiceButtonRects(ep) {
    const n = this._encChoices.length;
    if (!n) return [];
    const reserve = this._bottomReserve(ep);
    const PAD     = Math.max(8, Math.floor(ep.w * 0.07));
    const top     = ep.y + ep.h - reserve + 6;
    const bw      = ep.w - PAD * 2;
    const bh      = Math.max(26, Math.floor((reserve - 12) / n) - 4);
    return this._encChoices.map((_, i) => ({
      x: ep.x + PAD, y: top + i * (bh + 4), w: bw, h: bh,
    }));
  }

  _continueButtonRect(ep) {
    const reserve = this._bottomReserve(ep);
    const PAD     = Math.max(8, Math.floor(ep.w * 0.07));
    const bw      = ep.w - PAD * 2;
    const bh      = Math.max(26, Math.floor(reserve * 0.44));
    const top     = ep.y + ep.h - reserve + Math.floor((reserve - bh) / 2);
    return { x: ep.x + PAD, y: top, w: bw, h: bh };
  }

  _drawChoiceButtons(ctx, ep) {
    const rects = this._choiceButtonRects(ep);
    const fs    = Math.max(9, Math.floor(ep.h * 0.032));
    ctx.font = `${fs}px monospace`;
    for (let i = 0; i < rects.length; i++) {
      const br    = rects[i];
      const hover = this._choiceHoverIdx === i;
      ctx.fillStyle = hover ? '#1e1e60' : '#0e0e38';
      ctx.fillRect(br.x, br.y, br.w, br.h);
      ctx.strokeStyle = hover ? '#5858c0' : '#282858'; ctx.lineWidth = 1;
      ctx.strokeRect(br.x + .5, br.y + .5, br.w - 1, br.h - 1);
      ctx.fillStyle = hover ? '#c8d0ff' : '#707090';
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      const label = this._encChoices[i] ? this._encChoices[i].text : '';
      ctx.fillText(label, br.x + 8, br.y + br.h / 2);
    }
  }

  _drawContinueButton(ctx, ep) {
    const br    = this._continueButtonRect(ep);
    const hover = this._continueHover;
    ctx.fillStyle = hover ? '#282870' : '#14143a';
    ctx.fillRect(br.x, br.y, br.w, br.h);
    ctx.strokeStyle = hover ? '#8080d0' : '#383870'; ctx.lineWidth = 1;
    ctx.strokeRect(br.x + .5, br.y + .5, br.w - 1, br.h - 1);
    const fs = Math.max(9, Math.floor(ep.h * 0.036));
    ctx.font = `${fs}px monospace`;
    ctx.fillStyle = hover ? '#e0e8ff' : '#8888b8';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('[ CONTINUE ]', br.x + br.w / 2, br.y + br.h / 2);
  }

  // Simple word-wrap. Splits text into lines not exceeding maxW pixels.
  // Font must be set on ctx before calling (used for measureText).
  _wrapLine(text, maxW, ctx) {
    const words = text.split(' ');
    const lines = [];
    let cur = '';
    for (const w of words) {
      const test = cur ? `${cur} ${w}` : w;
      if (ctx.measureText(test).width > maxW && cur) { lines.push(cur); cur = w; }
      else cur = test;
    }
    if (cur) lines.push(cur);
    return lines.length ? lines : [''];
  }
}
