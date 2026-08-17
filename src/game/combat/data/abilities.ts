import type { AbilityDefinition, AttackPattern } from '../domain/types';

export const ABILITY_IDS = {
  DEFEND: 'defend',
  THRUST: 'thrust',
  SLASH: 'slash',
  PUSH: 'push',
  SLAM: 'slam',
  SHOOT: 'shoot',
  GUARDIAN_CRUSH: 'guardian-crush',
  GUARDIAN_RUPTURE: 'guardian-rupture',
  SIGNAL_THRUST: 'signal-thrust',
  DEBUG_KNOCKBACK: 'debug-knockback',
  DEBUG_STRIKE_PUSH: 'debug-strike-push',
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

export const SHOOT_PATTERN: AttackPattern = {
  id: 'projectile-forward-5',
  cells: Array.from({ length: 4 }, (_, index) => ({ forward: index + 2, lateral: 0 })),
};

export const WIDE_RUPTURE_PATTERN: AttackPattern = {
  id: 'wide-forward-5x3',
  cells: Array.from({ length: 5 }, (_, index) => index + 1).flatMap((forward) => [
    { forward, lateral: -1 },
    { forward, lateral: 0 },
    { forward, lateral: 1 },
  ]),
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
  [ABILITY_IDS.PUSH]: {
    id: ABILITY_IDS.PUSH,
    name: '밀치기',
    apCost: 1,
    targeting: 'UNIT',
    range: 1,
    effects: [
      { type: 'DAMAGE', amount: 1 },
      { type: 'KNOCKBACK', distance: 1 },
    ],
    threat: 'NORMAL_ATTACK',
    tags: ['#근거리공격', '#넉백'],
  },
  [ABILITY_IDS.SLAM]: {
    id: ABILITY_IDS.SLAM,
    name: '내려찍',
    apCost: 1,
    targeting: 'UNIT',
    range: 1,
    effects: [
      { type: 'DAMAGE', amount: 2 },
      { type: 'STUN', turns: 1 },
    ],
    threat: 'NORMAL_ATTACK',
    tags: ['#근거리공격', '#스턴'],
  },
  [ABILITY_IDS.SHOOT]: {
    id: ABILITY_IDS.SHOOT,
    name: '사격',
    apCost: 1,
    targeting: 'PATTERN',
    pattern: SHOOT_PATTERN,
    minimumRange: 2,
    range: 5,
    patternTargetMode: 'FIRST_IN_PATTERN',
    effects: [{ type: 'DAMAGE', amount: 4 }],
    intentAnchor: 'BODY',
    threat: 'NORMAL_ATTACK',
    tags: ['#원거리공격'],
  },
  [ABILITY_IDS.GUARDIAN_CRUSH]: {
    id: ABILITY_IDS.GUARDIAN_CRUSH,
    name: '짧은 타격',
    apCost: 0,
    targeting: 'PATTERN',
    pattern: SHORT_STRIKE_PATTERN,
    effects: [{ type: 'DAMAGE', amount: 5 }],
    intentAnchor: 'BODY',
    threat: 'NORMAL_ATTACK',
    interruptible: false,
  },
  [ABILITY_IDS.GUARDIAN_RUPTURE]: {
    id: ABILITY_IDS.GUARDIAN_RUPTURE,
    name: '광범위 공격',
    apCost: 0,
    targeting: 'PATTERN',
    pattern: WIDE_RUPTURE_PATTERN,
    effects: [{ type: 'DAMAGE', amount: 4 }],
    intentAnchor: 'BODY',
    threat: 'NORMAL_ATTACK',
    interruptible: true,
  },
  [ABILITY_IDS.SIGNAL_THRUST]: {
    id: ABILITY_IDS.SIGNAL_THRUST,
    name: 'Signal Thrust',
    apCost: 2,
    targeting: 'PATTERN',
    pattern: THRUST_PATTERN,
    effects: [{ type: 'DAMAGE', amount: 2 }],
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
  [ABILITY_IDS.DEBUG_STRIKE_PUSH]: {
    id: ABILITY_IDS.DEBUG_STRIKE_PUSH,
    name: 'Debug Strike + Push',
    apCost: 1,
    targeting: 'PATTERN',
    pattern: SHORT_STRIKE_PATTERN,
    effects: [
      { type: 'DAMAGE', amount: 1 },
      { type: 'KNOCKBACK', distance: 1 },
    ],
    threat: 'NORMAL_ATTACK',
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
