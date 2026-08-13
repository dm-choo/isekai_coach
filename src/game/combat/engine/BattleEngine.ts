import { ABILITIES, MOVE_AP_COST, getAbility } from '../data/abilities';
import type {
  AbilityDefinition,
  ActionFailureReason,
  ActionResult,
  BattleEngineOptions,
  BattleMapConfig,
  BattleOutcome,
  BattlePhase,
  BattleScenario,
  BattleState,
  CombatAction,
  CombatEvent,
  Direction,
  EnemyIntentStrategy,
  EnemyRank,
  GridPosition,
  Intent,
  IntentChoice,
  ThreatCategory,
  Unit,
  UnitDefinition,
  UseAbilityAction,
} from '../domain/types';
import { cloneAction } from '../policies/strategies';
import {
  BasicStudentStrategy,
  ScriptedEnemyStrategy,
  ScriptedStudentStrategy,
} from '../policies/strategies';
import {
  comparePositionLists,
  directionBetween,
  inBounds,
  isOccupied,
  manhattanDistance,
  projectPattern,
  step,
} from '../spatial/grid';
import { applyAbilityEffects } from './EffectResolver';
import { resolveAbilityTargets } from './TargetResolver';

type EventInput = CombatEvent extends infer Event
  ? Event extends CombatEvent
    ? Omit<Event, 'sequence' | 'turn'>
    : never
  : never;

const RANK_PRIORITY: Readonly<Record<EnemyRank, number>> = {
  BOSS: 0,
  ELITE: 1,
  NORMAL: 2,
};

/** Pure deterministic combat kernel. It has no Phaser, timer, or global RNG dependency. */
export class BattleEngine {
  private readonly scenarioId: string;
  private readonly map: BattleMapConfig;
  private units: Unit[];
  private intents: Intent[] = [];
  private eventHistory: CombatEvent[] = [];
  private turn = 0;
  private phase: BattlePhase = 'READY';
  private outcome: BattleOutcome = 'ONGOING';
  private readonly studentStrategy;
  private readonly enemyStrategies = new Map<string, EnemyIntentStrategy>();

  public constructor(scenario: BattleScenario, options: BattleEngineOptions = {}) {
    validateScenario(scenario);
    this.scenarioId = scenario.id;
    this.map = { ...scenario.map };
    this.units = scenario.units.map(createUnit);
    this.studentStrategy =
      options.studentStrategy ??
      (scenario.studentActions
        ? new ScriptedStudentStrategy(scenario.studentActions.map(cloneAction))
        : new BasicStudentStrategy());

    for (const [unitId, plans] of Object.entries(scenario.enemyPlans ?? {})) {
      this.enemyStrategies.set(
        unitId,
        new ScriptedEnemyStrategy(plans.map((plan) => clonePlan(plan))),
      );
    }
    if (options.enemyStrategies instanceof Map) {
      for (const [unitId, strategy] of options.enemyStrategies) {
        this.enemyStrategies.set(unitId, strategy);
      }
    } else {
      for (const [unitId, strategy] of Object.entries(options.enemyStrategies ?? {})) {
        this.enemyStrategies.set(unitId, strategy);
      }
    }
    this.recomputeOutcome();
  }

  public get state(): BattleState {
    return this.getState();
  }

  public get events(): readonly CombatEvent[] {
    return this.getEvents();
  }

  public getState(): BattleState {
    return {
      scenarioId: this.scenarioId,
      map: { ...this.map },
      turn: this.turn,
      phase: this.phase,
      units: this.units.map(cloneUnit),
      intents: this.intents.map(cloneIntent),
      outcome: this.outcome,
      eventHistory: this.eventHistory.map(cloneEvent),
    };
  }

  public getEvents(): readonly CombatEvent[] {
    return this.eventHistory.map(cloneEvent);
  }

