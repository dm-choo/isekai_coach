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
  GUARDIAN_SUMMON: 'guardian-summon',
  MINION_CHARGE: 'minion-charge',
  GOBLIN_LONG_SHOT: 'goblin-long-shot',
  GOBLIN_RUSH: 'goblin-rush',
  GOBLIN_BOMB: 'goblin-bomb',
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
  id: 'projectile-forward-3-to-6',
  cells: Array.from({ length: 4 }, (_, index) => ({ forward: index + 3, lateral: 0 })),
};

export const WIDE_RUPTURE_PATTERN: AttackPattern = {
  id: 'wide-forward-5x3',
  cells: Array.from({ length: 5 }, (_, index) => index + 1).flatMap((forward) => [
    { forward, lateral: -1 },
    { forward, lateral: 0 },
    { forward, lateral: 1 },
  ]),
};

export const CHARGE_PATTERN: AttackPattern = {
  id: 'charge-forward-3',
  cells: Array.from({ length: 3 }, (_, index) => ({ forward: index + 1, lateral: 0 })),
};

export const GOBLIN_LONG_SHOT_PATTERN: AttackPattern = {
  id: 'goblin-projectile-forward-11',
  cells: Array.from({ length: 10 }, (_, index) => ({ forward: index + 2, lateral: 0 })),
};

export const GOBLIN_BOMB_PATTERN: AttackPattern = {
  id: 'goblin-ground-column-3',
  cells: [
    { forward: 0, lateral: -1 },
    { forward: 0, lateral: 0 },
    { forward: 0, lateral: 1 },
  ],
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
    apCost: 2,
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
    name: '내려찍기',
    apCost: 2,
    targeting: 'UNIT',
    range: 1,
    effects: [
      { type: 'DAMAGE', amount: 2 },
    ],
    threat: 'NORMAL_ATTACK',
    tags: ['#근거리공격'],
  },
  [ABILITY_IDS.SHOOT]: {
    id: ABILITY_IDS.SHOOT,
    name: '사격',
    apCost: 2,
    targeting: 'PATTERN',
    pattern: SHOOT_PATTERN,
    minimumRange: 3,
    range: 6,
    patternTargetMode: 'FIRST_IN_PATTERN',
    effects: [{ type: 'DAMAGE', amount: 1 }],
    intentAnchor: 'BODY',
    threat: 'NORMAL_ATTACK',
    tags: ['#원거리공격'],
  },
  [ABILITY_IDS.GUARDIAN_CRUSH]: {
    id: ABILITY_IDS.GUARDIAN_CRUSH,
    name: '제압',
    apCost: 2,
    targeting: 'PATTERN',
    pattern: SHORT_STRIKE_PATTERN,
    effects: [{ type: 'DAMAGE', amount: 6 }],
    sourceMovement: { type: 'ADVANCE', distance: 2 },
    intentAnchor: 'BODY',
    threat: 'NORMAL_ATTACK',
    interruptible: false,
  },
  [ABILITY_IDS.GUARDIAN_RUPTURE]: {
    id: ABILITY_IDS.GUARDIAN_RUPTURE,
    name: '외침',
    apCost: 2,
    targeting: 'PATTERN',
    pattern: WIDE_RUPTURE_PATTERN,
    effects: [{ type: 'DAMAGE', amount: 2 }],
    intentAnchor: 'BODY',
    threat: 'NORMAL_ATTACK',
    interruptible: true,
    interruptOnMeleeHit: true,
  },
  [ABILITY_IDS.GUARDIAN_SUMMON]: {
    id: ABILITY_IDS.GUARDIAN_SUMMON,
    name: '하수인 소환',
    apCost: 2,
    targeting: 'SELF',
    effects: [{
      type: 'SUMMON',
      templateId: 'guardian-hound',
      cells: [
        { forward: 1, lateral: 0 },
        { forward: 1, lateral: -1 },
        { forward: 1, lateral: 1 },
        { forward: -1, lateral: 0 },
        { forward: -1, lateral: -1 },
        { forward: -1, lateral: 1 },
      ],
    }],
    intentAnchor: 'BODY',
    threat: 'NORMAL_ATTACK',
    interruptible: true,
  },
  [ABILITY_IDS.MINION_CHARGE]: {
    id: ABILITY_IDS.MINION_CHARGE,
    name: '돌진',
    apCost: 1,
    targeting: 'PATTERN',
    pattern: CHARGE_PATTERN,
    patternTargetMode: 'FIRST_IN_PATTERN',
    effects: [{ type: 'DAMAGE', amount: 2 }],
    sourceMovement: { type: 'CHARGE', distance: 3 },
    intentAnchor: 'BODY',
    threat: 'NORMAL_ATTACK',
    interruptible: true,
  },
  [ABILITY_IDS.GOBLIN_LONG_SHOT]: {
    id: ABILITY_IDS.GOBLIN_LONG_SHOT,
    name: '장거리 사격',
    apCost: 0,
    targeting: 'PATTERN',
    pattern: GOBLIN_LONG_SHOT_PATTERN,
    patternTargetMode: 'FIRST_IN_PATTERN',
    effects: [{ type: 'DAMAGE', amount: 1 }],
    intentAnchor: 'BODY',
    threat: 'NORMAL_ATTACK',
    interruptible: true,
  },
  [ABILITY_IDS.GOBLIN_RUSH]: {
    id: ABILITY_IDS.GOBLIN_RUSH,
    name: '단검 쇄도',
    apCost: 0,
    targeting: 'PATTERN',
    pattern: SHORT_STRIKE_PATTERN,
    effects: [{ type: 'DAMAGE', amount: 2 }],
    sourceMovement: { type: 'ADVANCE', distance: 4 },
    intentAnchor: 'BODY',
    threat: 'NORMAL_ATTACK',
    interruptible: true,
  },
  [ABILITY_IDS.GOBLIN_BOMB]: {
    id: ABILITY_IDS.GOBLIN_BOMB,
    name: '포자 폭탄',
    apCost: 0,
    targeting: 'PATTERN',
    pattern: GOBLIN_BOMB_PATTERN,
    effects: [{ type: 'DAMAGE', amount: 2 }],
    intentAnchor: 'GROUND',
    threat: 'UNBLOCKABLE_ATTACK',
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
