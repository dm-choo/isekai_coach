import type { Direction } from '../combat';
import type { PresentationPort } from '../phaser/bridge/PresentationPort';
import {
  DEFAULT_SLICE_POLICY,
  POLICY_COPY,
  SliceController,
  type PolicyExecutionStep,
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

export type SubmissionMode = 'INTRO' | 'CORRIDOR' | 'CENTER_GATE' | 'COMBAT' | 'SCOUTED' | 'DEFEAT';
export type SubmissionEncounterId = 'FIRST_WARRIOR' | 'CENTER_GUARD';

export interface SubmissionCombatSummary {
  readonly encounterId: SubmissionEncounterId;
  readonly turns: number;
  readonly selectedCounts: Readonly<Partial<Record<SlicePolicyId, number>>>;
  readonly primaryBlocked?: { readonly policyId: SlicePolicyId; readonly reason: string; readonly count: number };
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
  private notice = '동쪽 경계 너머에서 오래 멈춘 물소리가 들린다.';
  private combat: SliceController | null = null;
  private combatUnsubscribe: (() => void) | null = null;
  private encounterId: SubmissionEncounterId | undefined;
  private encounterContent: EncounterContent | undefined;
  private firstEncounterResolved = false;
  private elapsedBattleTurns = 0;
  private lastCombatSummary: SubmissionCombatSummary | undefined;
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
  return { encounterId, turns, selectedCounts, ...(primaryBlocked ? { primaryBlocked } : {}) };
}

export function submissionPolicyName(policyId: SlicePolicyId): string {
  return POLICY_COPY[policyId].name;
}