  /** Locks all living enemy intents before refilling student AP. */
  public beginTurn(): readonly CombatEvent[] {
    if (this.phase !== 'READY' || this.outcome !== 'ONGOING') return [];
    const eventStart = this.eventHistory.length;
    this.turn += 1;
    this.emit({ type: 'TURN_STARTED' });

    for (const enemy of this.livingUnits('ENEMY').sort(compareStableUnits)) {
      const strategy = this.enemyStrategies.get(enemy.id);
      const choice = strategy?.chooseIntent({
        state: this.getState(),
        enemy: cloneUnit(enemy),
        turn: this.turn,
      });
      if (!choice) continue;
      const intent = this.lockIntent(enemy, choice);
      if (!intent) continue;
      this.intents = [...this.intents, intent];
      this.replaceUnit(enemy.id, (unit) => ({ ...unit, currentIntent: intent.id }));
      this.emit({
        type: 'INTENT_DECLARED',
        sourceId: enemy.id,
        intentId: intent.id,
        intent: cloneIntent(intent),
      });
    }

    for (const student of this.livingUnits('STUDENT').sort(compareStableUnits)) {
      const from = student.ap;
      this.replaceUnit(student.id, (unit) => ({ ...unit, ap: unit.maxAp }));
      this.emit({ type: 'AP_REFILLED', unitId: student.id, from, to: student.maxAp });
    }
    this.phase = 'STUDENT_ACTION';
    return this.eventsSince(eventStart);
  }

  public performStudentAction(action: CombatAction): ActionResult {
    const eventStart = this.eventHistory.length;
    const failure = this.validateStudentAction(action);
    if (failure) return failedAction(action, failure);

    if (action.type === 'MOVE') {
      const actor = this.requireUnit(action.actorId);
      const apAfter = actor.ap - MOVE_AP_COST;
      this.replaceUnit(actor.id, (unit) => ({
        ...unit,
        ap: apAfter,
        position: { ...action.to },
      }));
      this.emit({
        type: 'AP_SPENT',
        unitId: actor.id,
        amount: MOVE_AP_COST,
        from: actor.ap,
        to: apAfter,
      });
      this.emit({
        type: 'UNIT_MOVED',
        unitId: actor.id,
        from: { ...actor.position },
        to: { ...action.to },
      });
    } else {
      const ability = ABILITIES[action.abilityId];
      this.executeStudentAbility(action, ability);
    }

    this.recomputeOutcome();
    return {
      executable: true,
      action: cloneAction(action),
      events: this.eventsSince(eventStart),
    };
  }

  /** Resolves locked intents once. Dead sources and their intents cannot act. */
  public resolveEnemyIntents(): readonly CombatEvent[] {
    if (this.phase !== 'STUDENT_ACTION') return [];
    const eventStart = this.eventHistory.length;
    this.phase = 'ENEMY_RESOLUTION';

    const resolutionOrder = this.intents.slice().sort(compareIntentsStable(this.units));
    const contestedMoveWinners = chooseContestedMoveWinners(resolutionOrder, this.units);

    for (const plannedIntent of resolutionOrder) {
      const intent = this.intents.find((candidate) => candidate.id === plannedIntent.id);
      if (!intent) continue;
      const source = this.findUnit(intent.sourceId);
      if (!source || source.hp <= 0) {
        this.cancelIntent(intent.id, 'SOURCE_DIED');
        continue;
      }
      if (this.outcome !== 'ONGOING') {
        this.cancelIntent(intent.id, 'BATTLE_ENDED');
        continue;
      }

      const destinationKey =
        intent.action.type === 'MOVE' ? positionKey(intent.action.to) : undefined;
      if (
        !destinationKey ||
        !contestedMoveWinners.has(destinationKey) ||
        contestedMoveWinners.get(destinationKey) === intent.sourceId
      ) {
        this.resolveIntent(intent);
      }
      const stillPending = this.intents.find((candidate) => candidate.id === intent.id);
      if (stillPending) {
        this.removeIntent(stillPending.id);
        this.emit({
          type: 'INTENT_RESOLVED',
          sourceId: stillPending.sourceId,
          intentId: stillPending.id,
        });
      }
      this.recomputeOutcome();
      if (this.outcome !== 'ONGOING') {
        for (const pending of this.intents.slice().sort(compareIntentsStable(this.units))) {
          this.cancelIntent(pending.id, 'BATTLE_ENDED');
        }
      }
    }

    this.recomputeOutcome();
    this.emit({ type: 'TURN_ENDED', outcome: this.outcome });
    this.phase = this.outcome === 'ONGOING' ? 'READY' : 'BATTLE_ENDED';
    return this.eventsSince(eventStart);
  }

