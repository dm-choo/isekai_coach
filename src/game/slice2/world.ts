export type WorldDirection = 'NORTH' | 'EAST' | 'SOUTH' | 'WEST';
export type EncounterKind = 'NONE' | 'BATTLE' | 'EVENT';
export type EncounterContent =
  | 'NONE'
  | 'GOBLIN_ARCHER'
  | 'GOBLIN_WARRIOR'
  | 'GOBLIN_BOMBER'
  | 'GOBLIN_ARCHER_WARRIOR'
  | 'GOBLIN_ARCHER_BOMBER'
  | 'GOBLIN_TRIO'
  | 'GOBLIN_RUSH_SQUAD'
  | 'GOBLIN_BOMBARDMENT'
  | 'GOBLIN_FIRELINE'
  | 'BARRIER_GUARDIAN'
  | 'RECOVERY_CACHE'
  | 'WATER_CACHE'
  | 'RATION_CACHE'
  | 'ROOT_SNARE';

export interface WorldEncounter {
  readonly id: string;
  readonly kind: EncounterKind;
  readonly content: EncounterContent;
  readonly resolved: boolean;
  readonly oneTime: boolean;
}

export interface CorridorSegment {
  readonly id: string;
  readonly direction: WorldDirection;
  readonly index: 1 | 2 | 3 | 4;
  readonly encounter: WorldEncounter;
}

export interface WorldRoom {
  readonly id: string;
  readonly kind: 'CENTER' | 'BOUNDARY';
  readonly direction?: WorldDirection;
  readonly exitOpen: boolean;
  readonly encounter: WorldEncounter;
}

export interface WorldTileState {
  readonly id: string;
  readonly index: number;
  readonly name: string;
  readonly encounterGeneration: number;
  readonly corridorsScouted: boolean;
  readonly cleared: boolean;
  readonly rooms: readonly WorldRoom[];
  readonly corridors: Readonly<Record<WorldDirection, readonly CorridorSegment[]>>;
  readonly consumedOneTimeRewards: readonly string[];
}

export interface Slice2WorldState {
  readonly seed: number;
  readonly tiles: readonly WorldTileState[];
}

const DIRECTIONS: readonly WorldDirection[] = ['NORTH', 'EAST', 'SOUTH', 'WEST'];
const REQUIRED_ROUTE: readonly string[] = [
  'room-west',
  'west-4', 'west-3', 'west-2', 'west-1',
  'room-center',
  'east-1', 'east-2', 'east-3', 'east-4',
  'room-east',
];

const TILE_NAMES = ['젖은 뿌리길', '무너진 감시로', '붉은 포자림', '고블린 봉쇄선'] as const;
const CENTER_CONTENT: readonly EncounterContent[] = [
  'GOBLIN_ARCHER_WARRIOR',
  'GOBLIN_RUSH_SQUAD',
  'GOBLIN_BOMBARDMENT',
  'GOBLIN_TRIO',
];

export function createSlice2World(seed = 20_260_818): Slice2WorldState {
  return {
    seed,
    tiles: TILE_NAMES.map((name, index) => createWorldTile(seed, index, name, 0, [])),
  };
}

export function rerollErodedTile(
  tile: WorldTileState,
  worldSeed: number,
): WorldTileState {
  return createWorldTile(
    worldSeed,
    tile.index,
    tile.name,
    tile.encounterGeneration + 1,
    tile.consumedOneTimeRewards,
  );
}

export function encounterAt(tile: WorldTileState, nodeId: string): WorldEncounter | undefined {
  const room = tile.rooms.find((candidate) => candidate.id === nodeId);
  if (room) return room.encounter;
  for (const direction of DIRECTIONS) {
    const segment = tile.corridors[direction].find((candidate) => candidate.id === nodeId);
    if (segment) return segment.encounter;
  }
  return undefined;
}

export function resolveNodeEncounter(tile: WorldTileState, nodeId: string): WorldTileState {
  const current = encounterAt(tile, nodeId);
  if (!current || current.resolved) return tile;
  const consumedOneTimeRewards = current.oneTime
    ? [...new Set([...tile.consumedOneTimeRewards, oneTimeRewardKey(tile.index, nodeId)])]
    : [...tile.consumedOneTimeRewards];
  const rooms = tile.rooms.map((room) => room.id === nodeId
    ? { ...room, encounter: { ...room.encounter, resolved: true } }
    : room);
  const corridors = mapCorridors(tile.corridors, (segment) => segment.id === nodeId
    ? { ...segment, encounter: { ...segment.encounter, resolved: true } }
    : segment);
  const centerCleared = nodeId === 'room-center' || rooms.find((room) => room.id === 'room-center')?.encounter.resolved;
  const next = {
    ...tile,
    rooms,
    corridors,
    corridorsScouted: Boolean(centerCleared),
    consumedOneTimeRewards,
  };
  return { ...next, cleared: isRequiredRouteSafe(next) };
}

export function isEncounterVisible(tile: WorldTileState, nodeId: string): boolean {
  return nodeId === 'room-center' || tile.corridorsScouted || encounterAt(tile, nodeId)?.resolved === true;
}

export function isRequiredRouteSafe(tile: WorldTileState): boolean {
  return REQUIRED_ROUTE.every((nodeId) => {
    const encounter = encounterAt(tile, nodeId);
    return !encounter || encounter.kind === 'NONE' || encounter.resolved;
  });
}

