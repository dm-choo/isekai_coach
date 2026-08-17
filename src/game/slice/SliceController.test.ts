import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { BattleState, CombatEvent } from '../combat';
import type {
  BattlePredictionPresentation,
  PresentationPort,
} from '../phaser/bridge/PresentationPort';
import { SliceController } from './SliceController';

class InstantPresentation implements PresentationPort {
  public readonly events: CombatEvent[] = [];
  public readonly predictions: (BattlePredictionPresentation | null)[] = [];
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
  public setPrediction(prediction: BattlePredictionPresentation | null): void {
    this.predictions.push(prediction);
  }
  public playSealUnlock(_signal: AbortSignal): Promise<void> {
    this.sealUnlocks += 1;
    return Promise.resolve();
  }
  public destroy(): void {}
}

describe('SliceController barrier-guardian encounter', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('opens as a boss encounter and declares move two plus 제압 on turn one', async () => {
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

  it('keeps planned movement provisional, supports one-step undo, then commits on Space semantics', async () => {
    const controller = new SliceController();
    const presentation = new InstantPresentation();
    controller.attachPresentation(presentation);
    controller.startEncounter();
    await flushPromises();

    const eventCount = controller.getSnapshot().eventHistory.length;
    controller.move('UP');
    let snapshot = controller.getSnapshot();
    expect(snapshot.state.units.find((unit) => unit.id === 'administrator-01')?.position).toEqual({ x: 4, y: 1 });
    expect(snapshot.previewState.units.find((unit) => unit.id === 'administrator-01')?.position).toEqual({ x: 4, y: 0 });
    expect(snapshot.eventHistory).toHaveLength(eventCount);
    expect(snapshot.plannedActions.map((action) => action.label)).toEqual(['이동']);
    expect(presentation.predictions.at(-1)?.unitPositions).toEqual([
      { unitId: 'administrator-01', position: { x: 4, y: 0 } },
    ]);

    controller.undoLastAction();
    snapshot = controller.getSnapshot();
    expect(snapshot.previewState.units.find((unit) => unit.id === 'administrator-01')?.position).toEqual({ x: 4, y: 1 });
    expect(snapshot.plannedActions).toHaveLength(0);

    controller.move('UP');
    controller.confirmPlan();
    await vi.advanceTimersByTimeAsync(6_000);
    await flushPromises();

    snapshot = controller.getSnapshot();
    const administrator = snapshot.state.units.find((unit) => unit.id === 'administrator-01');
    const guardian = snapshot.state.units.find((unit) => unit.id === 'barrier-guardian-01');
    expect(snapshot.mode).toBe('PLAYER_TURN');
    expect(snapshot.state.turn).toBe(2);
    expect(administrator?.hp).toBe(10);
    expect(administrator?.position).toEqual({ x: 4, y: 0 });
    expect(guardian).toMatchObject({ hp: 14, position: { x: 5, y: 1 } });
    expect(snapshot.lastPolicyTrace.map((step) => step.selectedName)).toEqual(['포지셔닝', '사격']);
    expect(presentation.events.filter((event) => event.type === 'ABILITY_USED' && event.abilityId === 'shoot')).toHaveLength(1);
    expect(snapshot.state.intents[0]?.abilityId).toBe('guardian-rupture');
  });

  it('recomputes a hover preview and only interrupts the wide attack after confirmation', async () => {
    const controller = new SliceController();
    const presentation = new InstantPresentation();
    controller.attachPresentation(presentation);
    controller.startEncounter();
    await flushPromises();
    controller.move('UP');
    controller.confirmPlan();
    await vi.advanceTimersByTimeAsync(6_000);
    await flushPromises();

    controller.move('DOWN');
    controller.setActionHover('SLAM');
    let preview = controller.getSnapshot();
    expect(preview.hoveredActionId).toBe('SLAM');
    expect(preview.state.intents[0]?.abilityId).toBe('guardian-rupture');
    expect(preview.previewState.intents).toHaveLength(0);
    expect(preview.state.units.find((unit) => unit.id === 'barrier-guardian-01')?.hp).toBe(14);
    expect(preview.previewState.units.find((unit) => unit.id === 'barrier-guardian-01')?.hp).toBe(13);
    expect(presentation.predictions.at(-1)?.previewIntents).toHaveLength(0);

    controller.setActionHover();
    controller.useAction('SLAM');
    preview = controller.getSnapshot();
    expect(preview.plannedActions.map((action) => action.label)).toEqual(['이동', '내려찍기']);
    expect(preview.state.intents[0]?.abilityId).toBe('guardian-rupture');
    expect(preview.previewState.intents).toHaveLength(0);

    controller.undoLastAction();
    expect(controller.getSnapshot().plannedActions.map((action) => action.label)).toEqual(['이동']);
    expect(controller.getSnapshot().previewState.intents[0]?.abilityId).toBe('guardian-rupture');

    controller.useAction('SLAM');
    controller.confirmPlan();
    await vi.advanceTimersByTimeAsync(6_000);
    await flushPromises();

    const snapshot = controller.getSnapshot();
    expect(snapshot.mode).toBe('PLAYER_TURN');
    expect(snapshot.state.turn).toBe(3);
    expect(snapshot.state.units.find((unit) => unit.id === 'administrator-01')?.hp).toBe(10);
    expect(snapshot.eventHistory).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'STATUS_APPLIED', status: 'STUN' }),
      expect.objectContaining({ type: 'INTENT_CANCELLED', reason: 'SOURCE_STUNNED' }),
    ]));
    expect(snapshot.state.intents[0]?.abilityId).toBe('guardian-summon');
  });

  it('aborts an in-flight ally phase on restart without stale state mutation', async () => {
    const controller = new SliceController();
    controller.attachPresentation(new InstantPresentation());
    controller.startEncounter();
    await flushPromises();
    controller.move('UP');
    controller.confirmPlan();
    await flushPromises();
    expect(controller.getSnapshot().mode).toBe('ALLY_TURN');

    controller.restart();
    await vi.advanceTimersByTimeAsync(10_000);
    await flushPromises();

    expect(controller.getSnapshot()).toMatchObject({
      mode: 'INTRO',
      isBusy: false,
      state: { turn: 0, outcome: 'ONGOING' },
    });
    expect(controller.getSnapshot().eventHistory).toHaveLength(0);
  });
});

async function flushPromises(): Promise<void> {
  for (let index = 0; index < 12; index += 1) await Promise.resolve();
}
