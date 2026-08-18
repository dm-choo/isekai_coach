import { describe, expect, it } from 'vitest';
import {
  REST_MINUTES,
  SLICE2_LATE_START_MINUTE,
  Slice2RunController,
  formatWorldTime,
} from './Slice2RunController';

describe('Slice2RunController exploration', () => {
  it('starts in the west room and only exposes adjacent travel', () => {
    const controller = new Slice2RunController();
    controller.startRun();
    const snapshot = controller.getSnapshot();
    expect(snapshot.currentNodeId).toBe('room-west');
    expect(snapshot.availableNodeIds).toEqual(['west-4']);
    controller.destroy();
  });

  it('does not advance a tile before the center and east route are safe', () => {
    const controller = new Slice2RunController();
    controller.startRun();
    expect(controller.getSnapshot().canAdvanceTile).toBe(false);
    controller.advanceTile();
    expect(controller.getSnapshot().currentTileIndex).toBe(0);
    controller.destroy();
  });

  it('advances two minutes per 100m segment from a 10:00 departure', () => {
    const controller = new Slice2RunController();
    controller.startRun();
    controller.moveTo('west-4');
    expect(controller.getSnapshot()).toMatchObject({ worldMinute: 602, worldTime: '10:02', elapsedTravel: 1 });
    controller.destroy();
  });

  it('rests only in a secure room and consumes both supplies plus twenty minutes', () => {
    const controller = new Slice2RunController({ initialVitals: { administratorHp: 10, allyHp: 9 } });
    controller.startRun();
    expect(controller.getSnapshot().canRest).toBe(true);
    controller.rest();
    expect(controller.getSnapshot()).toMatchObject({
      worldMinute: 600 + REST_MINUTES,
      worldTime: '10:20',
      supplies: { water: 0, food: 0, light: 1 },
      vitals: { administratorHp: 13, allyHp: 12 },
      restCount: 1,
      canRest: false,
    });
    controller.destroy();
  });

  it('conceals one night intent and spends one light to restore it', () => {
    const controller = new Slice2RunController({ startMinute: SLICE2_LATE_START_MINUTE + 58 });
    controller.startRun();
    controller.moveTo('west-4');
    controller.moveTo('west-3');
    expect(controller.getSnapshot()).toMatchObject({ mode: 'COMBAT', worldTime: '18:02', isNight: true });
    controller.startEncounter();
    expect(controller.getSnapshot().combat?.concealedIntentIds).toHaveLength(1);
    expect(controller.getSnapshot().canUseLight).toBe(true);
    controller.useLight();
    expect(controller.getSnapshot().combat?.concealedIntentIds).toEqual([]);
    expect(controller.getSnapshot().supplies.light).toBe(0);
    controller.destroy();
  });

  it('formats world time without leaking elapsed days into the clock', () => {
    expect(formatWorldTime(24 * 60 + 5)).toBe('00:05');
  });
});
