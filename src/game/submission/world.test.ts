import { describe, expect, it } from 'vitest';
import {
  computeBarrierContour,
  createSubmissionWorld,
  incorporateTile,
  incorporationBlocker,
  updateSubmissionTile,
} from './world';

describe('submission territory state', () => {
  it('keeps knowledge, threat, territory, and utility independent', () => {
    const world = createSubmissionWorld();
    const frontier = world.tiles.find((tile) => tile.id === 'frontier-east');
    expect(frontier).toMatchObject({
      knowledge: 'REVEALED',
      threat: 'HOSTILE',
      territory: 'OUTSIDE',
      utility: 'DORMANT',
    });
  });

  it('rejects incorporation at the first unmet authoritative condition', () => {
    let world = createSubmissionWorld();
    expect(incorporationBlocker(world, 'frontier-east')).toBe('NOT_SCOUTED');
    world = updateSubmissionTile(world, 'frontier-east', { knowledge: 'SCOUTED', corridorsScouted: true });
    expect(incorporationBlocker(world, 'frontier-east')).toBe('THREAT_REMAINS');
    world = updateSubmissionTile(world, 'frontier-east', { threat: 'SECURED' });
    expect(incorporationBlocker(world, 'frontier-east')).toBe('ROUTE_UNSAFE');
    world = updateSubmissionTile(world, 'frontier-east', { routeSafe: true });
    expect(incorporationBlocker(world, 'frontier-east')).toBe('ANCHOR_UNPREPARED');
    world = updateSubmissionTile(world, 'frontier-east', { anchorPrepared: true });
    expect(incorporationBlocker(world, 'frontier-east')).toBe('PROTAGONIST_ABSENT');
  });

  it('incorporates only an adjacent secured tile and reveals its next coordinates', () => {
    let world = createSubmissionWorld();
    world = updateSubmissionTile(world, 'frontier-east', {
      knowledge: 'SCOUTED',
      corridorsScouted: true,
      threat: 'SECURED',
      routeSafe: true,
      anchorPrepared: true,
      protagonistAtAnchor: true,
    });
    const result = incorporateTile(world, 'frontier-east');
    expect(result.incorporated).toBe(true);
    expect(result.world.tiles.find((tile) => tile.id === 'frontier-east')).toMatchObject({
      territory: 'INCORPORATED', utility: 'ACTIVE',
    });
    expect(result.world.tiles
      .filter((tile) => ['next-east', 'frontier-north', 'frontier-south'].includes(tile.id))
      .every((tile) => tile.knowledge === 'REVEALED')).toBe(true);
  });

  it('moves the contour from four edges to the joined six-edge outline', () => {
    let world = createSubmissionWorld();
    expect(computeBarrierContour(world)).toHaveLength(4);
    world = updateSubmissionTile(world, 'frontier-east', {
      knowledge: 'SCOUTED', corridorsScouted: true, threat: 'SECURED', routeSafe: true,
      anchorPrepared: true, protagonistAtAnchor: true,
    });
    world = incorporateTile(world, 'frontier-east').world;
    const contour = computeBarrierContour(world);
    expect(contour).toHaveLength(6);
    expect(contour.some((segment) => segment.tileId === 'initial-barrier' && segment.edge === 'EAST')).toBe(false);
    expect(contour.some((segment) => segment.tileId === 'frontier-east' && segment.edge === 'WEST')).toBe(false);
  });
});
