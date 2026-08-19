import * as Phaser from 'phaser';
import {
  CHARACTER_VISUALS,
  INTENT_ICON_TEXTURES,
  SLICE_ENVIRONMENT,
  SLICE_GROUND_ATLAS,
  SUBMISSION_ENVIRONMENT,
  SUBMISSION_GROUND_ATLAS,
  VFX_VISUALS,
  type BattleVisualTheme,
  type CharacterAnimationDefinition,
  type VisualAssetSource,
} from '../../assets/AssetManifest';

/** Reads optional asset sources from the manifest. Missing sources use renderer fallbacks. */
export function preloadVisualAssets(scene: Phaser.Scene, visualTheme: BattleVisualTheme = 'SLICE'): void {
  const environment = visualTheme === 'SUBMISSION' ? SUBMISSION_ENVIRONMENT : SLICE_ENVIRONMENT;
  const groundAtlas = visualTheme === 'SUBMISSION' ? SUBMISSION_GROUND_ATLAS : SLICE_GROUND_ATLAS;
  loadSource(scene, environment.textureKey, environment.source);
  loadSource(scene, groundAtlas.textureKey, groundAtlas.source);
  for (const [visualKey, visual] of Object.entries(CHARACTER_VISUALS)) {
    if (visualTheme === 'SUBMISSION' ? !visualKey.includes('_submission_') : visualKey.includes('_submission_')) continue;
    loadSource(scene, visual.spriteKey, visual.source);
  }
  for (const visual of Object.values(VFX_VISUALS)) {
    loadSource(scene, visual.textureKey, visual.source);
  }
  for (const icon of Object.values(INTENT_ICON_TEXTURES)) {
    if (!scene.textures.exists(icon.textureKey)) {
      scene.load.svg(icon.textureKey, resolveAssetUrl(icon.url), { width: 48, height: 48 });
    }
  }
}

/** Registers clips only after Phaser has loaded the manifest's textures. */
export function registerVisualAnimations(scene: Phaser.Scene): void {
  for (const visual of Object.values(CHARACTER_VISUALS)) {
    for (const animation of Object.values(visual.animations)) {
      registerAnimation(scene, visual.spriteKey, animation);
    }
  }
  for (const visual of Object.values(VFX_VISUALS)) {
    if (visual.animation) registerAnimation(scene, visual.textureKey, visual.animation);
  }
}

function loadSource(
  scene: Phaser.Scene,
  textureKey: string,
  source: VisualAssetSource | undefined,
): void {
  if (!source || scene.textures.exists(textureKey)) return;
  const url = resolveAssetUrl(source.url);
  if (source.type === 'IMAGE') {
    scene.load.image(textureKey, url);
    return;
  }
  scene.load.spritesheet(textureKey, url, {
    frameWidth: source.frameWidth,
    frameHeight: source.frameHeight,
    margin: source.margin,
    spacing: source.spacing,
  });
}

function registerAnimation(
  scene: Phaser.Scene,
  textureKey: string,
  definition: CharacterAnimationDefinition,
): void {
  if (
    !scene.textures.exists(textureKey) ||
    !definition.frames?.length ||
    scene.anims.exists(definition.key)
  ) {
    return;
  }
  const frameRate =
    definition.frameRate ??
    Math.max(1, Math.round((definition.frames.length * 1_000) / Math.max(1, definition.durationMs)));
  scene.anims.create({
    key: definition.key,
    frames: definition.frames.map((frame) => ({ key: textureKey, frame })),
    frameRate,
    repeat: definition.repeat ?? 0,
    yoyo: definition.yoyo ?? false,
  });
}

function resolveAssetUrl(url: string): string {
  if (/^(?:[a-z]+:|\/)/i.test(url)) return url;
  return `${import.meta.env.BASE_URL}${url.replace(/^\.\//, '')}`;
}
