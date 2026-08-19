import * as Phaser from 'phaser';
import type { Direction } from '../../combat';
import type { LogicalPosition } from './GridProjector';
import { GridProjector } from './GridProjector';

export type ThreatVisual = 'NORMAL_ATTACK' | 'UNBLOCKABLE_ATTACK';

export interface RenderableIntent {
  readonly id?: string;
  readonly sourceId: string;
  readonly abilityId?: string;
  readonly direction: Direction;
  readonly threat: ThreatVisual;
  readonly movementPath: readonly LogicalPosition[];
  readonly effectCells: readonly LogicalPosition[];
}

export class TelegraphView {
  private readonly objects = new Map<string, Phaser.GameObjects.GameObject[]>();

  public constructor(
    private readonly scene: Phaser.Scene,
    private readonly projector: GridProjector,
  ) {}

  public sync(intents: readonly RenderableIntent[]): void {
    const aliveKeys = new Set<string>();
    const sourceOrder = [...new Set(intents.map((intent) => intent.sourceId))];
    for (const intent of intents) {
      const key = intent.id ?? intent.sourceId;
      aliveKeys.add(key);
      this.remove(key);
      const sourceIndex = sourceOrder.indexOf(intent.sourceId);
      this.objects.set(key, this.draw(intent, sourceIndex));
    }
    for (const key of this.objects.keys()) {
      if (!aliveKeys.has(key)) this.remove(key);
    }
  }

  public clear(): void {
    for (const key of [...this.objects.keys()]) this.remove(key);
  }

  public pulse(): void {
    for (const objects of this.objects.values()) {
      for (const object of objects) {
        if ('setAlpha' in object) this.scene.tweens.add({ targets: object, alpha: 0.82, duration: 110, yoyo: true });
      }
    }
  }

  private draw(intent: RenderableIntent, sourceIndex: number): Phaser.GameObjects.GameObject[] {
    const result: Phaser.GameObjects.GameObject[] = [];
    const sourceColor = INTENT_SOURCE_COLORS[sourceIndex % INTENT_SOURCE_COLORS.length] ?? 0xff8b6c;
    const sourceMarker = String.fromCharCode(65 + sourceIndex);
    intent.movementPath.forEach((cell, index) => {
      const world = this.projector.gridToWorld(cell);
      const arrow = this.scene.add.text(world.x, world.y, movementArrow(intent.direction), {
        fontFamily: '"Pretendard Variable", system-ui, sans-serif',
        fontSize: '24px',
        color: `#${sourceColor.toString(16).padStart(6, '0')}`,
        fontStyle: 'bold',
        stroke: '#24102f',
        strokeThickness: 4,
      }).setOrigin(0.5).setDepth(19);
      result.push(arrow);
      if (index === intent.movementPath.length - 1) {
        const destination = this.createCellZone(world, 0xd84532, 0.13)
          .setStrokeStyle(4, sourceColor, 0.96)
          .setDepth(8);
        result.push(destination);
      }
    });

    const wide = intent.abilityId === 'guardian-rupture';
    const ground = intent.abilityId === 'goblin-bomb';
    for (const cell of intent.effectCells) {
      const world = this.projector.gridToWorld(cell);
      const zone = this.createCellZone(
          world,
          ground ? 0xd18a25 : wide ? 0xc83d24 : 0xe04a2f,
          ground ? 0.24 : wide ? 0.18 : 0.3,
        )
        .setStrokeStyle(wide ? 2 : 4, sourceColor, wide ? 0.8 : 0.98)
        .setDepth(9);
      this.scene.tweens.add({
        targets: zone,
        alpha: wide ? 0.48 : 0.72,
        duration: wide ? 640 : 420,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.InOut',
      });
      result.push(zone);
    }

    if (intent.effectCells.length > 0) {
      const topCell = intent.effectCells.reduce((left, right) => right.y < left.y ? right : left);
      const world = this.projector.gridToWorld(topCell);
      const label = this.scene.add
        .text(world.x - this.projector.cellSize.width / 2 + 15, world.y - this.projector.cellSize.height / 2 + 15, sourceMarker, {
          fontFamily: 'ui-monospace, monospace',
          fontSize: '12px',
          color: '#160a07',
          fontStyle: 'bold',
          backgroundColor: `#${sourceColor.toString(16).padStart(6, '0')}`,
          stroke: '#210706',
          strokeThickness: 1,
        })
        .setPadding(6, 4)
        .setOrigin(0.5)
        .setDepth(75);
      result.push(label);
    }
    return result;
  }

  private createCellZone(world: Readonly<{ x: number; y: number }>, color: number, alpha: number): Phaser.GameObjects.Shape {
    const polygon = this.projector.cellPolygon;
    return polygon
      ? this.scene.add.polygon(world.x, world.y, [...polygon], color, alpha)
      : this.scene.add.rectangle(world.x, world.y, this.projector.cellSize.width, this.projector.cellSize.height, color, alpha);
  }

  private remove(key: string): void {
    for (const object of this.objects.get(key) ?? []) {
      this.scene.tweens.killTweensOf(object);
      object.destroy();
    }
    this.objects.delete(key);
  }
}

const INTENT_SOURCE_COLORS = [0xff725e, 0xffc857, 0xc58cff, 0x67d7ef] as const;

function movementArrow(direction: string): string {
  return ({ UP: '↑', RIGHT: '→', DOWN: '↓', LEFT: '←' } as Record<string, string>)[direction] ?? '◇';
}
