import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { BattleState, CombatEvent } from '../combat';
import type { PresentationPort } from '../phaser/bridge/PresentationPort';
import { SliceController } from './SliceController';

class InstantPresentation implements PresentationPort {
  public readonly events: CombatEvent[] = [];
  public sealUnlocks = 0;

  public reset(_state: BattleState): void {}
  public present(
    event: CombatEvent,
    _state: BattleState,
    _durationScale: number,
    _signal: AbortSignal,
  ): Promise<void> {
    this.events.push(event);
    return Promise.resolve();
  }
  public settle(_state: BattleState): void {}
  public pause(): void {}
  public resume(): void {}
  public setSpeed(_multiplier: number): void {}
  public playSealUnlock(_signal: AbortSignal): Promise<void> {
    this.sealUnlocks += 1;
    return Promise.resolve();
  }
  public destroy(): void {}
}

describe('SliceController barrier-guardian encounter', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('opens as a boss encounter and declares the short BODY strike on turn one', async () => {
    const controller = new SliceController();
    controller.attachPresentation(new InstantPresentation());
    expect(controller.getSnapshot().mode).toBe('INTRO');

    controller.startEncounter();
    await flushPromises();

    const snapshot = controller.getSnapshot();
    expect(snapshot.mode).toBe('PLAYER_TURN');
    expect(snapshot.isBusy).toBe(false);
    expect(snapshot.state.map).toEqual({ width: 12, height: 3 });
    expect(snapshot.state.intents[0]).toMatchObject({
      abilityId: 'guardian-crush',
      anchor: 'BODY',
      direction: 'LEFT',
      effectCells: [{ x: 4, y: 1 }],
    });
    expect(snapshot.policy).toEqual(['EVADE', 'POSITION', 'SHOOT', 'PUSH', 'EMPTY']);
  });

  it('uses push to shift the locked strike, then shows two projectile shots before a miss', async () => {
    const controller = new SliceController();
    const presentation = new InstantPresentation();
    controller.attachPresentation(presentation);
    controller.startEncounter();
    await flushPromises();

    controller.useAction('PUSH');
    await flushPromises();
    expect(controller.getSnapshot().state.units.find((unit) => unit.id === 'barrier-guardian-01')?.position.x).toBe(6);
    expect(controller.getSnapshot().eventHistory.some((event) => event.type === 'INTENT_AREA_CHANGED')).toBe(true);

    controller.endTurn();
    await vi.advanceTimersByTimeAsync(6_000);
    await flushPromises();

    const snapshot = controller.getSnapshot();
    const administrator = snapshot.state.units.find((unit) => unit.id === 'administrator-01');
    const guardian = snapshot.state.units.find((unit) => unit.id === 'barrier-guardian-01');
    expect(snapshot.mode).toBe('PLAYER_TURN');
    expect(snapshot.state.turn).toBe(2);
    expect(administrator?.hp).toBe(10);
    expect(guardian).toMatchObject({ hp: 9, position: { x: 6, y: 1 } });
    expect(snapshot.lastPolicyTrace.map((step) => step.selectedName)).toEqual(['사격', '사격']);
    expect(presentation.events.filter((event) => event.type === 'ABILITY_USED' && event.abilityId === 'shoot')).toHaveLength(2);
    expect(snapshot.state.intents[0]?.abilityId).toBe('guardian-rupture');
  });

  it('moves with WASD separately, interrupts the wide attack with slam, and unlocks the seal', async () => {
    const controller = new SliceController();
    const presentation = new InstantPresentation();
    controller.attachPresentation(presentation);
    controller.startEncounter();
    await flushPromises();
    controller.useAction('PUSH');
    await flushPromises();
    controller.endTurn();
    await vi.advanceTimersByTimeAsync(6_000);
    await flushPromises();

    controller.move('RIGHT');
    await flushPromises();
    expect(controller.getSnapshot().state.units.find((unit) => unit.id === 'administrator-01')?.position.x).toBe(5);

    controller.useAction('SLAM');
    await flushPromises();
    await vi.advanceTimersByTimeAsync(6_000);
    await flushPromises();

    const victory = controller.getSnapshot();
    expect(victory.mode).toBe('VICTORY');
    expect(victory.state.outcome).toBe('STUDENT_VICTORY');
    expect(victory.eventHistory).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'STATUS_APPLIED', status: 'STUN' }),
      expect.objectContaining({ type: 'INTENT_CANCELLED', reason: 'SOURCE_STUNNED' }),
      expect.objectContaining({ type: 'UNIT_DIED', unitId: 'barrier-guardian-01' }),
    ]));

    controller.unlockSeal();
    await flushPromises();
    expect(controller.getSnapshot().mode).toBe('SEAL_UNLOCKED');
    expect(presentation.sealUnlocks).toBe(1);
  });
});

async function flushPromises(): Promise<void> {
  for (let index = 0; index < 12; index += 1) await Promise.resolve();
}
