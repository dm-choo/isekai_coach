import { describe, expect, it, vi } from 'vitest';
import {
  ABILITY_IDS,
  BattleEngine,
  SCENARIO_IDS,
  createBasicScenario,
  createKillCancelsIntentScenario,
  createMultiEnemyScenario,
  createScenario,
  createSpearmanKnockbackScenario,
  createUnblockableAttackScenario,
  createWarriorKnockbackScenario,
  defendAction,
  knockbackAction,
  moveAction,
  selectLowestHp,
  selectNearest,
  slashAction,
  type BattleScenario,
  type EnemyIntentStrategy,
  type Unit,
} from '..';

describe('BattleEngine turn contract', () => {
  it('restores the exact simulation head after a what-if preview', () => {
    const engine = new BattleEngine(createWarriorKnockbackScenario());
    engine.beginTurn();
    const stateBefore = engine.state;
    const eventsBefore = engine.events;

    const branch = engine.preview((preview) =>
      preview.performStudentAction(knockbackAction('student-01', 'enemy-01', 'RIGHT')),
    );

    expect(branch.value.executable).toBe(true);
    expect(branch.state).not.toEqual(stateBefore);
    expect(branch.events.some((event) => event.type === 'UNIT_KNOCKED_BACK')).toBe(true);
    expect(engine.state).toEqual(stateBefore);
    expect(engine.events).toEqual(eventsBefore);
  });

  it('declares locked intents before AP refill and rejects duplicate phase calls', () => {
    const engine = new BattleEngine(createWarriorKnockbackScenario());

    const events = engine.beginTurn();

    expect(events.map((event) => event.type)).toEqual([
      'TURN_STARTED',
      'INTENT_DECLARED',
      'AP_REFILLED',
    ]);
    expect(engine.state.phase).toBe('STUDENT_ACTION');
    expect(engine.state.turn).toBe(1);
    expect(student(engine).ap).toBe(2);
    expect(engine.beginTurn()).toEqual([]);
    expect(engine.events).toHaveLength(3);
  });

  it('runs named scenario factories through the public scenario registry', () => {
    expect(Object.values(SCENARIO_IDS)).toHaveLength(6);
    for (const id of Object.values(SCENARIO_IDS)) {
      const scenario = createScenario(id);
      expect(scenario.id).toBe(id);
      expect(() => new BattleEngine(scenario).runTurn()).not.toThrow();
    }
  });

  it('declares and resolves two enemy intents in stable spawn order', () => {
    const engine = new BattleEngine(createMultiEnemyScenario());

    engine.runTurn();

    const declared = engine.events.filter(
      (event): event is Extract<(typeof engine.events)[number], { type: 'INTENT_DECLARED' }> =>
        event.type === 'INTENT_DECLARED',
    );
    expect(declared.map((event) => event.sourceId)).toEqual(['enemy-01', 'enemy-02']);
    expect(student(engine)).toMatchObject({ hp: 4, status: { guard: 0 } });
    expect(
      engine.events
        .filter(
          (event): event is Extract<(typeof engine.events)[number], { type: 'ABILITY_USED' }> =>
            event.type === 'ABILITY_USED' && event.sourceId.startsWith('enemy-'),
        )
        .map((event) => event.sourceId),
    ).toEqual(['enemy-01', 'enemy-02']);
    expect(eventTypes(engine)).toEqual(
      expect.arrayContaining(['DAMAGE_BLOCKED', 'DAMAGE_DEALT']),
    );
  });

  it('runs the bundled Warrior demonstration with an explicit phase and event order', () => {
    const engine = new BattleEngine(createWarriorKnockbackScenario());

    const returned = engine.runTurn();

    expect(engine.state.phase).toBe('READY');
    expect(engine.state.turn).toBe(1);
    expect(engine.state.outcome).toBe('ONGOING');
    expect(returned).toEqual(engine.events);
    expect(returned.map((event) => event.type)).toEqual([
      'TURN_STARTED',
      'INTENT_DECLARED',
      'AP_REFILLED',
      'AP_SPENT',
      'ABILITY_USED',
      'UNIT_KNOCKED_BACK',
      'INTENT_AREA_CHANGED',
      'ABILITY_USED',
      'INTENT_RESOLVED',
      'TURN_ENDED',
    ]);
    expect(engine.state.intents).toEqual([]);
  });

  it('does not mutate scenario input or expose mutable state/event internals', () => {
    const scenario = createWarriorKnockbackScenario();
    const original = structuredClone(scenario);
    const engine = new BattleEngine(scenario);
    engine.beginTurn();
    const snapshot = engine.getState();
    const events = engine.getEvents();

    (snapshot.units[0].position as { x: number }).x = 99;
    const declared = events.find((event) => event.type === 'INTENT_DECLARED');
    if (declared?.type === 'INTENT_DECLARED') {
      (declared.intent.effectCells[0] as { x: number }).x = 99;
    }

    expect(engine.state.units[0].position.x).not.toBe(99);
    expect(engine.state.intents[0].effectCells[0].x).not.toBe(99);
    expect(scenario).toEqual(original);
  });
});

