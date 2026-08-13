import type { BattleState, CombatAction, CombatEvent } from '../../combat';

export type PlaybackSpeed = 1 | 2 | 4 | 'INSTANT';

export type RuntimeMode = 'READY' | 'PLAYING' | 'PAUSED' | 'COMPLETE';

export interface RuntimeStatus {
  readonly mode: RuntimeMode;
  readonly speed: PlaybackSpeed;
  readonly presentedEventCount: number;
  readonly queuedEventCount: number;
  readonly generation: number;
}

export interface SandboxSnapshot {
  readonly scenarioId: string;
  readonly state: BattleState;
  readonly eventHistory: readonly CombatEvent[];
  readonly status: RuntimeStatus;
}

export type SnapshotListener = (snapshot: SandboxSnapshot) => void;

export type PresentationListener = (
  state: BattleState,
  event: CombatEvent | null,
  status: RuntimeStatus,
) => void;

export interface SandboxCommands {
  readonly reset: (scenarioId?: string) => void;
  readonly start: () => void;
  readonly pause: () => void;
  readonly step: () => void;
  readonly setSpeed: (speed: PlaybackSpeed) => void;
  readonly performDebugAction: (action: CombatAction) => void;
}
