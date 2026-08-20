import type { Direction } from '../combat';
import type { PresentationPort } from '../phaser/bridge/PresentationPort';
import {
  DEFAULT_SLICE_POLICY,
  POLICY_COPY,
  SliceController,
  type PolicyExecutionStep,
  type PolicyDirectives,
  type SliceActionId,
  type SlicePolicyId,
  type SliceSnapshot,
} from '../slice';
import {
  SLICE2_ADMINISTRATOR_ID,
  SLICE2_ALLY_ID,
  formatWorldTime,
  type EncounterContent,
  type ExpeditionVitals,
} from '../slice2';
import {
  createSubmissionWorld,
  incorporateTile,
  updateSubmissionTile,
  type IncorporationBlocker,
  type SubmissionWorldState,
} from './world';
import { simulateDelegatedOperation, type DelegatedOperationResult } from './delegation';
import {
  SUBMISSION_FIRST_ROUTE,
  SUBMISSION_FRONTIER_ROUTES,
  getSubmissionRouteSpec,
  isSubmissionFrontierId,
  type SubmissionFrontierId,
  type SubmissionRouteSpec,
} from './routes';
import { createSubmissionJointScenario, createSubmissionSoloScenario } from './scenarios';

export type SubmissionMode =
  | 'AWAKENING' | 'SOLO_APPROACH' | 'COMPANION_SEALED' | 'COMPANION_JOINED'
  | 'INTRO' | 'CORRIDOR' | 'CENTER_GATE' | 'COMBAT' | 'SCOUTED'
  | 'POLICY_REVIEW' | 'DELEGATION_PLAN' | 'DELEGATION_RESULT'
  | 'ANCHOR_APPROACH' | 'ANCHOR_READY' | 'EXPANDED' | 'COMPLETE' | 'DEFEAT';
export type SubmissionEncounterId =
  | 'SOLO_WARRIOR' | 'FIRST_WARRIOR' | 'CENTER_GUARD'
  | 'SECOND_EAST_CENTER' | 'SECOND_NORTH_CENTER';
export type SubmissionPolicyChoice = 'PUSH_FIRST' | 'KEEP_RANGE';
export type SubmissionFrontierBlocker = 'NOT_REVEALED' | 'SPRING_DORMANT' | 'WATER_REQUIRED';
export interface SubmissionDefeatCost {
  readonly elapsedMinutes: number;
  readonly waterSpent: number;
  readonly foodSpent: number;
}

export interface SubmissionCombatSummary {
  readonly encounterId: SubmissionEncounterId;
  readonly turns: number;
  readonly selectedCounts: Readonly<Partial<Record<SlicePolicyId, number>>>;
  readonly primaryBlocked?: { readonly policyId: SlicePolicyId; readonly reason: string; readonly count: number };
  readonly blockedByPolicy: Readonly<Partial<Record<SlicePolicyId, { readonly reason: string; readonly count: number }>>>;
}

export interface SubmissionFrontierChoiceSnapshot {
  readonly id: SubmissionFrontierId;
  readonly available: boolean;
  readonly selected: boolean;
  readonly waterPaid: boolean;
  readonly blocker?: SubmissionFrontierBlocker;
}

export interface SubmissionSnapshot {
  readonly mode: SubmissionMode;
  readonly world: SubmissionWorldState;
  readonly worldMinute: number;
  readonly worldTime: string;
  readonly prologueProgress: number;
  readonly soloEncounterResolved: boolean;
  readonly companionJoined: boolean;
  readonly corridorProgress: number;
  readonly currentRoute: SubmissionRouteSpec;
  readonly selectedFrontierId?: SubmissionFrontierId;
  readonly activeFrontierId?: SubmissionFrontierId;
  readonly paidWaterFrontierId?: SubmissionFrontierId;
  readonly frontierChoices: readonly SubmissionFrontierChoiceSnapshot[];
  readonly vitals: ExpeditionVitals;
  readonly supplies: { readonly water: number; readonly food: number };
  readonly policy: readonly SlicePolicyId[];
  readonly notice: string;
  readonly combat?: SliceSnapshot;
  readonly encounterId?: SubmissionEncounterId;
  readonly encounterContent?: EncounterContent;
  readonly elapsedBattleTurns: number;
  readonly lastCombatSummary?: SubmissionCombatSummary;
  readonly policyChoice?: SubmissionPolicyChoice;
  readonly policyDirectives: PolicyDirectives;
  readonly retreatAtHp: number;
  readonly protagonistTaskMinutes: number;
  readonly delegationAttempt: number;
  readonly delegationRecoveryRequired: boolean;
  readonly delegationRecoveryMinutes: number;
  readonly delegationBaseline?: DelegatedOperationResult;
  readonly delegationResult?: DelegatedOperationResult;
  readonly anchorProgress: number;
  readonly incorporationBlocker?: IncorporationBlocker;
  readonly defeatCount: number;
  readonly lastDefeatCost?: SubmissionDefeatCost;
  readonly preDelegationRestRequired: boolean;
  readonly defeatReturnsToTerritory: true;
  readonly isNight: false;
  readonly canUseLight: false;
  readonly isBossEncounter: false;
}

export interface SubmissionControllerOptions {
  readonly playbackSpeed?: number;
  readonly phaseDelayScale?: number;
  readonly saveData?: SubmissionSaveData;
  readonly initialVitals?: ExpeditionVitals;
}

export interface SubmissionSaveData {
  readonly version: 3;
  readonly mode: Exclude<SubmissionMode, 'COMBAT' | 'DEFEAT'>;
  readonly world: SubmissionWorldState;
  readonly worldMinute: number;
  readonly prologueProgress: number;
  readonly soloEncounterResolved: boolean;
  readonly companionJoined: boolean;
  readonly corridorProgress: number;
  readonly selectedFrontierId?: SubmissionFrontierId;
  readonly activeFrontierId?: SubmissionFrontierId;
  readonly paidWaterFrontierId?: SubmissionFrontierId;
  readonly vitals: ExpeditionVitals;
  readonly supplies: { readonly water: number; readonly food: number };
  readonly policy: readonly SlicePolicyId[];
  readonly policyDirectives: PolicyDirectives;
  readonly notice: string;
  readonly firstEncounterResolved: boolean;
  readonly elapsedBattleTurns: number;
  readonly lastCombatSummary?: SubmissionCombatSummary;
  readonly policyChoice?: SubmissionPolicyChoice;
  readonly lastProtagonistTaskMinutes: number;
  readonly delegationAttempt: number;
  readonly delegationBaseline?: DelegatedOperationResult;
  readonly delegationResult?: DelegatedOperationResult;
  readonly anchorProgress: number;
  readonly incorporationBlocker?: IncorporationBlocker;
  readonly defeatCount?: number;
  readonly lastDefeatCost?: SubmissionDefeatCost;
}

