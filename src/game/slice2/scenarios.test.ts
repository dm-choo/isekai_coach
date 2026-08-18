import { describe, expect, it } from 'vitest';
import { BattleEngine, moveAction } from '../combat';
import { createSlice2EncounterScenario } from './scenarios';

describe('Slice 2 goblin encounters', () => {
  it('locks long shot, fast advance and ground bomb as distinct intents', () => {
    const engine = new BattleEngine(createSlice2EncounterScenario(
      'trio-test',
      'GOBLIN_TRIO',
      { administratorHp: 14, allyHp: 12 },
    ));
    engine.beginTurn();
    const intents = engine.getState().intents;

    expect(intents.find((intent) => intent.sourceId === 'goblin-archer')?.effectCells.length).toBeGreaterThanOrEqual(8);
    expect(intents.find((intent) => intent.sourceId === 'goblin-warrior')?.movementPath).toHaveLength(4);
    expect(intents.find((intent) => intent.sourceId === 'goblin-bomber')?.anchor).toBe('GROUND');
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
