import { describe, expect, it } from 'vitest';
import { applySubmissionDefeatCost, applySubmissionRest, parseSubmissionSave, SubmissionController } from './SubmissionController';

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

  it('teaches one solo planning action before exposing the full combat vocabulary', async () => {
    const controller = new SubmissionController();
    for (let step = 0; step < 20; step += 1) controller.advancePrologue();
    controller.startEncounter();
    await Promise.resolve();
    await Promise.resolve();

    expect(controller.getSnapshot().combat).toMatchObject({ mode: 'PLAYER_TURN', isBusy: false, plannedActions: [] });
    controller.confirmPlan();
    controller.useAction('SLAM');
    expect(controller.getSnapshot().combat).toMatchObject({ mode: 'PLAYER_TURN', plannedActions: [] });

    controller.move('LEFT');
    const planned = controller.getSnapshot().combat!;
    expect(planned.plannedActions.map((action) => action.label)).toEqual(['이동']);
    expect(planned.state.units.find((unit) => unit.id === 'administrator-slice2')?.position).toEqual({ x: 3, y: 1 });
    expect(planned.previewState.units.find((unit) => unit.id === 'administrator-slice2')?.position).toEqual({ x: 2, y: 1 });

    controller.move('LEFT');
    expect(controller.getSnapshot().combat?.plannedActions).toHaveLength(1);
    controller.confirmPlan();
    expect(controller.getSnapshot().combat).toMatchObject({ mode: 'PLAYER_TURN', plannedActions: [{ label: '이동' }] });
    controller.undoLastAction();
    controller.move('UP');
    expect(controller.getSnapshot().combat?.previewState.units.find((unit) => unit.id === 'administrator-slice2')?.position).toEqual({ x: 3, y: 0 });
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

  it('spends the one camp ration before delegation when the ally reaches the safe center badly hurt', () => {
    expect(applySubmissionRest({
      vitals: { administratorHp: 9, allyHp: 6 },
      supplies: { water: 1, food: 1 },
    })).toEqual({
      vitals: { administratorHp: 12, allyHp: 9 },
      supplies: { water: 0, food: 0 },
      elapsedMinutes: 20,
    });

    const base = new SubmissionController();
    const save = base.exportSave()!;
    base.destroy();
    const controller = new SubmissionController({
      saveData: {
        ...save,
        mode: 'SCOUTED',
        vitals: { administratorHp: 9, allyHp: 6 },
        worldMinute: 640,
        notice: '중앙 방 확보.',
      },
    });
    expect(controller.getSnapshot().preDelegationRestRequired).toBe(true);
    expect(controller.performPrimaryAction()).toBe(true);
    expect(controller.getSnapshot()).toMatchObject({
      mode: 'SCOUTED',
      worldMinute: 660,
      vitals: { administratorHp: 12, allyHp: 9 },
      supplies: { water: 0, food: 0 },
      preDelegationRestRequired: false,
    });
    expect(controller.performPrimaryAction()).toBe(true);
    expect(controller.getSnapshot().mode).toBe('POLICY_REVIEW');
    controller.destroy();
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
