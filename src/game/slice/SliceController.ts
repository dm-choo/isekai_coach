import {
  ABILITY_IDS,
  BattleEngine,
  directionBetween,
  getAbility,
  moveAction,
  projectPattern,
  pushAction,
  slamAction,
  step,
  type ActionFailureReason,
  type BattleScenario,
  type BattleState,
  type CombatAction,
  type CombatEvent,
  type Direction,
  type GridPosition,
  type Unit,
} from '../combat';
import type { PresentationPort } from '../phaser/bridge/PresentationPort';
import type { IntentIconKind } from '../phaser/bridge/PresentationPort';
import {
  DEFAULT_SLICE_POLICY,
  POLICY_COPY,
  evaluatePolicy,
  type PolicyExecutionStep,
  type PolicyDirectives,
  type SlicePolicyId,
} from './policy';
import {
  ADMINISTRATOR_ID,
  ARCHER_ID,
  GUARDIAN_ID,
  SLICE_SCENARIO_ID,
  createSliceScenario,
} from './scenario';

export type SliceMode =
  | 'INTRO'
  | 'PLAYER_TURN'
  | 'ALLY_TURN'
  | 'ENEMY_TURN'
  | 'VICTORY'
  | 'DEFEAT'
  | 'SEAL_UNLOCKED';
export type SliceActionId = 'PUSH' | 'SLAM' | 'INTERCEPT';

export interface PlannedPlayerAction {
  readonly id: string;
  readonly label: string;
  readonly action: CombatAction;
}

export interface IntentPreviewStep {
  readonly id: string;
  readonly label: string;
  readonly glyph: string;
  readonly icon: IntentIconKind;
  readonly description: string;
  readonly damage?: number;
  readonly policyId: SlicePolicyId;
  readonly policyRank: number;
  readonly policyReason: string;
  readonly blockedBeforeSelection: readonly { readonly policyId: SlicePolicyId; readonly reason: string }[];
  readonly movementPath: readonly GridPosition[];
  readonly effectCells: readonly GridPosition[];
}

export interface UnitIntentPreview {
  readonly unitId: string;
  readonly steps: readonly IntentPreviewStep[];
}

export interface SliceActionCandidate {
  readonly id: SliceActionId;
  readonly label: string;
  readonly glyph: string;
  readonly icon: IntentIconKind;
  readonly description: string;
  readonly tags: readonly string[];
  readonly apCost: number;
  readonly executable: boolean;
  readonly failureReason?: ActionFailureReason;
  readonly failureMessage?: string;
}

export interface SliceInputFeedback {
  readonly serial: number;
  readonly kind: 'ACCEPTED' | 'REJECTED' | 'COMMITTED';
  readonly message: string;
  readonly actionId?: SliceActionId;
}

export interface SliceRuntimeStatus {
  readonly presentedEventCount: number;
  readonly queuedEventCount: number;
  readonly generation: number;
}

export interface SliceSnapshot {
  readonly scenarioId: string;
  readonly mode: SliceMode;
  readonly state: BattleState;
  /** Projected player-plan state. The authoritative state remains `state`. */
  readonly previewState: BattleState;
  readonly eventHistory: readonly CombatEvent[];
  readonly status: SliceRuntimeStatus;
  readonly isBusy: boolean;
  readonly phaseSerial: number;
  readonly actions: readonly SliceActionCandidate[];
  readonly policy: readonly SlicePolicyId[];
  readonly activePolicyStep?: PolicyExecutionStep;
  readonly lastPolicyTrace: readonly PolicyExecutionStep[];
  readonly policyHistory: readonly PolicyExecutionStep[];
  readonly notice: string;
  readonly attempt: number;
  readonly plannedActions: readonly PlannedPlayerAction[];
  readonly allyIntent?: UnitIntentPreview;
  readonly hoveredActionId?: SliceActionId;
  readonly selectedTargetId?: string;
  readonly targetableEnemyIds: readonly string[];
  readonly canUndo: boolean;
  readonly canConfirm: boolean;
  readonly concealedIntentIds: readonly string[];
  readonly inputFeedback?: SliceInputFeedback;
}

type SnapshotListener = () => void;

