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
  createSlice2EncounterScenario,
  formatWorldTime,
  type EncounterContent,
  type ExpeditionVitals,
} from '../slice2';
import { createSubmissionWorld, updateSubmissionTile, type SubmissionWorldState } from './world';
import { simulateDelegatedOperation, type DelegatedOperationResult } from './delegation';

export type SubmissionMode =
  | 'INTRO' | 'CORRIDOR' | 'CENTER_GATE' | 'COMBAT' | 'SCOUTED'
  | 'POLICY_REVIEW' | 'DELEGATION_PLAN' | 'DELEGATION_RESULT' | 'DEFEAT';
export type SubmissionEncounterId = 'FIRST_WARRIOR' | 'CENTER_GUARD';
export type SubmissionPolicyChoice = 'PUSH_FIRST' | 'KEEP_RANGE';

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
  readonly isNight: false;
  readonly canUseLight: false;
  readonly isBossEncounter: false;
}

export interface SubmissionControllerOptions {
  readonly playbackSpeed?: number;
  readonly phaseDelayScale?: number;
}

type Listener = () => void;

const START_MINUTE = 10 * 60;
const TRAVEL_MINUTES_PER_100M = 2;

export class SubmissionController {
  private readonly listeners = new Set<Listener>();
  private mode: SubmissionMode = 'INTRO';
  private world = createSubmissionWorld();
  private worldMinute = START_MINUTE;
  private corridorProgress = 0;
  private vitals: ExpeditionVitals = { administratorHp: 14, allyHp: 12 };
  private supplies = { water: 1, food: 1 };
  private policy: readonly SlicePolicyId[] = [...DEFAULT_SLICE_POLICY];
  private policyDirectives: PolicyDirectives = {};
  private notice = '동쪽 경계 너머에서 오래 멈춘 물소리가 들린다.';
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
  private snapshot: SubmissionSnapshot;

  public constructor(private readonly options: SubmissionControllerOptions = {}) {
    this.snapshot = this.buildSnapshot();
  }

  public getSnapshot = (): SubmissionSnapshot => this.snapshot;

  public subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  public startExpedition = (): void => {
    if (this.mode !== 'INTRO') return;
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
    if (resolvedEncounter === 'FIRST_WARRIOR') {
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
    if (this.combat.getSnapshot().mode !== 'DEFEAT') return;
    this.beginCombat(this.encounterId, this.encounterContent);
  };

  public destroy(): void {
    this.releaseCombat();
    this.listeners.clear();
  }

  private beginCombat(encounterId: SubmissionEncounterId, content: EncounterContent): void {
    this.releaseCombat();
    this.encounterId = encounterId;
    this.encounterContent = content;
    const scenario = createSlice2EncounterScenario(`submission:${encounterId.toLowerCase()}`, content, this.vitals, { worldMinute: this.worldMinute });
    this.combat = new SliceController({
      scenarioFactory: () => scenario,
      administratorId: SLICE2_ADMINISTRATOR_ID,
      allyId: SLICE2_ALLY_ID,
      policy: this.policy,
      policyDirectives: this.policyDirectives,
      introNotice: encounterId === 'FIRST_WARRIOR'
        ? '빠르게 접근하는 적 하나가 통로를 막았다.'
        : '궁수의 사격선과 전사의 접근 경로가 겹친다.',
      playbackSpeed: this.options.playbackSpeed,
      phaseDelayScale: this.options.phaseDelayScale,
    });
    this.combatUnsubscribe = this.combat.subscribe(() => this.publish());
    this.mode = 'COMBAT';
    this.notice = encounterId === 'FIRST_WARRIOR' ? '단검의 쇄도' : '사격선과 추격자';
    this.publish();
  }

  private releaseCombat(): void {
    this.combatUnsubscribe?.();
    this.combatUnsubscribe = null;
    this.combat?.destroy();
    this.combat = null;
  }

  private buildSnapshot(): SubmissionSnapshot {
    return {
      mode: this.mode,
      world: this.world,
      worldMinute: this.worldMinute,
      worldTime: formatWorldTime(this.worldMinute),
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
