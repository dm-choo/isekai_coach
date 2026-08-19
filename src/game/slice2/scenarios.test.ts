import { describe, expect, it } from 'vitest';
import { BattleEngine, moveAction, slamAction } from '../combat';
import { DEFAULT_SLICE_POLICY, evaluatePolicy, type SlicePolicyId } from '../slice';
import { createEncounterSpec, createSlice2BossScenario, createSlice2EncounterScenario } from './scenarios';

describe('Slice 2 goblin encounters', () => {
  it('keeps evade-first and shoot-first as a real safety-versus-damage tradeoff', () => {
    const base = createSlice2EncounterScenario('policy-tradeoff', 'GOBLIN_ARCHER', { administratorHp: 14, allyHp: 12 });
    const scenario = {
      ...base,
      units: base.units.map((unit) => {
        if (unit.id === 'administrator-slice2') return { ...unit, position: { x: 3, y: 0 } };
        if (unit.id === 'archer-companion-slice2') return { ...unit, position: { x: 1, y: 1 } };
        if (unit.id === 'goblin-archer') return { ...unit, position: { x: 5, y: 1 } };
        return unit;
      }),
    };

    const resolveWith = (policy: readonly SlicePolicyId[]) => {
      const engine = new BattleEngine(scenario);
      engine.beginTurn();
      const decision = evaluatePolicy(engine.state, 'archer-companion-slice2', policy);
      expect(decision.selected?.action).toBeDefined();
      engine.performStudentAction(decision.selected!.action!);
      engine.resolveEnemyIntents();
      return {
        selected: decision.selected?.policyId,
        allyHp: engine.state.units.find((unit) => unit.id === 'archer-companion-slice2')?.hp,
        enemyHp: engine.state.units.find((unit) => unit.id === 'goblin-archer')?.hp,
      };
    };

    const safe = resolveWith(DEFAULT_SLICE_POLICY);
    const aggressive = resolveWith(['SHOOT', 'EVADE', 'POSITION', 'PUSH', 'EMPTY']);
    expect(safe).toEqual({ selected: 'EVADE', allyHp: 12, enemyHp: 2 });
    expect(aggressive).toEqual({ selected: 'SHOOT', allyHp: 11, enemyHp: 1 });
  });

  it('locks long shot, fast advance and ground bomb as distinct intents', () => {
    const engine = new BattleEngine(createSlice2EncounterScenario(
      'trio-test',
      'GOBLIN_TRIO',
      { administratorHp: 14, allyHp: 12 },
    ));
    engine.beginTurn();
    const intents = engine.getState().intents;

    expect(intents.find((intent) => intent.sourceId === 'goblin-archer')).toMatchObject({
      action: { targetId: 'archer-companion-slice2' },
      movementPath: [{ x: 10, y: 2 }],
    });
    expect(intents.find((intent) => intent.sourceId === 'goblin-archer')?.effectCells.length).toBeGreaterThanOrEqual(8);
    expect(intents.find((intent) => intent.sourceId === 'goblin-warrior')?.movementPath).toHaveLength(4);
    expect(intents.find((intent) => intent.sourceId === 'goblin-bomber')?.anchor).toBe('GROUND');
  });

  it('repositions a goblin archer toward the ranged ally before resolving its shot', () => {
    const base = createSlice2EncounterScenario('archer-position', 'GOBLIN_ARCHER', { administratorHp: 14, allyHp: 12 });
    const scenario = {
      ...base,
      units: base.units.map((unit) => unit.id === 'archer-companion-slice2'
        ? { ...unit, position: { x: 1, y: 0 } }
        : unit),
    };
    const engine = new BattleEngine(scenario);
    engine.beginTurn();

    expect(engine.state.intents[0]).toMatchObject({
      sourceId: 'goblin-archer',
      movementPath: [{ x: 10, y: 0 }],
      plannedMovementPath: [{ x: 10, y: 0 }],
      action: { targetId: 'archer-companion-slice2' },
    });
    engine.resolveEnemyIntents();
    const archerEvents = engine.events.filter((event) =>
      (event.type === 'UNIT_MOVED' && event.unitId === 'goblin-archer') ||
      (event.type === 'ABILITY_USED' && event.sourceId === 'goblin-archer'));
    expect(archerEvents.map((event) => event.type)).toEqual(['UNIT_MOVED', 'ABILITY_USED']);
    expect(engine.state.units.find((unit) => unit.id === 'goblin-archer')?.position).toEqual({ x: 10, y: 0 });
    expect(engine.state.units.find((unit) => unit.id === 'archer-companion-slice2')?.hp).toBe(11);
  });

  it('turns a melee pursuer around and reacquires targets after passing to their left', () => {
    const base = createSlice2EncounterScenario('turn-around', 'GOBLIN_WARRIOR', { administratorHp: 14, allyHp: 12 });
    const scenario = {
      ...base,
      units: base.units.map((unit) => unit.id === 'goblin-warrior'
        ? { ...unit, position: { x: 0, y: 1 }, facing: 'LEFT' as const }
        : unit),
    };
    const engine = new BattleEngine(scenario);
    engine.beginTurn();

    expect(engine.state.intents[0]).toMatchObject({ direction: 'RIGHT', action: { targetId: 'administrator-slice2' } });
    engine.resolveEnemyIntents();
    expect(engine.state.units.find((unit) => unit.id === 'goblin-warrior')).toMatchObject({ facing: 'RIGHT' });
    expect(engine.state.units.find((unit) => unit.id === 'administrator-slice2')?.hp).toBe(12);
  });

  it('updates student facing from movement and alternates bomber ground targets by turn', () => {
    const engine = new BattleEngine(createSlice2EncounterScenario('adaptive-bomb', 'GOBLIN_BOMBER', { administratorHp: 14, allyHp: 12 }));
    engine.beginTurn();
    const firstOrigin = engine.state.intents[0]?.origin;
    expect(engine.performStudentAction(moveAction('administrator-slice2', { x: 2, y: 1 })).executable).toBe(true);
    expect(engine.state.units.find((unit) => unit.id === 'administrator-slice2')?.facing).toBe('LEFT');
    engine.resolveEnemyIntents();
    engine.beginTurn();
    const secondOrigin = engine.state.intents[0]?.origin;
    expect(secondOrigin).not.toEqual(firstOrigin);
  });

  it('faces a student toward the selected target before using an ability', () => {
    const base = createSlice2EncounterScenario('student-facing', 'GOBLIN_BOMBER', { administratorHp: 14, allyHp: 12 });
    const scenario = {
      ...base,
      units: base.units.map((unit) => unit.id === 'goblin-bomber'
        ? { ...unit, position: { x: 4, y: 1 } }
        : unit),
    };
    const engine = new BattleEngine(scenario);
    engine.beginTurn();
    expect(engine.performStudentAction(slamAction('administrator-slice2', 'goblin-bomber', 'RIGHT')).executable).toBe(true);
    expect(engine.state.units.find((unit) => unit.id === 'administrator-slice2')?.facing).toBe('RIGHT');
  });

  it('uses the shared AP grammar and gives the melee goblin three HP', () => {
    const scenario = createSlice2EncounterScenario(
      'balance-test',
      'GOBLIN_WARRIOR',
      { administratorHp: 14, allyHp: 12 },
    );

    expect(scenario.units.find((unit) => unit.id === 'administrator-slice2')).toMatchObject({ maxAp: 3 });
    expect(scenario.units.find((unit) => unit.id === 'goblin-warrior')).toMatchObject({ hp: 3, maxHp: 3 });
  });

  it('carries expedition vitals into the existing barrier-guardian finale', () => {
    const scenario = createSlice2BossScenario({ administratorHp: 4, allyHp: 7 });
    expect(scenario).toMatchObject({ id: 'slice2:barrier-guardian-finale', name: '고블린 봉쇄선 / 결계 수호자' });
    expect(scenario.units.find((unit) => unit.id === 'administrator-slice2')).toMatchObject({ hp: 4, maxHp: 14, maxAp: 3 });
    expect(scenario.units.find((unit) => unit.id === 'archer-companion-slice2')).toMatchObject({ hp: 7, maxHp: 12, maxAp: 3 });
    expect(scenario.units.find((unit) => unit.id === 'barrier-guardian-01')).toMatchObject({ hp: 15, rank: 'BOSS' });
  });

  it('authors distinct three-enemy formations and adds a patrol only to small late encounters', () => {
    const rush = createSlice2EncounterScenario('rush', 'GOBLIN_RUSH_SQUAD', { administratorHp: 14, allyHp: 12 });
    const bombardment = createSlice2EncounterScenario('bomb', 'GOBLIN_BOMBARDMENT', { administratorHp: 14, allyHp: 12 });
    expect(rush.units.filter((unit) => unit.faction === 'ENEMY')).toHaveLength(3);
    expect(bombardment.units.filter((unit) => unit.faction === 'ENEMY')).toHaveLength(3);
    expect(new Set(rush.units.map((unit) => unit.id)).size).toBe(rush.units.length);

    const early = createSlice2EncounterScenario('early', 'GOBLIN_ARCHER', { administratorHp: 14, allyHp: 12 }, { worldMinute: 689 });
    const late = createSlice2EncounterScenario('late', 'GOBLIN_ARCHER', { administratorHp: 14, allyHp: 12 }, { worldMinute: 690 });
    expect(early.units.filter((unit) => unit.faction === 'ENEMY')).toHaveLength(1);
    expect(late.units.filter((unit) => unit.faction === 'ENEMY')).toHaveLength(2);

    const fireline = createSlice2EncounterScenario('fireline', 'GOBLIN_FIRELINE', { administratorHp: 14, allyHp: 12 });
    const trio = createSlice2EncounterScenario('trio', 'GOBLIN_TRIO', { administratorHp: 14, allyHp: 12 });
    for (const scenario of [rush, bombardment, fireline, trio, late]) {
      const engine = new BattleEngine(scenario);
      engine.beginTurn();
      expect(engine.state.intents).toHaveLength(scenario.units.filter((unit) => unit.faction === 'ENEMY').length);
    }
  });

  it('derives stable live encounter formation and strength variants from the encounter id', () => {
    const ids = Array.from({ length: 12 }, (_, index) => `tile-${index + 1}:generation-0:room-center`);
    const specs = ids.map(createEncounterSpec);
    expect(new Set(specs.map((spec) => spec.formation)).size).toBeGreaterThan(1);
    expect(new Set(specs.map((spec) => spec.strength))).toEqual(new Set(['NORMAL', 'VETERAN']));
    expect(createEncounterSpec(ids[0])).toEqual(createEncounterSpec(ids[0]));

    const scenarios = ids.map((id) => createSlice2EncounterScenario(id, 'GOBLIN_TRIO', { administratorHp: 14, allyHp: 12 }));
    expect(new Set(scenarios.map((scenario) => JSON.stringify(scenario.units.filter((unit) => unit.faction === 'ENEMY').map((unit) => unit.position)))).size).toBeGreaterThan(1);
    expect(scenarios.some((scenario) => scenario.units.some((unit) => unit.rank === 'ELITE'))).toBe(true);
  });

  it('shortens advance preview and moves the enemy shadow when the player blocks its path', () => {
    const engine = new BattleEngine(createSlice2EncounterScenario(
      'blocked-preview-test',
      'GOBLIN_WARRIOR',
      { administratorHp: 14, allyHp: 12 },
    ));
    engine.beginTurn();

    expect(engine.state.intents[0]).toMatchObject({
      movementPath: [{ x: 7, y: 2 }, { x: 6, y: 2 }, { x: 5, y: 2 }, { x: 4, y: 2 }],
      effectCells: [{ x: 3, y: 2 }],
    });

    const moved = engine.performStudentAction(moveAction('administrator-slice2', { x: 3, y: 2 }));
    expect(moved.executable).toBe(true);
    expect(engine.state.intents[0]).toMatchObject({
      movementPath: [{ x: 7, y: 2 }, { x: 6, y: 2 }, { x: 5, y: 2 }, { x: 4, y: 2 }],
      effectCells: [{ x: 3, y: 2 }],
    });

    const blocked = engine.performStudentAction(moveAction('administrator-slice2', { x: 4, y: 2 }));
    expect(blocked.executable).toBe(true);
    expect(engine.state.intents[0]).toMatchObject({
      movementPath: [{ x: 7, y: 2 }, { x: 6, y: 2 }, { x: 5, y: 2 }],
      effectCells: [{ x: 4, y: 2 }],
    });

    const resolution = engine.preview((branch) => branch.resolveEnemyIntents());
    expect(resolution.state.units.find((unit) => unit.id === 'goblin-warrior')?.position).toEqual({ x: 5, y: 2 });
    expect(resolution.state.units.find((unit) => unit.id === 'administrator-slice2')?.hp).toBe(12);
    expect(engine.state.units.find((unit) => unit.id === 'goblin-warrior')?.position).toEqual({ x: 8, y: 2 });
  });
});
