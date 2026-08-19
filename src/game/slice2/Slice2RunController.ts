import type { Direction } from '../combat';
import type { PresentationPort } from '../phaser/bridge/PresentationPort';
import {
  DEFAULT_SLICE_POLICY,
  SliceController,
  type SliceActionId,
  type SlicePolicyId,
  type PolicyExecutionStep,
  type SliceSnapshot,
} from '../slice';
import {
  SLICE2_ADMINISTRATOR_ID,
  SLICE2_ALLY_ID,
  createSlice2BossScenario,
  createSlice2EncounterScenario,
  encounterName,
  type ExpeditionVitals,
} from './scenarios';
import {
  createSlice2World,
  encounterAt,
  resolveNodeEncounter,
  type Slice2WorldState,
  type WorldEncounter,
  type WorldDirection,
  type WorldTileState,
} from './world';

export type Slice2Mode = 'INTRO' | 'EXPLORE' | 'COMBAT' | 'VICTORY' | 'DEFEAT';

export interface ExpeditionSupplies {
  readonly water: number;
  readonly food: number;
  readonly light: number;
}

export interface PolicyCombatSummary {
  readonly encounterId: string;
  readonly tileIndex: number;
  readonly policy: readonly SlicePolicyId[];
  readonly selectedCounts: Readonly<Partial<Record<SlicePolicyId, number>>>;
  readonly primaryBlocked?: {
    readonly policyId: SlicePolicyId;
    readonly reason: string;
    readonly count: number;
  };
  readonly turns: number;
  readonly vitalsBefore: ExpeditionVitals;
  readonly vitalsAfter: ExpeditionVitals;
}

export interface PolicyCombatComparison {
  readonly before: PolicyCombatSummary;
  readonly after: PolicyCombatSummary;
}

export interface Slice2RunOptions {
  readonly playbackSpeed?: number;
  readonly phaseDelayScale?: number;
  readonly startMinute?: number;
  readonly initialVitals?: ExpeditionVitals;
}

export interface Slice2RunSnapshot {
  readonly mode: Slice2Mode;
  readonly world: Slice2WorldState;
  readonly tile: WorldTileState;
  readonly currentTileIndex: number;
  readonly currentNodeId: string;
  readonly availableDoorDirections: readonly WorldDirection[];
  readonly vitals: ExpeditionVitals;
  readonly elapsedTravel: number;
  readonly elapsedBattleTurns: number;
  readonly elapsedEventMinutes: number;
  readonly policy: readonly SlicePolicyId[];
  readonly notice: string;
  readonly combat?: SliceSnapshot;
  readonly currentEncounter?: WorldEncounter;
  readonly canAdvanceTile: boolean;
  readonly attempt: number;
  readonly lastPolicyTrace: readonly PolicyExecutionStep[];
  readonly lastPolicySummary?: PolicyCombatSummary;
  readonly policyComparison?: PolicyCombatComparison;
  readonly worldMinute: number;
  readonly worldTime: string;
  readonly isNight: boolean;
  readonly supplies: ExpeditionSupplies;
  readonly canRest: boolean;
  readonly canUseLight: boolean;
  readonly restCount: number;
  readonly traversal?: CorridorTraversal;
  readonly isBossEncounter: boolean;
  readonly demoComplete: boolean;
}

export interface CorridorTraversal {
  readonly corridorDirection: WorldDirection;
  readonly heading: WorldDirection;
  readonly fromRoomId: string;
  readonly toRoomId: string;
  readonly segmentIds: readonly string[];
  readonly progressMeters: number;
  readonly distanceMeters: 400;
}

type Listener = () => void;

export const SLICE2_START_MINUTE = 10 * 60;
export const SLICE2_LATE_START_MINUTE = 17 * 60;
export const NIGHT_START_MINUTE = 18 * 60;
export const PATROL_RETURN_MINUTE = 11 * 60 + 30;
export const TRAVEL_MINUTES_PER_SEGMENT = 2;
export const EVENT_MINUTES = 5;
export const REST_MINUTES = 20;
export const REST_HEALING = 3;
export const MAX_CARRIED_SUPPLY = 2;

