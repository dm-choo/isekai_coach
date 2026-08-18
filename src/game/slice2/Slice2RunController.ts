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
  readonly policy: readonly SlicePolicyId[];
  readonly policyChanged: boolean;
  readonly notice: string;
  readonly combat?: SliceSnapshot;
  readonly currentEncounter?: WorldEncounter;
  readonly canAdvanceTile: boolean;
  readonly attempt: number;
  readonly lastPolicyTrace: readonly PolicyExecutionStep[];
}

type Listener = () => void;

const AGGRESSIVE_POLICY: readonly SlicePolicyId[] = ['SHOOT', 'EVADE', 'POSITION', 'PUSH', 'EMPTY'];

export class Slice2RunController {
  private readonly listeners = new Set<Listener>();
  private world = createSlice2World();
  private mode: Slice2Mode = 'INTRO';
  private currentTileIndex = 0;
  private currentNodeId = 'room-west';
  private vitals: ExpeditionVitals = { administratorHp: 14, allyHp: 12 };
  private elapsedTravel = 0;
  private elapsedBattleTurns = 0;
  private policy: readonly SlicePolicyId[] = [...DEFAULT_SLICE_POLICY];
  private policyChanged = false;
  private notice = '네 개의 월드 타일을 지나 고블린 봉쇄선을 돌파한다.';
  private combat: SliceController | null = null;
  private combatUnsubscribe: (() => void) | null = null;
  private encounterCheckpoint: ExpeditionVitals | null = null;
  private attempt = 1;
  private lastPolicyTrace: readonly PolicyExecutionStep[] = [];
  private snapshot = this.buildSnapshot();

  public constructor(private readonly timing: { readonly playbackSpeed?: number; readonly phaseDelayScale?: number } = {}) {}

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
    if (this.mode !== 'EXPLORE' || !availableNodeIds(this.currentTile(), this.currentNodeId).includes(nodeId)) return;
    this.currentNodeId = nodeId;
    this.elapsedTravel += 1;
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
  };

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
    this.vitals = { ...this.encounterCheckpoint };
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
    this.policy = [...DEFAULT_SLICE_POLICY];
    this.policyChanged = false;
    this.lastPolicyTrace = [];
    this.notice = '네 개의 월드 타일을 지나 고블린 봉쇄선을 돌파한다.';
    this.encounterCheckpoint = null;
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
    this.encounterCheckpoint = { ...this.vitals };
    const scenario = createSlice2EncounterScenario(encounter.id, encounter.content, this.vitals);
    this.combat = new SliceController({
      scenarioFactory: () => scenario,
      administratorId: SLICE2_ADMINISTRATOR_ID,
      allyId: SLICE2_ALLY_ID,
      policy: this.policy,
      introNotice: `${encounterName(encounter.content)}이 길을 막고 있다.`,
      playbackSpeed: this.timing.playbackSpeed,
      phaseDelayScale: this.timing.phaseDelayScale,
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
    } else {
      this.vitals = {
        ...this.vitals,
        administratorHp: Math.max(0, this.vitals.administratorHp - 1),
      };
      this.notice = '뿌리 덫을 통과하며 관리자가 피해 1을 받았다.';
    }
    this.replaceCurrentTile(resolveNodeEncounter(this.currentTile(), this.currentNodeId));
    if (this.vitals.administratorHp <= 0) this.mode = 'DEFEAT';
    this.publish();
  }

  private enterNextTile(): void {
    this.currentTileIndex += 1;
    this.currentNodeId = 'room-west';
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
      availableNodeIds: this.mode === 'EXPLORE' ? availableNodeIds(tile, this.currentNodeId) : [],
      vitals: this.vitals,
      elapsedTravel: this.elapsedTravel,
      elapsedBattleTurns: this.elapsedBattleTurns,
      policy: this.policy,
      policyChanged: this.policyChanged,
      notice: this.notice,
      combat: this.combat?.getSnapshot(),
      currentEncounter: encounterAt(tile, this.currentNodeId),
      canAdvanceTile: this.mode === 'EXPLORE' && this.canAdvanceTile(),
      attempt: this.attempt,
      lastPolicyTrace: this.lastPolicyTrace,
    };
  }

  private publish(): void {
    this.snapshot = this.buildSnapshot();
    for (const listener of this.listeners) listener();
  }
}
