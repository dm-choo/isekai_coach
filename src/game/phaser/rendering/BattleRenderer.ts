import * as Phaser from 'phaser';
import type { BattleState } from '../../combat';
import { getVfxVisual } from '../../assets/AssetManifest';
import { GridProjector } from './GridProjector';
import { TelegraphView, type RenderableIntent } from './TelegraphView';
import { UnitView } from './UnitView';

export class BattleRenderer {
  private readonly projector = new GridProjector();
  private readonly unitViews = new Map<string, UnitView>();
  private readonly telegraphs: TelegraphView;
  private readonly gridObjects: Phaser.GameObjects.GameObject[] = [];
  private readonly title: Phaser.GameObjects.Text;
  private readonly turnLabel: Phaser.GameObjects.Text;
  private readonly phaseLabel: Phaser.GameObjects.Text;

  public constructor(private readonly scene: Phaser.Scene) {
    scene.cameras.main.setBackgroundColor('#09111c');
    this.title = scene.add.text(34, 26, 'COMBAT SANDBOX', {
      fontFamily: 'ui-monospace, monospace',
      fontSize: '19px',
      color: '#d8e8f7',
      fontStyle: 'bold',
      letterSpacing: 2,
    });
    this.turnLabel = scene.add.text(34, 56, 'TURN —', {
      fontFamily: 'ui-monospace, monospace',
      fontSize: '14px',
      color: '#7fd7ff',
    });
    this.phaseLabel = scene.add.text(34, 79, 'READY', {
      fontFamily: 'ui-monospace, monospace',
      fontSize: '12px',
      color: '#8f9dae',
    });
    this.title.setDepth(100);
    this.turnLabel.setDepth(100);
    this.phaseLabel.setDepth(100);
    this.telegraphs = new TelegraphView(scene, this.projector);
  }

  public reset(state: BattleState): void {
    this.clearDynamicObjects();
    this.drawGrid(state.map.width, state.map.height);
    this.turnLabel.setText(`TURN ${state.turn}`);
    this.phaseLabel.setText('READY · INTENT IS LOCKED AFTER DECLARATION');

    for (const unit of state.units) {
      const world = this.projector.gridToWorld(unit.position);
      this.unitViews.set(unit.id, new UnitView(this.scene, unit, world));
    }
    this.telegraphs.sync(state.intents);
  }

  public sync(state: BattleState): void {
    this.turnLabel.setText(`TURN ${state.turn}`);
    const liveIds = new Set<string>();
    for (const unit of state.units) {
      liveIds.add(unit.id);
      let view = this.unitViews.get(unit.id);
      if (!view) {
        view = new UnitView(this.scene, unit, this.projector.gridToWorld(unit.position));
        this.unitViews.set(unit.id, view);
      }
      view.setWorldPosition(this.projector.gridToWorld(unit.position));
      view.update(unit);
      if (unit.hp <= 0) view.setAnimationState('death');
    }
    for (const [id, view] of this.unitViews) {
      if (!liveIds.has(id)) {
        view.destroy();
        this.unitViews.delete(id);
      }
    }
    this.telegraphs.sync(state.intents);
  }

  public setPhase(label: string): void {
    this.phaseLabel.setText(label.replaceAll('_', ' '));
  }

  public setTurn(turn: number): void {
    this.turnLabel.setText(`TURN ${turn}`);
  }

  public getUnit(id: string): UnitView | undefined {
    return this.unitViews.get(id);
  }

  public setUnitHp(id: string, hp: number, maxHp?: number): void {
    this.unitViews.get(id)?.setHp(hp, maxHp);
  }

  public setUnitAp(id: string, ap: number, maxAp: number): void {
    this.unitViews.get(id)?.setAp(ap, maxAp, true);
  }