const BARRIER_GUARDIAN_ENCOUNTER: WorldEncounter = {
  id: 'slice2:barrier-guardian-finale',
  kind: 'BATTLE',
  content: 'BARRIER_GUARDIAN',
  resolved: false,
  oneTime: false,
};

export function rootSnareHpAfter(hp: number): number {
  return hp > 1 ? hp - 1 : Math.max(0, hp);
}

interface EncounterCheckpoint {
  readonly vitals: ExpeditionVitals;
  readonly supplies: ExpeditionSupplies;
  readonly worldMinute: number;
  readonly elapsedBattleTurns: number;
}

export class Slice2RunController {
  private readonly listeners = new Set<Listener>();
  private world = createSlice2World();
  private mode: Slice2Mode = 'INTRO';
  private currentTileIndex = 0;
  private currentNodeId = 'room-west';
  private vitals: ExpeditionVitals = { administratorHp: 14, allyHp: 12 };
  private elapsedTravel = 0;
  private elapsedBattleTurns = 0;
  private elapsedEventMinutes = 0;
  private readonly startMinute: number;
  private worldMinute: number;
  private supplies: ExpeditionSupplies = { water: 1, food: 1, light: 1 };
  private restCount = 0;
  private policy: readonly SlicePolicyId[] = [...DEFAULT_SLICE_POLICY];
  private notice = '네 개의 월드 타일을 지나 고블린 봉쇄선을 돌파한다.';
  private combat: SliceController | null = null;
  private combatUnsubscribe: (() => void) | null = null;
  private encounterCheckpoint: EncounterCheckpoint | null = null;
  private attempt = 1;
  private lastPolicyTrace: readonly PolicyExecutionStep[] = [];
  private lastPolicySummary: PolicyCombatSummary | undefined;
  private policyRevisionBaseline: PolicyCombatSummary | undefined;
  private policyComparison: PolicyCombatComparison | undefined;
  private traversal: CorridorTraversal | undefined;
  private isBossEncounter = false;
  private demoComplete = false;
  private snapshot: Slice2RunSnapshot;

  public constructor(private readonly timing: Slice2RunOptions = {}) {
    this.startMinute = timing.startMinute ?? SLICE2_START_MINUTE;
    this.worldMinute = this.startMinute;
    this.vitals = timing.initialVitals ? { ...timing.initialVitals } : this.vitals;
    this.snapshot = this.buildSnapshot();
  }

  public getSnapshot = (): Slice2RunSnapshot => this.snapshot;

  public subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  public startRun = (): void => {
    if (this.mode !== 'INTRO') return;
    this.mode = 'EXPLORE';
    this.notice = '서쪽 경계 방이다. 중앙 방을 확보해 통로를 정찰하자.';
    this.publish();
  };

  public enterCorridor = (heading: WorldDirection): void => {
    if (this.mode !== 'EXPLORE' || this.traversal) return;
    const journey = corridorForDoor(this.currentNodeId, heading);
    if (!journey) return;
    this.traversal = journey;
    this.notice = '통로에 진입했다. D로 전진하고 A로 출발 방까지 후퇴할 수 있다.';
    this.publish();
  };

