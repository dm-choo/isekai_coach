import { describe, expect, it } from 'vitest';
import { ABILITY_IDS, getAbility } from '../data/abilities';
import type { GridPosition, Unit, UseAbilityAction } from '../domain/types';
import { resolveAbilityTargets } from './TargetResolver';

describe('projectile occlusion', () => {
  it('does not let a goblin archer shoot through an adjacent opponent', () => {
    expect(resolve(ABILITY_IDS.GOBLIN_LONG_SHOT, enemy('archer', 8), [
      student('front', 7),
      student('rear', 5),
    ], cells(6, 0))).toEqual([]);
  });

  it('stops on a friendly body instead of hitting a target behind it', () => {
    expect(resolve(ABILITY_IDS.SHOOT, student('archer', 1), [
      student('frontline', 2),
      enemy('target', 4),
    ], cells(7, 4))).toEqual([]);
  });

  it('hits the first unobstructed opponent inside the authored range', () => {
    expect(resolve(ABILITY_IDS.SHOOT, student('archer', 1), [
      enemy('target', 4),
      enemy('rear', 6),
    ], cells(7, 4))).toEqual(['target']);
  });
});

function resolve(abilityId: string, source: Unit, others: readonly Unit[], footprint: readonly GridPosition[]) {
  const ability = getAbility(abilityId);
  if (!ability) throw new Error(`Missing ability ${abilityId}`);
  const action: UseAbilityAction = { type: 'USE_ABILITY', actorId: source.id, abilityId, direction: source.facing };
  return resolveAbilityTargets({ source, ability, action, footprint, units: [source, ...others] });
}

function cells(count: number, minimum: number): GridPosition[] {
  return Array.from({ length: count - minimum + 1 }, (_, index) => ({ x: minimum + index, y: 1 }));
}

function student(id: string, x: number): Unit {
  return unit(id, 'STUDENT', x, 'RIGHT');
}

function enemy(id: string, x: number): Unit {
  return unit(id, 'ENEMY', x, 'LEFT');
}

function unit(id: string, faction: Unit['faction'], x: number, facing: Unit['facing']): Unit {
  return {
    id, faction, position: { x, y: 1 }, facing,
    hp: 3, maxHp: 3, ap: 0, maxAp: 3,
    status: { guard: 0, stunned: 0 }, abilities: [], rank: 'NORMAL', spawnOrder: x,
  };
}
