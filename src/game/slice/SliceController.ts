import {
  BattleEngine,
  directionBetween,
  getAbility,
  moveAction,
  projectPattern,
  pushAction,
  slamAction,
  step,
  type ActionFailureReason,
  type BattleState,
  type CombatAction,
  type CombatEvent,
  type Direction,
  type GridPosition,
} from '../combat';
import type { PresentationPort } from '../phaser/bridge/PresentationPort';
import type { IntentIconKind } from '../phaser/bridge/PresentationPort';
import {
  DEFAULT_SLICE_POLICY,
  POLICY_COPY,
  evaluatePolicy,
  type PolicyExecutionStep,
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
export type SliceActionId = 'PUSH' | 'SLAM';

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
  readonly notice: string;
  readonly attempt: number;
  readonly plannedActions: readonly PlannedPlayerAction[];
  readonly allyIntent?: UnitIntentPreview;
  readonly hoveredActionId?: SliceActionId;
  readonly selectedTargetId?: string;
  readonly canUndo: boolean;
  readonly canConfirm: boolean;
}

type SnapshotListener = () => void;

export class SliceController {
  private engine = new BattleEngine(createSliceScenario());
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
  private activePolicyStep: PolicyExecutionStep | undefined;
  private notice = '결계문 앞을 지키는 존재가 길을 막고 있다.';
  private plannedActions: CombatAction[] = [];
  private hoveredActionId: SliceActionId | undefined;
  private selectedTargetId: string | undefined = GUARDIAN_ID;
  private snapshot = this.buildSnapshot();

  public getSnapshot = (): SliceSnapshot => this.snapshot;