  public advanceTravel = (direction: 'FORWARD' | 'BACK'): void => {
    if (this.mode !== 'EXPLORE' || !this.traversal) return;
    const delta = direction === 'FORWARD' ? 5 : -5;
    const previousProgress = this.traversal.progressMeters;
    const progressMeters = Math.max(0, Math.min(400, previousProgress + delta));
    if (progressMeters === 0 && direction === 'BACK') {
      this.currentNodeId = this.traversal.fromRoomId;
      this.traversal = undefined;
      this.notice = '출발 지점으로 돌아왔다.';
      this.publish();
      return;
    }
    this.traversal = { ...this.traversal, progressMeters };
    const crossedForwardMilestone = direction === 'FORWARD'
      && Math.floor(previousProgress / 100) < Math.floor(progressMeters / 100);
    const crossedBackwardMilestone = direction === 'BACK'
      && Math.ceil(previousProgress / 100) > Math.ceil(progressMeters / 100);
    if (crossedForwardMilestone || crossedBackwardMilestone) {
      this.elapsedTravel += 1;
      this.worldMinute += TRAVEL_MINUTES_PER_SEGMENT;
    }
    if (!crossedForwardMilestone) {
      if (crossedBackwardMilestone) {
        const segmentIndex = Math.max(0, Math.ceil(progressMeters / 100) - 1);
        this.currentNodeId = this.traversal.segmentIds[segmentIndex];
      }
      this.publish();
      return;
    }
    const segmentIndex = Math.floor(progressMeters / 100) - 1;
    const segmentId = this.traversal.segmentIds[segmentIndex];
    this.currentNodeId = segmentId;
    const encounter = encounterAt(this.currentTile(), segmentId);
    if (encounter && !encounter.resolved && encounter.kind === 'BATTLE') {
      this.beginCombat(encounter);
      return;
    }
    if (encounter && !encounter.resolved && encounter.kind === 'EVENT') {
      this.resolveEvent(encounter);
      if (this.vitals.administratorHp <= 0) return;
    }
    if (progressMeters === 400) {
      this.arriveAtDestinationRoom();
      return;
    }
    this.notice = `${progressMeters}m 지점을 통과했다.`;
    this.publish();
  };

  private arriveAtDestinationRoom(): void {
    if (!this.traversal) return;
    const destination = this.traversal.toRoomId;
    this.traversal = undefined;
    this.currentNodeId = destination;
    const encounter = encounterAt(this.currentTile(), destination);
    if (encounter && !encounter.resolved && encounter.kind === 'BATTLE') {
      this.beginCombat(encounter);
      return;
    }
    if (encounter && !encounter.resolved && encounter.kind === 'EVENT') {
      this.resolveEvent(encounter);
      return;
    }
    this.notice = destination === 'room-center'
      ? '중앙 방은 확보됐다. 네 통로의 위험 위치가 드러났다.'
      : '다음 방에 도착했다.';
    this.publish();
  }

  public advanceTile = (): void => {
    if (this.mode !== 'EXPLORE' || !this.canAdvanceTile()) return;
    if (this.currentTileIndex === this.world.tiles.length - 1) {
      this.beginBossCombat();
      return;
    }
    this.enterNextTile();
  };

  public movePolicy = (index: number, offset: -1 | 1): void => {
    if (this.mode === 'COMBAT') return;
    const destination = index + offset;
    if (index < 0 || index >= this.policy.length || destination < 0 || destination >= this.policy.length) return;
    const next = [...this.policy];
    if (!this.policyRevisionBaseline && this.lastPolicySummary) this.policyRevisionBaseline = this.lastPolicySummary;
    this.policyComparison = undefined;
    [next[index], next[destination]] = [next[destination], next[index]];
    this.policy = next;
    this.notice = '원거리 동료의 전술 우선순위를 변경했다.';
    this.publish();
  };

  public rest = (): void => {
    if (!this.canRest()) return;
    this.supplies = {
      ...this.supplies,
      water: this.supplies.water - 1,
      food: this.supplies.food - 1,
    };
    this.vitals = {
      administratorHp: Math.min(14, this.vitals.administratorHp + REST_HEALING),
      allyHp: Math.min(12, this.vitals.allyHp + REST_HEALING),
    };
    this.worldMinute += REST_MINUTES;
    this.restCount += 1;
    this.notice = `물과 식량을 소비해 20분 휴식했다. 두 전투원이 HP ${REST_HEALING}을 회복했다.`;
    this.publish();
  };

  public useLight = (): void => {
    if (!this.canUseLight() || !this.combat) return;
    this.supplies = { ...this.supplies, light: this.supplies.light - 1 };
    this.combat.revealEnemyIntents();
    this.notice = '휴대용 조명을 사용해 이번 전투의 모든 Intent를 공개했다.';
    this.publish();
  };