export interface SliceControllerOptions {
  readonly scenarioFactory?: () => BattleScenario;
  readonly administratorId?: string;
  readonly allyId?: string;
  readonly initialTargetId?: string;
  readonly policy?: readonly SlicePolicyId[];
  readonly policyDirectives?: PolicyDirectives;
  readonly introNotice?: string;
  readonly playbackSpeed?: number;
  readonly phaseDelayScale?: number;
  readonly concealOneEnemyIntent?: boolean;
}

export class SliceController {
  private engine: BattleEngine;
  private readonly scenarioFactory: () => BattleScenario;
  private readonly administratorId: string;
  private readonly allyId: string;
  private readonly policyOrder: readonly SlicePolicyId[];
  private readonly policyDirectives: PolicyDirectives;
  private readonly introNotice: string;
  private readonly playbackSpeed: number;
  private readonly phaseDelayScale: number;
  private presentation: PresentationPort | null = null;
  private readonly listeners = new Set<SnapshotListener>();
  private mode: SliceMode = 'INTRO';
  private isBusy = false;
  private phaseSerial = 0;
  private presentedEventCount = 0;
  private generation = 0;
  private attempt = 1;
  private playbackAbortController = new AbortController();
  private lastPolicyTrace: PolicyExecutionStep[] = [];
  private policyHistory: PolicyExecutionStep[] = [];
  private activePolicyStep: PolicyExecutionStep | undefined;
  private notice: string;
  private plannedActions: CombatAction[] = [];
  private hoveredActionId: SliceActionId | undefined;
  private selectedTargetId: string | undefined;
  private readonly concealOneEnemyIntent: boolean;
  private enemyIntentsRevealed = false;
  private inputFeedback: SliceInputFeedback | undefined;
  private inputFeedbackSerial = 0;
  private snapshot: SliceSnapshot;

  public constructor(options: SliceControllerOptions = {}) {
    this.scenarioFactory = options.scenarioFactory ?? createSliceScenario;
    this.administratorId = options.administratorId ?? ADMINISTRATOR_ID;
    this.allyId = options.allyId ?? ARCHER_ID;
    this.policyOrder = [...(options.policy ?? DEFAULT_SLICE_POLICY)];
    this.policyDirectives = { ...options.policyDirectives };
    this.introNotice = options.introNotice ?? '결계문 앞을 지키는 존재가 길을 막고 있다.';
    this.playbackSpeed = options.playbackSpeed ?? 1;
    this.phaseDelayScale = options.phaseDelayScale ?? 1;
    this.concealOneEnemyIntent = options.concealOneEnemyIntent ?? false;
    this.notice = this.introNotice;
    this.engine = new BattleEngine(this.scenarioFactory());
    this.selectedTargetId = options.initialTargetId ?? this.firstLivingEnemyId();
    this.snapshot = this.buildSnapshot();
  }

  public getSnapshot = (): SliceSnapshot => this.snapshot;