  /** Runs one complete pipeline using the injected provisional student strategy. */
  public runTurn(): readonly CombatEvent[] {
    const eventStart = this.eventHistory.length;
    if (this.phase === 'READY') this.beginTurn();
    if (this.phase !== 'STUDENT_ACTION') return this.eventsSince(eventStart);

    // A hard ceiling prevents a provisional/third-party strategy from looping on
    // free actions forever. Invalid decisions stop evaluation for this turn.
    for (let decisions = 0; decisions < 64 && this.outcome === 'ONGOING'; decisions += 1) {
      const student = this.livingUnits('STUDENT').sort(compareStableUnits)[0];
      if (!student || student.ap <= 0) break;
      const action = this.studentStrategy.getNextAction({ state: this.getState(), student: cloneUnit(student) });
      if (!action) break;
      const result = this.performStudentAction(action);
      if (!result.executable) break;
      const currentStudent = this.findUnit(student.id);
      if (!currentStudent || currentStudent.ap <= 0) break;
    }
    this.resolveEnemyIntents();
    return this.eventsSince(eventStart);
  }

  public runTurns(count = 1): readonly CombatEvent[] {
    const eventStart = this.eventHistory.length;
    const turns = Math.max(0, Math.floor(count));
    for (let index = 0; index < turns && this.outcome === 'ONGOING'; index += 1) {
      this.runTurn();
    }
    return this.eventsSince(eventStart);
  }

  private validateStudentAction(action: CombatAction): ActionFailureReason | null {
    if (this.outcome !== 'ONGOING') return 'BATTLE_ENDED';
    if (this.phase !== 'STUDENT_ACTION') return 'WRONG_PHASE';
    const actor = this.findUnit(action.actorId);
    if (!actor) return 'UNIT_NOT_FOUND';
    if (actor.hp <= 0) return 'UNIT_DEAD';
    if (actor.faction !== 'STUDENT') return 'NOT_STUDENT';

    if (action.type === 'MOVE') {
      if (actor.ap < MOVE_AP_COST) return 'INSUFFICIENT_AP';
      if (!inBounds(this.map, action.to)) return 'OUT_OF_BOUNDS';
      if (manhattanDistance(actor.position, action.to) !== 1) return 'NOT_ADJACENT';
      if (isOccupied(this.units, action.to, actor.id)) return 'OCCUPIED';
      return null;
    }

    const ability = getAbility(action.abilityId);
    if (!ability) return 'ABILITY_NOT_FOUND';
    if (!actor.abilities.includes(ability.id)) return 'ABILITY_NOT_KNOWN';
    if (actor.ap < ability.apCost) return 'INSUFFICIENT_AP';
    if (ability.targeting === 'UNIT') {
      const target = action.targetId ? this.findUnit(action.targetId) : undefined;
      if (!target || target.hp <= 0 || target.id === actor.id) return 'INVALID_TARGET';
      const knockbacks = ability.effects.filter((effect) => effect.type === 'KNOCKBACK');
      const displacementOnly = knockbacks.length > 0 && knockbacks.length === ability.effects.length;
      if (displacementOnly) {
        const direction = action.direction ?? directionBetween(actor.position, target.position);
        if (
          !direction ||
          knockbacks.some((effect) => !this.canDisplace(target, direction, effect.distance))
        ) {
          return 'BLOCKED_KNOCKBACK';
        }
      }
    }
    return null;
  }

  private executeStudentAbility(action: UseAbilityAction, ability: AbilityDefinition): void {
    const actor = this.requireUnit(action.actorId);
    const selectedTarget = action.targetId ? this.findUnit(action.targetId) : undefined;
    const direction =
      action.direction ??
      (selectedTarget ? directionBetween(actor.position, selectedTarget.position) : undefined) ??
      actor.facing;
    const apAfter = actor.ap - ability.apCost;
    this.replaceUnit(actor.id, (unit) => ({ ...unit, ap: apAfter }));
    if (ability.apCost > 0) {
      this.emit({
        type: 'AP_SPENT',
        unitId: actor.id,
        amount: ability.apCost,
        from: actor.ap,
        to: apAfter,
      });
    }
    this.emit({
      type: 'ABILITY_USED',
      sourceId: actor.id,
      abilityId: ability.id,
      direction,
      targetId: action.targetId,
    });

    const footprint = ability.targeting === 'PATTERN' && ability.pattern
      ? projectPattern(actor.position, direction, ability.pattern, this.map)
      : [];
    this.resolveAbilityEffects(actor, ability, action, footprint, direction);
  }