type Listener = () => void;

const START_MINUTE = 10 * 60;
const TRAVEL_MINUTES_PER_100M = 2;
const PRE_DELEGATION_REST_HP = 6;
const REST_MINUTES = 20;
const DELEGATION_RECOVERY_MINUTES = 30;
const DELEGATION_RECOVERY_HP = 4;

export class SubmissionController {
  private readonly listeners = new Set<Listener>();
  private mode: SubmissionMode = 'AWAKENING';
  private world = createSubmissionWorld();
  private worldMinute = START_MINUTE;
  private prologueProgress = 0;
  private soloEncounterResolved = false;
  private companionJoined = false;
  private corridorProgress = 0;
  private selectedFrontierId: SubmissionFrontierId | undefined;
  private activeFrontierId: SubmissionFrontierId | undefined;
  private paidWaterFrontierId: SubmissionFrontierId | undefined;
  private vitals: ExpeditionVitals = { administratorHp: 14, allyHp: 12 };
  private supplies = { water: 1, food: 1 };
  private policy: readonly SlicePolicyId[] = [...DEFAULT_SLICE_POLICY];
  private policyDirectives: PolicyDirectives = {};
  private notice = '결계 안에서 눈을 떴다.';
  private combat: SliceController | null = null;
  private combatUnsubscribe: (() => void) | null = null;
  private encounterId: SubmissionEncounterId | undefined;
  private encounterContent: EncounterContent | undefined;
  private firstEncounterResolved = false;
  private elapsedBattleTurns = 0;
  private lastCombatSummary: SubmissionCombatSummary | undefined;
  private policyChoice: SubmissionPolicyChoice | undefined;
  private readonly retreatAtHp = 2;
  private readonly initialProtagonistTaskMinutes = 5;
  private lastProtagonistTaskMinutes = 0;
  private delegationAttempt = 0;
  private delegationBaseline: DelegatedOperationResult | undefined;
  private delegationResult: DelegatedOperationResult | undefined;
  private anchorProgress = 0;
  private lastIncorporationBlocker: IncorporationBlocker | undefined;
  private defeatCount = 0;
  private lastDefeatCost: SubmissionDefeatCost | undefined;
  private snapshot: SubmissionSnapshot;

  public constructor(private readonly options: SubmissionControllerOptions = {}) {
    if (options.saveData) this.hydrate(options.saveData);
    else if (options.initialVitals) this.vitals = options.initialVitals;
    this.snapshot = this.buildSnapshot();
  }

  public getSnapshot = (): SubmissionSnapshot => this.snapshot;

  public subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  public exportSave = (): SubmissionSaveData | undefined => {
    if (this.mode === 'DEFEAT') return undefined;
    if (this.mode === 'COMBAT') {
      const recovery = this.previewDefeatRecovery();
      return recovery ? this.buildSave(recovery.mode, recovery.overrides) : undefined;
    }
    return this.buildSave(this.mode);
  };

  private buildSave(
    mode: SubmissionSaveData['mode'],
    overrides: Partial<Omit<SubmissionSaveData, 'version' | 'mode'>> = {},
  ): SubmissionSaveData {
    return {
      version: 3,
      mode,
      world: this.world,
      worldMinute: this.worldMinute,
      prologueProgress: this.prologueProgress,
      soloEncounterResolved: this.soloEncounterResolved,
      companionJoined: this.companionJoined,
      corridorProgress: this.corridorProgress,
      selectedFrontierId: this.selectedFrontierId,
      activeFrontierId: this.activeFrontierId,
      paidWaterFrontierId: this.paidWaterFrontierId,
      vitals: this.vitals,
      supplies: this.supplies,
      policy: this.policy,
      policyDirectives: this.policyDirectives,
      notice: this.notice,
      firstEncounterResolved: this.firstEncounterResolved,
      elapsedBattleTurns: this.elapsedBattleTurns,
      lastCombatSummary: this.lastCombatSummary,
      policyChoice: this.policyChoice,
      lastProtagonistTaskMinutes: this.lastProtagonistTaskMinutes,
      delegationAttempt: this.delegationAttempt,
      delegationBaseline: this.delegationBaseline,
      delegationResult: this.delegationResult,
      anchorProgress: this.anchorProgress,
      incorporationBlocker: this.lastIncorporationBlocker,
      defeatCount: this.defeatCount,
      lastDefeatCost: this.lastDefeatCost,
      ...overrides,
    };
  }

  public performPrimaryAction = (): boolean => {
    if (this.mode === 'COMPANION_SEALED') this.releaseCompanion();
    else if (this.mode === 'INTRO') this.startExpedition();
    else if (this.mode === 'CENTER_GATE') this.enterCenter();
    else if (this.mode === 'SCOUTED' && this.requiresPreDelegationRest()) this.restAtSecuredCenter();
    else if (this.mode === 'SCOUTED') this.beginPolicyReview();
    else if (this.mode === 'POLICY_REVIEW' && this.policyChoice) this.openDelegationPlan();
    else if (this.mode === 'DELEGATION_PLAN') this.runDelegation();
    else if (this.mode === 'DELEGATION_RESULT' && this.delegationResult?.outcome === 'SECURED') this.beginAnchorApproach();
    else if (this.mode === 'DELEGATION_RESULT') this.beginPolicyReview();
    else if (this.mode === 'ANCHOR_READY') this.activateAnchor();
    else if (this.mode === 'EXPANDED') return this.commitFrontierSelection();
    else if (this.mode === 'COMPLETE') this.restartSubmission();
    else if (this.mode === 'COMBAT' && this.combat?.getSnapshot().mode === 'INTRO') this.startEncounter();
    else if (this.mode === 'COMBAT' && this.combat?.getSnapshot().mode === 'PLAYER_TURN') {
      if (this.isSoloLearningTurn() && (this.combat.getSnapshot().plannedActions.length === 0 || this.isSoloLearningDestinationThreatened())) return false;
      this.confirmPlan();
    }
    else if (this.mode === 'COMBAT' && this.combat?.getSnapshot().mode === 'VICTORY') this.completeEncounter();
    else if (this.mode === 'COMBAT' && this.combat?.getSnapshot().mode === 'DEFEAT') this.retryEncounter();
    else return false;
    return true;
  };

  public selectFrontier = (frontierId: SubmissionFrontierId): boolean => {
    if (this.mode !== 'EXPANDED' || this.activeFrontierId) return false;
    const blocker = this.frontierBlocker(frontierId);
    if (blocker) return false;
    if (this.selectedFrontierId === frontierId) return true;
    this.selectedFrontierId = frontierId;
    const route = getSubmissionRouteSpec(frontierId);
    this.notice = `${route.direction === 'NORTH' ? '북쪽' : '동쪽'} 경로 선택 · SPACE로 원정을 확정한다.`;
    this.publish();
    return true;
  };

