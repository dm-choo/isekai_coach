import {
  BattleEngine,
  SCENARIO_IDS,
  createScenario,
  type BattleState,
  type CombatAction,
  type CombatEvent,
} from '../../combat';
import type { PresentationPort } from './PresentationPort';
import type {
  PlaybackSpeed,
  RuntimeMode,
  RuntimeStatus,
  SandboxSnapshot,
  SnapshotListener,
} from './types';

const MAX_SANDBOX_TURNS = 12;

/**
 * Owns the simulation head and the independently-paced presentation cursor.
 * React only sends typed commands here; Phaser only implements PresentationPort.
 */
export class SandboxController {
  private scenarioId: string;
  private engine: BattleEngine;
  private presentation: PresentationPort | null = null;
  private readonly listeners = new Set<SnapshotListener>();
  private mode: RuntimeMode = 'READY';
  private speed: PlaybackSpeed = 1;
  private presentedEventCount = 0;
  private generation = 0;
  private pumpingGeneration: number | null = null;
  private stepBudget = 0;
  private playbackAbortController = new AbortController();
  private snapshot: SandboxSnapshot;

  public constructor(initialScenarioId: string = Object.values(SCENARIO_IDS)[0]) {
    this.scenarioId = initialScenarioId;
    this.engine = new BattleEngine(createScenario(initialScenarioId));
    this.snapshot = this.buildSnapshot();
  }

  public getSnapshot = (): SandboxSnapshot => this.snapshot;