  public subscribe = (listener: SnapshotListener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  public attachPresentation(presentation: PresentationPort): () => void {
    this.abortPresentation();
    this.presentation = presentation;
    presentation.setSpeed(1);
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
    this.notice = '수호자의 첫 타격이 고정됐다.';
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
    const administrator = this.buildPlanProjection().state.units.find((unit) => unit.id === ADMINISTRATOR_ID);
    if (!administrator) return;
    this.appendPlannedAction(moveAction(administrator.id, step(administrator.position, direction)));
  };

  public useAction = (actionId: SliceActionId): void => {
    if (!this.canAcceptPlayerInput()) return;
    const action = this.actionFor(actionId, this.buildPlanProjection().state);
    if (action) this.appendPlannedAction(action);
  };

  public setActionHover = (actionId?: SliceActionId): void => {
    if (this.mode !== 'PLAYER_TURN' || this.isBusy) return;
    this.hoveredActionId = actionId;
    this.publish();
  };

  public selectTarget = (unitId: string): void => {
    if (this.mode !== 'PLAYER_TURN' || this.isBusy) return;
    const target = this.buildPlanProjection().state.units.find(
      (unit) => unit.id === unitId && unit.faction === 'ENEMY' && unit.hp > 0,
    );
    if (!target) return;
    this.selectedTargetId = target.id;
    this.hoveredActionId = undefined;
    this.notice = `${unitDisplayName(target)}을 공격 대상으로 지정했다.`;
    this.publish();
  };

  public undoLastAction = (): void => {
    if (!this.canAcceptPlayerInput() || this.plannedActions.length === 0) return;
    this.plannedActions = this.plannedActions.slice(0, -1);
    this.hoveredActionId = undefined;
    this.notice = this.plannedActions.length === 0 ? '행동 계획을 비웠다.' : '마지막 계획 행동을 취소했다.';
    this.publish();
  };

  public confirmPlan = (): void => {
    if (!this.canAcceptPlayerInput()) return;
    const waitsWithoutAction = this.plannedActions.length === 0;
    this.isBusy = true;
    this.hoveredActionId = undefined;
    this.presentation?.setPrediction?.(null);
    if (waitsWithoutAction) this.notice = '대기하고 현재 턴을 종료한다.';
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
    this.engine = new BattleEngine(createSliceScenario());
    this.mode = 'INTRO';
    this.isBusy = false;
    this.phaseSerial += 1;
    this.presentedEventCount = 0;
    this.lastPolicyTrace = [];
    this.activePolicyStep = undefined;
    this.plannedActions = [];
    this.hoveredActionId = undefined;
    this.selectedTargetId = GUARDIAN_ID;
    this.attempt += 1;
    this.notice = '결계문 앞을 지키는 존재가 길을 막고 있다.';
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

  private appendPlannedAction(action: CombatAction): void {
    const result = this.simulateActions([...this.plannedActions, action]);
    if (!result.executable) {
      this.notice = failureCopy(result.reason);
      this.publish();
      return;
    }
    this.plannedActions = [...this.plannedActions, action];
    this.hoveredActionId = undefined;
    this.notice = `${actionLabel(action)} 계획 · Z 취소 / SPACE 확정`;
    this.publish();
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
      const ally = state.units.find((unit) => unit.id === ARCHER_ID);
      if (!ally || ally.hp <= 0 || ally.ap <= 0 || state.outcome !== 'ONGOING') break;
      const decision = evaluatePolicy(state, ARCHER_ID);
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
      : '수호자의 행동이 중단됐다.';
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
    this.notice = this.engine.getState().turn === 2
      ? '광범위 공격이 준비됐다. 중단할 수 있다.'
      : '새로운 적 행동이 고정됐다.';
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
      this.notice = '결계 수호자가 무너졌다. 관리자만 봉인을 해제할 수 있다.';
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
      const timer = globalThis.setTimeout(finish, duration);
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
        const ally = state.units.find((unit) => unit.id === ARCHER_ID && unit.hp > 0);
        if (!ally || ally.ap <= 0) break;
        const selected = evaluatePolicy(state, ARCHER_ID).selected;
        if (!selected?.action) break;
        steps.push(previewStep(selected.policyId, selected.action, state));
        if (!engine.performStudentAction(selected.action).executable) break;
      }
      return steps;
    });
    return preview.value.length > 0 ? { unitId: ARCHER_ID, steps: preview.value } : undefined;
  }

  private actionFor(actionId: SliceActionId, state: BattleState): CombatAction | null {
    const administrator = state.units.find((unit) => unit.id === ADMINISTRATOR_ID);
    const target = this.currentTarget(state, administrator?.position);
    if (!administrator || !target) return null;
    const direction = directionBetween(administrator.position, target.position);
    if (!direction) return null;
    return actionId === 'PUSH'
      ? pushAction(administrator.id, target.id, direction)
      : slamAction(administrator.id, target.id, direction);
  }

  private currentTarget(state: BattleState, origin?: GridPosition) {
    const selected = state.units.find(
      (unit) => unit.id === this.selectedTargetId && unit.faction === 'ENEMY' && unit.hp > 0,
    );
    if (selected) return selected;
    return state.units
      .filter((unit) => unit.faction === 'ENEMY' && unit.hp > 0)
      .slice()
      .sort((left, right) => {
        if (!origin) return left.spawnOrder - right.spawnOrder;
        const leftDistance = Math.abs(left.position.x - origin.x) + Math.abs(left.position.y - origin.y);
        const rightDistance = Math.abs(right.position.x - origin.x) + Math.abs(right.position.y - origin.y);
        return leftDistance - rightDistance || left.spawnOrder - right.spawnOrder;
      })[0];
  }

  private buildActionCandidates(): readonly SliceActionCandidate[] {
    const plannedState = this.simulateActions(this.plannedActions).state;
    const target = this.currentTarget(plannedState);
    const targetName = target ? unitDisplayName(target) : '적';
    const definitions: readonly Omit<SliceActionCandidate, 'executable' | 'failureReason'>[] = [
      {
        id: 'PUSH', label: '밀치기', glyph: '»', icon: 'PUSH', tags: ['#근거리공격', '#넉백'], apCost: 2,
        description: `인접한 ${targetName}에게 피해 1을 주고 1칸 밀어냅니다.`,
      },
      {
        id: 'SLAM', label: '내려찍기', glyph: '↓', icon: 'STUN', tags: ['#근거리공격', '#스턴'], apCost: 1,
        description: `인접한 ${targetName}에게 피해 1과 스턴을 적용해 중단 가능한 Intent를 취소합니다.`,
      },
    ];
    return definitions.map((definition) => {
      const action = this.actionFor(definition.id, plannedState);
      const result = action ? this.simulateActions([...this.plannedActions, action]) : null;
      return {
        ...definition,
        executable: this.canAcceptPlayerInput() && (result?.executable ?? false),
        failureReason: result && !result.executable ? result.reason : undefined,
      };
    });
  }

  private buildSnapshot(): SliceSnapshot {
    const eventHistory = this.engine.getEvents();
    const projection = this.buildPlanProjection();
    return {
      scenarioId: SLICE_SCENARIO_ID,
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
      policy: DEFAULT_SLICE_POLICY,
      activePolicyStep: this.activePolicyStep,
      lastPolicyTrace: this.lastPolicyTrace,
      notice: this.notice,
      attempt: this.attempt,
      plannedActions: this.plannedActions.map((action, index) => ({
        id: `plan-${index + 1}`,
        label: actionLabel(action),
        action,
      })),
      allyIntent: projection.allyIntent,
      hoveredActionId: this.hoveredActionId,
      selectedTargetId: this.currentTarget(projection.state)?.id,
      canUndo: this.canAcceptPlayerInput() && this.plannedActions.length > 0,
      canConfirm: this.canAcceptPlayerInput(),
    };
  }

  private publish(): void {
    this.snapshot = this.buildSnapshot();
    this.syncPlanningPresentation();
    for (const listener of this.listeners) listener();
  }

  private syncPlanningPresentation(): void {
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

  private abortPresentation(): void {
    this.playbackAbortController.abort();
    this.playbackAbortController = new AbortController();
  }
}

function unitDisplayName(unit: BattleState['units'][number]): string {
  if (unit.id === GUARDIAN_ID) return '결계 수호자';
  if (unit.combatRole === 'MINION') return '추적 하수인';
  return '적';
}

function previewStep(
  policyId: SlicePolicyId,
  action: CombatAction,
  state: BattleState,
): IntentPreviewStep {
  const copy = POLICY_COPY[policyId];
  if (action.type === 'MOVE') {
    return {
      id: `${policyId}-${action.actorId}-${action.to.x}-${action.to.y}`,
      label: copy.name,
      glyph: '◆',
      icon: 'MOVE',
      description: `${copy.name}: ${directionCopy(state.units.find((unit) => unit.id === action.actorId)?.position, action.to)} 1칸 이동합니다.`,
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
    return `사격: 같은 행 2~5칸 안의 가장 가까운 ${targetName ?? '적'}에게 피해 ${damage ?? 1}을 줍니다. 관통하지 않습니다.`;
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
