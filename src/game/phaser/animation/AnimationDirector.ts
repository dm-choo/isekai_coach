import type { BattleState, CombatEvent } from '../../combat';
import type { UnitAnimationState } from '../../assets/AssetManifest';
import { BattleRenderer } from '../rendering/BattleRenderer';
import type { LogicalPosition } from '../rendering/GridProjector';
import type { RenderableIntent, ThreatVisual } from '../rendering/TelegraphView';

type UnknownRecord = Record<string, unknown>;

const EVENT_DURATION_MS: Record<string, number> = {
  TURN_STARTED: 180,
  INTENT_DECLARED: 480,
  AP_REFILLED: 120,
  AP_SPENT: 90,
  UNIT_MOVED: 280,
  ABILITY_USED: 300,
  STATUS_APPLIED: 240,
  DAMAGE_DEALT: 260,
  DAMAGE_BLOCKED: 260,
  UNIT_KNOCKED_BACK: 330,
  INTENT_AREA_CHANGED: 440,
  INTENT_CANCELLED: 300,
  UNIT_DIED: 500,
  TURN_ENDED: 260,
};

/**
 * Translates domain facts into replaceable presentation. It never feeds tween
 * completion back into combat resolution; completion only advances playback.
 */
export class AnimationDirector {
  private readonly intents = new Map<string, RenderableIntent>();

  public constructor(private readonly renderer: BattleRenderer) {}

  public reset(state: BattleState): void {
    this.intents.clear();
    const raw = state as unknown as { intents?: readonly RenderableIntent[] };
    for (const intent of raw.intents ?? []) {
      this.intents.set(intent.id ?? intent.sourceId, intent);
    }
    this.renderer.reset(state);
  }

  public settle(state: BattleState): void {
    this.renderer.sync(state);
  }

  public async present(
    event: CombatEvent,
    durationScale: number,
    signal: AbortSignal,
  ): Promise<void> {
    if (signal.aborted) return;
    const record = flattenEvent(event);
    const type = readString(record, 'type') ?? 'UNKNOWN_EVENT';
    const duration = Math.max(0, Math.round((EVENT_DURATION_MS[type] ?? 160) * durationScale));
    this.renderer.setPhase(type);

    switch (type) {
      case 'TURN_STARTED': {
        const turn = readNumber(record, 'turn');
        if (turn !== undefined) this.renderer.setTurn(turn);
        await this.renderer.wait(duration, signal);
        break;
      }
      case 'INTENT_DECLARED': {
        const intent = readIntent(record);
        if (intent) {
          this.intents.set(intent.id ?? intent.sourceId, intent);
          this.renderer.syncTelegraphs([...this.intents.values()]);
        }
        await this.renderer.wait(duration, signal);
        break;
      }
      case 'INTENT_AREA_CHANGED': {
        const intent = readIntent(record);
        const sourceId = readString(record, 'sourceId', 'unitId');
        const key = intent?.id ?? sourceId;
        if (intent && key) this.intents.set(key, intent);
        else if (key) {
          const previous = this.intents.get(key);
          const cells = readPositions(record, 'toCells', 'telegraphedCells', 'cells');
          if (previous && cells) this.intents.set(key, { ...previous, telegraphedCells: cells });
        }
        this.renderer.syncTelegraphs([...this.intents.values()]);
        await this.renderer.wait(duration, signal);
        break;
      }
      case 'INTENT_CANCELLED':
      case 'INTENT_RESOLVED': {
        const key = readString(record, 'intentId', 'sourceId', 'unitId');
        if (key) {
          this.intents.delete(key);
          for (const [intentKey, intent] of this.intents) {
            if (intent.sourceId === key) this.intents.delete(intentKey);
          }
          this.renderer.syncTelegraphs([...this.intents.values()]);
        }
        await this.renderer.wait(duration, signal);
        break;
      }
      case 'AP_REFILLED':
      case 'AP_SPENT': {
        const unitId = readString(record, 'unitId');
        const ap = readNumber(record, 'to');
        const maxAp = readNumber(record, 'maxAp') ?? Math.max(ap ?? 0, readNumber(record, 'from') ?? 0);
        if (unitId && ap !== undefined) this.renderer.setUnitAp(unitId, ap, maxAp);
        await this.renderer.wait(duration, signal);
        break;
      }
      case 'UNIT_MOVED':
        await this.animateMove(record, 'move', duration, signal);
        break;
      case 'UNIT_KNOCKED_BACK':
        await this.animateMove(record, 'knockback', duration, signal);
        break;
      case 'ABILITY_USED': {
        const sourceId = readString(record, 'sourceId', 'unitId', 'actorId');
        const abilityId = readString(record, 'abilityId', 'actionId') ?? '';
        const state: UnitAnimationState = abilityId.toLowerCase().includes('defend') ? 'defend' : 'attack';
        if (sourceId) this.renderer.getUnit(sourceId)?.setAnimationState(state);
        if (sourceId) {
          await Promise.all([
            this.renderer.pulseUnit(sourceId, duration, signal),
            this.renderer.showVfx(sourceId, 'attack_fx_01', duration, signal),
          ]);
        }
        else await this.renderer.wait(duration, signal);
        this.renderer.getUnit(sourceId ?? '')?.returnToIdle();
        break;
      }
      case 'STATUS_APPLIED': {
        const unitId = readString(record, 'unitId', 'targetId', 'sourceId');
        if (unitId) this.renderer.getUnit(unitId)?.setAnimationState('defend');
        await this.renderer.wait(duration, signal);
        this.renderer.getUnit(unitId ?? '')?.returnToIdle();
        break;
      }
      case 'DAMAGE_DEALT': {
        const targetId = readString(record, 'targetId', 'unitId');
        const amount = readNumber(record, 'amount', 'damage', 'applied') ?? 1;
        const hpAfter = readNumber(record, 'hpAfter');
        if (targetId && hpAfter !== undefined) this.renderer.setUnitHp(targetId, hpAfter);
        if (targetId) this.renderer.getUnit(targetId)?.setAnimationState('hit');
        await Promise.all([
          targetId
            ? this.renderer.flashUnit(targetId, duration, signal)
            : this.renderer.wait(duration, signal),
          targetId
            ? this.renderer.showDamage(targetId, amount, false, duration, signal)
            : Promise.resolve(),
          targetId
            ? this.renderer.showVfx(targetId, 'hit_fx_01', duration, signal)
            : Promise.resolve(),
        ]);
        this.renderer.getUnit(targetId ?? '')?.returnToIdle();
        break;
      }
      case 'DAMAGE_BLOCKED': {
        const targetId = readString(record, 'targetId', 'unitId');
        if (targetId) this.renderer.getUnit(targetId)?.setAnimationState('defend');
        if (targetId) await this.renderer.showDamage(targetId, 0, true, duration, signal);
        else await this.renderer.wait(duration, signal);
        this.renderer.getUnit(targetId ?? '')?.returnToIdle();
        break;
      }
      case 'UNIT_DIED': {
        const unitId = readString(record, 'unitId', 'targetId');
        if (unitId) this.renderer.getUnit(unitId)?.setAnimationState('death');
        await this.renderer.wait(duration, signal);
        break;
      }
      case 'TURN_ENDED':
        this.intents.clear();
        this.renderer.clearTelegraphs();
        await this.renderer.wait(duration, signal);
        break;
      default:
        await this.renderer.wait(duration, signal);
    }
  }