  private lockIntent(source: Unit, choice: IntentChoice): Intent | null {
    const rawAction = cloneAction(choice.action);
    const action: CombatAction =
      rawAction.type === 'MOVE'
        ? { ...rawAction, actorId: source.id }
        : { ...rawAction, actorId: source.id };
    const direction =
      choice.direction ??
      (action.type === 'USE_ABILITY' ? action.direction : directionBetween(source.position, action.to)) ??
      source.facing;
    const ability = action.type === 'USE_ABILITY' ? getAbility(action.abilityId) : undefined;
    if (action.type === 'USE_ABILITY' && (!ability || !source.abilities.includes(ability.id))) return null;
    const anchor = choice.anchor ?? ability?.intentAnchor ?? 'BODY';
    const declaredOrigin =
      anchor === 'GROUND'
        ? choice.groundOrigin ??
          (action.type === 'USE_ABILITY' ? action.groundOrigin : undefined) ??
          source.position
        : source.position;
    const movementPath =
      action.type === 'MOVE' && inBounds(this.map, action.to) ? [{ ...action.to }] : [];
    const effectCells =
      action.type === 'USE_ABILITY' && ability?.pattern
        ? projectPattern(declaredOrigin, direction, ability.pattern, this.map)
        : [];
    const aim = effectCells[0] ?? movementPath[0] ?? declaredOrigin;
    const threat = ability?.threat ?? 'NORMAL_ATTACK';
    return {
      id: `${this.scenarioId}:turn-${this.turn}:intent-${source.id}`,
      sourceId: source.id,
      action,
      abilityId: ability?.id,
      anchor,
      origin: { ...declaredOrigin },
      declaredOrigin: { ...declaredOrigin },
      direction,
      aim: { ...aim },
      movementPath: movementPath.map(clonePosition),
      effectCells: effectCells.map(clonePosition),
      threat,
      tags: [threat],
    };
  }

  private resolveIntent(intent: Intent): void {
    const source = this.requireUnit(intent.sourceId);
    if (intent.action.type === 'MOVE') {
      const destination = intent.action.to;
      if (
        inBounds(this.map, destination) &&
        manhattanDistance(source.position, destination) === 1 &&
        !isOccupied(this.units, destination, source.id)
      ) {
        this.replaceUnit(source.id, (unit) => ({ ...unit, position: { ...destination } }));
        this.emit({
          type: 'UNIT_MOVED',
          unitId: source.id,
          from: { ...source.position },
          to: { ...destination },
        });
        this.refreshBodyIntents(source.id);
      }
      return;
    }

    const ability = getAbility(intent.action.abilityId);
    if (!ability) return;
    this.refreshBodyIntents(source.id);
    const currentIntent = this.intents.find((candidate) => candidate.id === intent.id) ?? intent;
    this.emit({
      type: 'ABILITY_USED',
      sourceId: source.id,
      abilityId: ability.id,
      direction: currentIntent.direction,
      targetId: currentIntent.action.type === 'USE_ABILITY' ? currentIntent.action.targetId : undefined,
    });
    const cells = this.effectiveIntentCells(currentIntent);
    if (currentIntent.action.type === 'USE_ABILITY') {
      this.resolveAbilityEffects(
        source,
        ability,
        currentIntent.action,
        cells,
        currentIntent.direction,
        currentIntent.threat,
      );
    }
  }

  private resolveAbilityEffects(
    source: Unit,
    ability: AbilityDefinition,
    action: UseAbilityAction,
    footprint: readonly GridPosition[],
    direction: Direction,
    threat: ThreatCategory = ability.threat ?? 'NORMAL_ATTACK',
  ): void {
    const targetIds = resolveAbilityTargets({ source, ability, action, footprint, units: this.units });
    applyAbilityEffects({
      sourceId: source.id,
      targetIds,
      effects: ability.effects,
      direction,
      threat,
      port: {
        isAlive: (unitId) => (this.findUnit(unitId)?.hp ?? 0) > 0,
        applyDamage: (sourceId, targetId, amount, effectThreat) =>
          this.applyDamage(sourceId, targetId, amount, effectThreat),
        applyGuard: (sourceId, targetId, amount) => this.applyGuard(sourceId, targetId, amount),
        applyKnockback: (sourceId, targetId, effectDirection, distance) =>
          this.applyKnockback(sourceId, targetId, effectDirection, distance),
      },
    });
  }

