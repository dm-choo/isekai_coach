import type {
  AbilityEffect,
  Direction,
  ThreatCategory,
  UnitId,
} from '../domain/types';

export interface EffectResolutionPort {
  isAlive(unitId: UnitId): boolean;
  applyDamage(sourceId: UnitId, targetId: UnitId, amount: number, threat: ThreatCategory): void;
  applyGuard(sourceId: UnitId, targetId: UnitId, amount: number): void;
  applyKnockback(sourceId: UnitId, targetId: UnitId, direction: Direction, distance: number): boolean;
}

export interface EffectResolutionContext {
  readonly sourceId: UnitId;
  readonly targetIds: readonly UnitId[];
  readonly effects: readonly AbilityEffect[];
  readonly direction: Direction;
  readonly threat: ThreatCategory;
  readonly port: EffectResolutionPort;
}

/**
 * PROVISIONAL ordering contract: stable targets are visited first and each
 * target receives effects in ability-data order. A dead target receives no
 * later effects; a blocked displacement does not cancel later effects.
 */
export function applyAbilityEffects(context: EffectResolutionContext): void {
  const { sourceId, targetIds, effects, direction, threat, port } = context;

  for (const targetId of targetIds) {
    for (const effect of effects) {
      if (!port.isAlive(targetId)) break;
      applyEffect(port, sourceId, targetId, effect, direction, threat);
    }
  }
}

function applyEffect(
  port: EffectResolutionPort,
  sourceId: UnitId,
  targetId: UnitId,
  effect: AbilityEffect,
  direction: Direction,
  threat: ThreatCategory,
): void {
  switch (effect.type) {
    case 'DAMAGE':
      port.applyDamage(sourceId, targetId, effect.amount, threat);
      break;
    case 'GUARD':
      port.applyGuard(sourceId, targetId, effect.amount);
      break;
    case 'KNOCKBACK':
      port.applyKnockback(sourceId, targetId, direction, effect.distance);
      break;
  }
}