  public restAtSecuredCenter = (): void => {
    if (this.mode !== 'SCOUTED' || !this.requiresPreDelegationRest()) return;
    const result = applySubmissionRest({ vitals: this.vitals, supplies: this.supplies });
    this.vitals = result.vitals;
    this.supplies = result.supplies;
    this.worldMinute += result.elapsedMinutes;
    this.notice = '안전한 중앙 방에서 물과 식량을 사용해 원정대를 회복했다.';
    this.publish();
  };

  public advancePrologue = (): void => {
    if (this.mode !== 'AWAKENING' && this.mode !== 'SOLO_APPROACH') return;
    this.mode = 'SOLO_APPROACH';
    const previous = this.prologueProgress;
    this.prologueProgress = Math.min(100, previous + 5);
    if (this.prologueProgress >= 100) {
      this.worldMinute += TRAVEL_MINUTES_PER_100M;
      this.beginCombat('SOLO_WARRIOR', 'GOBLIN_WARRIOR');
      return;
    }
    this.notice = this.prologueProgress < 45
      ? '빛이 닿지 않는 틈에서 움직임이 보인다.'
      : '바깥의 발소리가 가까워진다.';
    this.publish();
  };

  public releaseCompanion = (): void => {
    if (this.mode !== 'COMPANION_SEALED') return;
    this.companionJoined = true;
    this.mode = 'COMPANION_JOINED';
    this.notice = '봉인이 풀렸다. 두 사람의 실루엣이 같은 방향을 향한다.';
    this.publish();
  };

  public startExpedition = (): void => {
    if (this.mode !== 'COMPANION_JOINED' && this.mode !== 'INTRO') return;
    this.mode = 'CORRIDOR';
    this.notice = 'D를 누르는 동안 동쪽 통로를 걷는다. 조우하면 자동으로 멈춘다.';
    this.publish();
  };

  private commitFrontierSelection(): boolean {
    const frontierId = this.selectedFrontierId;
    if (!frontierId || this.frontierBlocker(frontierId)) return false;
    const route = getSubmissionRouteSpec(frontierId);
    if (route.waterCost > 0 && this.paidWaterFrontierId !== frontierId) {
      this.supplies = { ...this.supplies, water: this.supplies.water - route.waterCost };
      this.paidWaterFrontierId = frontierId;
    }
    this.activeFrontierId = frontierId;
    this.corridorProgress = 0;
    this.anchorProgress = 0;
    this.lastCombatSummary = undefined;
    this.lastProtagonistTaskMinutes = 0;
    this.delegationAttempt = 0;
    this.delegationBaseline = undefined;
    this.delegationResult = undefined;
    this.lastIncorporationBlocker = undefined;
    this.mode = 'CORRIDOR';
    this.notice = `${route.direction === 'NORTH' ? '북쪽' : '동쪽'} ${route.distanceMeters}m 원정을 시작한다.`;
    this.publish();
    return true;
  }

  public advanceCorridor = (): void => {
    if (this.mode !== 'CORRIDOR') return;
    const route = this.currentRoute();
    const previous = this.corridorProgress;
    this.corridorProgress = Math.min(route.distanceMeters, previous + 5);
    if (Math.floor(previous / 100) < Math.floor(this.corridorProgress / 100)) {
      this.worldMinute += TRAVEL_MINUTES_PER_100M;
    }
    if (!this.activeFrontierId && !this.firstEncounterResolved && this.corridorProgress >= 200) {
      this.beginCombat('FIRST_WARRIOR', 'GOBLIN_WARRIOR');
      return;
    }
    if (this.corridorProgress >= route.distanceMeters) {
      this.mode = 'CENTER_GATE';
      this.notice = `중앙 방 앞이다. 안쪽에서 ${route.threatCount}개의 움직임이 갈라진다.`;
      this.publish();
      return;
    }
    this.notice = `${this.corridorProgress}m · ${route.direction === 'NORTH' ? '북쪽' : '동쪽'}으로 전진 중`;
    this.publish();
  };

  public enterCenter = (): void => {
    if (this.mode !== 'CENTER_GATE') return;
    const route = this.currentRoute();
    this.beginCombat(route.centerEncounterId as SubmissionEncounterId, route.centerContent);
  };

  public beginPolicyReview = (): void => {
    if (this.mode !== 'SCOUTED' && this.mode !== 'DELEGATION_RESULT') return;
    const recovered = this.requiresDelegationRecovery();
    if (recovered) {
      this.worldMinute += DELEGATION_RECOVERY_MINUTES;
      this.vitals = {
        ...this.vitals,
        allyHp: Math.min(12, Math.max(DELEGATION_RECOVERY_HP, this.vitals.allyHp)),
      };
    }
    this.mode = 'POLICY_REVIEW';
    this.notice = recovered
      ? `결계 안으로 후송해 ${DELEGATION_RECOVERY_MINUTES}분을 잃었다. 같은 기록에서 대응을 다시 고른다.`
      : '직전 전투 기록을 보고 동료의 공간 대응 한 곳을 바꾼다.';
    this.publish();
  };

  public choosePolicy = (choice: SubmissionPolicyChoice): void => {
    if (this.mode !== 'POLICY_REVIEW') return;
    this.policyChoice = choice;
    if (choice === 'PUSH_FIRST') {
      this.policy = ['PUSH', 'EVADE', 'POSITION', 'SHOOT', 'EMPTY'];
      this.policyDirectives = {};
      this.notice = '접근 대응 선택 · 인접한 적은 밀쳐낸 뒤 기존 전술을 평가한다.';
    } else {
      this.policy = [...DEFAULT_SLICE_POLICY];
      this.policyDirectives = { keepRange: true };
      this.notice = '사거리 유지 선택 · 최소 사거리 안에서는 거리를 다시 만든다.';
    }
    this.publish();
  };

  public openDelegationPlan = (): void => {
    if (this.mode !== 'POLICY_REVIEW' || !this.policyChoice) return;
    const route = this.currentRoute();
    this.mode = 'DELEGATION_PLAN';
    this.notice = `정찰된 ${route.direction === 'NORTH' ? '북쪽' : '동쪽'} 통로 · 알려진 적 ${route.threatCount} · HP 2 이하 후퇴.`;
    this.publish();
  };

