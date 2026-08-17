import type { BattleState, CombatEvent, Intent } from '../../combat';
import type { UnitAnimationState } from '../../assets/AssetManifest';
import { BattleRenderer } from '../rendering/BattleRenderer';
import type { BattlePredictionPresentation } from '../bridge/PresentationPort';

const EVENT_DURATION_MS: Partial<Record<CombatEvent['type'], number>> = {
  TURN_STARTED: 180,
  INTENT_DECLARED: 480,
  AP_REFILLED: 120,
  AP_SPENT: 90,
  UNIT_MOVED: 280,
  ABILITY_USED: 460,
  STATUS_APPLIED: 240,
  STATUS_CONSUMED: 80,
  DAMAGE_DEALT: 260,
  DAMAGE_BLOCKED: 260,
  UNIT_KNOCKED_BACK: 330,
  INTENT_AREA_CHANGED: 440,
  INTENT_CANCELLED: 300,
  INTENT_RESOLVED: 160,
  UNIT_DIED: 500,
  UNIT_SUMMONED: 520,
  TURN_ENDED: 260,
};

/**
 * Translates immutable domain facts into replaceable presentation. Tween
 * completion advances playback only and never feeds back into combat rules.
 */
export class AnimationDirector {
  private readonly intents = new Map<string, Intent>();

  public constructor(private readonly renderer: BattleRenderer) {}

  public reset(state: BattleState): void {
    this.intents.clear();
    for (const intent of state.intents) this.intents.set(intent.id, intent);
    this.renderer.reset(state);
  }

  public settle(state: BattleState): void {
    this.renderer.sync(state);
  }

  public setPrediction(prediction: BattlePredictionPresentation | null): void {
    this.renderer.setPrediction(prediction);
  }

  public playSealUnlock(signal: AbortSignal): Promise<void> {
    return this.renderer.playSealUnlock(signal);
  }

  public async present(
    event: CombatEvent,
    durationScale: number,
    signal: AbortSignal,
  ): Promise<void> {
    if (signal.aborted) return;
    const duration = Math.max(
      0,
      Math.round((EVENT_DURATION_MS[event.type] ?? 160) * durationScale),
    );
    this.renderer.setPhase(event.type);

    switch (event.type) {
      case 'TURN_STARTED':
        this.renderer.setTurn(event.turn);
        await this.renderer.wait(duration, signal);
        break;
      case 'INTENT_DECLARED':
        this.intents.set(event.intentId, event.intent);
        this.syncTelegraphs();
        await this.renderer.wait(duration, signal);
        break;
      case 'INTENT_AREA_CHANGED':
        this.intents.set(event.intentId, event.intent);
        this.syncTelegraphs();
        await this.renderer.wait(duration, signal);
        break;
      case 'INTENT_CANCELLED':
      case 'INTENT_RESOLVED':
        this.intents.delete(event.intentId);
        this.syncTelegraphs();
        await this.renderer.wait(duration, signal);
        break;
      case 'AP_REFILLED':
      case 'AP_SPENT':
        this.renderer.setUnitAp(event.unitId, event.to, Math.max(event.from, event.to));
        await this.renderer.wait(duration, signal);
        break;
      case 'UNIT_MOVED':
        await this.animateMove(event.unitId, event.to, 'move', duration, signal);
        break;
      case 'UNIT_KNOCKED_BACK':
        await this.animateMove(event.unitId, event.to, 'knockback', duration, signal);
        break;
      case 'ABILITY_USED': {
        const state: UnitAnimationState = event.abilityId.toLowerCase().includes('defend')
          ? 'defend'
          : 'attack';
        this.renderer.getUnit(event.sourceId)?.setAnimationState(state);
        await this.renderer.animateAbility(
          event.sourceId,
          event.abilityId,
          event.targetId,
          duration,
          signal,
        );
        this.renderer.getUnit(event.sourceId)?.returnToIdle();
        break;
      }
      case 'STATUS_APPLIED':
        this.renderer.getUnit(event.targetId)?.setAnimationState('defend');
        await this.renderer.showStatus(
          event.targetId,
          event.status === 'STUN' ? '스턴 · 행동 중단' : '방어',
          duration,
          signal,
        );
        this.renderer.getUnit(event.targetId)?.returnToIdle();
        break;
      case 'STATUS_CONSUMED':
        await this.renderer.wait(duration, signal);
        break;
      case 'DAMAGE_DEALT':
        this.renderer.setUnitHp(event.targetId, event.hpAfter);
        this.renderer.getUnit(event.targetId)?.setAnimationState('hit');
        await Promise.all([
          this.renderer.flashUnit(event.targetId, duration, signal),
          this.renderer.showDamage(event.targetId, event.amount, false, duration, signal),
          this.renderer.showVfx(event.targetId, 'hit_fx_01', duration, signal),
        ]);
        this.renderer.getUnit(event.targetId)?.returnToIdle();
        break;
      case 'DAMAGE_BLOCKED':
        this.renderer.getUnit(event.targetId)?.setAnimationState('defend');
        await this.renderer.showDamage(event.targetId, event.amount, true, duration, signal);
        this.renderer.getUnit(event.targetId)?.returnToIdle();
        break;
      case 'UNIT_DIED':
        this.renderer.getUnit(event.unitId)?.setAnimationState('death');
        await this.renderer.wait(duration, signal);
        break;
      case 'UNIT_SUMMONED':
        await this.renderer.summonUnit(event.unit, duration, signal);
        break;
      case 'TURN_ENDED':
        this.intents.clear();
        this.renderer.clearTelegraphs();
        await this.renderer.wait(duration, signal);
        break;
    }
  }

  private async animateMove(
    unitId: string,
    to: Readonly<{ x: number; y: number }>,
    animation: 'move' | 'knockback',
    duration: number,
    signal: AbortSignal,
  ): Promise<void> {
    const view = this.renderer.getUnit(unitId);
    view?.setAnimationState(animation);
    await this.renderer.moveUnit(unitId, to, duration, signal);
    view?.returnToIdle();
  }

  private syncTelegraphs(): void {
    this.renderer.syncTelegraphs([...this.intents.values()]);
  }
}
