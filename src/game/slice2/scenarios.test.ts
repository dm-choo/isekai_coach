import { describe, expect, it } from 'vitest';
import { BattleEngine, moveAction } from '../combat';
import { createEncounterSpec, createSlice2EncounterScenario } from './scenarios';

describe('Slice 2 goblin encounters', () => {
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
    expect(engine.state.units.find((unit) => unit.id === 'goblin-archer')?.position).toEqual({ x: 10, y: 0 });
    expect(engine.state.units.find((unit) => unit.id === 'archer-companion-slice2')?.hp).toBe(11);
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