  private applyGuard(sourceId: string, targetId: string, amount: number): void {
    const applied = Math.max(0, Math.floor(amount));
    if (applied <= 0) return;
    this.replaceUnit(targetId, (unit) => ({
      ...unit,
      status: { ...unit.status, guard: unit.status.guard + applied },
    }));
    this.emit({
      type: 'STATUS_APPLIED',
      sourceId,
      targetId,
      status: 'GUARD',
      amount: applied,
    });
  }

  private applyDamage(
    sourceId: string,
    targetId: string,
    rawAmount: number,
    threat: ThreatCategory,
  ): void {
    const target = this.requireUnit(targetId);
    if (target.hp <= 0) return;
    let amount = Math.max(0, Math.floor(rawAmount));
    if (threat !== 'UNBLOCKABLE_ATTACK' && target.status.guard > 0 && amount > 0) {
      const blocked = Math.min(target.status.guard, amount);
      amount -= blocked;
      this.replaceUnit(target.id, (unit) => ({
        ...unit,
        status: { ...unit.status, guard: unit.status.guard - blocked },
      }));
      this.emit({
        type: 'DAMAGE_BLOCKED',
        sourceId,
        targetId,
        amount: blocked,
        threat,
      });
    }
    if (amount <= 0) return;
    const current = this.requireUnit(targetId);
    const hpAfter = Math.max(0, current.hp - amount);
    this.replaceUnit(targetId, (unit) => ({ ...unit, hp: hpAfter }));
    this.emit({
      type: 'DAMAGE_DEALT',
      sourceId,
      targetId,
      amount: current.hp - hpAfter,
      hpBefore: current.hp,
      hpAfter,
      threat,
    });
    if (hpAfter === 0) {
      this.emit({ type: 'UNIT_DIED', unitId: targetId, sourceId });
      const currentIntent = this.intents.find((intent) => intent.sourceId === targetId);
      if (currentIntent) this.cancelIntent(currentIntent.id, 'SOURCE_DIED');
    }
  }

  private canDisplace(target: Unit, direction: Direction, distance: number): boolean {
    let destination = target.position;
    for (let count = 0; count < distance; count += 1) {
      destination = step(destination, direction);
      if (!inBounds(this.map, destination) || isOccupied(this.units, destination, target.id)) {
        return false;
      }
    }
    return true;
  }

  private applyKnockback(
    sourceId: string,
    targetId: string,
    direction: Direction,
    distance: number,
  ): boolean {
    const target = this.requireUnit(targetId);
    if (!this.canDisplace(target, direction, distance)) return false;
    let destination = target.position;
    for (let count = 0; count < distance; count += 1) destination = step(destination, direction);
    this.replaceUnit(targetId, (unit) => ({ ...unit, position: { ...destination } }));
    this.emit({
      type: 'UNIT_KNOCKED_BACK',
      sourceId,
      unitId: targetId,
      from: { ...target.position },
      to: { ...destination },
      distance,
    });
    this.refreshBodyIntents(targetId);
    return true;
  }

  private refreshBodyIntents(sourceId: string): void {
    const source = this.findUnit(sourceId);
    if (!source) return;
    for (const previous of this.intents.filter(
      (intent) => intent.sourceId === sourceId && intent.anchor === 'BODY',
    )) {
      const nextCells = this.calculateBodyCells(previous, source);
      if (comparePositionLists(previous.effectCells, nextCells)) continue;
      const next: Intent = {
        ...previous,
        origin: { ...source.position },
        effectCells: nextCells.map(clonePosition),
      };
      this.intents = this.intents.map((intent) => (intent.id === previous.id ? next : intent));
      this.emit({
        type: 'INTENT_AREA_CHANGED',
        sourceId,
        intentId: previous.id,
        fromCells: previous.effectCells.map(clonePosition),
        toCells: nextCells.map(clonePosition),
        intent: cloneIntent(next),
      });
    }
  }