describe('locked intent geometry', () => {
  it('does not retarget when the student moves after declaration', () => {
    const engine = new BattleEngine(createWarriorKnockbackScenario());
    engine.beginTurn();
    const before = engine.state.intents[0];

    expect(engine.performStudentAction(moveAction('student-01', { x: 4, y: 0 })).executable).toBe(
      true,
    );
    const after = engine.state.intents[0];

    expect(after.direction).toBe(before.direction);
    expect(after.aim).toEqual(before.aim);
    expect(after.effectCells).toEqual(before.effectCells);
    engine.resolveEnemyIntents();
    expect(student(engine).hp).toBe(5);
  });

  it('translates a BODY footprint with its source while retaining locked direction', () => {
    const engine = new BattleEngine(createWarriorKnockbackScenario());
    engine.beginTurn();
    const before = engine.state.intents[0];

    const result = engine.performStudentAction(
      knockbackAction('student-01', 'enemy-01', 'RIGHT'),
    );
    const after = engine.state.intents[0];

    expect(result.executable).toBe(true);
    expect(after.direction).toBe('LEFT');
    expect(after.declaredOrigin).toEqual(before.declaredOrigin);
    expect(after.origin).toEqual({ x: 6, y: 1 });
    expect(after.effectCells).toEqual([{ x: 5, y: 1 }]);
    expect(result.events.map((event) => event.type)).toEqual([
      'AP_SPENT',
      'ABILITY_USED',
      'UNIT_KNOCKED_BACK',
      'INTENT_AREA_CHANGED',
    ]);
  });

  it('makes the short Warrior attack miss after knockback', () => {
    const engine = new BattleEngine(createWarriorKnockbackScenario());
    engine.runTurn();

    expect(student(engine).hp).toBe(5);
    expect(eventTypes(engine)).toContain('UNIT_KNOCKED_BACK');
    expect(damageEvents(engine, 'student-01')).toHaveLength(0);
  });

  it('keeps the long Spearman attack in range after the same knockback', () => {
    const engine = new BattleEngine(createSpearmanKnockbackScenario());
    engine.runTurn();

    expect(student(engine).hp).toBe(4);
    expect(engine.events.some((event) => event.type === 'INTENT_AREA_CHANGED')).toBe(true);
    expect(damageEvents(engine, 'student-01')).toHaveLength(1);
  });

  it('keeps a GROUND footprint fixed when its source moves', () => {
    const scenario = createWarriorKnockbackScenario();
    const groundScenario: BattleScenario = {
      ...scenario,
      id: 'ground-anchor-test',
      studentActions: undefined,
      enemyPlans: {
        'enemy-01': [
          {
            abilityId: ABILITY_IDS.SHORT_STRIKE,
            direction: 'LEFT',
            anchor: 'GROUND',
            groundOrigin: { x: 5, y: 1 },
          },
        ],
      },
    };
    const engine = new BattleEngine(groundScenario);
    engine.beginTurn();
    const cells = engine.state.intents[0].effectCells;

    engine.performStudentAction(knockbackAction('student-01', 'enemy-01', 'RIGHT'));

    expect(engine.state.intents[0].effectCells).toEqual(cells);
    expect(engine.events.some((event) => event.type === 'INTENT_AREA_CHANGED')).toBe(false);
    engine.resolveEnemyIntents();
    expect(student(engine).hp).toBe(4);
  });
});