  public subscribe = (listener: SnapshotListener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  public attachPresentation(presentation: PresentationPort): () => void {
    this.abortPresentation();
    this.presentation = presentation;
    presentation.setSpeed(this.playbackSpeed);
    presentation.setHiddenIntentIds?.(this.snapshot.concealedIntentIds);
    presentation.reset(this.engine.getState());
    presentation.setSelection?.(this.selectedTargetId ?? null);
    this.presentedEventCount = this.engine.getEvents().length;
    this.publish();
    return () => {
      if (this.presentation === presentation) {
        this.abortPresentation();
        this.presentation = null;
      }
    };
  }

  public startEncounter = (): void => {
    if (this.mode !== 'INTRO' || this.isBusy) return;
    this.engine.beginTurn();
    this.mode = 'PLAYER_TURN';
    this.isBusy = true;
    this.phaseSerial += 1;
    this.notice = '첫 적 행동의 이동과 타격 범위가 고정됐다.';
    this.publish();
    void this.pumpEvents().then(() => {
      if (this.mode === 'PLAYER_TURN') {
        this.isBusy = false;
        this.publish();
      }
    });
  };

  public move = (direction: Direction): void => {
    if (!this.canAcceptPlayerInput()) return;
    const administrator = this.simulateActions(this.plannedActions).state.units.find((unit) => unit.id === this.administratorId);
    if (!administrator) return;
    this.appendPlannedAction(moveAction(administrator.id, step(administrator.position, direction)));
  };

  public useAction = (actionId: SliceActionId): void => {
    if (!this.canAcceptPlayerInput()) return;
    // Hover prediction may include a lethal candidate and remove its target.
    // Input must branch from committed plan state, never from that what-if state.
    const action = this.actionFor(actionId, this.simulateActions(this.plannedActions).state);
    if (action) {
      this.appendPlannedAction(action, actionId);
      return;
    }
    this.notice = unavailableActionCopy(actionId);
    this.setInputFeedback('REJECTED', this.notice, actionId);
    this.publish();
  };

  public setActionHover = (actionId?: SliceActionId): void => {
    if (this.mode !== 'PLAYER_TURN' || this.isBusy) return;
    this.hoveredActionId = actionId;
    this.publish();
  };

  public revealEnemyIntents = (): void => {
    if (this.enemyIntentsRevealed || !this.concealOneEnemyIntent) return;
    this.enemyIntentsRevealed = true;
    this.notice = '휴대용 조명으로 모든 적 Intent를 확인했다.';
    this.publish();
  };

  public selectTarget = (unitId: string): void => {
    if (this.mode !== 'PLAYER_TURN' || this.isBusy) return;
    const projectedState = this.buildPlanProjection().state;
    const target = this.targetableEnemies(projectedState).find((unit) => unit.id === unitId);
    if (!target) return;
    if (this.selectedTargetId === target.id) return;
    this.selectedTargetId = target.id;
    this.hoveredActionId = undefined;
    this.notice = `${unitDisplayName(target)}을 공격 대상으로 지정했다.`;
    this.setInputFeedback('ACCEPTED', `${unitDisplayName(target)} 선택`);
    this.publish();
  };

  public undoLastAction = (): void => {
    if (!this.canAcceptPlayerInput() || this.plannedActions.length === 0) return;
    this.plannedActions = this.plannedActions.slice(0, -1);
    this.hoveredActionId = undefined;
    this.notice = this.plannedActions.length === 0 ? '행동 계획을 비웠다.' : '마지막 계획 행동을 취소했다.';
    this.setInputFeedback('ACCEPTED', this.notice);
    this.publish();
  };

  public confirmPlan = (): void => {
    if (!this.canAcceptPlayerInput()) return;
    const waitsWithoutAction = this.plannedActions.length === 0;
    this.isBusy = true;
    this.hoveredActionId = undefined;
    this.presentation?.setPrediction?.(null);
    if (waitsWithoutAction) this.notice = '대기하고 현재 턴을 종료한다.';
    this.setInputFeedback('COMMITTED', waitsWithoutAction ? '대기 확정 · 실행 시작' : `행동 ${this.plannedActions.length}개 확정 · 실행 시작`);
    this.publish();
    for (const action of this.plannedActions) {
      const result = this.engine.performStudentAction(action);
      if (!result.executable) {
        this.isBusy = false;
        this.notice = failureCopy(result.reason);
        this.publish();
        return;
      }
    }
    this.plannedActions = [];
    void this.pumpEvents().then(() => this.runAllyTurn());
  };

  public endTurn = this.confirmPlan;

  public unlockSeal = (): void => {
    if (this.mode !== 'VICTORY' || this.isBusy) return;
    this.isBusy = true;
    this.notice = '관리자가 오브젝트의 봉인을 해제한다.';
    this.publish();
    const signal = this.playbackAbortController.signal;
    const animation = this.presentation?.playSealUnlock?.(signal) ?? Promise.resolve();
    void animation.then(() => {
      if (signal.aborted || this.mode !== 'VICTORY') return;
      this.mode = 'SEAL_UNLOCKED';
      this.isBusy = false;
      this.phaseSerial += 1;
      this.publish();
    });
  };

  public restart = (): void => {
    this.abortPresentation();
    this.generation += 1;
    this.engine = new BattleEngine(this.scenarioFactory());
    this.mode = 'INTRO';
    this.isBusy = false;
    this.phaseSerial += 1;
    this.presentedEventCount = 0;
    this.lastPolicyTrace = [];
    this.policyHistory = [];
    this.activePolicyStep = undefined;
    this.plannedActions = [];
    this.hoveredActionId = undefined;
    this.selectedTargetId = this.firstLivingEnemyId();
    this.enemyIntentsRevealed = false;
    this.inputFeedback = undefined;
    this.attempt += 1;
    this.notice = this.introNotice;
    this.presentation?.reset(this.engine.getState());
    this.publish();
  };

  public destroy(): void {
    this.abortPresentation();
    this.generation += 1;
    this.presentation = null;
    this.listeners.clear();
  }

  private canAcceptPlayerInput(): boolean {
    return this.mode === 'PLAYER_TURN' && !this.isBusy && this.engine.getState().outcome === 'ONGOING';
  }

  private appendPlannedAction(action: CombatAction, actionId?: SliceActionId): void {
    const result = this.simulateActions([...this.plannedActions, action]);
    if (!result.executable) {
      this.notice = failureCopy(result.reason);
      this.setInputFeedback('REJECTED', this.notice, actionId);
      this.publish();
      return;
    }
    this.plannedActions = [...this.plannedActions, action];
    this.hoveredActionId = undefined;
    this.notice = `${actionLabel(action)} 계획 · Z 취소 / SPACE 확정`;
    this.setInputFeedback('ACCEPTED', `${actionLabel(action)}이 계획 ${this.plannedActions.length}번에 추가됨`, actionId);
    this.publish();
  }

  private setInputFeedback(kind: SliceInputFeedback['kind'], message: string, actionId?: SliceActionId): void {
    this.inputFeedbackSerial += 1;
    this.inputFeedback = { serial: this.inputFeedbackSerial, kind, message, ...(actionId ? { actionId } : {}) };
  }

  private async runAllyTurn(): Promise<void> {
    const runGeneration = this.generation;
    this.mode = 'ALLY_TURN';
    this.phaseSerial += 1;
    this.lastPolicyTrace = [];
    this.notice = '동료가 전술 우선순위를 위에서부터 평가한다.';
    this.publish();
    await this.phaseDelay(600, runGeneration);

    for (let cycle = 1; cycle <= 8 && runGeneration === this.generation; cycle += 1) {
      const state = this.engine.getState();
      const ally = state.units.find((unit) => unit.id === this.allyId);
      if (!ally || ally.hp <= 0 || ally.ap <= 0 || state.outcome !== 'ONGOING') break;
      const decision = evaluatePolicy(state, this.allyId, this.policyOrder, this.policyDirectives);
      const selected = decision.selected;
      const trace: PolicyExecutionStep = {
        cycle,
        selectedPolicyId: selected?.policyId ?? null,
        selectedName: selected ? POLICY_COPY[selected.policyId].name : '대기',
        reason: selected?.reason ?? '실행 가능한 전술이 없음',
        evaluations: decision.evaluations,
      };
      this.activePolicyStep = trace;
      this.lastPolicyTrace = [...this.lastPolicyTrace, trace];
      this.policyHistory = [...this.policyHistory, trace];
      this.notice = `${trace.selectedName} · ${trace.reason}`;
      this.publish();
      await this.phaseDelay(360, runGeneration);
      if (!selected?.action || runGeneration !== this.generation) break;
      const result = this.engine.performStudentAction(selected.action);
      if (!result.executable) break;
      await this.pumpEvents();
    }

    this.activePolicyStep = undefined;
    if (runGeneration !== this.generation) return;
    if (this.engine.getState().outcome !== 'ONGOING') {
      this.engine.resolveEnemyIntents();
      await this.pumpEvents();
      this.finishBattle();
      return;
    }
    await this.runEnemyTurn(runGeneration);
  }

  private async runEnemyTurn(runGeneration: number): Promise<void> {
    this.mode = 'ENEMY_TURN';
    this.phaseSerial += 1;
    this.notice = this.engine.getState().intents.length
      ? '고정된 공격 범위와 현재 점유자를 판정한다.'
      : '적의 행동이 중단됐다.';
    this.publish();
    await this.phaseDelay(650, runGeneration);
    if (runGeneration !== this.generation) return;
    this.engine.resolveEnemyIntents();
    await this.pumpEvents();
    if (this.engine.getState().outcome !== 'ONGOING') {
      this.finishBattle();
      return;
    }

    this.engine.beginTurn();
    this.plannedActions = [];
    this.hoveredActionId = undefined;
    this.mode = 'PLAYER_TURN';
    this.isBusy = true;
    this.phaseSerial += 1;
    this.notice = '새로운 적 행동이 고정됐다.';
    this.publish();
    await this.pumpEvents();
    if (runGeneration !== this.generation) return;
    this.isBusy = false;
    this.publish();
  }

  private finishBattle(): void {
    this.isBusy = false;
    this.activePolicyStep = undefined;
    this.plannedActions = [];
    this.hoveredActionId = undefined;
    if (this.engine.getState().outcome === 'STUDENT_VICTORY') {
      this.mode = 'VICTORY';
      this.notice = '현재 조우의 모든 적이 무너졌다.';
    } else {
      this.mode = 'DEFEAT';
      this.notice = '원정대가 행동 불능 상태가 됐다.';
    }
    this.phaseSerial += 1;
    this.publish();
  }

  private async pumpEvents(): Promise<void> {
    const runGeneration = this.generation;
    while (runGeneration === this.generation) {
      const event = this.engine.getEvents()[this.presentedEventCount];
      if (!event) break;
      if (this.presentation) {
        const signal = this.playbackAbortController.signal;
        await this.presentation.present(event, this.engine.getState(), 1, signal);
        if (signal.aborted || runGeneration !== this.generation) return;
      }
      this.presentedEventCount += 1;
      this.publish();
    }
    if (runGeneration === this.generation) this.presentation?.settle(this.engine.getState());
  }

  private phaseDelay(duration: number, runGeneration: number): Promise<void> {
    return new Promise((resolve) => {
      const signal = this.playbackAbortController.signal;
      if (runGeneration !== this.generation || signal.aborted) {
        resolve();
        return;
      }
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        globalThis.clearTimeout(timer);
        signal.removeEventListener('abort', abort);
        resolve();
      };
      const abort = () => finish();
      const timer = globalThis.setTimeout(finish, Math.max(1, duration * this.phaseDelayScale));
      signal.addEventListener('abort', abort, { once: true });
    });
  }

