import { describe, expect, it, vi } from 'vitest';
import type { BattleState, CombatEvent } from '../../combat';
import { moveAction } from '../../combat';
import type { PresentationPort } from './PresentationPort';
import { SandboxController } from './SandboxController';

class FakePresentation implements PresentationPort {
  public readonly presented: CombatEvent[] = [];
  public readonly abortedSequences: number[] = [];
  public resetCount = 0;
  public paused = false;
  public speed = 1;

  public constructor(private readonly blockPresent = false) {}

  public reset(_state: BattleState): void {
    this.resetCount += 1;
  }

  public present(
    event: CombatEvent,
    _state: BattleState,
    _durationScale: number,
    signal: AbortSignal,
  ): Promise<void> {
    this.presented.push(event);
    if (!this.blockPresent) return Promise.resolve();
    return new Promise((resolve) => {
      signal.addEventListener(
        'abort',
        () => {
          this.abortedSequences.push(event.sequence);
          resolve();
        },
        { once: true },
      );
    });
  }

  public settle(_state: BattleState): void {}
  public pause(): void { this.paused = true; }
  public resume(): void { this.paused = false; }
  public setSpeed(multiplier: number): void { this.speed = multiplier; }
  public destroy(): void {}
}

describe('SandboxController playback contract', () => {
  it('presents exactly one CombatEvent for each Step', async () => {
    const controller = new SandboxController('warrior-knockback');
    const presentation = new FakePresentation();
    controller.attachPresentation(presentation);

    controller.step();

    await vi.waitFor(() => expect(controller.getSnapshot().status.presentedEventCount).toBe(1));
    expect(controller.getSnapshot().status.mode).toBe('PAUSED');
    expect(presentation.presented.map((event) => event.type)).toEqual(['TURN_STARTED']);
  });

  it('aborts an in-flight presentation before resetting its generation', async () => {
    const controller = new SandboxController('warrior-knockback');
    const presentation = new FakePresentation(true);
    controller.attachPresentation(presentation);
    controller.start();
    await vi.waitFor(() => expect(presentation.presented).toHaveLength(1));

    controller.reset('basic-1v1');

    await vi.waitFor(() => expect(presentation.abortedSequences).toEqual([1]));
    expect(controller.getSnapshot()).toMatchObject({
      scenarioId: 'basic-1v1',
      status: { mode: 'READY', presentedEventCount: 0, queuedEventCount: 0, generation: 1 },
    });
    expect(presentation.resetCount).toBe(2);
  });

  it('drains the same event history without dropping events in Instant mode', async () => {
    const controller = new SandboxController('kill-cancels-intent');
    const presentation = new FakePresentation();
    controller.attachPresentation(presentation);
    controller.setSpeed('INSTANT');
    controller.start();

    await vi.waitFor(() => expect(controller.getSnapshot().status.mode).toBe('COMPLETE'));
    const snapshot = controller.getSnapshot();
    expect(snapshot.status.presentedEventCount).toBe(snapshot.eventHistory.length);
    expect(presentation.presented).toEqual(snapshot.eventHistory);
  });

  it('rejects manual debug actions while presentation is behind simulation', async () => {
    const controller = new SandboxController('warrior-knockback');
    controller.attachPresentation(new FakePresentation());
    controller.step();
    await vi.waitFor(() => expect(controller.getSnapshot().status.presentedEventCount).toBe(1));
    const before = controller.getSnapshot();
    const student = before.state.units.find((unit) => unit.faction === 'STUDENT');
    if (!student) throw new Error('scenario student is required');

    const accepted = controller.performDebugAction(
      moveAction(student.id, { x: student.position.x, y: student.position.y - 1 }),
    );

    expect(accepted).toBe(false);
    expect(controller.getSnapshot().eventHistory).toEqual(before.eventHistory);
  });

  it('resumes a start command issued before presentation attaches', async () => {
    const controller = new SandboxController('kill-cancels-intent');
    controller.setSpeed('INSTANT');
    controller.start();
    expect(controller.getSnapshot().status.presentedEventCount).toBe(0);

    const presentation = new FakePresentation();
    controller.attachPresentation(presentation);

    await vi.waitFor(() => expect(controller.getSnapshot().status.mode).toBe('COMPLETE'));
    expect(presentation.presented).toHaveLength(controller.getSnapshot().eventHistory.length);
  });
});