describe('damage, defense, and death', () => {
  it('applies pattern damage and knockback in declared effect order', () => {
    const base = createWarriorKnockbackScenario();
    const scenario: BattleScenario = {
      ...base,
      id: 'combined-effect-test',
      studentActions: undefined,
      units: base.units.map((unit) =>
        unit.id === 'student-01'
          ? { ...unit, abilities: [...unit.abilities, ABILITY_IDS.DEBUG_STRIKE_PUSH] }
          : unit,
      ),
    };
    const engine = new BattleEngine(scenario);
    engine.beginTurn();

    const result = engine.performStudentAction({
      type: 'USE_ABILITY',
      actorId: 'student-01',
      abilityId: ABILITY_IDS.DEBUG_STRIKE_PUSH,
      direction: 'RIGHT',
    });

    expect(result.events.map((event) => event.type)).toEqual([
      'AP_SPENT',
      'ABILITY_USED',
      'DAMAGE_DEALT',
      'UNIT_KNOCKED_BACK',
      'INTENT_AREA_CHANGED',
    ]);
    expect(enemy(engine)).toMatchObject({ hp: 4, position: { x: 6, y: 1 } });
  });

  it('cancels a dead source intent before it can execute', () => {
    const engine = new BattleEngine(createKillCancelsIntentScenario());
    engine.runTurn();

    expect(enemy(engine).hp).toBe(0);
    expect(student(engine).hp).toBe(5);
    expect(engine.state.outcome).toBe('STUDENT_VICTORY');
    const types = eventTypes(engine);
    const deathIndex = types.indexOf('UNIT_DIED');
    expect(types[deathIndex + 1]).toBe('INTENT_CANCELLED');
    expect(
      engine.events.filter(
        (event) => event.type === 'ABILITY_USED' && event.sourceId === 'enemy-01',
      ),
    ).toHaveLength(0);
  });

  it('reduces the next normal hit by one and consumes only that mitigation', () => {
    const normal = createWarriorKnockbackScenario();
    const engine = new BattleEngine({ ...normal, studentActions: [defendAction('student-01')] });
    engine.runTurn();

    expect(student(engine).hp).toBe(5);
    expect(student(engine).status.guard).toBe(0);
    expect(engine.events.some((event) => event.type === 'DAMAGE_BLOCKED')).toBe(true);
  });

  it('does not let Defend reduce an unblockable attack', () => {
    const engine = new BattleEngine(createUnblockableAttackScenario());
    engine.runTurn();

    expect(student(engine).hp).toBe(3);
    expect(student(engine).status.guard).toBe(1);
    expect(engine.events.some((event) => event.type === 'DAMAGE_BLOCKED')).toBe(false);
    expect(damageEvents(engine, 'student-01')[0]?.threat).toBe('UNBLOCKABLE_ATTACK');
  });
});