  public completeEncounter = (): void => {
    if (this.mode !== 'COMBAT' || !this.combat) return;
    const combat = this.combat.getSnapshot();
    if (combat.mode === 'DEFEAT') {
      this.mode = 'DEFEAT';
      this.notice = '원정대가 전투 불능이 됐다. 같은 인카운터 체크포인트에서 재시도할 수 있다.';
      this.publish();
      return;
    }
    if (this.isBossEncounter && combat.mode === 'VICTORY') return;
    if (combat.mode !== 'VICTORY' && combat.mode !== 'SEAL_UNLOCKED') return;
    const administrator = combat.state.units.find((unit) => unit.id === SLICE2_ADMINISTRATOR_ID);
    const ally = combat.state.units.find((unit) => unit.id === SLICE2_ALLY_ID);
    const vitalsAfter = {
      administratorHp: administrator?.hp ?? this.vitals.administratorHp,
      allyHp: ally?.hp ?? this.vitals.allyHp,
    };
    const encounter = this.isBossEncounter ? BARRIER_GUARDIAN_ENCOUNTER : encounterAt(this.currentTile(), this.currentNodeId);
    const summary = summarizePolicyCombat(
      encounter?.id ?? combat.scenarioId,
      this.currentTileIndex,
      this.policy,
      combat.policyHistory,
      combat.state.turn,
      this.encounterCheckpoint?.vitals ?? this.vitals,
      vitalsAfter,
    );
    this.vitals = vitalsAfter;
    this.elapsedBattleTurns += combat.state.turn;
    this.worldMinute += combat.state.turn;
    this.lastPolicyTrace = [...combat.lastPolicyTrace];
    this.lastPolicySummary = summary;
    if (this.policyRevisionBaseline && !samePolicy(this.policyRevisionBaseline.policy, summary.policy)) {
      this.policyComparison = { before: this.policyRevisionBaseline, after: summary };
      this.policyRevisionBaseline = undefined;
    }
    if (this.isBossEncounter) {
      this.releaseCombat();
      this.isBossEncounter = false;
      this.demoComplete = true;
      this.mode = 'VICTORY';
      this.notice = '결계문을 해제했다. 원정 데모 완료.';
      this.publish();
      return;
    }
    const centerCleared = this.currentNodeId === 'room-center';
    this.replaceCurrentTile(resolveNodeEncounter(this.currentTile(), this.currentNodeId));
    this.releaseCombat();
    this.mode = 'EXPLORE';
    if (this.traversal?.progressMeters === 400) {
      this.arriveAtDestinationRoom();
      return;
    }
    this.notice = centerCleared
      ? '중앙 방 확보. 네 통로의 인카운터 종류와 위치를 정찰했다.'
      : '통로의 위협을 제거했다. 같은 구간으로 복귀했다.';
    this.publish();
  };

  public retryEncounter = (): void => {
    const combatDefeat = this.mode === 'COMBAT' && this.combat?.getSnapshot().mode === 'DEFEAT';
    if ((!combatDefeat && this.mode !== 'DEFEAT') || !this.encounterCheckpoint) return;
    const encounter = this.isBossEncounter ? BARRIER_GUARDIAN_ENCOUNTER : encounterAt(this.currentTile(), this.currentNodeId);
    if (!encounter || encounter.kind !== 'BATTLE') return;
    this.vitals = { ...this.encounterCheckpoint.vitals };
    this.supplies = { ...this.encounterCheckpoint.supplies };
    this.worldMinute = this.encounterCheckpoint.worldMinute;
    this.elapsedBattleTurns = this.encounterCheckpoint.elapsedBattleTurns;
    if (this.isBossEncounter) this.beginBossCombat();
    else this.beginCombat(encounter);
  };

  public restartRun = (): void => {
    this.releaseCombat();
    this.world = createSlice2World();
    this.mode = 'INTRO';
    this.currentTileIndex = 0;
    this.currentNodeId = 'room-west';
    this.vitals = { administratorHp: 14, allyHp: 12 };
    this.elapsedTravel = 0;
    this.elapsedBattleTurns = 0;
    this.elapsedEventMinutes = 0;
    this.worldMinute = this.startMinute;
    this.supplies = { water: 1, food: 1, light: 1 };
    this.restCount = 0;
    this.policy = [...DEFAULT_SLICE_POLICY];
    this.lastPolicyTrace = [];
    this.lastPolicySummary = undefined;
    this.policyRevisionBaseline = undefined;
    this.policyComparison = undefined;
    this.isBossEncounter = false;
    this.demoComplete = false;
    this.notice = '네 개의 월드 타일을 지나 고블린 봉쇄선을 돌파한다.';
    this.encounterCheckpoint = null;
    this.traversal = undefined;
    this.attempt += 1;
    this.publish();
  };