  private async animateMove(
    record: UnknownRecord,
    animation: 'move' | 'knockback',
    duration: number,
    signal: AbortSignal,
  ): Promise<void> {
    const unitId = readString(record, 'unitId', 'targetId', 'sourceId');
    const to = readPosition(record, 'to', 'position');
    if (!unitId || !to) {
      await this.renderer.wait(duration, signal);
      return;
    }
    const view = this.renderer.getUnit(unitId);
    view?.setAnimationState(animation);
    await this.renderer.moveUnit(unitId, to, duration, signal);
    view?.returnToIdle();
  }
}

function flattenEvent(event: CombatEvent): UnknownRecord {
  const outer = event as unknown as UnknownRecord;
  const payload = isRecord(outer.payload) ? outer.payload : {};
  return { ...outer, ...payload };
}

function readIntent(record: UnknownRecord): RenderableIntent | null {
  const candidate = isRecord(record.intent) ? record.intent : record;
  const sourceId = readString(candidate, 'sourceId', 'unitId');
  const cells = readPositions(candidate, 'telegraphedCells', 'toCells', 'cells', 'newCells');
  if (!sourceId || !cells) return null;
  const rawThreat = readString(candidate, 'threat', 'category', 'threatCategory');
  const threat: ThreatVisual = rawThreat === 'UNBLOCKABLE_ATTACK' ? rawThreat : 'NORMAL_ATTACK';
  return {
    id: readString(candidate, 'id', 'intentId'),
    sourceId,
    threat,
    telegraphedCells: cells,
  };
}

function readString(record: UnknownRecord, ...keys: string[]): string | undefined {
  for (const key of keys) if (typeof record[key] === 'string') return record[key] as string;
  return undefined;
}

function readNumber(record: UnknownRecord, ...keys: string[]): number | undefined {
  for (const key of keys) if (typeof record[key] === 'number') return record[key] as number;
  return undefined;
}

function readPosition(record: UnknownRecord, ...keys: string[]): LogicalPosition | undefined {
  for (const key of keys) {
    const value = record[key];
    if (isPosition(value)) return { x: value.x, y: value.y };
  }
  return undefined;
}

function readPositions(record: UnknownRecord, ...keys: string[]): readonly LogicalPosition[] | undefined {
  for (const key of keys) {
    const value = record[key];
    if (Array.isArray(value) && value.every(isPosition)) {
      return value.map(({ x, y }) => ({ x, y }));
    }
  }
  return undefined;
}

function isPosition(value: unknown): value is LogicalPosition {
  return isRecord(value) && typeof value.x === 'number' && typeof value.y === 'number';
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null;
}
