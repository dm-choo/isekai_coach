import {
  BattleEngine,
  directionBetween,
  moveAction,
  pushAction,
  slamAction,
  step,
  type ActionFailureReason,
  type BattleState,
  type CombatAction,
  type CombatEvent,
  type Direction,
} from '../combat';
import type { PresentationPort } from '../phaser/bridge/PresentationPort';
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

export interface SliceActionCandidate {
  readonly id: SliceActionId;
  readonly label: string;
  readonly glyph: string;
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
    const administrator = this.unit(ADMINISTRATOR_ID);
    if (!administrator) return;
    this.executePlayerAction(moveAction(administrator.id, step(administrator.position, direction)));
  };

  public useAction = (actionId: SliceActionId): void => {
    if (!this.canAcceptPlayerInput()) return;
    const action = this.actionFor(actionId, this.engine.getState());
    if (action) this.executePlayerAction(action);
  };

  public endTurn = (): void => {
    if (!this.canAcceptPlayerInput()) return;
    this.isBusy = true;
    this.publish();
    void this.runAllyTurn();
  };

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

  private executePlayerAction(action: CombatAction): void {
    const result = this.engine.performStudentAction(action);
    if (!result.executable) {
      this.notice = failureCopy(result.reason);
      this.publish();
      return;
    }
    this.isBusy = true;
    this.notice = action.type === 'MOVE' ? '이동' : action.abilityId === 'push' ? '밀치기' : '내려찍';
    this.publish();
    void this.pumpEvents().then(() => {
      if (this.mode !== 'PLAYER_TURN') return;
      const administrator = this.unit(ADMINISTRATOR_ID);
      if (!administrator || administrator.ap <= 0 || this.engine.getState().outcome !== 'ONGOING') {
        void this.runAllyTurn();
        return;
      }
      this.isBusy = false;
      this.publish();
    });
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
      globalThis.setTimeout(() => {
        resolve();
      }, runGeneration === this.generation ? duration : 0);
    });
  }

  private actionFor(actionId: SliceActionId, state: BattleState): CombatAction | null {
    const administrator = state.units.find((unit) => unit.id === ADMINISTRATOR_ID);
    const guardian = state.units.find((unit) => unit.id === GUARDIAN_ID && unit.hp > 0);
    if (!administrator || !guardian) return null;
    const direction = directionBetween(administrator.position, guardian.position);
    if (!direction) return null;
    return actionId === 'PUSH'
      ? pushAction(administrator.id, guardian.id, direction)
      : slamAction(administrator.id, guardian.id, direction);
  }

  private buildActionCandidates(): readonly SliceActionCandidate[] {
    const definitions: readonly Omit<SliceActionCandidate, 'executable' | 'failureReason'>[] = [
      { id: 'PUSH', label: '밀치기', glyph: '»', tags: ['#근거리공격', '#넉백'], apCost: 1 },
      { id: 'SLAM', label: '내려찍', glyph: '↓', tags: ['#근거리공격', '#스턴'], apCost: 1 },
    ];
    return definitions.map((definition) => {
      const action = this.actionFor(definition.id, this.engine.getState());
      const result = action
        ? this.engine.preview((engine) => engine.performStudentAction(action)).value
        : null;
      return {
        ...definition,
        executable: this.canAcceptPlayerInput() && (result?.executable ?? false),
        failureReason: result && !result.executable ? result.reason : undefined,
      };
    });
  }

  private unit(id: string) {
    return this.engine.getState().units.find((unit) => unit.id === id);
  }

  private buildSnapshot(): SliceSnapshot {
    const eventHistory = this.engine.getEvents();
    return {
      scenarioId: SLICE_SCENARIO_ID,
      mode: this.mode,
      state: this.engine.getState(),
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
    };
  }

  private publish(): void {
    this.snapshot = this.buildSnapshot();
    for (const listener of this.listeners) listener();
  }

  private abortPresentation(): void {
    this.playbackAbortController.abort();
    this.playbackAbortController = new AbortController();
  }
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