  public attachPresentation(presentation: PresentationPort): () => void {
    return this.combat?.attachPresentation(presentation) ?? (() => presentation.destroy());
  }

  public selectTarget = (unitId: string): void => this.combat?.selectTarget(unitId);
  public startEncounter = (): void => this.combat?.startEncounter();
  public move = (direction: Direction): void => this.combat?.move(direction);
  public useAction = (actionId: SliceActionId): void => this.combat?.useAction(actionId);
  public setActionHover = (actionId?: SliceActionId): void => this.combat?.setActionHover(actionId);
  public undoLastAction = (): void => this.combat?.undoLastAction();
  public confirmPlan = (): void => this.combat?.confirmPlan();
  public unlockSeal = (): void => this.combat?.unlockSeal();

  public destroy(): void {
    this.releaseCombat();
    this.listeners.clear();
  }

  private beginCombat(encounter: WorldEncounter): void {
    this.releaseCombat();
    this.encounterCheckpoint = {
      vitals: { ...this.vitals },
      supplies: { ...this.supplies },
      worldMinute: this.worldMinute,
      elapsedBattleTurns: this.elapsedBattleTurns,
    };
    const night = isNightMinute(this.worldMinute);
    const scenario = createSlice2EncounterScenario(encounter.id, encounter.content, this.vitals, { worldMinute: this.worldMinute });
    this.combat = new SliceController({
      scenarioFactory: () => scenario,
      administratorId: SLICE2_ADMINISTRATOR_ID,
      allyId: SLICE2_ALLY_ID,
      policy: this.policy,
      introNotice: `${encounterName(encounter.content)}이 길을 막고 있다.`,
      playbackSpeed: this.timing.playbackSpeed,
      phaseDelayScale: this.timing.phaseDelayScale,
      concealOneEnemyIntent: night,
    });
    this.combatUnsubscribe = this.combat.subscribe(() => this.publish());
    this.mode = 'COMBAT';
    this.notice = encounterName(encounter.content);
    this.publish();
  }

  private beginBossCombat(): void {
    this.releaseCombat();
    this.isBossEncounter = true;
    this.encounterCheckpoint = {
      vitals: { ...this.vitals },
      supplies: { ...this.supplies },
      worldMinute: this.worldMinute,
      elapsedBattleTurns: this.elapsedBattleTurns,
    };
    const scenario = createSlice2BossScenario(this.vitals);
    this.combat = new SliceController({
      scenarioFactory: () => scenario,
      administratorId: SLICE2_ADMINISTRATOR_ID,
      allyId: SLICE2_ALLY_ID,
      policy: this.policy,
      introNotice: '결계 수호자가 봉쇄선의 마지막 문을 지키고 있다.',
      playbackSpeed: this.timing.playbackSpeed,
      phaseDelayScale: this.timing.phaseDelayScale,
      concealOneEnemyIntent: isNightMinute(this.worldMinute),
    });
    this.combatUnsubscribe = this.combat.subscribe(() => this.publish());
    this.mode = 'COMBAT';
    this.notice = '결계 수호자';
    this.publish();
  }

