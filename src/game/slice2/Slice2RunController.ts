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
  createSlice2EncounterScenario,
  encounterName,
  type ExpeditionVitals,
} from './scenarios';
import {
  availableNodeIds,
  createSlice2World,
  encounterAt,
  resolveNodeEncounter,
  type Slice2WorldState,
  type WorldEncounter,
  type WorldTileState,
} from './world';

export type Slice2Mode = 'INTRO' | 'EXPLORE' | 'COMBAT' | 'POLICY_REVIEW' | 'VICTORY' | 'DEFEAT';

export interface ExpeditionSupplies {
  readonly water: number;
  readonly food: number;
  readonly light: number;
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
  readonly availableNodeIds: readonly string[];
  readonly vitals: ExpeditionVitals;
  readonly elapsedTravel: number;
  readonly elapsedBattleTurns: number;
  readonly elapsedEventMinutes: number;
  readonly policy: readonly SlicePolicyId[];
  readonly policyChanged: boolean;
  readonly notice: string;
  readonly combat?: SliceSnapshot;
  readonly currentEncounter?: WorldEncounter;
  readonly canAdvanceTile: boolean;
  readonly attempt: number;
  readonly lastPolicyTrace: readonly PolicyExecutionStep[];
  readonly worldMinute: number;
  readonly worldTime: string;
  readonly isNight: boolean;
  readonly supplies: ExpeditionSupplies;
  readonly canRest: boolean;
  readonly canUseLight: boolean;
  readonly restCount: number;
  readonly traversal?: CorridorTraversal;
}

export interface CorridorTraversal {
  readonly fromNodeId: string;
  readonly toNodeId: string;
  readonly progressMeters: number;
  readonly distanceMeters: 100;
}

type Listener = () => void;