  private simulateActions(actions: readonly CombatAction[]): {
    executable: true;
    state: BattleState;
  } | {
    executable: false;
    state: BattleState;
    reason: ActionFailureReason;
  } {
    const preview = this.engine.preview((engine) => {
      for (const action of actions) {
        const result = engine.performStudentAction(action);
        if (!result.executable) return { executable: false as const, reason: result.reason };
      }
      return { executable: true as const };
    });
    return preview.value.executable
      ? { executable: true, state: preview.state }
      : { executable: false, reason: preview.value.reason, state: preview.state };
  }

  private buildPlanProjection(): { state: BattleState; allyIntent?: UnitIntentPreview } {
    let actions = [...this.plannedActions];
    const base = this.simulateActions(actions);
    if (this.hoveredActionId && base.executable) {
      const candidate = this.actionFor(this.hoveredActionId, base.state);
      if (candidate) {
        const candidateResult = this.simulateActions([...actions, candidate]);
        if (candidateResult.executable) actions = [...actions, candidate];
      }
    }
    const projection = this.simulateActions(actions);
    return {
      state: projection.state,
      allyIntent: projection.executable ? this.simulateAllyIntent(actions) : undefined,
    };
  }

  private simulateAllyIntent(playerActions: readonly CombatAction[]): UnitIntentPreview | undefined {
    const preview = this.engine.preview((engine) => {
      for (const action of playerActions) {
        if (!engine.performStudentAction(action).executable) return [] as IntentPreviewStep[];
      }
      const steps: IntentPreviewStep[] = [];
      for (let cycle = 0; cycle < 8; cycle += 1) {
        const state = engine.getState();
      const ally = state.units.find((unit) => unit.id === this.allyId && unit.hp > 0);
        if (!ally || ally.ap <= 0) break;
        const decision = evaluatePolicy(state, this.allyId, this.policyOrder, this.policyDirectives);
        const selected = decision.selected;
        if (!selected?.action) break;
        const selectedIndex = decision.evaluations.findIndex((evaluation) => evaluation === selected);
        steps.push(previewStep(selected.policyId, selected.action, state, selected.reason, selectedIndex + 1, decision.evaluations
          .slice(0, selectedIndex)
          .map((evaluation) => ({ policyId: evaluation.policyId, reason: evaluation.reason }))));
        if (!engine.performStudentAction(selected.action).executable) break;
      }
      return steps;
    });
    return preview.value.length > 0 ? { unitId: this.allyId, steps: preview.value } : undefined;
  }

