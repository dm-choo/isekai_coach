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
import { createSubmissionJointScenario, createSubmissionSoloScenario } from './scenarios';

export type SubmissionMode =
  | 'AWAKENING' | 'SOLO_APPROACH' | 'COMPANION_SEALED' | 'COMPANION_JOINED'
  | 'INTRO' | 'CORRIDOR' | 'CENTER_GATE' | 'COMBAT' | 'SCOUTED'
  | 'POLICY_REVIEW' | 'DELEGATION_PLAN' | 'DELEGATION_RESULT'
  | 'ANCHOR_APPROACH' | 'ANCHOR_READY' | 'EXPANDED' | 'DEFEAT';
export type SubmissionEncounterId = 'SOLO_WARRIOR' | 'FIRST_WARRIOR' | 'CENTER_GUARD';
export type SubmissionPolicyChoice = 'PUSH_FIRST' | 'KEEP_RANGE';
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

export interface SubmissionSnapshot {
  readonly mode: SubmissionMode;
  readonly world: SubmissionWorldState;
  readonly worldMinute: number;
  readonly worldTime: string;
  readonly prologueProgress: number;
  readonly soloEncounterResolved: boolean;
  readonly companionJoined: boolean;
  readonly corridorProgress: number;
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
  readonly delegationBaseline?: DelegatedOperationResult;
  readonly delegationResult?: DelegatedOperationResult;
  readonly anchorProgress: number;
  readonly incorporationBlocker?: IncorporationBlocker;
  readonly defeatCount: number;
  readonly lastDefeatCost?: SubmissionDefeatCost;
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
  readonly version: 2;
  readonly mode: Exclude<SubmissionMode, 'COMBAT' | 'DEFEAT'>;
  readonly world: SubmissionWorldState;
  readonly worldMinute: number;
  readonly prologueProgress: number;
  readonly soloEncounterResolved: boolean;
  readonly companionJoined: boolean;
  readonly corridorProgress: number;
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

export class SubmissionController {
  private readonly listeners = new Set<Listener>();
  private mode: SubmissionMode = 'AWAKENING';
  private world = createSubmissionWorld();
  private worldMinute = START_MINUTE;
  private prologueProgress = 0;
  private soloEncounterResolved = false;
  private companionJoined = false;
  private corridorProgress = 0;
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
    if (this.mode === 'COMBAT' || this.mode === 'DEFEAT') return undefined;
    return {
      version: 2,
      mode: this.mode,
      world: this.world,
      worldMinute: this.worldMinute,
      prologueProgress: this.prologueProgress,
      soloEncounterResolved: this.soloEncounterResolved,
      companionJoined: this.companionJoined,
      corridorProgress: this.corridorProgress,
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
    };
  };

