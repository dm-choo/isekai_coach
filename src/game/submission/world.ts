export type TileKnowledge = 'UNSEEN' | 'REVEALED' | 'SCOUTED';
export type TileThreat = 'HOSTILE' | 'CONTESTED' | 'SECURED';
export type TileTerritory = 'OUTSIDE' | 'INCORPORATED';
export type TileUtility = 'DORMANT' | 'ACTIVE' | 'IMPAIRED';
export type CardinalEdge = 'NORTH' | 'EAST' | 'SOUTH' | 'WEST';

export interface WorldCoordinate {
  readonly x: number;
  readonly y: number;
}

export interface SubmissionTileState {
  readonly id: string;
  readonly name: string;
  readonly coordinate: WorldCoordinate;
  readonly knowledge: TileKnowledge;
  readonly threat: TileThreat;
  readonly territory: TileTerritory;
  readonly utility: TileUtility;
  readonly stabilized: boolean;
  readonly corridorsScouted: boolean;
  readonly routeSafe: boolean;
  readonly anchorPrepared: boolean;
  readonly protagonistAtAnchor: boolean;
  readonly utilityKind?: 'SPRING';
  readonly revealsOnIncorporation: readonly string[];
}

export interface SubmissionWorldState {
  readonly tiles: readonly SubmissionTileState[];
  readonly revision: number;
}

export interface BarrierContourSegment {
  readonly id: string;
  readonly tileId: string;
  readonly edge: CardinalEdge;
  readonly x: number;
  readonly y: number;
}

export type IncorporationBlocker =
  | 'ALREADY_INCORPORATED'
  | 'NOT_ADJACENT'
  | 'NOT_SCOUTED'
  | 'THREAT_REMAINS'
  | 'ROUTE_UNSAFE'
  | 'ANCHOR_UNPREPARED'
  | 'PROTAGONIST_ABSENT';

export interface IncorporationResult {
  readonly world: SubmissionWorldState;
  readonly incorporated: boolean;
  readonly blocker?: IncorporationBlocker;
}

const EDGE_DELTAS: Readonly<Record<CardinalEdge, WorldCoordinate>> = {
  NORTH: { x: 0, y: -1 },
  EAST: { x: 1, y: 0 },
  SOUTH: { x: 0, y: 1 },
  WEST: { x: -1, y: 0 },
};

const EDGE_ORDER: readonly CardinalEdge[] = ['NORTH', 'EAST', 'SOUTH', 'WEST'];

export function createSubmissionWorld(): SubmissionWorldState {
  return {
    revision: 0,
    tiles: [
      {
        id: 'initial-barrier',
        name: '깨어난 정원',
        coordinate: { x: 0, y: 0 },
        knowledge: 'SCOUTED',
        threat: 'SECURED',
        territory: 'INCORPORATED',
        utility: 'ACTIVE',
        stabilized: true,
        corridorsScouted: true,
        routeSafe: true,
        anchorPrepared: true,
        protagonistAtAnchor: false,
        revealsOnIncorporation: ['frontier-east'],
      },
      {
        id: 'frontier-east',
        name: '물안개 전초지',
        coordinate: { x: 1, y: 0 },
        knowledge: 'REVEALED',
        threat: 'HOSTILE',
        territory: 'OUTSIDE',
        utility: 'DORMANT',
        stabilized: false,
        corridorsScouted: false,
        routeSafe: false,
        anchorPrepared: false,
        protagonistAtAnchor: false,
        utilityKind: 'SPRING',
        revealsOnIncorporation: ['next-east', 'frontier-north', 'frontier-south'],
      },
      {
        id: 'next-east',
        name: '붉은 수관림',
        coordinate: { x: 2, y: 0 },
        knowledge: 'UNSEEN',
        threat: 'HOSTILE',
        territory: 'OUTSIDE',
        utility: 'DORMANT',
        stabilized: false,
        corridorsScouted: false,
        routeSafe: false,
        anchorPrepared: false,
        protagonistAtAnchor: false,
        revealsOnIncorporation: [],
      },
      {
        id: 'frontier-north',
        name: '기울어진 성소',
        coordinate: { x: 1, y: -1 },
        knowledge: 'UNSEEN',
        threat: 'HOSTILE',
        territory: 'OUTSIDE',
        utility: 'DORMANT',
        stabilized: false,
        corridorsScouted: false,
        routeSafe: false,
        anchorPrepared: false,
        protagonistAtAnchor: false,
        revealsOnIncorporation: [],
      },
      {
        id: 'frontier-south',
        name: '침수된 회랑',
        coordinate: { x: 1, y: 1 },
        knowledge: 'UNSEEN',
        threat: 'HOSTILE',
        territory: 'OUTSIDE',
        utility: 'DORMANT',
        stabilized: false,
        corridorsScouted: false,
        routeSafe: false,
        anchorPrepared: false,
        protagonistAtAnchor: false,
        revealsOnIncorporation: [],
      },
    ],
  };
}

