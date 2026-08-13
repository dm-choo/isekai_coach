import * as Phaser from 'phaser';
import type { LogicalPosition } from './GridProjector';
import { GridProjector } from './GridProjector';

export type ThreatVisual = 'NORMAL_ATTACK' | 'UNBLOCKABLE_ATTACK';

export interface RenderableIntent {
  readonly id?: string;
  readonly sourceId: string;
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

  private draw(intent: RenderableIntent): Phaser.GameObjects.GameObject[] {
    const result: Phaser.GameObjects.GameObject[] = [];
    const unblockable = intent.threat === 'UNBLOCKABLE_ATTACK';
    const cellSize = this.projector.cellSize;

    for (const [index, cell] of intent.movementPath.entries()) {
      const world = this.projector.gridToWorld(cell);
      const destination = this.scene.add
        .rectangle(world.x, world.y, cellSize.width - 10, cellSize.height - 12, 0x4bc8e8, 0.08)
        .setStrokeStyle(2, 0x7fe7ff, 0.9)
        .setDepth(7);
      const arrow = this.scene.add
        .text(world.x, world.y, movementArrow(intent.direction), {
          fontFamily: 'ui-monospace, monospace',
          fontSize: '22px',
          color: '#a8f0ff',
          fontStyle: 'bold',
        })
        .setOrigin(0.5)
        .setAlpha(Math.min(1, 0.65 + index * 0.1))
        .setDepth(8);
      result.push(destination, arrow);
    }

    for (const cell of intent.effectCells) {
      const world = this.projector.gridToWorld(cell);
      const zone = this.scene.add
        .rectangle(
          world.x,
          world.y,
          cellSize.width - 6,
          cellSize.height - 8,
          unblockable ? 0xc236d6 : 0xef3f4f,
          0.26,
        )
        .setDepth(7);
      zone.setStrokeStyle(unblockable ? 4 : 2, unblockable ? 0xf6b8ff : 0xff8e8e, 0.95);
      result.push(zone);

      if (unblockable) {
        // A broken-shield-like X and hatch pattern distinguish this without color.
        const hatch = this.scene.add.graphics().setDepth(8);
        hatch.lineStyle(2, 0xf6b8ff, 0.5);
        for (let offset = -24; offset <= 24; offset += 12) {
          hatch.lineBetween(
            world.x + offset - 10,
            world.y + cellSize.height / 2 - 7,
            world.x + offset + 10,
            world.y - cellSize.height / 2 + 7,
          );
        }
        result.push(hatch);
        const icon = this.scene.add
          .text(world.x + 20, world.y - 22, '⛨×', {
            align: 'center',
            fontFamily: 'system-ui, sans-serif',
            fontSize: '14px',
            color: '#ffe2ff',
            fontStyle: 'bold',
            backgroundColor: '#5d1768',
          })
          .setOrigin(0.5)
          .setPadding(3, 1)
          .setDepth(80);
        result.push(icon);
      } else {
        const icon = this.scene.add
          .text(world.x, world.y, '!', {
            fontFamily: 'ui-monospace, monospace',
            fontSize: '18px',
            color: '#ffc0c0',
            fontStyle: 'bold',
          })
          .setOrigin(0.5)
          .setDepth(8);
        result.push(icon);
      }
    }
    return result;
  }

  private remove(key: string): void {
    for (const object of this.objects.get(key) ?? []) object.destroy();
    this.objects.delete(key);
  }
}

function movementArrow(direction: string): string {
  return ({ UP: '↑', RIGHT: '→', DOWN: '↓', LEFT: '←' } as Record<string, string>)[direction] ?? '◇';
}
