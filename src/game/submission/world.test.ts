import { describe, expect, it } from 'vitest';
import {
  computeBarrierContour,
  createSubmissionWorld,
  destabilizeTile,
  incorporateTile,
  incorporationBlocker,
  updateSubmissionTile,
  type SubmissionWorldState,
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

  it('incorporates only an adjacent secured tile and reveals only the east and north choices', () => {
    let world = createSubmissionWorld();
    world = prepareForIncorporation(world, 'frontier-east');
    const result = incorporateTile(world, 'frontier-east');
    expect(result.incorporated).toBe(true);
    expect(result.world.tiles.find((tile) => tile.id === 'frontier-east')).toMatchObject({
      territory: 'INCORPORATED', utility: 'ACTIVE', stabilized: true,
    });
    expect(result.world.tiles
      .filter((tile) => tile.territory === 'OUTSIDE' && tile.knowledge === 'REVEALED')
      .map((tile) => tile.id)).toEqual(['next-east', 'frontier-north']);
    expect(result.world.tiles.find((tile) => tile.id === 'frontier-south')).toMatchObject({
      knowledge: 'UNSEEN', territory: 'OUTSIDE',
    });
  });

  it.each([
    {
      targetId: 'next-east',
      otherId: 'frontier-north',
      ownedIds: ['initial-barrier', 'frontier-east', 'next-east'],
      internalSeams: ['initial-barrier:EAST', 'frontier-east:WEST', 'frontier-east:EAST', 'next-east:WEST'],
    },
    {
      targetId: 'frontier-north',
      otherId: 'next-east',
      ownedIds: ['initial-barrier', 'frontier-east', 'frontier-north'],
      internalSeams: ['initial-barrier:EAST', 'frontier-east:WEST', 'frontier-east:NORTH', 'frontier-north:SOUTH'],
    },
  ] as const)('forms a three-tile, eight-edge contour after incorporating $targetId', ({
    targetId, otherId, ownedIds, internalSeams,
  }) => {
    let world = createSubmissionWorld();
    world = prepareForIncorporation(world, 'frontier-east');
    world = incorporateTile(world, 'frontier-east').world;
    world = prepareForIncorporation(world, targetId);

    const result = incorporateTile(world, targetId);
    expect(result.incorporated).toBe(true);
    expect(result.world.tiles
      .filter((tile) => tile.territory === 'INCORPORATED')
      .map((tile) => tile.id)).toEqual(ownedIds);
    expect(result.world.tiles.find((tile) => tile.id === otherId)).toMatchObject({
      knowledge: 'REVEALED', territory: 'OUTSIDE',
    });

    const contour = computeBarrierContour(result.world);
    const contourIds = contour.map((segment) => segment.id);
    expect(contour).toHaveLength(8);
    for (const seam of internalSeams) expect(contourIds).not.toContain(seam);
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

  it('keeps ownership and the spring while instability impairs route, scouting, and utility', () => {
    let world = createSubmissionWorld();
    world = updateSubmissionTile(world, 'frontier-east', {
      knowledge: 'SCOUTED', corridorsScouted: true, threat: 'SECURED', routeSafe: true,
      anchorPrepared: true, protagonistAtAnchor: true,
    });
    world = incorporateTile(world, 'frontier-east').world;
    const contourBefore = computeBarrierContour(world);
    const unstable = destabilizeTile(world, 'frontier-east');
    expect(unstable.tiles.find((tile) => tile.id === 'frontier-east')).toMatchObject({
      territory: 'INCORPORATED',
      utilityKind: 'SPRING',
      utility: 'IMPAIRED',
      stabilized: false,
      routeSafe: false,
      corridorsScouted: false,
      knowledge: 'SCOUTED',
    });
    expect(computeBarrierContour(unstable)).toEqual(contourBefore);
  });
});

function prepareForIncorporation(world: SubmissionWorldState, tileId: string): SubmissionWorldState {
  return updateSubmissionTile(world, tileId, {
    knowledge: 'SCOUTED',
    corridorsScouted: true,
    threat: 'SECURED',
    routeSafe: true,
    anchorPrepared: true,
    protagonistAtAnchor: true,
  });
}
