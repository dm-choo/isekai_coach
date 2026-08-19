import { describe, expect, it } from 'vitest';
import { SubmissionController } from './SubmissionController';

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
});