  private resolveEvent(encounter: WorldEncounter): void {
    if (encounter.content === 'RECOVERY_CACHE') {
      this.vitals = {
        administratorHp: Math.min(14, this.vitals.administratorHp + 2),
        allyHp: Math.min(12, this.vitals.allyHp + 2),
      };
      this.notice = '버려진 보급품을 회수해 두 전투원의 HP를 2 회복했다.';
    } else if (encounter.content === 'WATER_CACHE') {
      const before = this.supplies.water;
      if (before === MAX_CARRIED_SUPPLY) {
        this.notice = '수통이 가득 찼다. 물은 이 구간에 남겨두었다.';
        this.publish();
        return;
      }
      this.supplies = { ...this.supplies, water: before + 1 };
      this.notice = '깨끗한 물을 찾아 물 1을 확보했다.';
    } else if (encounter.content === 'RATION_CACHE') {
      const before = this.supplies.food;
      if (before === MAX_CARRIED_SUPPLY) {
        this.notice = '식량 주머니가 가득 찼다. 식량은 이 구간에 남겨두었다.';
        this.publish();
        return;
      }
      this.supplies = { ...this.supplies, food: before + 1 };
      this.notice = '버려진 야전 식량 1을 확보했다.';
    } else {
      const before = this.vitals.administratorHp;
      this.vitals = {
        ...this.vitals,
        administratorHp: rootSnareHpAfter(before),
      };
      this.notice = before > 1
        ? '뿌리 덫을 통과하며 관리자가 피해 1을 받았다.'
        : '뿌리 덫이 장비에 걸렸다. 치명상은 피했다.';
    }
    this.worldMinute += EVENT_MINUTES;
    this.elapsedEventMinutes += EVENT_MINUTES;
    this.replaceCurrentTile(resolveNodeEncounter(this.currentTile(), this.currentNodeId));
    if (this.vitals.administratorHp <= 0) this.mode = 'DEFEAT';
    this.publish();
  }

  private enterNextTile(): void {
    this.currentTileIndex += 1;
    this.currentNodeId = 'room-west';
    this.traversal = undefined;
    this.mode = 'EXPLORE';
    this.notice = `${this.currentTile().name}의 서쪽 경계 방에 진입했다.`;
    this.publish();
  }

  private currentTile(): WorldTileState {
    return this.world.tiles[this.currentTileIndex];
  }

  private replaceCurrentTile(tile: WorldTileState): void {
    this.world = {
      ...this.world,
      tiles: this.world.tiles.map((candidate, index) => index === this.currentTileIndex ? tile : candidate),
    };
  }

  private canAdvanceTile(): boolean {
    return this.currentNodeId === 'room-east' && this.currentTile().cleared;
  }

  private canRest(): boolean {
    if (this.mode !== 'EXPLORE' || this.traversal || this.supplies.water < 1 || this.supplies.food < 1) return false;
    if (this.vitals.administratorHp >= 14 && this.vitals.allyHp >= 12) return false;
    const room = this.currentTile().rooms.find((candidate) => candidate.id === this.currentNodeId);
    return Boolean(room?.encounter.resolved);
  }

  private canUseLight(): boolean {
    return this.mode === 'COMBAT'
      && this.supplies.light > 0
      && Boolean(this.combat?.getSnapshot().concealedIntentIds.length);
  }

  private releaseCombat(): void {
    this.combatUnsubscribe?.();
    this.combatUnsubscribe = null;
    this.combat?.destroy();
    this.combat = null;
  }

  private buildSnapshot(): Slice2RunSnapshot {
    const tile = this.currentTile();
    return {
      mode: this.mode,
      world: this.world,
      tile,
      currentTileIndex: this.currentTileIndex,
      currentNodeId: this.currentNodeId,
      availableDoorDirections: this.mode === 'EXPLORE' && !this.traversal ? doorDirectionsForRoom(this.currentNodeId) : [],
      vitals: this.vitals,
      elapsedTravel: this.elapsedTravel,
      elapsedBattleTurns: this.elapsedBattleTurns,
      elapsedEventMinutes: this.elapsedEventMinutes,
      policy: this.policy,
      notice: this.notice,
      combat: this.combat?.getSnapshot(),
      currentEncounter: this.isBossEncounter ? BARRIER_GUARDIAN_ENCOUNTER : encounterAt(tile, this.currentNodeId),
      canAdvanceTile: this.mode === 'EXPLORE' && this.canAdvanceTile(),
      attempt: this.attempt,
      lastPolicyTrace: this.lastPolicyTrace,
      lastPolicySummary: this.lastPolicySummary,
      policyComparison: this.policyComparison,
      worldMinute: this.currentDisplayMinute(),
      worldTime: formatWorldTime(this.currentDisplayMinute()),
      isNight: isNightMinute(this.currentDisplayMinute()),
      supplies: this.supplies,
      canRest: this.canRest(),
      canUseLight: this.canUseLight(),
      restCount: this.restCount,
      traversal: this.traversal ? { ...this.traversal } : undefined,
      isBossEncounter: this.isBossEncounter,
      demoComplete: this.demoComplete,
    };
  }

