import * as Phaser from 'phaser';
import { getAbility, type BattleState, type Unit } from '../../combat';
import {
  getVfxVisual,
  SLICE_ENVIRONMENT,
  SLICE_GROUND_ATLAS,
} from '../../assets/AssetManifest';
import type { BattlePredictionPresentation } from '../bridge/PresentationPort';
import { GridProjector } from './GridProjector';
import { TelegraphView, type RenderableIntent } from './TelegraphView';
import { UnitView } from './UnitView';

export class BattleRenderer {
  private readonly projector = new GridProjector();
  private readonly unitViews = new Map<string, UnitView>();
  private readonly telegraphs: TelegraphView;
  private readonly groundObjects: Phaser.GameObjects.GameObject[] = [];
  private readonly predictionObjects: Phaser.GameObjects.GameObject[] = [];
  private readonly occupancyObjects: Phaser.GameObjects.GameObject[] = [];
  private readonly ambientObjects: Phaser.GameObjects.GameObject[] = [];
  private readonly previewIntentUnitIds = new Set<string>();
  private currentState: BattleState | null = null;

  public constructor(private readonly scene: Phaser.Scene) {
    scene.cameras.main.setBackgroundColor('#071009');
    const background = scene.add.image(640, 360, SLICE_ENVIRONMENT.textureKey)
      .setDisplaySize(1280, 720)
      .setDepth(-100);
    this.ambientObjects.push(background);

    const shade = scene.add.graphics().setDepth(-90);
    shade.fillGradientStyle(0x020603, 0x020603, 0x07100a, 0x07100a, 0.35, 0.35, 0.04, 0.04);
    shade.fillRect(0, 0, 1280, 720);
    this.ambientObjects.push(shade);
    this.createFireflies();
    this.telegraphs = new TelegraphView(scene, this.projector);
  }

  public reset(state: BattleState): void {
    this.currentState = state;
    this.clearDynamicObjects();
    this.drawGroundCues(state);
    for (const unit of state.units) {
      this.unitViews.set(unit.id, new UnitView(this.scene, unit, this.projector.gridToWorld(unit.position)));
    }
    this.telegraphs.sync(state.intents);
    this.drawOccupancy(state);
    this.syncIntentBadges(state);
  }