  public performPrimaryAction = (): boolean => {
    if (this.mode === 'COMPANION_SEALED') this.releaseCompanion();
    else if (this.mode === 'INTRO') this.startExpedition();
    else if (this.mode === 'CENTER_GATE') this.enterCenter();
    else if (this.mode === 'SCOUTED') this.beginPolicyReview();
    else if (this.mode === 'POLICY_REVIEW' && this.policyChoice) this.openDelegationPlan();
    else if (this.mode === 'DELEGATION_PLAN') this.runDelegation();
    else if (this.mode === 'DELEGATION_RESULT' && this.delegationResult?.outcome === 'SECURED') this.beginAnchorApproach();
    else if (this.mode === 'DELEGATION_RESULT') this.beginPolicyReview();
    else if (this.mode === 'ANCHOR_READY') this.activateAnchor();
    else if (this.mode === 'EXPANDED') this.restartSubmission();
    else if (this.mode === 'COMBAT' && this.combat?.getSnapshot().mode === 'INTRO') this.startEncounter();
    else if (this.mode === 'COMBAT' && this.combat?.getSnapshot().mode === 'PLAYER_TURN') this.confirmPlan();
    else if (this.mode === 'COMBAT' && this.combat?.getSnapshot().mode === 'VICTORY') this.completeEncounter();
    else if (this.mode === 'COMBAT' && this.combat?.getSnapshot().mode === 'DEFEAT') this.retryEncounter();
    else return false;
    return true;
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

  public advanceCorridor = (): void => {
    if (this.mode !== 'CORRIDOR') return;
    const previous = this.corridorProgress;
    this.corridorProgress = Math.min(400, previous + 5);
    if (Math.floor(previous / 100) < Math.floor(this.corridorProgress / 100)) {
      this.worldMinute += TRAVEL_MINUTES_PER_100M;
    }
    if (!this.firstEncounterResolved && this.corridorProgress >= 200) {
      this.beginCombat('FIRST_WARRIOR', 'GOBLIN_WARRIOR');
      return;
    }
    if (this.corridorProgress >= 400) {
      this.mode = 'CENTER_GATE';
      this.notice = '중앙 방 앞이다. 안쪽에서 두 개의 발소리가 갈라진다.';
      this.publish();
      return;
    }
    this.notice = `${this.corridorProgress}m · 동쪽으로 전진 중`;
    this.publish();
  };

  public enterCenter = (): void => {
    if (this.mode !== 'CENTER_GATE') return;
    this.beginCombat('CENTER_GUARD', 'GOBLIN_ARCHER_WARRIOR');
  };

  public beginPolicyReview = (): void => {
    if (this.mode !== 'SCOUTED' && this.mode !== 'DELEGATION_RESULT') return;
    this.mode = 'POLICY_REVIEW';
    this.notice = '직전 전투 기록을 보고 동료의 공간 대응 한 곳을 바꾼다.';
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
    this.mode = 'DELEGATION_PLAN';
    this.notice = '정찰된 동쪽 통로 · 알려진 두 적 · HP 2 이하 후퇴.';
    this.publish();
  };

  public runDelegation = (): void => {
    if (this.mode !== 'DELEGATION_PLAN' || !this.policyChoice) return;
    this.delegationAttempt += 1;
    this.delegationBaseline = simulateDelegatedOperation({
      allyHp: this.vitals.allyHp,
      retreatAtHp: this.retreatAtHp,
      worldMinute: this.worldMinute,
    });
    this.delegationResult = simulateDelegatedOperation({
      allyHp: this.vitals.allyHp,
      policy: this.policy,
      directives: this.policyDirectives,
      retreatAtHp: this.retreatAtHp,
      worldMinute: this.worldMinute,
    });
    const result = this.delegationResult;
    const frontierBeforeOperation = this.world.tiles.find((tile) => tile.id === 'frontier-east');
    this.lastProtagonistTaskMinutes = frontierBeforeOperation?.anchorPrepared ? 0 : this.initialProtagonistTaskMinutes;
    const sharedElapsed = Math.max(this.lastProtagonistTaskMinutes, result.elapsedMinutes);
    this.worldMinute += sharedElapsed;
    this.vitals = { ...this.vitals, allyHp: result.finalHp };
    this.world = updateSubmissionTile(this.world, 'frontier-east', {
      anchorPrepared: true,
      ...(result.outcome === 'SECURED' ? { threat: 'SECURED' as const, routeSafe: true } : {}),
    });
    this.mode = 'DELEGATION_RESULT';
    this.notice = result.outcome === 'SECURED'
      ? this.lastProtagonistTaskMinutes > 0
        ? '동쪽 통로 확보. 같은 시간 동안 주인공의 확장 회로 준비도 끝났다.'
        : '동쪽 통로 확보. 먼저 준비된 확장 회로와 안전 경로가 연결됐다.'
      : result.outcome === 'TIME_LIMIT'
        ? '시간 한도 도달. 동료는 안전하지만 통로 위협이 남았다.'
        : result.outcome === 'RETREATED'
          ? '후퇴 조건 발동. 동료는 돌아왔지만 통로 위협이 남았다.'
          : '별동대 전투 불능. 이 작전은 경로를 확보하지 못했다.';
    this.publish();
  };

  public beginAnchorApproach = (): void => {
    if (this.mode !== 'DELEGATION_RESULT' || this.delegationResult?.outcome !== 'SECURED') return;
    const frontier = this.world.tiles.find((tile) => tile.id === 'frontier-east');
    if (!frontier?.routeSafe) return;
    this.anchorProgress = 0;
    this.mode = 'ANCHOR_APPROACH';
    this.notice = '동료가 확보한 길이다. D를 누르는 동안 동쪽 경계 거점으로 이동한다.';
    this.publish();
  };

  public advanceAnchorApproach = (): void => {
    if (this.mode !== 'ANCHOR_APPROACH') return;
    const previous = this.anchorProgress;
    this.anchorProgress = Math.min(400, previous + 5);
    if (Math.floor(previous / 100) < Math.floor(this.anchorProgress / 100)) this.worldMinute += TRAVEL_MINUTES_PER_100M;
    if (this.anchorProgress >= 400) {
      this.world = updateSubmissionTile(this.world, 'frontier-east', { protagonistAtAnchor: true });
      this.mode = 'ANCHOR_READY';
      this.notice = '확장 거점 도착. 준비된 회로를 결계에 연결할 수 있다.';
    } else {
      this.notice = `${this.anchorProgress}m · 확보된 길을 이동 중`;
    }
    this.publish();
  };

  public activateAnchor = (): void => {
    const result = incorporateTile(this.world, 'frontier-east');
    if (!result.incorporated) {
      this.lastIncorporationBlocker = result.blocker;
      this.notice = incorporationBlockerCopy(result.blocker);
      this.publish();
      return;
    }
    this.lastIncorporationBlocker = undefined;
    this.world = result.world;
    this.supplies = { ...this.supplies, water: this.supplies.water + 1 };
    this.mode = 'EXPANDED';
    this.notice = '물안개 전초지가 결계 안으로 편입됐다. 샘이 깨어나고 다음 좌표가 드러났다.';
    this.publish();
  };

  public restartSubmission = (): void => {
    if (this.mode !== 'EXPANDED') return;
    this.releaseCombat();
    this.mode = 'AWAKENING';
    this.world = createSubmissionWorld();
    this.worldMinute = START_MINUTE;
    this.prologueProgress = 0;
    this.soloEncounterResolved = false;
    this.companionJoined = false;
    this.corridorProgress = 0;
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
  public move = (direction: Direction): void => this.combat?.move(direction);
  public useAction = (actionId: SliceActionId): void => this.combat?.useAction(actionId);
  public setActionHover = (actionId?: SliceActionId): void => this.combat?.setActionHover(actionId);
  public undoLastAction = (): void => this.combat?.undoLastAction();
  public confirmPlan = (): void => this.combat?.confirmPlan();
  public useLight = (): void => undefined;
  public unlockSeal = (): void => undefined;

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
      this.world = updateSubmissionTile(this.world, 'frontier-east', {
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
    const defeatedEncounter = this.encounterId;
    const defeated = this.combat.getSnapshot();
    if (defeated.mode !== 'DEFEAT') return;
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
    this.vitals = cost.vitals;
    this.supplies = cost.supplies;
    this.elapsedBattleTurns += defeated.state.turn;
    this.worldMinute += cost.elapsedMinutes;
    this.defeatCount += 1;
    this.lastDefeatCost = {
      elapsedMinutes: cost.elapsedMinutes,
      waterSpent: cost.usedCampSupplies ? 1 : 0,
      foodSpent: cost.usedCampSupplies ? 1 : 0,
    };
    this.releaseCombat();
    this.encounterId = undefined;
    this.encounterContent = undefined;
    this.corridorProgress = 0;
    if (defeatedEncounter === 'SOLO_WARRIOR' || !this.companionJoined) {
      this.prologueProgress = 0;
      this.soloEncounterResolved = false;
      this.mode = 'AWAKENING';
    } else {
      this.mode = 'COMPANION_JOINED';
    }
    this.notice = `안전 영토로 후퇴 · ${cost.elapsedMinutes}분 경과 · 물/식량 ${cost.usedCampSupplies ? '1씩 사용' : '없음'} · 부상 유지`;
    this.publish();
  };

  public destroy(): void {
    this.releaseCombat();
    this.listeners.clear();
  }

  private beginCombat(encounterId: SubmissionEncounterId, content: EncounterContent, retryNotice?: string): void {
    this.releaseCombat();
    this.encounterId = encounterId;
    this.encounterContent = content;
    const scenario = encounterId === 'SOLO_WARRIOR'
      ? createSubmissionSoloScenario(this.vitals, this.worldMinute)
      : createSubmissionJointScenario(encounterId.toLowerCase(), content, this.vitals, this.worldMinute);
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
          : '궁수의 사격선과 전사의 접근 경로가 겹친다.'),
      playbackSpeed: this.options.playbackSpeed,
      phaseDelayScale: this.options.phaseDelayScale,
    });
    this.combatUnsubscribe = this.combat.subscribe(() => this.publish());
    this.mode = 'COMBAT';
    this.notice = encounterId === 'SOLO_WARRIOR'
      ? '바깥의 첫 위협'
      : encounterId === 'FIRST_WARRIOR' ? '단검의 쇄도' : '사격선과 추격자';
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
    return {
      mode: this.mode,
      world: this.world,
      worldMinute: this.worldMinute,
      worldTime: formatWorldTime(this.worldMinute),
      prologueProgress: this.prologueProgress,
      soloEncounterResolved: this.soloEncounterResolved,
      companionJoined: this.companionJoined,
      corridorProgress: this.corridorProgress,
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
        : this.world.tiles.find((tile) => tile.id === 'frontier-east')?.anchorPrepared ? 0 : this.initialProtagonistTaskMinutes,
      delegationAttempt: this.delegationAttempt,
      delegationBaseline: this.delegationBaseline,
      delegationResult: this.delegationResult,
      anchorProgress: this.anchorProgress,
      incorporationBlocker: this.lastIncorporationBlocker,
      defeatCount: this.defeatCount,
      lastDefeatCost: this.lastDefeatCost,
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
    const save = parsed as Partial<SubmissionSaveData>;
    const stableModes: readonly SubmissionSaveData['mode'][] = [
      'AWAKENING', 'SOLO_APPROACH', 'COMPANION_SEALED', 'COMPANION_JOINED',
      'INTRO', 'CORRIDOR', 'CENTER_GATE', 'SCOUTED', 'POLICY_REVIEW', 'DELEGATION_PLAN',
      'DELEGATION_RESULT', 'ANCHOR_APPROACH', 'ANCHOR_READY', 'EXPANDED',
    ];
    if (save.version !== 2 || !stableModes.includes(save.mode as SubmissionSaveData['mode'])) return undefined;
    if (!save.world || !Array.isArray(save.world.tiles) || !Number.isFinite(save.worldMinute) || !Number.isFinite(save.corridorProgress)) return undefined;
    if (!Number.isFinite(save.prologueProgress) || typeof save.soloEncounterResolved !== 'boolean' || typeof save.companionJoined !== 'boolean') return undefined;
    if (!save.vitals || !save.supplies || !Array.isArray(save.policy) || !save.policyDirectives || typeof save.notice !== 'string') return undefined;
    if (typeof save.firstEncounterResolved !== 'boolean' || !Number.isFinite(save.elapsedBattleTurns) || !Number.isFinite(save.lastProtagonistTaskMinutes)) return undefined;
    if (!Number.isFinite(save.delegationAttempt) || !Number.isFinite(save.anchorProgress)) return undefined;
    return save as SubmissionSaveData;
  } catch {
    return undefined;
  }
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