  public subscribe = (listener: SnapshotListener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  public attachPresentation(presentation: PresentationPort): () => void {
    this.abortPresentation();
    this.presentation = presentation;
    presentation.setSpeed(this.speed === 'INSTANT' ? 1 : this.speed);
    presentation.reset(this.engine.getState());
    if (this.mode === 'PAUSED') presentation.pause();
    if (this.mode === 'PLAYING' || this.stepBudget > 0) void this.pump();
    return () => {
      if (this.presentation === presentation) {
        this.abortPresentation();
        this.presentation = null;
      }
    };
  }

  public reset = (scenarioId: string = this.scenarioId): void => {
    this.abortPresentation();
    this.generation += 1;
    this.pumpingGeneration = null;
    this.scenarioId = scenarioId;
    this.engine = new BattleEngine(createScenario(scenarioId));
    this.mode = 'READY';
    this.presentedEventCount = 0;
    this.stepBudget = 0;
    this.presentation?.reset(this.engine.getState());
    this.publish();
  };

  public start = (): void => {
    if (this.mode === 'COMPLETE') return;
    this.mode = 'PLAYING';
    this.stepBudget = 0;
    this.presentation?.resume();
    this.publish();
    void this.pump();
  };

  public pause = (): void => {
    if (this.mode === 'COMPLETE') return;
    this.mode = 'PAUSED';
    this.stepBudget = 0;
    this.presentation?.pause();
    this.publish();
  };

  /** PROVISIONAL: one Step completes exactly one queued CombatEvent presentation. */
  public step = (): void => {
    if (this.mode === 'COMPLETE') return;
    this.mode = 'PAUSED';
    this.stepBudget = 1;
    this.presentation?.resume();
    this.publish();
    void this.pump();
  };

  public setSpeed = (speed: PlaybackSpeed): void => {
    this.speed = speed;
    // Existing tween/timer work also drains promptly when Instant is selected.
    const multiplier = speed === 'INSTANT' ? 1_000 : speed;
    this.presentation?.setSpeed(multiplier);
    this.publish();
    if (speed === 'INSTANT' && this.mode !== 'PAUSED' && this.mode !== 'COMPLETE') {
      this.start();
    }
  };

  public performDebugAction = (action: CombatAction): boolean => {
    if (this.presentedEventCount < this.engine.getEvents().length) return false;
    if (this.mode === 'PLAYING') this.pause();
    const phase = readPhase(this.engine.getState());
    if (!isStudentActionPhase(phase)) this.engine.beginTurn();
    const result = this.engine.performStudentAction(action);
    this.mode = 'PAUSED';
    this.publish();
    if (result.executable) {
      this.stepBudget = Math.max(this.stepBudget, this.engine.getEvents().length - this.presentedEventCount);
      this.presentation?.resume();
      void this.pump();
    }
    return result.executable;
  };

  public destroy(): void {
    this.abortPresentation();
    this.generation += 1;
    this.presentation = null;
    this.listeners.clear();
  }

  private async pump(): Promise<void> {
    const runGeneration = this.generation;
    if (this.pumpingGeneration === runGeneration) return;
    this.pumpingGeneration = runGeneration;

    try {
      while (runGeneration === this.generation) {
        const stepping = this.mode === 'PAUSED' && this.stepBudget > 0;
        if (this.mode !== 'PLAYING' && !stepping) break;
        if (!this.presentation) break;

        if (!this.ensureNextEvent()) break;
        const events = this.engine.getEvents();
        const event = events[this.presentedEventCount];
        if (!event) break;

        const signal = this.playbackAbortController.signal;
        await this.present(event, runGeneration, signal);
        if (runGeneration !== this.generation || signal.aborted) break;
        this.presentedEventCount += 1;
        this.publish();

        if (this.mode === 'PAUSED' && this.stepBudget > 0) {
          this.stepBudget -= 1;
          if (this.stepBudget === 0) {
            this.presentation?.pause();
            break;
          }
        }

        if (this.presentedEventCount >= this.engine.getEvents().length) {
          this.presentation?.settle(this.engine.getState());
          if (isTerminal(this.engine.getState()) || readTurn(this.engine.getState()) >= MAX_SANDBOX_TURNS) {
            this.mode = 'COMPLETE';
            this.publish();
            break;
          }
        }
      }
    } finally {
      if (this.pumpingGeneration === runGeneration) {
        this.pumpingGeneration = null;
        if (
          runGeneration === this.generation &&
          (this.mode === 'PLAYING' || (this.mode === 'PAUSED' && this.stepBudget > 0))
        ) {
          queueMicrotask(() => void this.pump());
        }
      }
    }
  }

  private ensureNextEvent(): boolean {
    if (this.presentedEventCount < this.engine.getEvents().length) return true;
    const state = this.engine.getState();
    if (isTerminal(state) || readTurn(state) >= MAX_SANDBOX_TURNS) {
      this.mode = 'COMPLETE';
      this.publish();
      return false;
    }

    const phase = readPhase(state);
    if (isStudentActionPhase(phase)) this.engine.resolveEnemyIntents();
    else this.engine.runTurn();
    this.publish();
    return this.presentedEventCount < this.engine.getEvents().length;
  }

  private async present(
    event: CombatEvent,
    runGeneration: number,
    signal: AbortSignal,
  ): Promise<void> {
    const presentation = this.presentation;
    if (!presentation || runGeneration !== this.generation || signal.aborted) return;
    const instant = this.speed === 'INSTANT';
    await presentation.present(event, this.engine.getState(), instant ? 0 : 1, signal);
  }

  private abortPresentation(): void {
    this.playbackAbortController.abort();
    this.playbackAbortController = new AbortController();
  }

  private publish(): void {
    this.snapshot = this.buildSnapshot();
    for (const listener of this.listeners) listener(this.snapshot);
  }

  private buildSnapshot(): SandboxSnapshot {
    const events = this.engine.getEvents();
    const status: RuntimeStatus = {
      mode: this.mode,
      speed: this.speed,
      presentedEventCount: this.presentedEventCount,
      queuedEventCount: Math.max(0, events.length - this.presentedEventCount),
      generation: this.generation,
    };
    return {
      scenarioId: this.scenarioId,
      state: this.engine.getState(),
      eventHistory: events,
      status,
    };
  }
}

function readPhase(state: BattleState): string {
  return state.phase;
}

function readTurn(state: BattleState): number {
  return state.turn;
}

function isStudentActionPhase(phase: string): boolean {
  return phase.includes('STUDENT') || phase.includes('PLAYER');
}

function isTerminal(state: BattleState): boolean {
  return state.outcome !== 'ONGOING';
}