function createWorldTile(
  worldSeed: number,
  tileIndex: number,
  name: string,
  generation: number,
  consumedOneTimeRewards: readonly string[],
): WorldTileState {
  const random = mulberry32(mixSeed(worldSeed, tileIndex, generation));
  const corridors = Object.fromEntries(DIRECTIONS.map((direction) => [
    direction,
    Array.from({ length: 4 }, (_, offset) => {
      const index = (offset + 1) as 1 | 2 | 3 | 4;
      const id = `${direction.toLowerCase()}-${index}`;
      const content = drawCorridorContent(random, direction, index, tileIndex);
      const oneTime = isOneTimeReward(content);
      const consumed = oneTime && consumedOneTimeRewards.includes(oneTimeRewardKey(tileIndex, id));
      return {
        id,
        direction,
        index,
        encounter: createEncounter(tileIndex, generation, id, consumed ? 'NONE' : content),
      };
    }),
  ])) as unknown as Readonly<Record<WorldDirection, readonly CorridorSegment[]>>;

  const rooms: readonly WorldRoom[] = [
    {
      id: 'room-center', kind: 'CENTER', exitOpen: false,
      encounter: createEncounter(tileIndex, generation, 'room-center', CENTER_CONTENT[tileIndex] ?? 'GOBLIN_TRIO'),
    },
    ...DIRECTIONS.map((direction): WorldRoom => ({
      id: `room-${direction.toLowerCase()}`,
      kind: 'BOUNDARY',
      direction,
      exitOpen: direction === 'EAST' || direction === 'WEST',
      encounter: createEncounter(tileIndex, generation, `room-${direction.toLowerCase()}`, 'NONE'),
    })),
  ];

  return {
    id: `world-tile-${tileIndex + 1}`,
    index: tileIndex,
    name,
    encounterGeneration: generation,
    corridorsScouted: false,
    cleared: false,
    rooms,
    corridors,
    consumedOneTimeRewards: [...consumedOneTimeRewards],
  };
}

function drawCorridorContent(
  random: () => number,
  direction: WorldDirection,
  index: number,
  tileIndex: number,
): EncounterContent {
  const roll = random();
  const optional = direction === 'NORTH' || direction === 'SOUTH';
  if (!optional) {
    if (tileIndex === 0 && direction === 'WEST' && index === 3) return 'GOBLIN_WARRIOR';
    if (tileIndex === 1 && direction === 'WEST' && index === 4) return 'GOBLIN_ARCHER';
    return roll < 0.88 ? 'NONE' : 'ROOT_SNARE';
  }
  // Tile 2 always exposes one food and one water detour so the run can test
  // rest-versus-arrival-time decisions on a stable seed.
  if (tileIndex === 1 && direction === 'NORTH' && index === 3) return 'RATION_CACHE';
  if (tileIndex === 1 && direction === 'SOUTH' && index === 3) return 'WATER_CACHE';
  if (tileIndex === 1 && optional) return 'NONE';
  if (optional && index === 3 && roll < 0.29) return 'RATION_CACHE';
  if (optional && index === 3 && roll < 0.58) return 'WATER_CACHE';
  if (roll < 0.5) return 'NONE';
  if (roll < 0.64) return 'ROOT_SNARE';
  if (roll < 0.87) return tileIndex < 2 ? 'GOBLIN_WARRIOR' : 'GOBLIN_BOMBER';
  return 'GOBLIN_ARCHER';
}

function createEncounter(
  tileIndex: number,
  generation: number,
  nodeId: string,
  content: EncounterContent,
): WorldEncounter {
  return {
    id: encounterId(tileIndex, generation, nodeId),
    kind: content === 'NONE' ? 'NONE' : isEvent(content) ? 'EVENT' : 'BATTLE',
    content,
    resolved: content === 'NONE',
    oneTime: isOneTimeReward(content),
  };
}

function isEvent(content: EncounterContent): boolean {
  return content === 'RECOVERY_CACHE'
    || content === 'WATER_CACHE'
    || content === 'RATION_CACHE'
    || content === 'ROOT_SNARE';
}

function isOneTimeReward(content: EncounterContent): boolean {
  return content === 'RECOVERY_CACHE' || content === 'WATER_CACHE' || content === 'RATION_CACHE';
}

function encounterId(tileIndex: number, generation: number, nodeId: string): string {
  return `tile-${tileIndex + 1}:generation-${generation}:${nodeId}`;
}

function oneTimeRewardKey(tileIndex: number, nodeId: string): string {
  return `tile-${tileIndex + 1}:${nodeId}`;
}

function mapCorridors(
  corridors: WorldTileState['corridors'],
  update: (segment: CorridorSegment) => CorridorSegment,
): WorldTileState['corridors'] {
  return Object.fromEntries(DIRECTIONS.map((direction) => [
    direction,
    corridors[direction].map(update),
  ])) as unknown as WorldTileState['corridors'];
}

function mixSeed(worldSeed: number, tileIndex: number, generation: number): number {
  return (worldSeed ^ Math.imul(tileIndex + 1, 0x9e3779b1) ^ Math.imul(generation + 1, 0x85ebca6b)) >>> 0;
}

function mulberry32(seed: number): () => number {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let result = value;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4_294_967_296;
  };
}