  public runDelegation = (): void => {
    if (this.mode !== 'DELEGATION_PLAN' || !this.policyChoice) return;
    const route = this.currentRoute();
    const targetId = route.targetTileId;
    this.delegationAttempt += 1;
    this.delegationBaseline = simulateDelegatedOperation({
      allyHp: this.vitals.allyHp,
      retreatAtHp: this.retreatAtHp,
      worldMinute: this.worldMinute,
      frontierId: this.activeFrontierId,
    });
    this.delegationResult = simulateDelegatedOperation({
      allyHp: this.vitals.allyHp,
      policy: this.policy,
      directives: this.policyDirectives,
      retreatAtHp: this.retreatAtHp,
      worldMinute: this.worldMinute,
      frontierId: this.activeFrontierId,
    });
    const result = this.delegationResult;
    const frontierBeforeOperation = this.world.tiles.find((tile) => tile.id === targetId);
    this.lastProtagonistTaskMinutes = frontierBeforeOperation?.anchorPrepared ? 0 : this.initialProtagonistTaskMinutes;
    const sharedElapsed = Math.max(this.lastProtagonistTaskMinutes, result.elapsedMinutes);
    this.worldMinute += sharedElapsed;
    this.vitals = { ...this.vitals, allyHp: result.finalHp };
    this.world = updateSubmissionTile(this.world, targetId, {
      anchorPrepared: true,
      ...(result.outcome === 'SECURED' ? { threat: 'SECURED' as const, routeSafe: true } : {}),
    });
    this.mode = 'DELEGATION_RESULT';
    this.notice = result.outcome === 'SECURED'
      ? this.lastProtagonistTaskMinutes > 0
        ? `${route.direction === 'NORTH' ? '북쪽' : '동쪽'} 통로 확보. 같은 시간 동안 주인공의 확장 회로 준비도 끝났다.`
        : `${route.direction === 'NORTH' ? '북쪽' : '동쪽'} 통로 확보. 먼저 준비된 확장 회로와 안전 경로가 연결됐다.`
      : result.outcome === 'TIME_LIMIT'
        ? '시간 한도 도달. 동료는 안전하지만 통로 위협이 남았다.'
        : result.outcome === 'RETREATED'
          ? '후퇴 조건 발동. 동료는 돌아왔지만 통로 위협이 남았다.'
          : '별동대 전투 불능. 이 작전은 경로를 확보하지 못했다.';
    this.publish();
  };

  public beginAnchorApproach = (): void => {
    if (this.mode !== 'DELEGATION_RESULT' || this.delegationResult?.outcome !== 'SECURED') return;
    const route = this.currentRoute();
    const frontier = this.world.tiles.find((tile) => tile.id === route.targetTileId);
    if (!frontier?.routeSafe) return;
    this.anchorProgress = 0;
    this.mode = 'ANCHOR_APPROACH';
    this.notice = `동료가 확보한 길이다. D를 누르는 동안 ${route.direction === 'NORTH' ? '북쪽' : '동쪽'} 경계 거점으로 이동한다.`;
    this.publish();
  };

  public advanceAnchorApproach = (): void => {
    if (this.mode !== 'ANCHOR_APPROACH') return;
    const route = this.currentRoute();
    const previous = this.anchorProgress;
    this.anchorProgress = Math.min(route.distanceMeters, previous + 5);
    if (Math.floor(previous / 100) < Math.floor(this.anchorProgress / 100)) this.worldMinute += TRAVEL_MINUTES_PER_100M;
    if (this.anchorProgress >= route.distanceMeters) {
      this.world = updateSubmissionTile(this.world, route.targetTileId, { protagonistAtAnchor: true });
      this.mode = 'ANCHOR_READY';
      this.notice = '확장 거점 도착. 준비된 회로를 결계에 연결할 수 있다.';
    } else {
      this.notice = `${this.anchorProgress}m · 확보된 길을 이동 중`;
    }
    this.publish();
  };

  public activateAnchor = (): void => {
    const route = this.currentRoute();
    const result = incorporateTile(this.world, route.targetTileId);
    if (!result.incorporated) {
      this.lastIncorporationBlocker = result.blocker;
      this.notice = incorporationBlockerCopy(result.blocker);
      this.publish();
      return;
    }
    this.lastIncorporationBlocker = undefined;
    this.world = result.world;
    if (!this.activeFrontierId) {
      this.supplies = { ...this.supplies, water: this.supplies.water + 1 };
      this.selectedFrontierId = undefined;
      this.mode = 'EXPANDED';
      this.notice = '물안개 전초지가 결계 안으로 편입됐다. 샘이 깨어나고 두 좌표가 드러났다.';
    } else {
      this.mode = 'COMPLETE';
      this.notice = `${route.direction === 'NORTH' ? '북쪽' : '동쪽'}의 새 땅이 결계 안으로 이어졌다.`;
    }
    this.publish();
  };

  public restartSubmission = (): void => {
    if (this.mode !== 'COMPLETE') return;
    this.releaseCombat();
    this.mode = 'AWAKENING';
    this.world = createSubmissionWorld();
    this.worldMinute = START_MINUTE;
    this.prologueProgress = 0;
    this.soloEncounterResolved = false;
    this.companionJoined = false;
    this.corridorProgress = 0;
    this.selectedFrontierId = undefined;
    this.activeFrontierId = undefined;
    this.paidWaterFrontierId = undefined;
    this.vitals = { administratorHp: 14, allyHp: 12 };
    this.supplies = { water: 1, food: 1 };
    this.policy = [...DEFAULT_SLICE_POLICY];
    this.policyDirectives = {};
    this.notice = '결계 안에서 눈을 떴다.';
    this.encounterId = undefined;
    this.encounterContent = undefined;
    this.firstEncounterResolved = false;
    this.elapsedBattleTurns = 0;
    this.lastCombatSummary = undefined;
    this.policyChoice = undefined;
    this.lastProtagonistTaskMinutes = 0;
    this.delegationAttempt = 0;
    this.delegationBaseline = undefined;
    this.delegationResult = undefined;
    this.anchorProgress = 0;
    this.lastIncorporationBlocker = undefined;
    this.defeatCount = 0;
    this.lastDefeatCost = undefined;
    this.publish();
  };

  public attachPresentation = (presentation: PresentationPort): (() => void) => (
    this.combat?.attachPresentation(presentation) ?? (() => presentation.destroy())
  );

  public selectTarget = (unitId: string): void => this.combat?.selectTarget(unitId);
  public startEncounter = (): void => this.combat?.startEncounter();
  public move = (direction: Direction): void => {
    if (this.isSoloLearningTurn() && this.combat?.getSnapshot().plannedActions.length) return;
    this.combat?.move(direction);
  };
  public useAction = (actionId: SliceActionId): void => {
    if (this.isSoloLearningTurn()) return;
    this.combat?.useAction(actionId);
  };
  public setActionHover = (actionId?: SliceActionId): void => this.combat?.setActionHover(actionId);
  public undoLastAction = (): void => this.combat?.undoLastAction();
  public confirmPlan = (): void => {
    if (this.isSoloLearningTurn() && (this.combat?.getSnapshot().plannedActions.length === 0 || this.isSoloLearningDestinationThreatened())) return;
    this.combat?.confirmPlan();
  };
  public useLight = (): void => undefined;
  public unlockSeal = (): void => undefined;