  public sync(state: BattleState): void {
    this.currentState = state;
    const liveIds = new Set<string>();
    for (const unit of state.units) {
      liveIds.add(unit.id);
      let view = this.unitViews.get(unit.id);
      if (!view) {
        view = new UnitView(this.scene, unit, this.projector.gridToWorld(unit.position));
        this.unitViews.set(unit.id, view);
      }
      view.setWorldPosition(this.projector.gridToWorld(unit.position), unit.position.y);
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
    this.drawOccupancy(state);
    this.syncIntentBadges(state);
  }

  public setPhase(_label: string): void {}

  public setTurn(_turn: number): void {}

  public setPrediction(prediction: BattlePredictionPresentation | null): void {
    for (const object of this.predictionObjects) object.destroy();
    this.predictionObjects.length = 0;
    for (const unitId of this.previewIntentUnitIds) this.unitViews.get(unitId)?.setIntentPreview([]);
    this.previewIntentUnitIds.clear();
    this.telegraphs.sync(prediction?.previewIntents ?? this.currentState?.intents ?? []);
    if (!prediction) return;
    for (const layer of [prediction.current, prediction.candidate]) {
      if (!layer) continue;
      for (const cell of layer.cells) {
        const world = this.projector.gridToWorld(cell);
        const zone = this.scene.add
          .rectangle(world.x, world.y, this.projector.cellSize.width, this.projector.cellSize.height, 0x70e8d1, 0.1)
          .setStrokeStyle(2, 0xb9fff1, 0.82)
          .setDepth(14);
        this.predictionObjects.push(zone);
      }
    }
    for (const destination of prediction.unitPositions ?? []) {
      const world = this.projector.gridToWorld(destination.position);
      const zone = this.scene.add
        .rectangle(world.x, world.y, this.projector.cellSize.width - 8, this.projector.cellSize.height - 8, 0x7fe7d2, 0.08)
        .setStrokeStyle(3, 0xc5fff3, 0.95)
        .setDepth(14);
      const marker = this.scene.add.text(world.x, world.y, '◇', {
        fontFamily: 'Georgia, serif', fontSize: '25px', color: '#d7fff7', stroke: '#10241f', strokeThickness: 4,
      }).setOrigin(0.5).setDepth(15);
      this.predictionObjects.push(zone, marker);
    }
    for (const intent of prediction.intents ?? []) {
      this.previewIntentUnitIds.add(intent.unitId);
      this.unitViews.get(intent.unitId)?.setIntentPreview(intent.steps);
      for (const step of intent.steps) {
        for (const cell of step.movementPath) {
          const world = this.projector.gridToWorld(cell);
          const marker = this.scene.add
            .rectangle(world.x, world.y, this.projector.cellSize.width - 6, this.projector.cellSize.height - 6, 0x64d8c6, 0.08)
            .setStrokeStyle(2, 0x9af6e5, 0.72)
            .setDepth(13);
          this.predictionObjects.push(marker);
        }
        for (const cell of step.effectCells) {
          const world = this.projector.gridToWorld(cell);
          const zone = this.scene.add
            .rectangle(world.x, world.y, this.projector.cellSize.width - 6, this.projector.cellSize.height - 6, 0xe5bc57, 0.13)
            .setStrokeStyle(2, 0xffe29a, 0.8)
            .setDepth(13);
          this.predictionObjects.push(zone);
        }
      }
    }
  }

  public summonUnit(unit: Unit, duration: number, signal: AbortSignal): Promise<void> {
    if (signal.aborted || this.unitViews.has(unit.id)) return Promise.resolve();
    const view = new UnitView(this.scene, unit, this.projector.gridToWorld(unit.position));
    view.container.setAlpha(0).setScale(0.45);
    this.unitViews.set(unit.id, view);
    if (duration <= 0) {
      view.container.setAlpha(1).setScale(1);
      return Promise.resolve();
    }
    const ring = this.scene.add.circle(view.container.x, view.container.y, 28, 0xe56b3f, 0.08)
      .setStrokeStyle(4, 0xffb270, 0.86)
      .setDepth(88);
    this.scene.tweens.add({ targets: ring, scale: 2.6, alpha: 0, duration, onComplete: () => ring.destroy() });
    const tween = this.scene.tweens.add({
      targets: view.container,
      alpha: 1,
      scale: 1,
      duration,
      ease: 'Back.Out',
    });
    return this.awaitTween(tween, signal, () => ring.destroy());
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
    view.setGridDepth(to.y);
    const dust = this.scene.add.ellipse(view.container.x, view.container.y + 20, 58, 18, 0xb68a55, 0.28).setDepth(22);
    if (duration <= 0) {
      view.setWorldPosition(world, to.y);
      dust.destroy();
      return Promise.resolve();
    }
    const tween = this.scene.tweens.add({
      targets: view.container,
      x: world.x,
      y: world.y,
      duration,
      ease: 'Cubic.InOut',
    });
    this.scene.tweens.add({ targets: dust, scaleX: 1.8, alpha: 0, duration, onComplete: () => dust.destroy() });
    return this.awaitTween(tween, signal);
  }

  public async animateAbility(
    sourceId: string,
    abilityId: string,
    targetId: string | undefined,
    duration: number,
    signal: AbortSignal,
  ): Promise<void> {
    const source = this.unitViews.get(sourceId);
    const target = targetId ? this.unitViews.get(targetId) : undefined;
    if (!source || signal.aborted) return;
    const camera = this.scene.cameras.main;
    const focusX = target ? (source.container.x + target.container.x) / 2 : source.container.x;
    const focusY = target ? (source.container.y + target.container.y) / 2 - 60 : source.container.y - 70;
    camera.pan(focusX, focusY, Math.min(180, duration / 2), 'Sine.easeOut');
    camera.zoomTo(1.065, Math.min(180, duration / 2), 'Sine.easeOut');

    if (abilityId === 'shoot' && target) {
      await this.animateProjectile(source, target, Math.max(320, duration), signal);
    } else if (abilityId === 'slam' && target) {
      await this.animateSlam(source, target, Math.max(390, duration), signal);
    } else if ((abilityId === 'push' || abilityId === 'minion-charge') && target) {
      await this.animateLunge(source, target, Math.max(300, duration), 38, signal);
    } else if (abilityId === 'guardian-crush') {
      await this.animateLunge(source, target, Math.max(370, duration), 48, signal);
      camera.shake(180, 0.008);
    } else if (abilityId === 'guardian-rupture') {
      this.telegraphs.pulse();
      const rupture = this.scene.add.ellipse(650, 535, 760, 165, 0xd74b25, 0.17)
        .setStrokeStyle(5, 0xffb04f, 0.76)
        .setDepth(24);
      const tween = this.scene.tweens.add({ targets: rupture, scaleX: 1.14, scaleY: 1.18, alpha: 0, duration: Math.max(430, duration) });
      camera.shake(320, 0.014);
      await this.awaitTween(tween, signal, () => rupture.destroy());
    } else {
      await this.pulseUnit(sourceId, duration, signal);
    }

    if (!signal.aborted) {
      camera.pan(640, 360, 220, 'Sine.easeInOut');
      camera.zoomTo(1, 220, 'Sine.easeInOut');
    }
  }

  public pulseUnit(id: string, duration: number, signal: AbortSignal): Promise<void> {
    const view = this.unitViews.get(id);
    if (!view || duration <= 0 || signal.aborted) return Promise.resolve();
    const tween = this.scene.tweens.add({
      targets: view.container,
      scaleX: 1.05,
      scaleY: 1.05,
      duration: duration / 2,
      yoyo: true,
      ease: 'Sine.InOut',
    });
    return this.awaitTween(tween, signal);
  }

  public flashUnit(id: string, duration: number, signal: AbortSignal): Promise<void> {
    const view = this.unitViews.get(id);
    if (!view || duration <= 0 || signal.aborted) return Promise.resolve();
    const tween = this.scene.tweens.add({
      targets: view.container,
      alpha: 0.26,
      duration: Math.max(45, duration / 4),
      yoyo: true,
      repeat: 2,
    });
    this.scene.cameras.main.shake(Math.min(duration, 220), 0.006);
    return this.awaitTween(tween, signal);
  }

  public showVfx(id: string, vfxKey: string, duration: number, signal: AbortSignal): Promise<void> {
    const view = this.unitViews.get(id);
    if (!view || signal.aborted) return Promise.resolve();
    const visual = getVfxVisual(vfxKey);
    const effect = this.scene.add
      .ellipse(view.container.x, view.container.y - 36, 28, 28, visual.color, 0.14)
      .setStrokeStyle(4, visual.color, 0.94)
      .setDepth(80);
    const tween = this.scene.tweens.add({
      targets: effect,
      scaleX: 2.7,
      scaleY: 2.7,
      alpha: 0,
      duration: Math.max(1, Math.min(duration, visual.durationMs)),
      ease: 'Cubic.Out',
    });
    return this.awaitTween(tween, signal, () => effect.destroy());
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
    const label = this.scene.add.text(view.container.x, view.container.y - 190, blocked ? '방어' : `-${amount}`, {
      fontFamily: '"Pretendard Variable", system-ui, sans-serif',
      fontSize: blocked ? '18px' : '34px',
      color: blocked ? '#b6f2e4' : '#fff0c9',
      fontStyle: 'bold',
      stroke: '#2a0c07',
      strokeThickness: 7,
    }).setOrigin(0.5).setDepth(130);
    const tween = this.scene.tweens.add({
      targets: label,
      y: label.y - 44,
      scale: 1.18,
      alpha: 0,
      duration,
      ease: 'Cubic.Out',
    });
    return this.awaitTween(tween, signal, () => label.destroy());
  }

  public showStatus(id: string, labelText: string, duration: number, signal: AbortSignal): Promise<void> {
    const view = this.unitViews.get(id);
    if (!view || signal.aborted) return Promise.resolve();
    const label = this.scene.add.text(view.container.x, view.container.y - 245, labelText, {
      fontFamily: '"Pretendard Variable", system-ui, sans-serif',
      fontSize: '22px',
      color: '#ffe46f',
      fontStyle: 'bold',
      backgroundColor: '#33270ddd',
      stroke: '#130e02',
      strokeThickness: 4,
    }).setPadding(12, 5).setOrigin(0.5).setDepth(132);
    const tween = this.scene.tweens.add({ targets: label, y: label.y - 25, alpha: 0, duration });
    return this.awaitTween(tween, signal, () => label.destroy());
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

  public async playSealUnlock(signal: AbortSignal): Promise<void> {
    if (signal.aborted) return;
    const camera = this.scene.cameras.main;
    camera.pan(1_000, 270, 500, 'Sine.easeInOut');
    camera.zoomTo(1.2, 500, 'Sine.easeInOut');
    const rings: Phaser.GameObjects.Arc[] = [];
    for (let index = 0; index < 4; index += 1) {
      const ring = this.scene.add.circle(1_006, 274, 36 + index * 18, 0x7dffe5, 0.025)
        .setStrokeStyle(4 - index * 0.5, 0xb8fff2, 0.8 - index * 0.12)
        .setDepth(120);
      rings.push(ring);
      this.scene.tweens.add({ targets: ring, scale: 1.42, alpha: 0, delay: index * 150, duration: 900, repeat: 1 });
    }
    const light = this.scene.add.circle(1_006, 274, 12, 0xd8fff7, 0.95).setDepth(121);
    const tween = this.scene.tweens.add({ targets: light, scale: 7, alpha: 0.08, duration: 1_250, ease: 'Cubic.Out' });
    await this.awaitTween(tween, signal, () => {
      light.destroy();
      for (const ring of rings) ring.destroy();
    });
  }

  public destroy(): void {
    this.clearDynamicObjects();
    for (const object of this.ambientObjects) object.destroy();
    this.ambientObjects.length = 0;
  }

  private async animateProjectile(
    source: UnitView,
    target: UnitView,
    duration: number,
    signal: AbortSignal,
  ): Promise<void> {
    const startX = source.container.x + 42;
    const startY = source.container.y - 90;
    const endX = target.container.x - 32;
    const endY = target.container.y - 105;
    const angle = Phaser.Math.RadToDeg(Math.atan2(endY - startY, endX - startX));
    const arrow = this.scene.add.container(startX, startY).setDepth(105).setAngle(angle);
    const shaft = this.scene.add.rectangle(0, 0, 54, 3, 0xf2dfab, 1);
    const head = this.scene.add.triangle(29, 0, 0, -6, 10, 0, 0, 6, 0xfff1bc, 1);
    arrow.add([shaft, head]);
    const trail = this.scene.add.line(0, 0, startX, startY, endX, endY, 0xf6d885, 0.18).setOrigin(0).setDepth(103);
    const draw = this.scene.tweens.add({ targets: source.container, x: source.container.x - 7, duration: 100, yoyo: true });
    await this.awaitTween(draw, signal);
    const flight = this.scene.tweens.add({ targets: arrow, x: endX, y: endY, duration: Math.max(180, duration * 0.62), ease: 'Cubic.In' });
    await this.awaitTween(flight, signal, () => {
      arrow.destroy(true);
      trail.destroy();
    });
  }

  private async animateSlam(
    source: UnitView,
    target: UnitView,
    duration: number,
    signal: AbortSignal,
  ): Promise<void> {
    const originY = source.container.y;
    const windup = this.scene.tweens.add({ targets: source.container, y: originY - 34, angle: -5, duration: duration * 0.35, ease: 'Cubic.Out' });
    await this.awaitTween(windup, signal);
    const impact = this.scene.tweens.add({ targets: source.container, y: originY + 2, angle: 2, duration: duration * 0.25, ease: 'Cubic.In' });
    const wave = this.scene.add.ellipse(target.container.x, target.container.y + 18, 52, 20, 0xffd05e, 0.32)
      .setStrokeStyle(5, 0xffe99c, 0.9)
      .setDepth(72);
    this.scene.tweens.add({ targets: wave, scaleX: 3.2, scaleY: 2.3, alpha: 0, duration: duration * 0.7, onComplete: () => wave.destroy() });
    this.scene.cameras.main.shake(260, 0.012);
    await this.awaitTween(impact, signal);
    source.container.setAngle(0).setY(originY);
  }

  private async animateLunge(
    source: UnitView,
    target: UnitView | undefined,
    duration: number,
    distance: number,
    signal: AbortSignal,
  ): Promise<void> {
    const originX = source.container.x;
    const direction = target ? Math.sign(target.container.x - source.container.x) || 1 : -1;
    const strike = this.scene.tweens.add({
      targets: source.container,
      x: originX + direction * distance,
      scaleX: 1.07,
      duration: duration * 0.42,
      yoyo: true,
      ease: 'Cubic.InOut',
    });
    const arc = this.scene.add.arc(
      originX + direction * distance,
      source.container.y - 72,
      58,
      direction > 0 ? 290 : 110,
      direction > 0 ? 70 : 250,
      false,
      0xffd36f,
      0.08,
    ).setStrokeStyle(7, 0xffe5a5, 0.78).setDepth(94);
    this.scene.tweens.add({ targets: arc, scale: 1.35, alpha: 0, duration: duration * 0.7, onComplete: () => arc.destroy() });
    await this.awaitTween(strike, signal);
    source.container.setX(originX).setScale(1);
  }

  private drawGroundCues(state: BattleState): void {
    const atlasExists = this.scene.textures.exists(SLICE_GROUND_ATLAS.textureKey);
    for (let x = 0; x < state.map.width; x += 1) {
      for (let y = 0; y < state.map.height; y += 1) {
        const world = this.projector.gridToWorld({ x, y });
        if (atlasExists) {
          const tile = this.scene.add.image(world.x, world.y, SLICE_GROUND_ATLAS.textureKey, (x + y * 2) % 4)
            .setDisplaySize(this.projector.cellSize.width, this.projector.cellSize.height)
            .setAlpha(0.9)
            .setDepth(2);
          this.groundObjects.push(tile);
        } else {
          const tile = this.scene.add.rectangle(
            world.x,
            world.y,
            this.projector.cellSize.width,
            this.projector.cellSize.height,
            (x + y) % 2 === 0 ? 0x26301b : 0x202919,
            0.9,
          ).setDepth(2);
          this.groundObjects.push(tile);
        }
        const border = this.scene.add.rectangle(
          world.x,
          world.y,
          this.projector.cellSize.width,
          this.projector.cellSize.height,
          0x000000,
          0,
        ).setStrokeStyle(1, 0xb3ba86, 0.14).setDepth(3);
        this.groundObjects.push(border);
      }
    }
  }

  private drawOccupancy(state: BattleState): void {
    for (const object of this.occupancyObjects) object.destroy();
    this.occupancyObjects.length = 0;
    for (const unit of state.units.filter((candidate) => candidate.hp > 0)) {
      const world = this.projector.gridToWorld(unit.position);
      const ally = unit.faction === 'STUDENT';
      const outline = this.scene.add.rectangle(
        world.x,
        world.y,
        this.projector.cellSize.width - 4,
        this.projector.cellSize.height - 4,
        ally ? 0x448fd9 : 0xc8473d,
        0.05,
      ).setStrokeStyle(3, ally ? 0x78c8ff : 0xff7767, 0.9).setDepth(12);
      this.occupancyObjects.push(outline);
    }
  }

  private syncIntentBadges(state: BattleState): void {
    const intentSources = new Set(state.intents.map((intent) => intent.sourceId));
    for (const [unitId, view] of this.unitViews) {
      if (!this.previewIntentUnitIds.has(unitId) && !intentSources.has(unitId)) view.setIntentPreview([]);
    }
    for (const intent of state.intents) {
      const ability = intent.abilityId ? getAbility(intent.abilityId) : undefined;
      const steps = [];
      if (intent.movementPath.length > 0) {
        steps.push({ id: `${intent.id}:move`, label: '이동', glyph: '↝' });
      }
      if (ability) {
        const damage = ability.effects.find((effect) => effect.type === 'DAMAGE');
        steps.push({
          id: `${intent.id}:ability`,
          label: ability.name,
          glyph: intentGlyph(ability.id),
          damage: damage?.type === 'DAMAGE' ? damage.amount : undefined,
        });
      }
      this.unitViews.get(intent.sourceId)?.setIntentPreview(steps);
    }
  }

  private createFireflies(): void {
    for (let index = 0; index < 18; index += 1) {
      const firefly = this.scene.add.circle(
        60 + ((index * 173) % 1_150),
        100 + ((index * 97) % 310),
        index % 3 === 0 ? 2 : 1.2,
        0xd9ef91,
        0.25 + (index % 4) * 0.08,
      ).setDepth(-70);
      this.scene.tweens.add({
        targets: firefly,
        x: firefly.x + 12 + (index % 5) * 4,
        y: firefly.y - 10 - (index % 3) * 7,
        alpha: 0.08,
        duration: 1_800 + (index % 7) * 230,
        yoyo: true,
        repeat: -1,
        delay: index * 90,
      });
      this.ambientObjects.push(firefly);
    }
  }

  private awaitTween(
    tween: Phaser.Tweens.Tween,
    signal: AbortSignal,
    cleanup?: () => void,
  ): Promise<void> {
    if (signal.aborted) {
      tween.stop();
      cleanup?.();
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        signal.removeEventListener('abort', abort);
        cleanup?.();
        resolve();
      };
      tween.once(Phaser.Tweens.Events.TWEEN_COMPLETE, finish);
      tween.once(Phaser.Tweens.Events.TWEEN_STOP, finish);
      const abort = () => {
        tween.stop();
        finish();
      };
      signal.addEventListener('abort', abort, { once: true });
    });
  }

  private clearDynamicObjects(): void {
    this.scene.tweens.killTweensOf([...this.unitViews.values()].map((view) => view.container));
    for (const view of this.unitViews.values()) view.destroy();
    this.unitViews.clear();
    this.telegraphs.clear();
    this.setPrediction(null);
    for (const object of this.groundObjects) object.destroy();
    this.groundObjects.length = 0;
    for (const object of this.occupancyObjects) object.destroy();
    this.occupancyObjects.length = 0;
  }
}

function intentGlyph(abilityId: string): string {
  if (abilityId === 'guardian-crush' || abilityId === 'slam') return '↓';
  if (abilityId === 'guardian-rupture') return '◉';
  if (abilityId === 'guardian-summon') return '+';
  if (abilityId === 'minion-charge' || abilityId === 'push') return '»';
  if (abilityId === 'shoot') return '➶';
  return '◆';
}
