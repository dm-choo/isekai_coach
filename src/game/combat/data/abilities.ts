import type { AbilityDefinition, AttackPattern } from '../domain/types';

export const ABILITY_IDS = {
  DEFEND: 'defend',
  THRUST: 'thrust',
  SLASH: 'slash',
  DEBUG_KNOCKBACK: 'debug-knockback',
  SHORT_STRIKE: 'enemy-short-strike',
  ENEMY_THRUST: 'enemy-thrust',
  UNBLOCKABLE_STRIKE: 'enemy-unblockable-strike',
} as const;

export const THRUST_PATTERN: AttackPattern = {
  id: 'line-forward-3',
  cells: [
    { forward: 1, lateral: 0 },
    { forward: 2, lateral: 0 },
    { forward: 3, lateral: 0 },
  ],
};

export const SLASH_PATTERN: AttackPattern = {
  id: 'front-column-3',
  cells: [
    { forward: 1, lateral: -1 },
    { forward: 1, lateral: 0 },
    { forward: 1, lateral: 1 },
  ],
};

export const SHORT_STRIKE_PATTERN: AttackPattern = {
  id: 'line-forward-1',
  cells: [{ forward: 1, lateral: 0 }],
};

export const ABILITIES: Readonly<Record<string, AbilityDefinition>> = {
  [ABILITY_IDS.DEFEND]: {
    id: ABILITY_IDS.DEFEND,
    name: 'Defend',
    apCost: 1,
    targeting: 'SELF',
    effects: [{ type: 'GUARD', amount: 1 }],
  },
  [ABILITY_IDS.THRUST]: {
    id: ABILITY_IDS.THRUST,
    name: 'Thrust',
    apCost: 1,
    targeting: 'PATTERN',
    pattern: THRUST_PATTERN,
    effects: [{ type: 'DAMAGE', amount: 1 }],
    intentAnchor: 'BODY',
    threat: 'NORMAL_ATTACK',
  },
  [ABILITY_IDS.SLASH]: {
    id: ABILITY_IDS.SLASH,
    name: 'Slash',
    apCost: 1,
    targeting: 'PATTERN',
    pattern: SLASH_PATTERN,
    effects: [{ type: 'DAMAGE', amount: 1 }],
    intentAnchor: 'BODY',
    threat: 'NORMAL_ATTACK',
  },
  [ABILITY_IDS.DEBUG_KNOCKBACK]: {
    id: ABILITY_IDS.DEBUG_KNOCKBACK,
    name: 'Debug Knockback',
    apCost: 1,
    targeting: 'UNIT',
    effects: [{ type: 'KNOCKBACK', distance: 1 }],
    provisional: true,
  },
  [ABILITY_IDS.SHORT_STRIKE]: {
    id: ABILITY_IDS.SHORT_STRIKE,
    name: 'Short Strike',
    apCost: 0,
    targeting: 'PATTERN',
    pattern: SHORT_STRIKE_PATTERN,
    effects: [{ type: 'DAMAGE', amount: 1 }],
    intentAnchor: 'BODY',
    threat: 'NORMAL_ATTACK',
  },
  [ABILITY_IDS.ENEMY_THRUST]: {
    id: ABILITY_IDS.ENEMY_THRUST,
    name: 'Enemy Thrust',
    apCost: 0,
    targeting: 'PATTERN',
    pattern: THRUST_PATTERN,
    effects: [{ type: 'DAMAGE', amount: 1 }],
    intentAnchor: 'BODY',
    threat: 'NORMAL_ATTACK',
  },
  [ABILITY_IDS.UNBLOCKABLE_STRIKE]: {
    id: ABILITY_IDS.UNBLOCKABLE_STRIKE,
    name: 'Unblockable Strike',
    apCost: 0,
    targeting: 'PATTERN',
    pattern: SHORT_STRIKE_PATTERN,
    effects: [{ type: 'DAMAGE', amount: 2 }],
    intentAnchor: 'BODY',
    threat: 'UNBLOCKABLE_ATTACK',
  },
};

export const MOVE_AP_COST = 1;

export function getAbility(id: string): AbilityDefinition | undefined {
  return ABILITIES[id];
}
