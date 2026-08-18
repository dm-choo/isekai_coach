import type { BattleState, CombatEvent, Intent } from '../../combat';

export type IntentIconKind = 'MOVE' | 'ATTACK' | 'SHOOT' | 'STUN' | 'SUMMON' | 'PUSH';

export interface PredictionLayer {
  readonly cells: readonly Readonly<{ x: number; y: number }>[];
  readonly label: string;
}

export interface BattlePredictionPresentation {
  readonly current?: PredictionLayer;
  readonly candidate?: PredictionLayer;
  readonly unitPositions?: readonly {
    readonly unitId: string;
    readonly position: Readonly<{ x: number; y: number }>;
  }[];
  readonly intents?: readonly {
    readonly unitId: string;
    readonly steps: readonly {
      readonly id: string;
      readonly label: string;
      readonly glyph: string;
      readonly icon: IntentIconKind;
      readonly description: string;
      readonly damage?: number;
      readonly movementPath: readonly Readonly<{ x: number; y: number }>[];
      readonly effectCells: readonly Readonly<{ x: number; y: number }>[];
    }[];
  }[];
  /** What-if enemy intents after the hovered/planned player actions. */
  readonly previewIntents?: readonly Intent[];
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
  setSelection?(unitId: string | null): void;
  /** Presentation-only fog. Authoritative intents remain intact. */
  setHiddenIntentIds?(intentIds: readonly string[]): void;
  playSealUnlock?(signal: AbortSignal): Promise<void>;
  destroy(): void;
}
