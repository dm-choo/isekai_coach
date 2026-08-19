import { describe, expect, it } from 'vitest';
import { applySubmissionDefeatCost, parseSubmissionSave, SubmissionController } from './SubmissionController';

describe('SubmissionController direct exploration', () => {
  it('starts alone and turns world movement into the first approach', () => {
    const controller = new SubmissionController();
    expect(controller.getSnapshot()).toMatchObject({
      mode: 'AWAKENING', prologueProgress: 0, companionJoined: false, worldTime: '10:00',
    });
    controller.advancePrologue();
    expect(controller.getSnapshot()).toMatchObject({ mode: 'SOLO_APPROACH', prologueProgress: 5 });
    controller.destroy();
  });

  it('advances shared world time by two minutes for the guarded first 100m', () => {
    const controller = new SubmissionController();
    for (let step = 0; step < 19; step += 1) controller.advancePrologue();
    expect(controller.getSnapshot()).toMatchObject({ prologueProgress: 95, worldTime: '10:00' });
    controller.advancePrologue();
    expect(controller.getSnapshot()).toMatchObject({ prologueProgress: 100, worldTime: '10:02' });
    controller.destroy();
  });

  it('automatically enters an authoritative solo encounter before any companion exists', () => {
    const controller = new SubmissionController();
    for (let step = 0; step < 20; step += 1) controller.advancePrologue();
    const snapshot = controller.getSnapshot();
    expect(snapshot).toMatchObject({
      mode: 'COMBAT',
      prologueProgress: 100,
      worldTime: '10:02',
      encounterId: 'SOLO_WARRIOR',
      encounterContent: 'GOBLIN_WARRIOR',
      companionJoined: false,
    });
    expect(snapshot.combat?.mode).toBe('INTRO');
    expect(snapshot.combat?.state.units.filter((unit) => unit.faction === 'STUDENT')).toHaveLength(1);
    expect(snapshot.combat?.state.units.filter((unit) => unit.faction === 'ENEMY')).toHaveLength(1);
    controller.destroy();
  });

  it('keeps the established 400m expedition cadence after the companion joins', () => {
    const controller = joinedController();
    controller.startExpedition();
    for (let step = 0; step < 19; step += 1) controller.advanceCorridor();
    expect(controller.getSnapshot()).toMatchObject({ corridorProgress: 95, worldTime: '10:00' });
    controller.advanceCorridor();
    expect(controller.getSnapshot()).toMatchObject({ corridorProgress: 100, worldTime: '10:02' });
    controller.destroy();
  });

  it('explains the first authoritative blocker instead of silently activating early', () => {
    const controller = new SubmissionController();
    controller.activateAnchor();
    expect(controller.getSnapshot()).toMatchObject({
      mode: 'AWAKENING',
      incorporationBlocker: 'NOT_SCOUTED',
      notice: '중앙 방을 확보해 모든 통로를 먼저 정찰해야 한다.',
    });
    controller.destroy();
  });

  it('ignores unavailable primary actions instead of pretending the input was accepted', () => {
    const controller = new SubmissionController();
    expect(controller.performPrimaryAction()).toBe(false);
    expect(controller.getSnapshot().mode).toBe('AWAKENING');
    controller.destroy();
  });

  it('round-trips a stable checkpoint without changing time, position, or world state', () => {
    const controller = new SubmissionController();
    for (let step = 0; step < 19; step += 1) controller.advancePrologue();
    const save = controller.exportSave();
    expect(save).toBeDefined();
    const parsed = parseSubmissionSave(JSON.stringify(save));
    const restored = new SubmissionController({ saveData: parsed! });
    expect(restored.getSnapshot()).toMatchObject({
      mode: 'SOLO_APPROACH', prologueProgress: 95, worldTime: '10:00', companionJoined: false,
      supplies: { water: 1, food: 1 },
    });
    expect(restored.getSnapshot().world).toEqual(controller.getSnapshot().world);
    expect(parseSubmissionSave('{broken')).toBeUndefined();
    expect(parseSubmissionSave(JSON.stringify({ ...save, version: 1 }))).toBeUndefined();
    controller.destroy();
    restored.destroy();
  });

  it('keeps defeat costs while preserving a deterministic same-encounter retry budget', () => {
    expect(applySubmissionDefeatCost({
      vitals: { administratorHp: 0, allyHp: 2 },
      supplies: { water: 1, food: 1 },
      battleTurns: 4,
    })).toEqual({
      vitals: { administratorHp: 3, allyHp: 3 },
      supplies: { water: 0, food: 0 },
      elapsedMinutes: 9,
      usedCampSupplies: true,
    });
    expect(applySubmissionDefeatCost({
      vitals: { administratorHp: 0, allyHp: 2 },
      supplies: { water: 0, food: 1 },
      battleTurns: 4,
    })).toMatchObject({
      vitals: { administratorHp: 1, allyHp: 2 },
      supplies: { water: 0, food: 1 },
      elapsedMinutes: 9,
      usedCampSupplies: false,
    });
  });
});

function joinedController(): SubmissionController {
  const initial = new SubmissionController();
  const save = initial.exportSave()!;
  initial.destroy();
  return new SubmissionController({
    saveData: {
      ...save,
      mode: 'COMPANION_JOINED',
      prologueProgress: 100,
      soloEncounterResolved: true,
      companionJoined: true,
      notice: '동료가 합류했다.',
    },
  });
}
