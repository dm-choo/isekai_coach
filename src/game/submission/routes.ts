import type { GridPosition } from '../combat';
import type { EncounterContent } from '../slice2';
import type { CardinalEdge } from './world';

export type SubmissionFrontierId = 'next-east' | 'frontier-north';
export type SubmissionRouteTargetId = 'frontier-east' | SubmissionFrontierId;

export interface SubmissionRouteSpec {
  readonly id: SubmissionRouteTargetId;
  readonly targetTileId: SubmissionRouteTargetId;
  readonly direction: Extract<CardinalEdge, 'EAST' | 'NORTH'>;
  readonly distanceMeters: number;
  readonly travelMinutes: number;
  readonly waterCost: number;
  readonly threatCount: number;
  readonly centerEncounterId: 'CENTER_GUARD' | 'SECOND_EAST_CENTER' | 'SECOND_NORTH_CENTER';
  readonly centerContent: EncounterContent;
  readonly delegationEncounterId: string;
  readonly delegationContent: EncounterContent;
  readonly delegationScenarioId: string;
  readonly delegationAllyPosition: GridPosition;
  readonly delegationEnemyPositions?: Readonly<Record<string, GridPosition>>;
  readonly lockDelegationRoster?: boolean;
}

export interface SubmissionFrontierRouteSpec extends SubmissionRouteSpec {
  readonly id: SubmissionFrontierId;
  readonly targetTileId: SubmissionFrontierId;
}

/**
 * Compatibility fixture for the first submitted frontier. It intentionally
 * retains the P20 encounter id and dynamic patrol behavior.
 */
export const SUBMISSION_FIRST_ROUTE: SubmissionRouteSpec = {
  id: 'frontier-east',
  targetTileId: 'frontier-east',
  direction: 'EAST',
  distanceMeters: 400,
  travelMinutes: 8,
  waterCost: 0,
  threatCount: 2,
  centerEncounterId: 'CENTER_GUARD',
  centerContent: 'GOBLIN_ARCHER_WARRIOR',
  delegationEncounterId: 'tile-submission-delegated-east',
  delegationContent: 'GOBLIN_ARCHER_WARRIOR',
  delegationScenarioId: 'submission:delegated-east:known-fixture',
  delegationAllyPosition: { x: 1, y: 1 },
};

export const SUBMISSION_FRONTIER_ROUTES: readonly SubmissionFrontierRouteSpec[] = [
  {
    id: 'next-east',
    targetTileId: 'next-east',
    direction: 'EAST',
    distanceMeters: 400,
    travelMinutes: 8,
    waterCost: 0,
    threatCount: 2,
    centerEncounterId: 'SECOND_EAST_CENTER',
    centerContent: 'GOBLIN_ARCHER_WARRIOR',
    delegationEncounterId: 'submission-p22-delegated-next-east',
    delegationContent: 'GOBLIN_ARCHER_WARRIOR',
    delegationScenarioId: 'submission:delegated-next-east:authored-fixture',
    delegationAllyPosition: { x: 1, y: 1 },
    delegationEnemyPositions: {
      'goblin-warrior': { x: 2, y: 1 },
      'goblin-archer': { x: 3, y: 1 },
    },
    lockDelegationRoster: true,
  },
  {
    id: 'frontier-north',
    targetTileId: 'frontier-north',
    direction: 'NORTH',
    distanceMeters: 600,
    travelMinutes: 12,
    waterCost: 1,
    threatCount: 1,
    centerEncounterId: 'SECOND_NORTH_CENTER',
    centerContent: 'GOBLIN_ARCHER',
    delegationEncounterId: 'submission-p22-delegated-frontier-north',
    delegationContent: 'GOBLIN_ARCHER',
    delegationScenarioId: 'submission:delegated-frontier-north:authored-fixture',
    delegationAllyPosition: { x: 1, y: 1 },
    delegationEnemyPositions: {
      'goblin-archer': { x: 10, y: 1 },
    },
    lockDelegationRoster: true,
  },
];

export function getSubmissionRouteSpec(id: SubmissionRouteTargetId): SubmissionRouteSpec {
  if (id === 'frontier-east') return SUBMISSION_FIRST_ROUTE;
  const route = SUBMISSION_FRONTIER_ROUTES.find((candidate) => candidate.id === id);
  if (!route) throw new Error(`Unknown submission frontier route: ${id}`);
  return route;
}

export function isSubmissionFrontierId(value: unknown): value is SubmissionFrontierId {
  return value === 'next-east' || value === 'frontier-north';
}
