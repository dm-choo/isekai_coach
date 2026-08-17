import * as Phaser from 'phaser';
import type { LogicalPosition } from './GridProjector';
import { GridProjector } from './GridProjector';

export type ThreatVisual = 'NORMAL_ATTACK' | 'UNBLOCKABLE_ATTACK';

export interface RenderableIntent {
  readonly id?: string;
  readonly sourceId: string;
  readonly abilityId?: string;
  readonly direction: string;
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
    for (const intent of intents) {
      const key = intent.id ?? intent.sourceId;
      aliveKeys.add(key);
      this.remove(key);
      this.objects.set(key, this.draw(intent));
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

  private draw(intent: RenderableIntent): Phaser.GameObjects.GameObject[] {
    const result: Phaser.GameObjects.GameObject[] = [];
    intent.movementPath.forEach((cell, index) => {
      const world = this.projector.gridToWorld(cell);
      const arrow = this.scene.add.text(world.x, world.y, movementArrow(intent.direction), {
        fontFamily: '"Pretendard Variable", system-ui, sans-serif',
        fontSize: '24px',
        color: '#c48aff',
        fontStyle: 'bold',
        stroke: '#24102f',
        strokeThickness: 4,
      }).setOrigin(0.5).setDepth(19);
      result.push(arrow);
      if (index === intent.movementPath.length - 1) {
        const destination = this.scene.add
          .rectangle(world.x, world.y, this.projector.cellSize.width - 7, this.projector.cellSize.height - 7, 0xd84532, 0.13)
          .setStrokeStyle(4, 0xff8b6c, 0.96)
          .setDepth(8);
        result.push(destination);
      }
    });

    const wide = intent.abilityId === 'guardian-rupture';
    for (const cell of intent.effectCells) {
      const world = this.projector.gridToWorld(cell);
      const zone = this.scene.add
        .rectangle(
          world.x,
          world.y,
          this.projector.cellSize.width,
          this.projector.cellSize.height,
          wide ? 0xc83d24 : 0xe04a2f,
          wide ? 0.18 : 0.3,
        )
        .setStrokeStyle(wide ? 2 : 3, wide ? 0xffb04f : 0xffdf8e, wide ? 0.72 : 0.95)
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
        .text(world.x, world.y - this.projector.cellSize.height / 2 - 15, wide ? '⚠  중단 가능' : '⚠  타격 예고', {
          fontFamily: '"Pretendard Variable", system-ui, sans-serif',
          fontSize: wide ? '14px' : '13px',
          color: '#ffe8bf',
          fontStyle: 'bold',
          backgroundColor: '#521c16dd',
          stroke: '#210706',
          strokeThickness: 2,
        })
        .setPadding(9, 4)
        .setOrigin(0.5)
        .setDepth(75);
      result.push(label);
    }
    return result;
  }

  private remove(key: string): void {
    for (const object of this.objects.get(key) ?? []) {
      this.scene.tweens.killTweensOf(object);
      object.destroy();
    }
    this.objects.delete(key);
  }
}

function movementArrow(direction: string): string {
  return ({ UP: '↑', RIGHT: '→', DOWN: '↓', LEFT: '←' } as Record<string, string>)[direction] ?? '◇';
}