describe('movement and deterministic ordering', () => {
  it('fails blocked and non-adjacent movement atomically without overlap', () => {
    const engine = new BattleEngine(createWarriorKnockbackScenario());
    engine.beginTurn();
    const before = engine.state;

    const occupied = engine.performStudentAction(moveAction('student-01', { x: 5, y: 1 }));
    const diagonal = engine.performStudentAction(moveAction('student-01', { x: 5, y: 0 }));

    expect(occupied).toMatchObject({ executable: false, reason: 'OCCUPIED', events: [] });
    expect(diagonal).toMatchObject({ executable: false, reason: 'NOT_ADJACENT', events: [] });
    expect(engine.state.units).toEqual(before.units);
  });

  it('logs AP spending before each successful action but never for a failed action', () => {
    const engine = new BattleEngine(createWarriorKnockbackScenario());
    engine.beginTurn();
    const failed = engine.performStudentAction(moveAction('student-01', { x: 5, y: 1 }));
    const succeeded = engine.performStudentAction(moveAction('student-01', { x: 4, y: 0 }));

    expect(failed.events).toEqual([]);
    expect(succeeded.events.map((event) => event.type)).toEqual(['AP_SPENT', 'UNIT_MOVED']);
    expect(succeeded.events[0]).toMatchObject({
      type: 'AP_SPENT',
      unitId: 'student-01',
      amount: 1,
      from: 2,
      to: 1,
    });
    expect(
      engine.events.filter((event) => event.type === 'AP_SPENT'),
    ).toHaveLength(1);
  });

  it('fails knockback into a boundary before charging AP or emitting events', () => {
    const base = createWarriorKnockbackScenario();
    const scenario: BattleScenario = {
      ...base,
      id: 'boundary-knockback',
      studentActions: undefined,
      units: base.units.map((unit) =>
        unit.id === 'enemy-01' ? { ...unit, position: { x: 11, y: 1 } } : unit,
      ),
    };
    const engine = new BattleEngine(scenario);
    engine.beginTurn();
    const beforeCount = engine.events.length;

    const result = engine.performStudentAction(
      knockbackAction('student-01', 'enemy-01', 'RIGHT'),
    );

    expect(result).toMatchObject({ executable: false, reason: 'BLOCKED_KNOCKBACK' });
    expect(engine.events).toHaveLength(beforeCount);
    expect(student(engine).ap).toBe(2);
    expect(enemy(engine).position).toEqual({ x: 11, y: 1 });
  });

  it('uses Boss > Elite > Normal > spawn order for contested enemy movement', () => {
    const mover = (actorId: string): EnemyIntentStrategy => ({
      chooseIntent: () => ({ action: moveAction(actorId, { x: 2, y: 1 }) }),
    });
    const scenario: BattleScenario = {
      id: 'movement-priority',
      name: 'Movement priority',
      map: { width: 5, height: 3 },
      units: [
        {
          id: 'student',
          faction: 'STUDENT',
          position: { x: 0, y: 1 },
          facing: 'RIGHT',
          abilities: [],
          spawnOrder: 0,
        },
        {
          id: 'normal',
          faction: 'ENEMY',
          position: { x: 2, y: 0 },
          facing: 'DOWN',
          abilities: [],
          rank: 'NORMAL',
          spawnOrder: 1,
        },
        {
          id: 'boss',
          faction: 'ENEMY',
          position: { x: 2, y: 2 },
          facing: 'UP',
          abilities: [],
          rank: 'BOSS',
          spawnOrder: 2,
        },
      ],
    };
    const engine = new BattleEngine(scenario, {
      enemyStrategies: { normal: mover('normal'), boss: mover('boss') },
    });
    engine.beginTurn();
    expect(engine.state.intents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          movementPath: [{ x: 2, y: 1 }],
          effectCells: [],
        }),
      ]),
    );
    engine.resolveEnemyIntents();

    expect(unit(engine, 'boss').position).toEqual({ x: 2, y: 1 });
    expect(unit(engine, 'normal').position).toEqual({ x: 2, y: 0 });
    expect(
      engine.events.filter((event) => event.type === 'UNIT_MOVED').map((event) => event.unitId),
    ).toEqual(['boss']);
  });

  it('produces identical state and event sequences for identical inputs without Math.random', () => {
    const random = vi.spyOn(Math, 'random').mockImplementation(() => {
      throw new Error('combat domain must not call Math.random');
    });
    const first = new BattleEngine(createBasicScenario());
    const second = new BattleEngine(createBasicScenario());

    first.runTurns(4);
    second.runTurns(4);

    expect(first.state).toEqual(second.state);
    expect(first.events).toEqual(second.events);
    random.mockRestore();
  });
});

describe('selector utilities', () => {
  it('uses independent deterministic criteria without mutating candidates', () => {
    const source = fakeUnit('source', 5, { x: 0, y: 1 }, 0);
    const lowFar = fakeUnit('low-far', 1, { x: 4, y: 1 }, 2);
    const healthyNear = fakeUnit('healthy-near', 4, { x: 1, y: 1 }, 1);
    const candidates = [healthyNear, lowFar];
    const before = [...candidates];

    expect(selectLowestHp(source, candidates, 'ENEMY')?.id).toBe('low-far');
    expect(selectNearest(source, candidates, 'ENEMY')?.id).toBe('healthy-near');
    expect(candidates).toEqual(before);
  });
});

function unit(engine: BattleEngine, id: string): Unit {
  const result = engine.state.units.find((candidate) => candidate.id === id);
  if (!result) throw new Error(`Missing test unit ${id}`);
  return result;
}

function student(engine: BattleEngine): Unit {
  return unit(engine, 'student-01');
}

function enemy(engine: BattleEngine): Unit {
  return unit(engine, 'enemy-01');
}

function eventTypes(engine: BattleEngine): string[] {
  return engine.events.map((event) => event.type);
}

function damageEvents(engine: BattleEngine, targetId: string) {
  return engine.events.filter(
    (event): event is Extract<(typeof engine.events)[number], { type: 'DAMAGE_DEALT' }> =>
      event.type === 'DAMAGE_DEALT' && event.targetId === targetId,
  );
}

function fakeUnit(
  id: string,
  hp: number,
  position: { x: number; y: number },
  spawnOrder: number,
): Unit {
  return {
    id,
    faction: id === 'source' ? 'STUDENT' : 'ENEMY',
    position,
    facing: 'RIGHT',
    hp,
    maxHp: 5,
    ap: 0,
    maxAp: 2,
    status: { guard: 0, stunned: 0 },
    abilities: [],
    rank: 'NORMAL',
    spawnOrder,
  };
}
