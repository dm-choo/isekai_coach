import { describe, expect, it } from 'vitest';
import { ABILITY_IDS, BattleEngine, getAbility, pushAction, slamAction, type BattleScenario } from '../combat';
import {
  ADMINISTRATOR_ID,
  ARCHER_ID,
  GUARDIAN_ID,
  createSliceScenario,
} from './scenario';

describe('vertical slice encounter contract', () => {
  it('pins the approved party, boss, and player-action balance', () => {
    const scenario = createSliceScenario();
    expect(scenario.units.find((candidate) => candidate.id === ADMINISTRATOR_ID)).toMatchObject({ hp: 10, maxHp: 10, maxAp: 3 });
    expect(scenario.units.find((candidate) => candidate.id === ARCHER_ID)).toMatchObject({ hp: 10, maxHp: 10 });
    expect(scenario.units.find((candidate) => candidate.id === GUARDIAN_ID)).toMatchObject({ hp: 15, maxHp: 15 });
    expect(getAbility(ABILITY_IDS.SHOOT)).toMatchObject({ apCost: 2, effects: [{ type: 'DAMAGE', amount: 1 }] });
    expect(getAbility(ABILITY_IDS.SLAM)).toMatchObject({
      name: '내려찍기',
      apCost: 2,
      effects: [{ type: 'DAMAGE', amount: 2 }],
      tags: ['#근거리공격'],
    });
    expect(getAbility(ABILITY_IDS.PUSH)).toMatchObject({ apCost: 2 });
    expect(getAbility(ABILITY_IDS.PUSH)?.effects).toEqual(expect.arrayContaining([
      { type: 'DAMAGE', amount: 1 },
      { type: 'KNOCKBACK', distance: 1 },
    ]));
  });

  it('locks move two then suppression as one first-turn boss pattern', () => {
    const engine = new BattleEngine(createSliceScenario());

    engine.beginTurn();

    expect(engine.state.intents[0]).toMatchObject({
      sourceId: GUARDIAN_ID,
      abilityId: 'guardian-crush',
      movementPath: [{ x: 6, y: 1 }, { x: 5, y: 1 }],
      effectCells: [{ x: 4, y: 1 }],
    });

    engine.resolveEnemyIntents();

    expect(unit(engine, GUARDIAN_ID)).toMatchObject({ position: { x: 5, y: 1 }, hp: 15 });
    expect(unit(engine, ADMINISTRATOR_ID).hp).toBe(4);
    expect(engine.events).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'UNIT_MOVED', unitId: GUARDIAN_ID, to: { x: 5, y: 1 } }),
      expect.objectContaining({ type: 'DAMAGE_DEALT', targetId: ADMINISTRATOR_ID, amount: 6 }),
    ]));
  });

  it('lets a melee hit interrupt the second-turn 5x3 charge without applying stun', () => {
    const engine = new BattleEngine(createSliceScenario());
    engine.beginTurn();
    engine.resolveEnemyIntents();
    engine.beginTurn();

    const shout = engine.state.intents[0];
    expect(shout).toMatchObject({ abilityId: 'guardian-rupture' });
    expect(shout.effectCells).toHaveLength(15);

    const result = engine.performStudentAction(
      slamAction(ADMINISTRATOR_ID, GUARDIAN_ID, 'RIGHT'),
    );

    expect(result.executable).toBe(true);
    expect(result.events).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'DAMAGE_DEALT', targetId: GUARDIAN_ID, amount: 2 }),
      expect.objectContaining({ type: 'INTENT_CANCELLED', reason: 'MELEE_HIT' }),
    ]));
    expect(result.events.some((event) => event.type === 'STATUS_APPLIED' && event.status === 'STUN')).toBe(false);
    engine.resolveEnemyIntents();
    expect(unit(engine, ADMINISTRATOR_ID).hp).toBe(4);
  });

  it('also lets 밀치기 interrupt the charged shout through #근거리공격', () => {
    const engine = new BattleEngine(createSliceScenario());
    engine.beginTurn();
    engine.resolveEnemyIntents();
    engine.beginTurn();

    const result = engine.performStudentAction(
      pushAction(ADMINISTRATOR_ID, GUARDIAN_ID, 'RIGHT'),
    );

    expect(result.executable).toBe(true);
    expect(result.events).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'UNIT_KNOCKED_BACK', unitId: GUARDIAN_ID }),
      expect.objectContaining({ type: 'INTENT_CANCELLED', reason: 'MELEE_HIT' }),
    ]));
  });

  it('summons an uncapped 1 HP ranged-hunter and charges toward the ranged ally', () => {
    const engine = new BattleEngine(withDurableParty(createSliceScenario()));
    runEmptyTurn(engine); // 1: move + suppression
    runEmptyTurn(engine); // 2: shout
    runEmptyTurn(engine); // 3: summon

    const firstHound = engine.state.units.find((candidate) => candidate.id === 'guardian-hound-1');
    expect(firstHound).toMatchObject({
      hp: 1,
      maxHp: 1,
      combatRole: 'MINION',
      behavior: 'RANGED_HUNTER',
    });
    expect(engine.events).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'UNIT_SUMMONED', templateId: 'guardian-hound' }),
    ]));

    const allyHpBefore = unit(engine, ARCHER_ID).hp;
    engine.beginTurn();
    const charge = engine.state.intents.find((intent) => intent.sourceId === firstHound?.id);
    expect(charge).toMatchObject({
      abilityId: 'minion-charge',
      action: expect.objectContaining({ targetId: ARCHER_ID }),
    });
    engine.resolveEnemyIntents();
    expect(unit(engine, ARCHER_ID).hp).toBe(allyHpBefore - 2);
    expect(unit(engine, 'guardian-hound-1').position).toEqual({ x: 3, y: 2 });

    runEmptyTurn(engine); // 5: shout
    runEmptyTurn(engine); // 6: second summon
    expect(engine.state.units.filter((candidate) => candidate.id.startsWith('guardian-hound-'))).toHaveLength(2);
  });

  it('uses the next authored summon cell when the preferred cell is occupied', () => {
    const scenario = withDurableParty(createSliceScenario());
    const engine = new BattleEngine(scenario);

    runEmptyTurn(engine); // guardian ends at 5,1; administrator occupies preferred 4,1
    runEmptyTurn(engine);
    runEmptyTurn(engine);

    expect(unit(engine, 'guardian-hound-1').position).toEqual({ x: 4, y: 2 });
    expect(engine.events).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'UNIT_SUMMONED', templateId: 'guardian-hound' }),
    ]));
  });

  it('replays the full 1-2-3 pattern loop deterministically', () => {
    const first = new BattleEngine(withDurableParty(createSliceScenario()));
    const second = new BattleEngine(withDurableParty(createSliceScenario()));
    for (let turn = 0; turn < 6; turn += 1) {
      runEmptyTurn(first);
      runEmptyTurn(second);
    }

    expect(first.state).toEqual(second.state);
    expect(first.events).toEqual(second.events);
    expect(first.events.filter((event) => event.type === 'UNIT_SUMMONED')).toHaveLength(2);
  });
});

function runEmptyTurn(engine: BattleEngine): void {
  engine.beginTurn();
  engine.resolveEnemyIntents();
}

function withDurableParty(scenario: BattleScenario): BattleScenario {
  return {
    ...scenario,
    id: `${scenario.id}-durable-test`,
    units: scenario.units.map((candidate) => candidate.faction === 'STUDENT'
      ? { ...candidate, hp: 100, maxHp: 100 }
      : candidate),
  };
}

function unit(engine: BattleEngine, id: string) {
  const found = engine.state.units.find((candidate) => candidate.id === id);
  if (!found) throw new Error(`Missing unit ${id}`);
  return found;
}
