import { describe, expect, it } from 'vitest';
import { Slice2RunController } from './Slice2RunController';

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
});