export function updateSubmissionTile(
  world: SubmissionWorldState,
  tileId: string,
  update: Partial<Omit<SubmissionTileState, 'id' | 'coordinate'>>,
): SubmissionWorldState {
  if (!world.tiles.some((tile) => tile.id === tileId)) return world;
  return {
    revision: world.revision + 1,
    tiles: world.tiles.map((tile) => tile.id === tileId ? { ...tile, ...update } : tile),
  };
}

export function incorporationBlocker(
  world: SubmissionWorldState,
  tileId: string,
): IncorporationBlocker | undefined {
  const tile = world.tiles.find((candidate) => candidate.id === tileId);
  if (!tile) return 'NOT_ADJACENT';
  if (tile.territory === 'INCORPORATED') return 'ALREADY_INCORPORATED';
  if (!hasIncorporatedNeighbor(world, tile.coordinate)) return 'NOT_ADJACENT';
  if (tile.knowledge !== 'SCOUTED' || !tile.corridorsScouted) return 'NOT_SCOUTED';
  if (tile.threat !== 'SECURED') return 'THREAT_REMAINS';
  if (!tile.routeSafe) return 'ROUTE_UNSAFE';
  if (!tile.anchorPrepared) return 'ANCHOR_UNPREPARED';
  if (!tile.protagonistAtAnchor) return 'PROTAGONIST_ABSENT';
  return undefined;
}

export function incorporateTile(
  world: SubmissionWorldState,
  tileId: string,
): IncorporationResult {
  const blocker = incorporationBlocker(world, tileId);
  if (blocker) return { world, incorporated: false, blocker };
  const target = world.tiles.find((tile) => tile.id === tileId);
  if (!target) return { world, incorporated: false, blocker: 'NOT_ADJACENT' };
  const reveals = new Set(target.revealsOnIncorporation);
  return {
    incorporated: true,
    world: {
      revision: world.revision + 1,
      tiles: world.tiles.map((tile) => {
        if (tile.id === tileId) {
          return { ...tile, territory: 'INCORPORATED', utility: 'ACTIVE' };
        }
        if (reveals.has(tile.id) && tile.knowledge === 'UNSEEN') {
          return { ...tile, knowledge: 'REVEALED' };
        }
        return tile;
      }),
    },
  };
}

export function computeBarrierContour(world: SubmissionWorldState): readonly BarrierContourSegment[] {
  const incorporated = world.tiles.filter((tile) => tile.territory === 'INCORPORATED');
  const ownedCoordinates = new Set(incorporated.map((tile) => coordinateKey(tile.coordinate)));
  return incorporated.flatMap((tile) => EDGE_ORDER
    .filter((edge) => {
      const delta = EDGE_DELTAS[edge];
      return !ownedCoordinates.has(coordinateKey({
        x: tile.coordinate.x + delta.x,
        y: tile.coordinate.y + delta.y,
      }));
    })
    .map((edge) => ({
      id: `${tile.id}:${edge}`,
      tileId: tile.id,
      edge,
      x: tile.coordinate.x,
      y: tile.coordinate.y,
    })));
}

export function hasIncorporatedNeighbor(
  world: SubmissionWorldState,
  coordinate: WorldCoordinate,
): boolean {
  return EDGE_ORDER.some((edge) => {
    const delta = EDGE_DELTAS[edge];
    return world.tiles.some((tile) => tile.territory === 'INCORPORATED'
      && tile.coordinate.x === coordinate.x + delta.x
      && tile.coordinate.y === coordinate.y + delta.y);
  });
}

function coordinateKey(coordinate: WorldCoordinate): string {
  return `${coordinate.x},${coordinate.y}`;
}