  private calculateBodyCells(intent: Intent, source: Unit): GridPosition[] {
    if (intent.action.type === 'MOVE') return [{ ...intent.action.to }];
    const ability = getAbility(intent.action.abilityId);
    return ability?.pattern
      ? projectPattern(source.position, intent.direction, ability.pattern, this.map)
      : [];
  }

  private effectiveIntentCells(intent: Intent): readonly GridPosition[] {
    if (intent.anchor === 'GROUND') return intent.effectCells.map(clonePosition);
    const source = this.findUnit(intent.sourceId);
    return source ? this.calculateBodyCells(intent, source) : [];
  }

  private cancelIntent(intentId: string, reason: 'SOURCE_DIED' | 'BATTLE_ENDED'): void {
    const intent = this.intents.find((candidate) => candidate.id === intentId);
    if (!intent) return;
    this.removeIntent(intentId);
    this.emit({
      type: 'INTENT_CANCELLED',
      sourceId: intent.sourceId,
      intentId,
      reason,
    });
  }

  private removeIntent(intentId: string): void {
    const intent = this.intents.find((candidate) => candidate.id === intentId);
    this.intents = this.intents.filter((candidate) => candidate.id !== intentId);
    if (intent) {
      this.replaceUnit(intent.sourceId, (unit) => {
        const { currentIntent: _ignored, ...withoutIntent } = unit;
        return withoutIntent;
      });
    }
  }

  private recomputeOutcome(): void {
    const hasStudent = this.units.some((unit) => unit.faction === 'STUDENT' && unit.hp > 0);
    const hasEnemy = this.units.some((unit) => unit.faction === 'ENEMY' && unit.hp > 0);
    this.outcome = hasStudent
      ? hasEnemy
        ? 'ONGOING'
        : 'STUDENT_VICTORY'
      : hasEnemy
        ? 'ENEMY_VICTORY'
        : 'DRAW';
  }

  private livingUnits(faction: 'STUDENT' | 'ENEMY'): Unit[] {
    return this.units.filter((unit) => unit.faction === faction && unit.hp > 0);
  }

  private findUnit(id: string): Unit | undefined {
    return this.units.find((unit) => unit.id === id);
  }

  private requireUnit(id: string): Unit {
    const unit = this.findUnit(id);
    if (!unit) throw new Error(`Combat invariant failed: unit ${id} does not exist`);
    return unit;
  }

  private replaceUnit(id: string, update: (unit: Unit) => Unit): void {
    this.units = this.units.map((unit) => (unit.id === id ? update(unit) : unit));
  }

  private emit(input: EventInput): CombatEvent {
    const event = {
      ...input,
      sequence: this.eventHistory.length + 1,
      turn: this.turn,
    } as CombatEvent;
    this.eventHistory.push(cloneEvent(event));
    return event;
  }

  private eventsSince(index: number): readonly CombatEvent[] {
    return this.eventHistory.slice(index).map(cloneEvent);
  }
}

function validateScenario(scenario: BattleScenario): void {
  if (!scenario.id) throw new Error('BattleScenario.id is required');
  if (!Number.isInteger(scenario.map.width) || scenario.map.width <= 0) {
    throw new Error('Battle map width must be a positive integer');
  }
  if (!Number.isInteger(scenario.map.height) || scenario.map.height <= 0) {
    throw new Error('Battle map height must be a positive integer');
  }
  const ids = new Set<string>();
  const positions = new Set<string>();
  scenario.units.forEach((definition) => {
    if (ids.has(definition.id)) throw new Error(`Duplicate unit id: ${definition.id}`);
    ids.add(definition.id);
    if (!inBounds(scenario.map, definition.position)) {
      throw new Error(`Unit ${definition.id} starts out of bounds`);
    }
    const key = `${definition.position.x},${definition.position.y}`;
    if (positions.has(key)) throw new Error(`Multiple units start at ${key}`);
    positions.add(key);
    for (const abilityId of definition.abilities) {
      if (!getAbility(abilityId)) throw new Error(`Unknown ability ${abilityId} on ${definition.id}`);
    }
  });
}