  private isSoloLearningTurn(): boolean {
    const combat = this.combat?.getSnapshot();
    return this.encounterId === 'SOLO_WARRIOR' && combat?.mode === 'PLAYER_TURN' && combat.state.turn === 1;
  }

  private requiresPreDelegationRest(): boolean {
    return this.vitals.allyHp <= PRE_DELEGATION_REST_HP && this.supplies.water > 0 && this.supplies.food > 0;
  }

  private requiresDelegationRecovery(): boolean {
    return this.mode === 'DELEGATION_RESULT'
      && this.delegationResult?.outcome !== 'SECURED'
      && this.vitals.allyHp <= this.retreatAtHp;
  }

  private isSoloLearningDestinationThreatened(): boolean {
    const combat = this.combat?.getSnapshot();
    const administrator = combat?.previewState.units.find((unit) => unit.id === SLICE2_ADMINISTRATOR_ID);
    return administrator !== undefined && combat!.previewState.intents.some((intent) => (
      intent.effectCells.some((cell) => cell.x === administrator.position.x && cell.y === administrator.position.y)
    ));
  }

  public completeEncounter = (): void => {
    if (this.mode !== 'COMBAT' || !this.combat || !this.encounterId) return;
    const combat = this.combat.getSnapshot();
    if (combat.mode !== 'VICTORY') return;
    const administrator = combat.state.units.find((unit) => unit.id === SLICE2_ADMINISTRATOR_ID);
    const ally = combat.state.units.find((unit) => unit.id === SLICE2_ALLY_ID);
    this.vitals = {
      administratorHp: administrator?.hp ?? this.vitals.administratorHp,
      allyHp: ally?.hp ?? this.vitals.allyHp,
    };
    this.elapsedBattleTurns += combat.state.turn;
    this.worldMinute += combat.state.turn;
    this.lastCombatSummary = summarizeCombat(this.encounterId, combat.policyHistory, combat.state.turn);
    const resolvedEncounter = this.encounterId;
    this.releaseCombat();
    this.encounterId = undefined;
    this.encounterContent = undefined;
    if (resolvedEncounter === 'SOLO_WARRIOR') {
      this.soloEncounterResolved = true;
      this.mode = 'COMPANION_SEALED';
      this.notice = '위협이 쓰러지자, 바깥 유적의 봉인이 모습을 드러냈다.';
    } else if (resolvedEncounter === 'FIRST_WARRIOR') {
      this.firstEncounterResolved = true;
      this.mode = 'CORRIDOR';
      this.notice = '첫 위협을 제거했다. 같은 통로에서 D로 계속 전진한다.';
    } else {
      const route = this.currentRoute();
      this.world = updateSubmissionTile(this.world, route.targetTileId, {
        knowledge: 'SCOUTED',
        corridorsScouted: true,
        threat: 'CONTESTED',
      });
      this.mode = 'SCOUTED';
      this.notice = '중앙 방 확보. 네 통로의 위험 위치가 한꺼번에 드러났다.';
    }
    this.publish();
  };

  public retryEncounter = (): void => {
    if (!this.encounterId || !this.encounterContent || !this.combat) return;
    const recovery = this.previewDefeatRecovery();
    if (!recovery) return;
    const recoveredSave = this.buildSave(recovery.mode, recovery.overrides);
    this.releaseCombat();
    this.encounterId = undefined;
    this.encounterContent = undefined;
    this.hydrate(recoveredSave);
    this.publish();
  };

  private previewDefeatRecovery(): {
    readonly mode: SubmissionSaveData['mode'];
    readonly overrides: Partial<Omit<SubmissionSaveData, 'version' | 'mode'>>;
  } | undefined {
    if (!this.encounterId || !this.combat) return undefined;
    const defeatedEncounter = this.encounterId;
    const defeated = this.combat.getSnapshot();
    if (defeated.mode !== 'DEFEAT') return undefined;
    const administrator = defeated.state.units.find((unit) => unit.id === SLICE2_ADMINISTRATOR_ID);
    const ally = defeated.state.units.find((unit) => unit.id === SLICE2_ALLY_ID);
    const cost = applySubmissionDefeatCost({
      vitals: {
        administratorHp: administrator?.hp ?? 0,
        allyHp: ally?.hp ?? this.vitals.allyHp,
      },
      supplies: this.supplies,
      battleTurns: defeated.state.turn,
    });
    const lastDefeatCost = {
      elapsedMinutes: cost.elapsedMinutes,
      waterSpent: cost.usedCampSupplies ? 1 : 0,
      foodSpent: cost.usedCampSupplies ? 1 : 0,
    };
    const notice = `안전 영토로 후퇴 · ${cost.elapsedMinutes}분 경과 · 물/식량 ${cost.usedCampSupplies ? '1씩 사용' : '없음'} · 부상 유지`;
    if (defeatedEncounter === 'SOLO_WARRIOR' || !this.companionJoined) {
      return {
        mode: 'AWAKENING',
        overrides: {
          prologueProgress: 0,
          soloEncounterResolved: false,
          corridorProgress: 0,
          vitals: cost.vitals,
          supplies: cost.supplies,
          worldMinute: this.worldMinute + cost.elapsedMinutes,
          elapsedBattleTurns: this.elapsedBattleTurns + defeated.state.turn,
          defeatCount: this.defeatCount + 1,
          lastDefeatCost,
          notice,
        },
      };
    }
    if (this.activeFrontierId) {
      return {
        mode: 'EXPANDED',
        overrides: {
          activeFrontierId: undefined,
          corridorProgress: 0,
          vitals: cost.vitals,
          supplies: cost.supplies,
          worldMinute: this.worldMinute + cost.elapsedMinutes,
          elapsedBattleTurns: this.elapsedBattleTurns + defeated.state.turn,
          delegationBaseline: undefined,
          delegationResult: undefined,
          anchorProgress: 0,
          defeatCount: this.defeatCount + 1,
          lastDefeatCost,
          notice,
        },
      };
    }
    return {
      mode: 'COMPANION_JOINED',
      overrides: {
        corridorProgress: 0,
        vitals: cost.vitals,
        supplies: cost.supplies,
        worldMinute: this.worldMinute + cost.elapsedMinutes,
        elapsedBattleTurns: this.elapsedBattleTurns + defeated.state.turn,
        defeatCount: this.defeatCount + 1,
        lastDefeatCost,
        notice,
      },
    };
  }