  private actionFor(actionId: SliceActionId, state: BattleState): CombatAction | null {
    const administrator = state.units.find((unit) => unit.id === this.administratorId);
    if (!administrator) return null;
    if (actionId === 'INTERCEPT') {
      return { type: 'USE_ABILITY', actorId: administrator.id, abilityId: ABILITY_IDS.INTERCEPT, targetId: administrator.id };
    }
    const target = this.currentTarget(state, administrator?.position, true);
    if (!target) return null;
    const direction = directionBetween(administrator.position, target.position);
    if (!direction) return null;
    return actionId === 'PUSH'
      ? pushAction(administrator.id, target.id, direction)
      : slamAction(administrator.id, target.id, direction);
  }

  private currentTarget(state: BattleState, origin?: GridPosition, targetableOnly = false) {
    const candidates = targetableOnly
      ? this.targetableEnemies(state)
      : state.units.filter((unit) => unit.faction === 'ENEMY' && unit.hp > 0);
    const selected = state.units.find(
      (unit) => unit.id === this.selectedTargetId && candidates.some((candidate) => candidate.id === unit.id),
    );
    if (selected) return selected;
    return candidates
      .slice()
      .sort((left, right) => {
        if (!origin) return left.spawnOrder - right.spawnOrder;
        const leftDistance = Math.abs(left.position.x - origin.x) + Math.abs(left.position.y - origin.y);
        const rightDistance = Math.abs(right.position.x - origin.x) + Math.abs(right.position.y - origin.y);
        return leftDistance - rightDistance || left.spawnOrder - right.spawnOrder;
      })[0];
  }