function createUnit(definition: UnitDefinition, index: number): Unit {
  const maxHp = Math.max(1, Math.floor(definition.maxHp ?? definition.hp ?? 5));
  const maxAp = Math.max(0, Math.floor(definition.maxAp ?? (definition.faction === 'STUDENT' ? 2 : 0)));
  return {
    id: definition.id,
    faction: definition.faction,
    position: { ...definition.position },
    facing: definition.facing,
    hp: Math.max(0, Math.min(maxHp, Math.floor(definition.hp ?? maxHp))),
    maxHp,
    ap: Math.max(0, Math.min(maxAp, Math.floor(definition.ap ?? 0))),
    maxAp,
    status: { guard: Math.max(0, Math.floor(definition.status?.guard ?? 0)) },
    abilities: [...definition.abilities],
    rank: definition.rank ?? 'NORMAL',
    spawnOrder: definition.spawnOrder ?? index,
    visualKey: definition.visualKey,
  };
}

function clonePlan(plan: BattleScenario['enemyPlans'] extends infer _ ? NonNullable<BattleScenario['enemyPlans']>[string][number] : never) {
  return {
    ...plan,
    action: plan.action ? cloneAction(plan.action) : undefined,
    groundOrigin: plan.groundOrigin ? { ...plan.groundOrigin } : undefined,
  };
}

function failedAction(action: CombatAction, reason: ActionFailureReason): ActionResult {
  return { executable: false, action: cloneAction(action), reason, events: [] };
}

function clonePosition(position: GridPosition): GridPosition {
  return { x: position.x, y: position.y };
}

function cloneUnit(unit: Unit): Unit {
  return {
    ...unit,
    position: clonePosition(unit.position),
    status: { ...unit.status },
    abilities: [...unit.abilities],
  };
}

function cloneIntent(intent: Intent): Intent {
  return {
    ...intent,
    action: cloneAction(intent.action),
    origin: clonePosition(intent.origin),
    declaredOrigin: clonePosition(intent.declaredOrigin),
    aim: clonePosition(intent.aim),
    movementPath: intent.movementPath.map(clonePosition),
    effectCells: intent.effectCells.map(clonePosition),
    tags: [...intent.tags],
  };
}

function cloneEvent(event: CombatEvent): CombatEvent {
  switch (event.type) {
    case 'INTENT_DECLARED':
      return { ...event, intent: cloneIntent(event.intent) };
    case 'UNIT_MOVED':
    case 'UNIT_KNOCKED_BACK':
      return { ...event, from: clonePosition(event.from), to: clonePosition(event.to) };
    case 'INTENT_AREA_CHANGED':
      return {
        ...event,
        fromCells: event.fromCells.map(clonePosition),
        toCells: event.toCells.map(clonePosition),
        intent: cloneIntent(event.intent),
      };
    default:
      return { ...event };
  }
}

function compareStableUnits(left: Unit, right: Unit): number {
  return left.spawnOrder - right.spawnOrder || compareIds(left.id, right.id);
}

function compareResolutionPriority(left: Unit, right: Unit): number {
  return (
    RANK_PRIORITY[left.rank] - RANK_PRIORITY[right.rank] ||
    left.spawnOrder - right.spawnOrder ||
    compareIds(left.id, right.id)
  );
}

function compareIntentsStable(units: readonly Unit[]): (left: Intent, right: Intent) => number {
  return (left, right) => {
    const leftUnit = units.find((unit) => unit.id === left.sourceId);
    const rightUnit = units.find((unit) => unit.id === right.sourceId);
    if (!leftUnit || !rightUnit) return compareIds(left.sourceId, right.sourceId);
    return compareStableUnits(leftUnit, rightUnit);
  };
}

function chooseContestedMoveWinners(
  intents: readonly Intent[],
  units: readonly Unit[],
): Map<string, string> {
  const candidates = new Map<string, Unit[]>();
  for (const intent of intents) {
    if (intent.action.type !== 'MOVE') continue;
    const source = units.find((unit) => unit.id === intent.sourceId);
    if (!source || source.hp <= 0) continue;
    const key = positionKey(intent.action.to);
    candidates.set(key, [...(candidates.get(key) ?? []), source]);
  }
  const result = new Map<string, string>();
  for (const [key, movers] of candidates) {
    if (movers.length > 1) {
      result.set(key, movers.slice().sort(compareResolutionPriority)[0].id);
    }
  }
  return result;
}

function positionKey(position: GridPosition): string {
  return `${position.x},${position.y}`;
}

function compareIds(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