  public destroy(): void {
    this.releaseCombat();
    this.listeners.clear();
  }

  private beginCombat(encounterId: SubmissionEncounterId, content: EncounterContent, retryNotice?: string): void {
    this.releaseCombat();
    this.encounterId = encounterId;
    this.encounterContent = content;
    const authoredEncounterId = encounterId === 'SECOND_EAST_CENTER' || encounterId === 'SECOND_NORTH_CENTER'
      ? encounterId
      : encounterId.toLowerCase();
    const scenario = encounterId === 'SOLO_WARRIOR'
      ? createSubmissionSoloScenario(this.vitals, this.worldMinute)
      : createSubmissionJointScenario(authoredEncounterId, content, this.vitals, this.worldMinute);
    this.combat = new SliceController({
      scenarioFactory: () => scenario,
      administratorId: SLICE2_ADMINISTRATOR_ID,
      allyId: SLICE2_ALLY_ID,
      policy: this.policy,
      policyDirectives: this.policyDirectives,
      introNotice: retryNotice ?? (encounterId === 'SOLO_WARRIOR'
        ? '결계 밖의 첫 위협이다.'
        : encounterId === 'FIRST_WARRIOR'
          ? '빠르게 접근하는 적 하나가 통로를 막았다.'
          : encounterId === 'SECOND_NORTH_CENTER'
            ? '먼 경계에서 하나의 긴 사격선이 중앙 방을 가른다.'
            : encounterId === 'SECOND_EAST_CENTER'
              ? '가까운 추격자 뒤로 궁수의 사격선이 겹친다.'
              : '궁수의 사격선과 전사의 접근 경로가 겹친다.'),
      playbackSpeed: this.options.playbackSpeed,
      phaseDelayScale: this.options.phaseDelayScale,
    });
    this.combatUnsubscribe = this.combat.subscribe(() => this.publish());
    this.mode = 'COMBAT';
    this.notice = encounterId === 'SOLO_WARRIOR'
      ? '바깥의 첫 위협'
      : encounterId === 'FIRST_WARRIOR'
        ? '단검의 쇄도'
        : encounterId === 'SECOND_NORTH_CENTER' ? '먼 경계의 사격선' : '사격선과 추격자';
    this.publish();
  }

  private releaseCombat(): void {
    this.combatUnsubscribe?.();
    this.combatUnsubscribe = null;
    this.combat?.destroy();
    this.combat = null;
  }

  private hydrate(save: SubmissionSaveData): void {
    this.mode = save.mode;
    this.world = save.world;
    this.worldMinute = save.worldMinute;
    this.prologueProgress = save.prologueProgress;
    this.soloEncounterResolved = save.soloEncounterResolved;
    this.companionJoined = save.companionJoined;
    this.corridorProgress = save.corridorProgress;
    this.selectedFrontierId = save.selectedFrontierId;
    this.activeFrontierId = save.activeFrontierId;
    this.paidWaterFrontierId = save.paidWaterFrontierId;
    this.vitals = save.vitals;
    this.supplies = save.supplies;
    this.policy = save.policy;
    this.policyDirectives = save.policyDirectives;
    this.notice = save.notice;
    this.firstEncounterResolved = save.firstEncounterResolved;
    this.elapsedBattleTurns = save.elapsedBattleTurns;
    this.lastCombatSummary = save.lastCombatSummary;
    this.policyChoice = save.policyChoice;
    this.lastProtagonistTaskMinutes = save.lastProtagonistTaskMinutes;
    this.delegationAttempt = save.delegationAttempt;
    this.delegationBaseline = save.delegationBaseline;
    this.delegationResult = save.delegationResult;
    this.anchorProgress = save.anchorProgress;
    this.lastIncorporationBlocker = save.incorporationBlocker;
    this.defeatCount = save.defeatCount ?? 0;
    this.lastDefeatCost = save.lastDefeatCost;
  }

  private buildSnapshot(): SubmissionSnapshot {
    const route = this.currentRoute();
    return {
      mode: this.mode,
      world: this.world,
      worldMinute: this.worldMinute,
      worldTime: formatWorldTime(this.worldMinute),
      prologueProgress: this.prologueProgress,
      soloEncounterResolved: this.soloEncounterResolved,
      companionJoined: this.companionJoined,
      corridorProgress: this.corridorProgress,
      currentRoute: route,
      selectedFrontierId: this.selectedFrontierId,
      activeFrontierId: this.activeFrontierId,
      paidWaterFrontierId: this.paidWaterFrontierId,
      frontierChoices: SUBMISSION_FRONTIER_ROUTES.map((choice) => {
        const blocker = this.frontierBlocker(choice.id);
        return {
          id: choice.id,
          available: blocker === undefined,
          selected: this.selectedFrontierId === choice.id,
          waterPaid: this.paidWaterFrontierId === choice.id,
          ...(blocker ? { blocker } : {}),
        };
      }),
      vitals: this.vitals,
      supplies: this.supplies,
      policy: this.policy,
      notice: this.notice,
      combat: this.combat?.getSnapshot(),
      encounterId: this.encounterId,
      encounterContent: this.encounterContent,
      elapsedBattleTurns: this.elapsedBattleTurns,
      lastCombatSummary: this.lastCombatSummary,
      policyChoice: this.policyChoice,
      policyDirectives: this.policyDirectives,
      retreatAtHp: this.retreatAtHp,
      protagonistTaskMinutes: this.mode === 'DELEGATION_RESULT'
        ? this.lastProtagonistTaskMinutes
        : this.world.tiles.find((tile) => tile.id === route.targetTileId)?.anchorPrepared ? 0 : this.initialProtagonistTaskMinutes,
      delegationAttempt: this.delegationAttempt,
      delegationRecoveryRequired: this.requiresDelegationRecovery(),
      delegationRecoveryMinutes: DELEGATION_RECOVERY_MINUTES,
      delegationBaseline: this.delegationBaseline,
      delegationResult: this.delegationResult,
      anchorProgress: this.anchorProgress,
      incorporationBlocker: this.lastIncorporationBlocker,
      defeatCount: this.defeatCount,
      lastDefeatCost: this.lastDefeatCost,
      preDelegationRestRequired: this.requiresPreDelegationRest(),
      defeatReturnsToTerritory: true,
      isNight: false,
      canUseLight: false,
      isBossEncounter: false,
    };
  }

  private publish(): void {
    this.snapshot = this.buildSnapshot();
    for (const listener of this.listeners) listener();
  }

  private currentRoute(): SubmissionRouteSpec {
    const frontierId = this.activeFrontierId ?? (this.mode === 'EXPANDED' ? this.selectedFrontierId : undefined);
    return frontierId ? getSubmissionRouteSpec(frontierId) : SUBMISSION_FIRST_ROUTE;
  }

