export type UnitId = string;
export type AbilityId = string;

export interface GridPosition {
  readonly x: number;
  readonly y: number;
}

export interface BattleMapConfig {
  readonly width: number;
  readonly height: number;
}

export type Faction = 'STUDENT' | 'ENEMY';
export type Direction = 'UP' | 'RIGHT' | 'DOWN' | 'LEFT';
export type EnemyRank = 'NORMAL' | 'ELITE' | 'BOSS';
export type IntentAnchor = 'BODY' | 'GROUND';
export type ThreatCategory = 'NORMAL_ATTACK' | 'UNBLOCKABLE_ATTACK';

export interface UnitStatus {
  /** Remaining mitigation for the next blockable hit. */
  readonly guard: number;
}

/** A shared runtime model is used for students and enemies. */
export interface Unit {
  readonly id: UnitId;
  readonly faction: Faction;
  readonly position: GridPosition;
  readonly facing: Direction;
  readonly hp: number;
  readonly maxHp: number;
  readonly ap: number;
  readonly maxAp: number;
  readonly status: UnitStatus;
  readonly abilities: readonly AbilityId[];
  readonly currentIntent?: string;
  readonly rank: EnemyRank;
  readonly spawnOrder: number;
  readonly visualKey?: string;
}

export interface UnitDefinition {
  readonly id: UnitId;
  readonly faction: Faction;
  readonly position: GridPosition;
  readonly facing: Direction;
  readonly hp?: number;
  readonly maxHp?: number;
  readonly ap?: number;
  readonly maxAp?: number;
  readonly status?: Partial<UnitStatus>;
  readonly abilities: readonly AbilityId[];
  readonly rank?: EnemyRank;
  readonly spawnOrder?: number;
  readonly visualKey?: string;
}

/** Relative pattern data is rotated into the locked attack direction. */
export interface PatternCell {
  readonly forward: number;
  readonly lateral: number;
}

export interface AttackPattern {
  readonly id: string;
  readonly cells: readonly PatternCell[];
}

export interface DamageEffect {
  readonly type: 'DAMAGE';
  readonly amount: number;
}

export interface GuardEffect {
  readonly type: 'GUARD';
  readonly amount: number;
}

export interface KnockbackEffect {
  readonly type: 'KNOCKBACK';
  readonly distance: number;
}

export type AbilityEffect = DamageEffect | GuardEffect | KnockbackEffect;
export type AbilityTargeting = 'SELF' | 'PATTERN' | 'UNIT';

export interface AbilityDefinition {
  readonly id: AbilityId;
  readonly name: string;
  readonly apCost: number;
  readonly targeting: AbilityTargeting;
  readonly pattern?: AttackPattern;
  readonly effects: readonly AbilityEffect[];
  readonly intentAnchor?: IntentAnchor;
  readonly threat?: ThreatCategory;
  /** Developer scaffolding, not a player-facing combat-design commitment. */
  readonly provisional?: boolean;
}

export interface MoveAction {
  readonly type: 'MOVE';
  readonly actorId: UnitId;
  readonly to: GridPosition;
}

export interface UseAbilityAction {
  readonly type: 'USE_ABILITY';
  readonly actorId: UnitId;
  readonly abilityId: AbilityId;
  readonly direction?: Direction;
  readonly targetId?: UnitId;
  /** Only strategies constructing a GROUND intent need to provide this. */
  readonly groundOrigin?: GridPosition;
}

export type CombatAction = MoveAction | UseAbilityAction;

export interface Intent {
  readonly id: string;
  readonly sourceId: UnitId;
  readonly action: CombatAction;
  readonly abilityId?: AbilityId;
  readonly anchor: IntentAnchor;
  /** Current footprint origin. It moves with BODY and remains fixed for GROUND. */
  readonly origin: GridPosition;
  /** Immutable declaration-time origin, useful for review/replay tooling. */
  readonly declaredOrigin: GridPosition;
  /** Direction is locked at declaration and never reads the source's later facing. */
  readonly direction: Direction;
  readonly aim: GridPosition;
  /** Cells traversed by a movement intent. Never rendered as attack danger. */
  readonly movementPath: readonly GridPosition[];
  /** Cells affected by ability resolution. Empty for a pure movement intent. */
  readonly effectCells: readonly GridPosition[];
  readonly threat: ThreatCategory;
  readonly tags: readonly ThreatCategory[];
}

export type BattlePhase = 'READY' | 'STUDENT_ACTION' | 'ENEMY_RESOLUTION' | 'BATTLE_ENDED';
export type BattleOutcome = 'ONGOING' | 'STUDENT_VICTORY' | 'ENEMY_VICTORY' | 'DRAW';

export interface EventBase {
  readonly sequence: number;
  readonly turn: number;
  readonly type: string;
}

export interface TurnStartedEvent extends EventBase {
  readonly type: 'TURN_STARTED';
}

export interface IntentDeclaredEvent extends EventBase {
  readonly type: 'INTENT_DECLARED';
  readonly sourceId: UnitId;
  readonly intentId: string;
  readonly intent: Intent;
}

export interface ApRefilledEvent extends EventBase {
  readonly type: 'AP_REFILLED';
  readonly unitId: UnitId;
  readonly from: number;
  readonly to: number;
}

export interface ApSpentEvent extends EventBase {
  readonly type: 'AP_SPENT';
  readonly unitId: UnitId;
  readonly amount: number;
  readonly from: number;
  readonly to: number;
}

export interface UnitMovedEvent extends EventBase {
  readonly type: 'UNIT_MOVED';
  readonly unitId: UnitId;
  readonly from: GridPosition;
  readonly to: GridPosition;
}