  private targetableEnemies(state: BattleState): Unit[] {
    const administrator = state.units.find((unit) => unit.id === this.administratorId && unit.hp > 0);
    if (!administrator) return [];
    const cheapestAttack = Math.min(getAbility(ABILITY_IDS.PUSH)?.apCost ?? Infinity, getAbility(ABILITY_IDS.SLAM)?.apCost ?? Infinity);
    if (administrator.ap < cheapestAttack) return [];
    return state.units.filter((unit) =>
      unit.faction === 'ENEMY' && unit.hp > 0 &&
      Math.abs(unit.position.x - administrator.position.x) + Math.abs(unit.position.y - administrator.position.y) <= 1
    );
  }

  private buildActionCandidates(): readonly SliceActionCandidate[] {
    const plannedState = this.simulateActions(this.plannedActions).state;
    const target = this.currentTarget(plannedState, undefined, true);
    const targetName = target ? unitDisplayName(target) : '적';
    const definitions: readonly Omit<SliceActionCandidate, 'executable' | 'failureReason'>[] = [
      {
        id: 'PUSH', label: '밀치기', glyph: '»', icon: 'PUSH', tags: ['#근거리공격', '#넉백'], apCost: 2,
        description: `인접한 ${targetName}에게 피해 1을 주고 1칸 밀어냅니다.`,
      },
      {
        id: 'SLAM', label: '내려찍기', glyph: '↓', icon: 'ATTACK', tags: ['#근거리공격'], apCost: 2,
        description: `인접한 ${targetName}에게 피해 2를 줍니다. 차징 중인 결계 수호자에게 적중하면 해당 Intent를 취소합니다.`,
      },
      {
        id: 'INTERCEPT', label: '가로막기', glyph: '◇', icon: 'INTERCEPT', tags: ['#방어', '#반격', '#이동차단'], apCost: 2,
        description: '이 턴 적의 이동 경로에 먼저 들어가 가로막으면 받는 피해 1을 막고 해당 적에게 피해 1로 한 번 반격합니다.',
      },
    ];
    return definitions.map((definition) => {
      const action = this.actionFor(definition.id, plannedState);
      const result = action ? this.simulateActions([...this.plannedActions, action]) : null;
      return {
        ...definition,
        executable: this.canAcceptPlayerInput() && (result?.executable ?? false),
        failureReason: result && !result.executable ? result.reason : action ? undefined : 'INVALID_TARGET',
        failureMessage: result && !result.executable
          ? failureCopy(result.reason)
          : action ? undefined : unavailableActionCopy(definition.id),
      };
    });
  }