  public moveUnit(
    id: string,
    to: Readonly<{ x: number; y: number }>,
    duration: number,
    signal: AbortSignal,
  ): Promise<void> {
    const view = this.unitViews.get(id);
    if (!view || signal.aborted) return Promise.resolve();
    const world = this.projector.gridToWorld(to);
    if (duration <= 0) {
      view.setWorldPosition(world);
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        signal.removeEventListener('abort', abort);
        resolve();
      };
      const tween = this.scene.tweens.add({
        targets: view.container,
        x: world.x,
        y: world.y,
        duration,
        ease: 'Cubic.Out',
        onComplete: finish,
        onStop: finish,
      });
      const abort = () => {
        tween.stop();
        finish();
      };
      signal.addEventListener('abort', abort, { once: true });
    });
  }

  public pulseUnit(id: string, duration: number, signal: AbortSignal): Promise<void> {
    const view = this.unitViews.get(id);
    if (!view || duration <= 0 || signal.aborted) return Promise.resolve();
    return new Promise((resolve) => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        signal.removeEventListener('abort', abort);
        resolve();
      };
      const tween = this.scene.tweens.add({
        targets: view.container,
        scaleX: 1.12,
        scaleY: 1.12,
        duration: duration / 2,
        yoyo: true,
        ease: 'Sine.InOut',
        onComplete: finish,
        onStop: finish,
      });
      const abort = () => {
        tween.stop();
        finish();
      };
      signal.addEventListener('abort', abort, { once: true });
    });
  }

  public flashUnit(id: string, duration: number, signal: AbortSignal): Promise<void> {
    const view = this.unitViews.get(id);
    if (!view || duration <= 0 || signal.aborted) return Promise.resolve();
    return new Promise((resolve) => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        signal.removeEventListener('abort', abort);
        resolve();
      };
      const tween = this.scene.tweens.add({
        targets: view.container,
        alpha: 0.2,
        duration: Math.max(40, duration / 3),
        yoyo: true,
        repeat: 1,
        onComplete: finish,
        onStop: finish,
      });
      const abort = () => {
        tween.stop();
        finish();
      };
      signal.addEventListener('abort', abort, { once: true });
    });
  }

  public showVfx(
    id: string,
    vfxKey: string,
    duration: number,
    signal: AbortSignal,
  ): Promise<void> {
    const view = this.unitViews.get(id);
    if (!view || signal.aborted) return Promise.resolve();
    const visual = getVfxVisual(vfxKey);
    let effect: Phaser.GameObjects.Sprite | Phaser.GameObjects.Ellipse;
    if (this.scene.textures.exists(visual.textureKey)) {
      effect = this.scene.add.sprite(
        view.container.x,
        view.container.y - 4,
        visual.textureKey,
      );
      if (visual.animation && this.scene.anims.exists(visual.animation.key)) {
        effect.play(visual.animation.key);
      }
    } else {
      effect = this.scene.add
        .ellipse(view.container.x, view.container.y - 4, 26, 26, visual.color, 0.12)
        .setStrokeStyle(4, visual.color, 0.95);
    }
    effect.setDepth(70);
    if (duration <= 0) {
      effect.destroy();
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        signal.removeEventListener('abort', abort);
        effect.destroy();
        resolve();
      };
      const tween = this.scene.tweens.add({
        targets: effect,
        scaleX: 2.4,
        scaleY: 2.4,
        alpha: 0,
        angle: 35,
        duration: Math.min(duration, visual.durationMs),
        ease: 'Cubic.Out',
        onComplete: finish,
        onStop: finish,
      });
      const abort = () => {
        tween.stop();
        finish();
      };
      signal.addEventListener('abort', abort, { once: true });
    });
  }

  public showDamage(
    id: string,
    amount: number,
    blocked: boolean,
    duration: number,
    signal: AbortSignal,
  ): Promise<void> {
    const view = this.unitViews.get(id);
    if (!view || signal.aborted) return Promise.resolve();
    const label = this.scene.add
      .text(view.container.x, view.container.y - 55, blocked ? 'BLOCKED' : `-${amount}`, {
        fontFamily: 'ui-monospace, monospace',
        fontSize: blocked ? '13px' : '20px',
        color: blocked ? '#8fd7ff' : '#fff0e8',
        fontStyle: 'bold',
        stroke: '#25101b',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(120);
    if (duration <= 0) {
      label.destroy();
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        signal.removeEventListener('abort', abort);
        label.destroy();
        resolve();
      };
      const tween = this.scene.tweens.add({
        targets: label,
        y: label.y - 32,
        alpha: 0,
        duration,
        ease: 'Cubic.Out',
        onComplete: finish,
        onStop: finish,
      });
      const abort = () => {
        tween.stop();
        finish();
      };
      signal.addEventListener('abort', abort, { once: true });
    });
  }

  public wait(duration: number, signal: AbortSignal): Promise<void> {
    if (duration <= 0 || signal.aborted) return Promise.resolve();
    return new Promise((resolve) => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        signal.removeEventListener('abort', abort);
        resolve();
      };
      const timer = this.scene.time.delayedCall(duration, finish);
      const abort = () => {
        timer.remove(false);
        finish();
      };
      signal.addEventListener('abort', abort, { once: true });
    });
  }

  public syncTelegraphs(intents: readonly RenderableIntent[]): void {
    this.telegraphs.sync(intents);
  }

  public clearTelegraphs(): void {
    this.telegraphs.clear();
  }

  public destroy(): void {
    this.clearDynamicObjects();
    this.title.destroy();
    this.turnLabel.destroy();
    this.phaseLabel.destroy();
  }

  private drawGrid(width: number, height: number): void {
    const size = this.projector.cellSize;
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const world = this.projector.gridToWorld({ x, y });
        const cell = this.scene.add
          .rectangle(world.x, world.y, size.width, size.height, (x + y) % 2 ? 0x152537 : 0x192c40, 0.88)
          .setStrokeStyle(1, 0x395066, 0.9)
          .setDepth(2 + y);
        const coordinate = this.scene.add
          .text(world.x - size.width / 2 + 5, world.y - size.height / 2 + 4, `${x},${y}`, {
            fontFamily: 'ui-monospace, monospace',
            fontSize: '8px',
            color: '#557087',
          })
          .setDepth(3 + y);
        this.gridObjects.push(cell, coordinate);
      }
    }
  }

  private clearDynamicObjects(): void {
    this.scene.tweens.killAll();
    for (const view of this.unitViews.values()) view.destroy();
    this.unitViews.clear();
    this.telegraphs.clear();
    for (const object of this.gridObjects) object.destroy();
    this.gridObjects.length = 0;
  }
}
