import type { BattleState, CombatEvent } from '../../combat';

export interface PredictionLayer {
  readonly cells: readonly Readonly<{ x: number; y: number }>[];
  readonly label: string;
}

export interface BattlePredictionPresentation {
  readonly current?: PredictionLayer;
  readonly candidate?: PredictionLayer;
}

/** Phaser implements this port; the controller and combat domain know no Scene API. */
export interface PresentationPort {
  reset(state: BattleState): void;
  present(
    event: CombatEvent,
    state: BattleState,
    durationScale: number,
    signal: AbortSignal,
  ): Promise<void>;
  settle(state: BattleState): void;
  pause(): void;
  resume(): void;
  setSpeed(multiplier: number): void;
  setPrediction?(prediction: BattlePredictionPresentation | null): void;
  playSealUnlock?(signal: AbortSignal): Promise<void>;
  destroy(): void;
}
