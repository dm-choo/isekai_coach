import { describe, expect, it } from 'vitest';
import {
  REST_MINUTES,
  SLICE2_LATE_START_MINUTE,
  Slice2RunController,
  formatWorldTime,
  rootSnareHpAfter,
} from './Slice2RunController';

describe('Slice2RunController exploration', () => {
  it('starts in the west room and exposes one physical door instead of 100m nodes', () => {
    const controller = new Slice2RunController();
    controller.startRun();
    const snapshot = controller.getSnapshot();
    expect(snapshot.currentNodeId).toBe('room-west');
    expect(snapshot.availableDoorDirections).toEqual(['EAST']);
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
    controller.enterCorridor('EAST');
    advance(controller, 100);
    expect(controller.getSnapshot()).toMatchObject({ worldMinute: 602, worldTime: '10:02', elapsedTravel: 1 });
    expect(controller.getSnapshot().traversal).toMatchObject({
      fromRoomId: 'room-west',
      toRoomId: 'room-center',
      progressMeters: 100,
      distanceMeters: 400,
    });
    controller.destroy();
  });

  it('lets the party retreat to 0m without changing node or world time', () => {
    const controller = new Slice2RunController();
    controller.startRun();
    controller.enterCorridor('EAST');
    controller.advanceTravel('FORWARD');
    controller.advanceTravel('FORWARD');
    controller.advanceTravel('BACK');
    controller.advanceTravel('BACK');

    expect(controller.getSnapshot()).toMatchObject({ currentNodeId: 'room-west', worldMinute: 600, traversal: undefined });
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

  it('lets the player reorder ally policy from any non-combat run screen', () => {
    const controller = new Slice2RunController();
    controller.movePolicy(2, -1);
    expect(controller.getSnapshot().policy).toEqual(['EVADE', 'SHOOT', 'POSITION', 'PUSH', 'EMPTY']);
    controller.startRun();
    controller.movePolicy(1, -1);
    expect(controller.getSnapshot().policy).toEqual(['SHOOT', 'EVADE', 'POSITION', 'PUSH', 'EMPTY']);
    controller.destroy();
  });

  it('conceals one night intent and spends one light to restore it', () => {
    const controller = new Slice2RunController({ startMinute: SLICE2_LATE_START_MINUTE + 58 });
    controller.startRun();
    controller.enterCorridor('EAST');
    advance(controller, 200);
    expect(controller.getSnapshot()).toMatchObject({ mode: 'COMBAT', worldTime: '18:02', isNight: true });
    expect(controller.getSnapshot().traversal).toMatchObject({ progressMeters: 200, toRoomId: 'room-center' });
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

  it('keeps an unavoidable corridor snare nonlethal on the required linear route', () => {
    expect(rootSnareHpAfter(14)).toBe(13);
    expect(rootSnareHpAfter(1)).toBe(1);
    expect(rootSnareHpAfter(0)).toBe(0);
  });
});

function advance(controller: Slice2RunController, meters: number): void {
  for (let distance = 0; distance < meters; distance += 5) controller.advanceTravel('FORWARD');
}
