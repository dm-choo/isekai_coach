import type { BattleState, CombatEvent } from '../../combat';

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
  destroy(): void;
}
