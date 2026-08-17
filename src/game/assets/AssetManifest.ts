export type UnitAnimationState =
  | 'idle'
  | 'move'
  | 'attack'
  | 'defend'
  | 'hit'
  | 'knockback'
  | 'death';

export interface CharacterAnimationDefinition {
  readonly key: string;
  readonly durationMs: number;
  readonly frames?: readonly number[];
  readonly frameRate?: number;
  readonly repeat?: number;
  readonly yoyo?: boolean;
}

export type VisualAssetSource =
  | {
      readonly type: 'IMAGE';
      readonly url: string;
    }
  | {
      readonly type: 'SPRITESHEET';
      readonly url: string;
      readonly frameWidth: number;
      readonly frameHeight: number;
      readonly margin?: number;
      readonly spacing?: number;
    };

export interface DisplaySize {
  readonly width: number;
  readonly height: number;
}

export interface CharacterVisualConfig {
  readonly spriteKey: string;
  /** Optional real asset. Omit it to keep the generated-shape fallback. */
  readonly source?: VisualAssetSource;
  readonly displayName: string;
  readonly displaySize?: DisplaySize;
  readonly nativeFacing?: 'LEFT' | 'RIGHT';
  readonly silhouette?: 'ADMINISTRATOR' | 'ARCHER' | 'GUARDIAN' | 'LANCER' | 'RAIDER' | 'GENERIC';
  readonly palette: {
    readonly body: number;
    readonly accent: number;
    readonly shadow: number;
  };
  readonly animations: Record<UnitAnimationState, CharacterAnimationDefinition>;
}

export interface VfxVisualConfig {
  readonly textureKey: string;
  /** Optional real asset. Omit it to keep the generated-ellipse fallback. */
  readonly source?: VisualAssetSource;
  readonly animation?: CharacterAnimationDefinition;
  readonly durationMs: number;
  readonly color: number;
}

const animationSet = (prefix: string): Record<UnitAnimationState, CharacterAnimationDefinition> => ({
  idle: { key: `${prefix}:idle`, durationMs: 0 },
  move: { key: `${prefix}:move`, durationMs: 220 },
  attack: { key: `${prefix}:attack`, durationMs: 260 },
  defend: { key: `${prefix}:defend`, durationMs: 240 },
  hit: { key: `${prefix}:hit`, durationMs: 180 },
  knockback: { key: `${prefix}:knockback`, durationMs: 260 },
  death: { key: `${prefix}:death`, durationMs: 420 },
});

/**
 * Asset paths never leak into a Scene or the combat domain. Adding a source and
 * frame ranges here is enough for the preload/animation registry and UnitView
 * adapter to replace the generated placeholder.
 */
export const CHARACTER_VISUALS: Record<string, CharacterVisualConfig> = {
  administrator_slice_01: {
    spriteKey: 'administrator_slice_01',
    source: { type: 'IMAGE', url: 'assets/slice1/administrator.png' },
    displayName: '관리자',
    displaySize: { width: 250, height: 228 },
    nativeFacing: 'RIGHT',
    silhouette: 'ADMINISTRATOR',
    palette: { body: 0x163c39, accent: 0xa8f5e5, shadow: 0x06120f },
    animations: animationSet('administrator_slice_01'),
  },
  archer_slice_01: {
    spriteKey: 'archer_slice_01',
    source: { type: 'IMAGE', url: 'assets/slice1/archer.png' },
    displayName: '원거리 동료',
    displaySize: { width: 166, height: 249 },
    nativeFacing: 'RIGHT',
    silhouette: 'ARCHER',
    palette: { body: 0x496035, accent: 0xe8bc62, shadow: 0x0d1309 },
    animations: animationSet('archer_slice_01'),
  },
  barrier_guardian_slice_01: {
    spriteKey: 'barrier_guardian_slice_01',
    source: { type: 'IMAGE', url: 'assets/slice1/barrier-guardian.png' },
    displayName: '결계 수호자',
    displaySize: { width: 250, height: 375 },
    nativeFacing: 'LEFT',
    silhouette: 'GUARDIAN',
    palette: { body: 0x3f4434, accent: 0xf17e3d, shadow: 0x080b07 },
    animations: animationSet('barrier_guardian_slice_01'),
  },
  operator_slice_01: {
    spriteKey: 'operator_slice_01',
    displayName: 'Administrator',
    silhouette: 'ADMINISTRATOR',
    palette: { body: 0x17353d, accent: 0xcdf9ff, shadow: 0x071619 },
    animations: animationSet('operator_slice_01'),
  },
  ally_lancer_slice_01: {
    spriteKey: 'ally_lancer_slice_01',
    displayName: 'Sera',
    silhouette: 'LANCER',
    palette: { body: 0x2a5361, accent: 0x9eeeff, shadow: 0x0b2027 },
    animations: animationSet('ally_lancer_slice_01'),
  },
  enemy_raider_slice_01: {
    spriteKey: 'enemy_raider_slice_01',
    displayName: 'Rift Raider',
    silhouette: 'RAIDER',
    palette: { body: 0x5f2d32, accent: 0xff7f83, shadow: 0x210d10 },
    animations: animationSet('enemy_raider_slice_01'),
  },
  student_sprite_01: {
    spriteKey: 'student_sprite_01',
    displayName: 'Student',
    palette: { body: 0x5ac8fa, accent: 0xe8fbff, shadow: 0x14556b },
    animations: animationSet('student_sprite_01'),
  },
  student_sprite_02: {
    spriteKey: 'student_sprite_02',
    displayName: 'Student B',
    palette: { body: 0x9b8cff, accent: 0xf0edff, shadow: 0x3c3472 },
    animations: animationSet('student_sprite_02'),
  },
  enemy_sprite_01: {
    spriteKey: 'enemy_sprite_01',
    displayName: 'Warrior',
    palette: { body: 0xf36b60, accent: 0xffe4df, shadow: 0x702923 },
    animations: animationSet('enemy_sprite_01'),
  },
  enemy_sprite_02: {
    spriteKey: 'enemy_sprite_02',
    displayName: 'Spearman',
    palette: { body: 0xf0a64b, accent: 0xfff0d1, shadow: 0x70461f },
    animations: animationSet('enemy_sprite_02'),
  },
};

export const SLICE_ENVIRONMENT = {
  textureKey: 'slice1_jungle_barrier_room',
  source: { type: 'IMAGE', url: 'assets/slice1/jungle-barrier-room.png' } as VisualAssetSource,
} as const;

export const VFX_VISUALS: Record<string, VfxVisualConfig> = {
  attack_fx_01: { textureKey: 'attack_fx_01', durationMs: 180, color: 0xfff0cb },
  hit_fx_01: { textureKey: 'hit_fx_01', durationMs: 180, color: 0xffffff },
};

export function getCharacterVisual(
  visualKey: string | undefined,
  faction: 'STUDENT' | 'ENEMY',
): CharacterVisualConfig {
  const fallback = faction === 'STUDENT' ? 'student_sprite_01' : 'enemy_sprite_01';
  return CHARACTER_VISUALS[visualKey ?? fallback] ?? CHARACTER_VISUALS[fallback];
}

export function getVfxVisual(vfxKey: string): VfxVisualConfig {
  return VFX_VISUALS[vfxKey] ?? VFX_VISUALS.hit_fx_01;
}
