import { describe, expect, it } from 'vitest';
import { SLICE2_ADMINISTRATOR_ID, SLICE2_ALLY_ID } from '../slice2';
import { createSubmissionJointScenario, createSubmissionSoloScenario, SUBMISSION_VISUAL_KEYS } from './scenarios';

const VITALS = { administratorHp: 14, allyHp: 12 } as const;

describe('submission encounter authorship', () => {
  it('keeps the prologue battle authoritative and solo', () => {
    const scenario = createSubmissionSoloScenario(VITALS, 600);
    expect(scenario.units.filter((unit) => unit.faction === 'STUDENT')).toEqual([
      expect.objectContaining({ id: SLICE2_ADMINISTRATOR_ID, visualKey: SUBMISSION_VISUAL_KEYS.administrator }),
    ]);
    expect(scenario.units.some((unit) => unit.id === SLICE2_ALLY_ID)).toBe(false);
    expect(scenario.units.filter((unit) => unit.faction === 'ENEMY')).toEqual([
      expect.objectContaining({ hp: 2, maxHp: 2, visualKey: SUBMISSION_VISUAL_KEYS.goblinWarrior }),
    ]);
  });

  it('uses only purpose-built submission visuals after the companion joins', () => {
    const scenario = createSubmissionJointScenario('first-warrior', 'GOBLIN_ARCHER_WARRIOR', VITALS, 610);
    expect(scenario.units.find((unit) => unit.id === SLICE2_ADMINISTRATOR_ID)?.visualKey).toBe(SUBMISSION_VISUAL_KEYS.administrator);
    expect(scenario.units.find((unit) => unit.id === SLICE2_ALLY_ID)?.visualKey).toBe(SUBMISSION_VISUAL_KEYS.archer);
    expect(scenario.units.filter((unit) => unit.faction === 'ENEMY').map((unit) => unit.visualKey)).toEqual([
      SUBMISSION_VISUAL_KEYS.goblinArcher,
      SUBMISSION_VISUAL_KEYS.goblinWarrior,
    ]);
  });

  it('keeps the two second-frontier center rooms authored and immune to late patrol drift', () => {
    const eastEarly = createSubmissionJointScenario('SECOND_EAST_CENTER', 'GOBLIN_ARCHER_WARRIOR', VITALS, 668);
    const eastLate = createSubmissionJointScenario('SECOND_EAST_CENTER', 'GOBLIN_ARCHER_WARRIOR', VITALS, 760);
    const northEarly = createSubmissionJointScenario('SECOND_NORTH_CENTER', 'GOBLIN_ARCHER', VITALS, 668);
    const northLate = createSubmissionJointScenario('SECOND_NORTH_CENTER', 'GOBLIN_ARCHER', VITALS, 760);
    expect(eastLate).toEqual(eastEarly);
    expect(northLate).toEqual(northEarly);
    expect(eastEarly.units.filter((unit) => unit.faction === 'ENEMY').map((unit) => unit.position))
      .toEqual([{ x: 9, y: 0 }, { x: 6, y: 1 }]);
    expect(northEarly.units.filter((unit) => unit.faction === 'ENEMY').map((unit) => unit.position))
      .toEqual([{ x: 10, y: 1 }]);
    expect(northEarly.units.find((unit) => unit.id === SLICE2_ALLY_ID)?.position).toEqual({ x: 1, y: 2 });
  });
});