  private frontierBlocker(frontierId: SubmissionFrontierId): SubmissionFrontierBlocker | undefined {
    const route = getSubmissionRouteSpec(frontierId);
    const target = this.world.tiles.find((tile) => tile.id === route.targetTileId);
    if (!target || target.knowledge !== 'REVEALED' || target.territory !== 'OUTSIDE') return 'NOT_REVEALED';
    if (frontierId !== 'frontier-north' || this.paidWaterFrontierId === frontierId) return undefined;
    const spring = this.world.tiles.find((tile) => tile.id === 'frontier-east');
    if (spring?.utility !== 'ACTIVE') return 'SPRING_DORMANT';
    if (this.supplies.water < route.waterCost) return 'WATER_REQUIRED';
    return undefined;
  }
}

function summarizeCombat(
  encounterId: SubmissionEncounterId,
  history: readonly PolicyExecutionStep[],
  turns: number,
): SubmissionCombatSummary {
  const selectedCounts: Partial<Record<SlicePolicyId, number>> = {};
  const blocked = new Map<string, { policyId: SlicePolicyId; reason: string; count: number }>();
  for (const step of history) {
    if (step.selectedPolicyId) selectedCounts[step.selectedPolicyId] = (selectedCounts[step.selectedPolicyId] ?? 0) + 1;
    for (const evaluation of step.evaluations) {
      if (evaluation.executable) continue;
      const key = `${evaluation.policyId}:${evaluation.reason}`;
      const current = blocked.get(key);
      blocked.set(key, { policyId: evaluation.policyId, reason: evaluation.reason, count: (current?.count ?? 0) + 1 });
    }
  }
  const primaryBlocked = [...blocked.values()].sort((left, right) => right.count - left.count)[0];
  const blockedByPolicy: Partial<Record<SlicePolicyId, { reason: string; count: number }>> = {};
  for (const entry of blocked.values()) {
    const current = blockedByPolicy[entry.policyId];
    if (!current || blockedReasonPriority(entry.reason) > blockedReasonPriority(current.reason) || (
      blockedReasonPriority(entry.reason) === blockedReasonPriority(current.reason) && entry.count > current.count
    )) blockedByPolicy[entry.policyId] = { reason: entry.reason, count: entry.count };
  }
  return { encounterId, turns, selectedCounts, blockedByPolicy, ...(primaryBlocked ? { primaryBlocked } : {}) };
}

function blockedReasonPriority(reason: string): number {
  if (reason.includes('유효 사거리') || reason.includes('인접한 적')) return 3;
  if (reason.includes('AP 부족')) return 0;
  return 1;
}

export function submissionPolicyName(policyId: SlicePolicyId): string {
  return POLICY_COPY[policyId].name;
}

function incorporationBlockerCopy(blocker?: IncorporationBlocker): string {
  const copy: Readonly<Record<IncorporationBlocker, string>> = {
    ALREADY_INCORPORATED: '이미 결계 안에 편입된 땅이다.',
    NOT_ADJACENT: '현재 결계와 맞닿은 타일만 편입할 수 있다.',
    NOT_SCOUTED: '중앙 방을 확보해 모든 통로를 먼저 정찰해야 한다.',
    THREAT_REMAINS: '타일 안의 위협이 남아 있다.',
    ROUTE_UNSAFE: '확장 거점까지 이어지는 안전 경로가 없다.',
    ANCHOR_UNPREPARED: '중앙 방의 확장 회로 준비가 끝나지 않았다.',
    PROTAGONIST_ABSENT: '주인공이 경계 방의 확장 거점에 직접 도착해야 한다.',
  };
  return blocker ? copy[blocker] : '아직 이 땅을 결계에 편입할 수 없다.';
}

export function parseSubmissionSave(value: string | null): SubmissionSaveData | undefined {
  if (!value) return undefined;
  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== 'object') return undefined;
    const save = parsed as Partial<Omit<SubmissionSaveData, 'version'>> & { readonly version?: number };
    const stableModes: readonly SubmissionSaveData['mode'][] = [
      'AWAKENING', 'SOLO_APPROACH', 'COMPANION_SEALED', 'COMPANION_JOINED',
      'INTRO', 'CORRIDOR', 'CENTER_GATE', 'SCOUTED', 'POLICY_REVIEW', 'DELEGATION_PLAN',
      'DELEGATION_RESULT', 'ANCHOR_APPROACH', 'ANCHOR_READY', 'EXPANDED', 'COMPLETE',
    ];
    if ((save.version !== 2 && save.version !== 3) || !stableModes.includes(save.mode as SubmissionSaveData['mode'])) return undefined;
    if (save.version === 2 && save.mode === 'COMPLETE') return undefined;
    if (!isSubmissionWorldState(save.world) || !isNonNegativeFinite(save.worldMinute) || !isNonNegativeFinite(save.corridorProgress)) return undefined;
    if (!Number.isFinite(save.prologueProgress) || typeof save.soloEncounterResolved !== 'boolean' || typeof save.companionJoined !== 'boolean') return undefined;
    if (!isSubmissionVitals(save.vitals) || !isSubmissionSupplies(save.supplies) || !isSubmissionPolicy(save.policy)
      || !isPolicyDirectives(save.policyDirectives) || typeof save.notice !== 'string') return undefined;
    if (typeof save.firstEncounterResolved !== 'boolean' || !Number.isFinite(save.elapsedBattleTurns) || !Number.isFinite(save.lastProtagonistTaskMinutes)) return undefined;
    if (!Number.isFinite(save.delegationAttempt) || !Number.isFinite(save.anchorProgress)) return undefined;
    if (save.selectedFrontierId !== undefined && !isSubmissionFrontierId(save.selectedFrontierId)) return undefined;
    if (save.activeFrontierId !== undefined && !isSubmissionFrontierId(save.activeFrontierId)) return undefined;
    if (save.paidWaterFrontierId !== undefined && !isSubmissionFrontierId(save.paidWaterFrontierId)) return undefined;
    if (save.policyChoice !== undefined && save.policyChoice !== 'PUSH_FIRST' && save.policyChoice !== 'KEEP_RANGE') return undefined;
    if (save.version === 3) {
      if (save.activeFrontierId && save.selectedFrontierId !== save.activeFrontierId) return undefined;
      if (save.mode === 'EXPANDED' && save.activeFrontierId) return undefined;
      if (save.mode === 'COMPLETE' && (!save.activeFrontierId || !save.selectedFrontierId)) return undefined;
      if (save.selectedFrontierId && !save.activeFrontierId && save.mode !== 'EXPANDED') return undefined;
      if (save.mode === 'DELEGATION_PLAN' && !save.policyChoice) return undefined;
    }
    return {
      ...(save as Omit<SubmissionSaveData, 'version' | 'world'>),
      version: 3,
      world: save.version === 2 ? normalizeLegacySubmissionWorld(save.world) : save.world,
      selectedFrontierId: save.version === 2 ? undefined : save.selectedFrontierId,
      activeFrontierId: save.version === 2 ? undefined : save.activeFrontierId,
      paidWaterFrontierId: save.version === 2 ? undefined : save.paidWaterFrontierId,
      delegationBaseline: save.version === 2 ? normalizeLegacyDelegationResult(save.delegationBaseline) : save.delegationBaseline,
      delegationResult: save.version === 2 ? normalizeLegacyDelegationResult(save.delegationResult) : save.delegationResult,
    };
  } catch {
    return undefined;
  }
}

