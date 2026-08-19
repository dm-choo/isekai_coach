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
});