  private buildSnapshot(): SliceSnapshot {
    const eventHistory = this.engine.getEvents();
    const projection = this.buildPlanProjection();
    return {
      scenarioId: this.engine.getState().scenarioId,
      mode: this.mode,
      state: this.engine.getState(),
      previewState: projection.state,
      eventHistory,
      status: {
        presentedEventCount: this.presentedEventCount,
        queuedEventCount: Math.max(0, eventHistory.length - this.presentedEventCount),
        generation: this.generation,
      },
      isBusy: this.isBusy,
      phaseSerial: this.phaseSerial,
      actions: this.buildActionCandidates(),
      policy: this.policyOrder,
      activePolicyStep: this.activePolicyStep,
      lastPolicyTrace: this.lastPolicyTrace,
      policyHistory: this.policyHistory,
      notice: this.notice,
      attempt: this.attempt,
      plannedActions: this.plannedActions.map((action, index) => ({
        id: `plan-${index + 1}`,
        label: actionLabel(action),
        action,
      })),
      allyIntent: projection.allyIntent,
      hoveredActionId: this.hoveredActionId,
      selectedTargetId: this.currentTarget(projection.state, undefined, true)?.id,
      targetableEnemyIds: this.targetableEnemies(projection.state).map((unit) => unit.id),
      canUndo: this.canAcceptPlayerInput() && this.plannedActions.length > 0,
      canConfirm: this.canAcceptPlayerInput(),
      concealedIntentIds: this.concealedIntentIds(projection.state),
      inputFeedback: this.inputFeedback,
    };
  }

  private publish(): void {
    this.snapshot = this.buildSnapshot();
    this.syncPlanningPresentation();
    for (const listener of this.listeners) listener();
  }

  private syncPlanningPresentation(): void {
    this.presentation?.setHiddenIntentIds?.(this.snapshot.concealedIntentIds);
    this.presentation?.setSelection?.(this.snapshot.selectedTargetId ?? null);
    if (!this.presentation || this.mode !== 'PLAYER_TURN' || this.isBusy) {
      this.presentation?.setPrediction?.(null);
      return;
    }
    const authoritative = this.engine.getState();
    const preview = this.snapshot.previewState;
    this.presentation.setPrediction?.({
      unitPositions: preview.units
        .filter((unit) => {
          const current = authoritative.units.find((candidate) => candidate.id === unit.id);
          return current && (current.position.x !== unit.position.x || current.position.y !== unit.position.y);
        })
        .map((unit) => ({ unitId: unit.id, position: unit.position })),
      intents: this.snapshot.allyIntent ? [this.snapshot.allyIntent] : [],
      previewIntents: preview.intents,
    });
  }

  private concealedIntentIds(state: BattleState): readonly string[] {
    if (!this.concealOneEnemyIntent || this.enemyIntentsRevealed) return [];
    const first = state.intents
      .filter((intent) => state.units.some((unit) => unit.id === intent.sourceId && unit.hp > 0))
      .slice()
      .sort((left, right) => {
        const leftOrder = state.units.find((unit) => unit.id === left.sourceId)?.spawnOrder ?? 0;
        const rightOrder = state.units.find((unit) => unit.id === right.sourceId)?.spawnOrder ?? 0;
        return leftOrder - rightOrder;
      })[0];
    return first ? [first.id] : [];
  }

  private abortPresentation(): void {
    this.playbackAbortController.abort();
    this.playbackAbortController = new AbortController();
  }

  private firstLivingEnemyId(): string | undefined {
    return this.engine.getState().units
      .filter((unit) => unit.faction === 'ENEMY' && unit.hp > 0)
      .sort((left, right) => left.spawnOrder - right.spawnOrder)[0]?.id;
  }
}

function unitDisplayName(unit: BattleState['units'][number]): string {
  if (unit.id === GUARDIAN_ID) return '결계 수호자';
  if (unit.combatRole === 'MINION') return '추적 하수인';
  const suffix = unit.id.endsWith('-1') ? ' A' : unit.id.endsWith('-2') ? ' B' : '';
  if (unit.id.includes('patrol')) return '순찰 고블린 전사';
  if (unit.visualKey === 'goblin_archer_slice_02') return `고블린 궁수${suffix}`;
  if (unit.visualKey === 'goblin_warrior_slice_02') return `고블린 전사${suffix}`;
  if (unit.visualKey === 'goblin_bomber_slice_02') return `고블린 투척병${suffix}`;
  return '적';
}