function isNonNegativeFinite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function isSubmissionVitals(value: unknown): value is ExpeditionVitals {
  if (!value || typeof value !== 'object') return false;
  const vitals = value as Partial<ExpeditionVitals>;
  return isNonNegativeFinite(vitals.administratorHp) && isNonNegativeFinite(vitals.allyHp);
}

function isSubmissionSupplies(value: unknown): value is SubmissionSaveData['supplies'] {
  if (!value || typeof value !== 'object') return false;
  const supplies = value as Partial<SubmissionSaveData['supplies']>;
  return Number.isInteger(supplies.water) && Number.isInteger(supplies.food)
    && (supplies.water ?? -1) >= 0 && (supplies.food ?? -1) >= 0;
}

function isSubmissionPolicy(value: unknown): value is readonly SlicePolicyId[] {
  const ids: readonly SlicePolicyId[] = ['EVADE', 'POSITION', 'SHOOT', 'PUSH', 'EMPTY'];
  return Array.isArray(value) && value.length === 5
    && value.every((entry) => ids.includes(entry as SlicePolicyId));
}

function isPolicyDirectives(value: unknown): value is PolicyDirectives {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const directives = value as { readonly keepRange?: unknown };
  return directives.keepRange === undefined || typeof directives.keepRange === 'boolean';
}

function isSubmissionWorldState(value: unknown): value is SubmissionWorldState {
  if (!value || typeof value !== 'object') return false;
  const world = value as Partial<SubmissionWorldState>;
  if (!isNonNegativeFinite(world.revision) || !Array.isArray(world.tiles)) return false;
  const tileIds = new Set<string>();
  for (const candidate of world.tiles) {
    if (!candidate || typeof candidate !== 'object') return false;
    const tile = candidate as Partial<SubmissionWorldState['tiles'][number]>;
    if (typeof tile.id !== 'string' || tileIds.has(tile.id) || typeof tile.name !== 'string') return false;
    tileIds.add(tile.id);
    if (!tile.coordinate || typeof tile.coordinate !== 'object'
      || !Number.isFinite(tile.coordinate.x) || !Number.isFinite(tile.coordinate.y)) return false;
    if (!['UNSEEN', 'REVEALED', 'SCOUTED'].includes(tile.knowledge ?? '')
      || !['HOSTILE', 'CONTESTED', 'SECURED'].includes(tile.threat ?? '')
      || !['OUTSIDE', 'INCORPORATED'].includes(tile.territory ?? '')
      || !['DORMANT', 'ACTIVE', 'IMPAIRED'].includes(tile.utility ?? '')) return false;
    if (typeof tile.stabilized !== 'boolean' || typeof tile.corridorsScouted !== 'boolean'
      || typeof tile.routeSafe !== 'boolean' || typeof tile.anchorPrepared !== 'boolean'
      || typeof tile.protagonistAtAnchor !== 'boolean' || !Array.isArray(tile.revealsOnIncorporation)
      || !tile.revealsOnIncorporation.every((id) => typeof id === 'string')) return false;
  }
  return ['initial-barrier', 'frontier-east', 'next-east', 'frontier-north', 'frontier-south']
    .every((id) => tileIds.has(id));
}

function normalizeLegacyDelegationResult(
  result: DelegatedOperationResult | undefined,
): DelegatedOperationResult | undefined {
  if (!result) return undefined;
  return {
    ...result,
    frontierId: result.frontierId ?? 'frontier-east',
    distanceMeters: result.distanceMeters ?? SUBMISSION_FIRST_ROUTE.distanceMeters,
    waterCost: result.waterCost ?? SUBMISSION_FIRST_ROUTE.waterCost,
  };
}

function normalizeLegacySubmissionWorld(world: SubmissionWorldState): SubmissionWorldState {
  return {
    ...world,
    tiles: world.tiles.map((tile) => {
      if (tile.id === 'frontier-east') {
        return { ...tile, revealsOnIncorporation: ['next-east', 'frontier-north'] };
      }
      if (tile.id === 'frontier-south' && tile.territory === 'OUTSIDE') {
        return { ...tile, knowledge: 'UNSEEN' };
      }
      return tile;
    }),
  };
}

export function applySubmissionDefeatCost(input: {
  readonly vitals: ExpeditionVitals;
  readonly supplies: { readonly water: number; readonly food: number };
  readonly battleTurns: number;
}): {
  readonly vitals: ExpeditionVitals;
  readonly supplies: { readonly water: number; readonly food: number };
  readonly elapsedMinutes: number;
  readonly usedCampSupplies: boolean;
} {
  const usedCampSupplies = input.supplies.water > 0 && input.supplies.food > 0;
  const recoveryFloor = usedCampSupplies ? 3 : 1;
  return {
    vitals: {
      administratorHp: Math.max(recoveryFloor, input.vitals.administratorHp),
      allyHp: Math.max(recoveryFloor, input.vitals.allyHp),
    },
    supplies: usedCampSupplies
      ? { water: input.supplies.water - 1, food: input.supplies.food - 1 }
      : input.supplies,
    elapsedMinutes: Math.max(1, input.battleTurns) + 5,
    usedCampSupplies,
  };
}

export function applySubmissionRest(input: {
  readonly vitals: ExpeditionVitals;
  readonly supplies: { readonly water: number; readonly food: number };
}): {
  readonly vitals: ExpeditionVitals;
  readonly supplies: { readonly water: number; readonly food: number };
  readonly elapsedMinutes: number;
} {
  if (input.supplies.water < 1 || input.supplies.food < 1) {
    return { vitals: input.vitals, supplies: input.supplies, elapsedMinutes: 0 };
  }
  return {
    vitals: {
      administratorHp: Math.min(14, input.vitals.administratorHp + 3),
      allyHp: Math.min(12, input.vitals.allyHp + 3),
    },
    supplies: { water: input.supplies.water - 1, food: input.supplies.food - 1 },
    elapsedMinutes: REST_MINUTES,
  };
}
