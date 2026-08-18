import { describe, expect, it } from 'vitest';
import { BattleEngine } from '../combat';
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
});