function previewStep(
  policyId: SlicePolicyId,
  action: CombatAction,
  state: BattleState,
  policyReason: string,
  policyRank: number,
  blockedBeforeSelection: readonly { readonly policyId: SlicePolicyId; readonly reason: string }[],
): IntentPreviewStep {
  const copy = POLICY_COPY[policyId];
  if (action.type === 'MOVE') {
    return {
      id: `${policyId}-${action.actorId}-${action.to.x}-${action.to.y}`,
      label: copy.name,
      glyph: '◆',
      icon: 'MOVE',
      description: `${copy.name}: ${directionCopy(state.units.find((unit) => unit.id === action.actorId)?.position, action.to)} 1칸 이동합니다.`,
      policyId,
      policyRank,
      policyReason,
      blockedBeforeSelection,
      movementPath: [{ ...action.to }],
      effectCells: [],
    };
  }
  const actor = state.units.find((unit) => unit.id === action.actorId);
  const ability = getAbility(action.abilityId);
  const target = action.targetId ? state.units.find((unit) => unit.id === action.targetId) : undefined;
  const direction = action.direction ?? (actor && target ? directionBetween(actor.position, target.position) : undefined) ?? actor?.facing ?? 'RIGHT';
  const effectCells = ability?.targeting === 'UNIT' && target
    ? [{ ...target.position }]
    : actor && ability?.pattern
      ? projectPattern(actor.position, direction, ability.pattern, state.map)
      : [];
  const damage = ability?.effects.find((effect) => effect.type === 'DAMAGE');
  return {
    id: `${policyId}-${action.actorId}-${action.abilityId}`,
    label: copy.name,
    glyph: policyId === 'SHOOT' ? '➶' : policyId === 'PUSH' ? '»' : '◆',
    icon: policyId === 'SHOOT' ? 'SHOOT' : policyId === 'PUSH' ? 'PUSH' : 'ATTACK',
    description: policyDescription(policyId, target ? unitDisplayName(target) : undefined, damage?.type === 'DAMAGE' ? damage.amount : undefined),
    damage: damage?.type === 'DAMAGE' ? damage.amount : undefined,
    policyId,
    policyRank,
    policyReason,
    blockedBeforeSelection,
    movementPath: [],
    effectCells,
  };
}

function directionCopy(from: GridPosition | undefined, to: GridPosition): string {
  if (!from) return '인접 칸으로';
  if (to.y < from.y) return '위로';
  if (to.y > from.y) return '아래로';
  if (to.x < from.x) return '왼쪽으로';
  return '오른쪽으로';
}

function policyDescription(policyId: SlicePolicyId, targetName?: string, damage?: number): string {
  if (policyId === 'SHOOT') {
    return `사격: 같은 행 3~6칸 안에서 몸에 가리지 않은 첫 ${targetName ?? '적'}에게 피해 ${damage ?? 1}을 줍니다. 인접 사격과 관통은 불가능합니다.`;
  }
  if (policyId === 'PUSH') {
    return `밀치기: 인접한 ${targetName ?? '적'}에게 피해 ${damage ?? 1}을 주고 1칸 밀어냅니다.`;
  }
  return `${POLICY_COPY[policyId].name}을 실행합니다.`;
}

function actionLabel(action: CombatAction): string {
  if (action.type === 'MOVE') return '이동';
  if (action.abilityId === 'push') return '밀치기';
  if (action.abilityId === 'slam') return '내려찍기';
  if (action.abilityId === 'intercept') return '가로막기';
  return getAbility(action.abilityId)?.name ?? '행동';
}

function failureCopy(reason: ActionFailureReason): string {
  const copy: Partial<Record<ActionFailureReason, string>> = {
    INSUFFICIENT_AP: 'AP가 부족하다.',
    OUT_OF_BOUNDS: '전투 영역 밖으로는 이동할 수 없다.',
    OCCUPIED: '다른 전투원이 점유한 위치다.',
    INVALID_TARGET: '유효한 사거리에 표적이 없다.',
    BLOCKED_KNOCKBACK: '뒤칸이 막혀 밀칠 수 없다.',
  };
  return copy[reason] ?? '지금은 그 행동을 실행할 수 없다.';
}

function unavailableActionCopy(actionId: SliceActionId): string {
  if (actionId === 'PUSH' || actionId === 'SLAM') return '인접한 적이 없음 · 먼저 이동';
  return '현재 위치에서는 사용할 수 없음';
}