  private currentDisplayMinute(): number {
    const combat = this.combat?.getSnapshot();
    if (!combat || combat.mode === 'INTRO') return this.worldMinute;
    return this.worldMinute + Math.max(0, combat.state.turn - 1);
  }

  private publish(): void {
    this.snapshot = this.buildSnapshot();
    for (const listener of this.listeners) listener();
  }
}

export function formatWorldTime(minute: number): string {
  const normalized = ((minute % (24 * 60)) + 24 * 60) % (24 * 60);
  return `${String(Math.floor(normalized / 60)).padStart(2, '0')}:${String(normalized % 60).padStart(2, '0')}`;
}

export function isNightMinute(minute: number): boolean {
  const normalized = ((minute % (24 * 60)) + 24 * 60) % (24 * 60);
  return normalized >= NIGHT_START_MINUTE || normalized < 6 * 60;
}

const OPPOSITE_DIRECTION: Readonly<Record<WorldDirection, WorldDirection>> = {
  NORTH: 'SOUTH',
  EAST: 'WEST',
  SOUTH: 'NORTH',
  WEST: 'EAST',
};

export function doorDirectionsForRoom(roomId: string): readonly WorldDirection[] {
  if (roomId === 'room-center') return ['NORTH', 'EAST', 'SOUTH', 'WEST'];
  const match = /^room-(north|east|south|west)$/.exec(roomId);
  if (!match) return [];
  return [OPPOSITE_DIRECTION[match[1].toUpperCase() as WorldDirection]];
}

function corridorForDoor(roomId: string, heading: WorldDirection): CorridorTraversal | undefined {
  if (!doorDirectionsForRoom(roomId).includes(heading)) return undefined;
  const fromCenter = roomId === 'room-center';
  const corridorDirection = fromCenter
    ? heading
    : roomId.replace('room-', '').toUpperCase() as WorldDirection;
  const directionName = corridorDirection.toLowerCase();
  const indexes = fromCenter ? [1, 2, 3, 4] : [4, 3, 2, 1];
  return {
    corridorDirection,
    heading,
    fromRoomId: roomId,
    toRoomId: fromCenter ? `room-${directionName}` : 'room-center',
    segmentIds: indexes.map((index) => `${directionName}-${index}`),
    progressMeters: 0,
    distanceMeters: 400,
  };
}

function summarizePolicyCombat(
  encounterId: string,
  tileIndex: number,
  policy: readonly SlicePolicyId[],
  history: readonly PolicyExecutionStep[],
  turns: number,
  vitalsBefore: ExpeditionVitals,
  vitalsAfter: ExpeditionVitals,
): PolicyCombatSummary {
  const selectedCounts: Partial<Record<SlicePolicyId, number>> = {};
  const blockedCounts = new Map<string, { policyId: SlicePolicyId; reason: string; count: number }>();
  for (const step of history) {
    if (step.selectedPolicyId) {
      selectedCounts[step.selectedPolicyId] = (selectedCounts[step.selectedPolicyId] ?? 0) + 1;
    }
    for (const evaluation of step.evaluations) {
      if (evaluation.executable) continue;
      const key = `${evaluation.policyId}\u0000${evaluation.reason}`;
      const current = blockedCounts.get(key);
      blockedCounts.set(key, {
        policyId: evaluation.policyId,
        reason: evaluation.reason,
        count: (current?.count ?? 0) + 1,
      });
    }
  }
  const primaryBlocked = [...blockedCounts.values()]
    .sort((left, right) => right.count - left.count || policy.indexOf(left.policyId) - policy.indexOf(right.policyId))[0];
  return {
    encounterId,
    tileIndex,
    policy: [...policy],
    selectedCounts,
    ...(primaryBlocked ? { primaryBlocked } : {}),
    turns,
    vitalsBefore: { ...vitalsBefore },
    vitalsAfter: { ...vitalsAfter },
  };
}

function samePolicy(left: readonly SlicePolicyId[], right: readonly SlicePolicyId[]): boolean {
  return left.length === right.length && left.every((policyId, index) => policyId === right[index]);
}