export interface AbilityUsedEvent extends EventBase {
  readonly type: 'ABILITY_USED';
  readonly sourceId: UnitId;
  readonly abilityId: AbilityId;
  readonly direction: Direction;
  readonly targetId?: UnitId;
}

export interface StatusAppliedEvent extends EventBase {
  readonly type: 'STATUS_APPLIED';
  readonly sourceId: UnitId;
  readonly targetId: UnitId;
  readonly status: 'GUARD';
  readonly amount: number;
}

export interface DamageBlockedEvent extends EventBase {
  readonly type: 'DAMAGE_BLOCKED';
  readonly sourceId: UnitId;
  readonly targetId: UnitId;
  readonly amount: number;
  readonly threat: ThreatCategory;
}

export interface DamageDealtEvent extends EventBase {
  readonly type: 'DAMAGE_DEALT';
  readonly sourceId: UnitId;
  readonly targetId: UnitId;
  readonly amount: number;
  readonly hpBefore: number;
  readonly hpAfter: number;
  readonly threat: ThreatCategory;
}

export interface UnitKnockedBackEvent extends EventBase {
  readonly type: 'UNIT_KNOCKED_BACK';
  readonly sourceId: UnitId;
  readonly unitId: UnitId;
  readonly from: GridPosition;
  readonly to: GridPosition;
  readonly distance: number;
}

export interface IntentAreaChangedEvent extends EventBase {
  readonly type: 'INTENT_AREA_CHANGED';
  readonly sourceId: UnitId;
  readonly intentId: string;
  readonly fromCells: readonly GridPosition[];
  readonly toCells: readonly GridPosition[];
  readonly intent: Intent;
}

export interface IntentCancelledEvent extends EventBase {
  readonly type: 'INTENT_CANCELLED';
  readonly sourceId: UnitId;
  readonly intentId: string;
  readonly reason: 'SOURCE_DIED' | 'BATTLE_ENDED';
}

export interface IntentResolvedEvent extends EventBase {
  readonly type: 'INTENT_RESOLVED';
  readonly sourceId: UnitId;
  readonly intentId: string;
}

export interface UnitDiedEvent extends EventBase {
  readonly type: 'UNIT_DIED';
  readonly unitId: UnitId;
  readonly sourceId?: UnitId;
}

export interface TurnEndedEvent extends EventBase {
  readonly type: 'TURN_ENDED';
  readonly outcome: BattleOutcome;
}

export type CombatEvent =
  | TurnStartedEvent
  | IntentDeclaredEvent
  | ApRefilledEvent
  | ApSpentEvent
  | UnitMovedEvent
  | AbilityUsedEvent
  | StatusAppliedEvent
  | DamageBlockedEvent
  | DamageDealtEvent
  | UnitKnockedBackEvent
  | IntentAreaChangedEvent
  | IntentCancelledEvent
  | IntentResolvedEvent
  | UnitDiedEvent
  | TurnEndedEvent;

export interface BattleState {
  readonly scenarioId: string;
  readonly map: BattleMapConfig;
  readonly turn: number;
  readonly phase: BattlePhase;
  readonly units: readonly Unit[];
  readonly intents: readonly Intent[];
  readonly outcome: BattleOutcome;
}

export interface EnemyIntentPlan {
  readonly abilityId?: AbilityId;
  readonly action?: CombatAction;
  readonly direction?: Direction;
  readonly anchor?: IntentAnchor;
  readonly groundOrigin?: GridPosition;
  readonly targetId?: UnitId;
}

export interface BattleScenario {
  readonly id: string;
  readonly name: string;
  readonly map: BattleMapConfig;
  readonly units: readonly UnitDefinition[];
  /** Deterministic scenario defaults; a supplied enemy strategy replaces these. */
  readonly enemyPlans?: Readonly<Record<UnitId, readonly EnemyIntentPlan[]>>;
  /** PROVISIONAL: authored sandbox demonstration, not final Gambit data. */
  readonly studentActions?: readonly CombatAction[];
}

export type ActionFailureReason =
  | 'BATTLE_ENDED'
  | 'WRONG_PHASE'
  | 'UNIT_NOT_FOUND'
  | 'UNIT_DEAD'
  | 'NOT_STUDENT'
  | 'INSUFFICIENT_AP'
  | 'ABILITY_NOT_KNOWN'
  | 'ABILITY_NOT_FOUND'
  | 'INVALID_TARGET'
  | 'OUT_OF_BOUNDS'
  | 'OCCUPIED'
  | 'NOT_ADJACENT'
  | 'BLOCKED_KNOCKBACK';

export type ActionResult =
  | {
      readonly executable: true;
      readonly action: CombatAction;
      readonly events: readonly CombatEvent[];
    }
  | {
      readonly executable: false;
      readonly action: CombatAction;
      readonly reason: ActionFailureReason;
      readonly events: readonly [];
    };

export interface DecisionContext {
  readonly state: BattleState;
  readonly student: Unit;
}

export interface EnemyIntentContext {
  readonly state: BattleState;
  readonly enemy: Unit;
  readonly turn: number;
}

export interface IntentChoice {
  readonly action: CombatAction;
  readonly anchor?: IntentAnchor;
  readonly direction?: Direction;
  readonly groundOrigin?: GridPosition;
}

export interface StudentDecisionStrategy {
  getNextAction(context: DecisionContext): CombatAction | null;
}

export interface EnemyIntentStrategy {
  chooseIntent(context: EnemyIntentContext): IntentChoice | null;
}

export interface BattleEngineOptions {
  readonly studentStrategy?: StudentDecisionStrategy;
  readonly enemyStrategies?:
    | Readonly<Record<UnitId, EnemyIntentStrategy>>
    | ReadonlyMap<UnitId, EnemyIntentStrategy>;
}