const AGGRESSIVE_POLICY: readonly SlicePolicyId[] = ['SHOOT', 'EVADE', 'POSITION', 'PUSH', 'EMPTY'];
export const SLICE2_START_MINUTE = 10 * 60;
export const SLICE2_LATE_START_MINUTE = 17 * 60;
export const NIGHT_START_MINUTE = 18 * 60;
export const PATROL_RETURN_MINUTE = 11 * 60 + 30;
export const TRAVEL_MINUTES_PER_SEGMENT = 2;
export const EVENT_MINUTES = 5;
export const REST_MINUTES = 20;
export const REST_HEALING = 3;
export const MAX_CARRIED_SUPPLY = 2;

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
  private policyChanged = false;
  private notice = '네 개의 월드 타일을 지나 고블린 봉쇄선을 돌파한다.';
  private combat: SliceController | null = null;
  private combatUnsubscribe: (() => void) | null = null;
  private encounterCheckpoint: EncounterCheckpoint | null = null;
  private attempt = 1;
  private lastPolicyTrace: readonly PolicyExecutionStep[] = [];
  private traversal: CorridorTraversal | undefined;
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

  public moveTo = (nodeId: string): void => {
    if (this.mode !== 'EXPLORE' || this.traversal || !availableNodeIds(this.currentTile(), this.currentNodeId).includes(nodeId)) return;
    this.traversal = { fromNodeId: this.currentNodeId, toNodeId: nodeId, progressMeters: 0, distanceMeters: 100 };
    this.notice = `${nodeId} 방향 통로에 진입했다. D를 누르고 이동하십시오.`;
    this.publish();
  };

  public advanceTravel = (direction: 'FORWARD' | 'BACK'): void => {
    if (this.mode !== 'EXPLORE' || !this.traversal) return;
    const delta = direction === 'FORWARD' ? 5 : -5;
    const progressMeters = Math.max(0, Math.min(100, this.traversal.progressMeters + delta));
    if (progressMeters === 0 && direction === 'BACK') {
      this.traversal = undefined;
      this.notice = '출발 지점으로 돌아왔다.';
      this.publish();
      return;
    }
    this.traversal = { ...this.traversal, progressMeters };
    if (progressMeters < 100) {
      this.publish();
      return;
    }
    const destination = this.traversal.toNodeId;
    this.traversal = undefined;
    this.arriveAtNode(destination);
  };

  private arriveAtNode(nodeId: string): void {
    this.currentNodeId = nodeId;
    this.elapsedTravel += 1;
    this.worldMinute += TRAVEL_MINUTES_PER_SEGMENT;
    const encounter = encounterAt(this.currentTile(), nodeId);
    if (encounter && !encounter.resolved && encounter.kind === 'BATTLE') {
      this.beginCombat(encounter);
      return;
    }
    if (encounter && !encounter.resolved && encounter.kind === 'EVENT') {
      this.resolveEvent(encounter);
      return;
    }
    this.notice = nodeId === 'room-center'
      ? '중앙 방은 확보됐다. 네 통로의 위험 위치가 드러났다.'
      : '통로를 이동했다.';
    this.publish();
  }

  public advanceTile = (): void => {
    if (this.mode !== 'EXPLORE' || !this.canAdvanceTile()) return;
    if (this.currentTileIndex === this.world.tiles.length - 1) {
      this.mode = 'VICTORY';
      this.notice = '네 개의 월드 타일에 안전 경로를 확보했다.';
      this.publish();
      return;
    }
    if (this.currentTileIndex === 1 && !this.policyChanged) {
      this.mode = 'POLICY_REVIEW';
      this.notice = '두 타일의 기록을 바탕으로 동료 전술 순서를 한 번 조정한다.';
      this.publish();
      return;
    }
    this.enterNextTile();
  };

  public choosePolicy = (kind: 'KEEP' | 'AGGRESSIVE'): void => {
    if (this.mode !== 'POLICY_REVIEW') return;
    this.policy = kind === 'AGGRESSIVE' ? [...AGGRESSIVE_POLICY] : [...DEFAULT_SLICE_POLICY];
    this.policyChanged = true;
    this.enterNextTile();
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
    if (combat.mode !== 'VICTORY') return;
    const administrator = combat.state.units.find((unit) => unit.id === SLICE2_ADMINISTRATOR_ID);
    const ally = combat.state.units.find((unit) => unit.id === SLICE2_ALLY_ID);
    this.vitals = {
      administratorHp: administrator?.hp ?? this.vitals.administratorHp,
      allyHp: ally?.hp ?? this.vitals.allyHp,
    };
    this.elapsedBattleTurns += combat.state.turn;
    this.worldMinute += combat.state.turn;
    this.lastPolicyTrace = [...combat.lastPolicyTrace];
    const centerCleared = this.currentNodeId === 'room-center';
    this.replaceCurrentTile(resolveNodeEncounter(this.currentTile(), this.currentNodeId));
    this.releaseCombat();
    this.mode = 'EXPLORE';
    this.notice = centerCleared
      ? '중앙 방 확보. 네 통로의 인카운터 종류와 위치를 정찰했다.'
      : '통로의 위협을 제거했다. 같은 구간으로 복귀했다.';
    this.publish();
  };

  public retryEncounter = (): void => {
    const combatDefeat = this.mode === 'COMBAT' && this.combat?.getSnapshot().mode === 'DEFEAT';
    if ((!combatDefeat && this.mode !== 'DEFEAT') || !this.encounterCheckpoint) return;
    const encounter = encounterAt(this.currentTile(), this.currentNodeId);
    if (!encounter || encounter.kind !== 'BATTLE') return;
    this.vitals = { ...this.encounterCheckpoint.vitals };
    this.supplies = { ...this.encounterCheckpoint.supplies };
    this.worldMinute = this.encounterCheckpoint.worldMinute;
    this.elapsedBattleTurns = this.encounterCheckpoint.elapsedBattleTurns;
    this.beginCombat(encounter);
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
    this.policyChanged = false;
    this.lastPolicyTrace = [];
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
      this.vitals = {
        ...this.vitals,
        administratorHp: Math.max(0, this.vitals.administratorHp - 1),
      };
      this.notice = '뿌리 덫을 통과하며 관리자가 피해 1을 받았다.';
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
      availableNodeIds: this.mode === 'EXPLORE' && !this.traversal ? availableNodeIds(tile, this.currentNodeId) : [],
      vitals: this.vitals,
      elapsedTravel: this.elapsedTravel,
      elapsedBattleTurns: this.elapsedBattleTurns,
      elapsedEventMinutes: this.elapsedEventMinutes,
      policy: this.policy,
      policyChanged: this.policyChanged,
      notice: this.notice,
      combat: this.combat?.getSnapshot(),
      currentEncounter: encounterAt(tile, this.currentNodeId),
      canAdvanceTile: this.mode === 'EXPLORE' && this.canAdvanceTile(),
      attempt: this.attempt,
      lastPolicyTrace: this.lastPolicyTrace,
      worldMinute: this.currentDisplayMinute(),
      worldTime: formatWorldTime(this.currentDisplayMinute()),
      isNight: isNightMinute(this.currentDisplayMinute()),
      supplies: this.supplies,
      canRest: this.canRest(),
      canUseLight: this.canUseLight(),
      restCount: this.restCount,
      traversal: this.traversal ? { ...this.traversal } : undefined,
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
