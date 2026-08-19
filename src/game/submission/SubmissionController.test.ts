import { describe, expect, it } from 'vitest';
import { applySubmissionDefeatCost, parseSubmissionSave, SubmissionController } from './SubmissionController';

describe('SubmissionController direct exploration', () => {
  it('starts only from the visible boundary action', () => {
    const controller = new SubmissionController();
    expect(controller.getSnapshot()).toMatchObject({ mode: 'INTRO', corridorProgress: 0, worldTime: '10:00' });
    controller.startExpedition();
    expect(controller.getSnapshot()).toMatchObject({ mode: 'CORRIDOR', corridorProgress: 0 });
    controller.startExpedition();
    expect(controller.getSnapshot().mode).toBe('CORRIDOR');
    controller.destroy();
  });

  it('advances shared world time by two minutes for every guarded 100m', () => {
    const controller = new SubmissionController();
    controller.startExpedition();
    for (let step = 0; step < 19; step += 1) controller.advanceCorridor();
    expect(controller.getSnapshot()).toMatchObject({ corridorProgress: 95, worldTime: '10:00' });
    controller.advanceCorridor();
    expect(controller.getSnapshot()).toMatchObject({ corridorProgress: 100, worldTime: '10:02' });
    controller.destroy();
  });

  it('automatically stops travel at the first fixed spatial encounter', () => {
    const controller = new SubmissionController();
    controller.startExpedition();
    for (let step = 0; step < 40; step += 1) controller.advanceCorridor();
    const snapshot = controller.getSnapshot();
    expect(snapshot).toMatchObject({
      mode: 'COMBAT',
      corridorProgress: 200,
      worldTime: '10:04',
      encounterId: 'FIRST_WARRIOR',
      encounterContent: 'GOBLIN_WARRIOR',
    });
    expect(snapshot.combat?.mode).toBe('INTRO');
    expect(snapshot.combat?.state.units.filter((unit) => unit.faction === 'ENEMY')).toHaveLength(1);
    controller.destroy();
  });

  it('explains the first authoritative blocker instead of silently activating early', () => {
    const controller = new SubmissionController();
    controller.activateAnchor();
    expect(controller.getSnapshot()).toMatchObject({
      mode: 'INTRO',
      incorporationBlocker: 'NOT_SCOUTED',
      notice: '중앙 방을 확보해 모든 통로를 먼저 정찰해야 한다.',
    });
    controller.destroy();
  });

  it('ignores unavailable primary actions instead of pretending the input was accepted', () => {
    const controller = new SubmissionController();
    expect(controller.performPrimaryAction()).toBe(true);
    expect(controller.getSnapshot().mode).toBe('CORRIDOR');
    expect(controller.performPrimaryAction()).toBe(false);
    expect(controller.getSnapshot().mode).toBe('CORRIDOR');
    controller.destroy();
  });

  it('round-trips a stable checkpoint without changing time, position, or world state', () => {
    const controller = new SubmissionController();
    controller.startExpedition();
    for (let step = 0; step < 19; step += 1) controller.advanceCorridor();
    const save = controller.exportSave();
    expect(save).toBeDefined();
    const parsed = parseSubmissionSave(JSON.stringify(save));
    const restored = new SubmissionController({ saveData: parsed! });
    expect(restored.getSnapshot()).toMatchObject({
      mode: 'CORRIDOR', corridorProgress: 95, worldTime: '10:00',
      supplies: { water: 1, food: 1 },
    });
    expect(restored.getSnapshot().world).toEqual(controller.getSnapshot().world);
    expect(parseSubmissionSave('{broken')).toBeUndefined();
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
