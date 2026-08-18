import { describe, expect, it } from 'vitest';
import {
  CHARACTER_VISUALS,
  INTENT_ICON_TEXTURES,
  SLICE_ENVIRONMENT,
  SLICE_GROUND_ATLAS,
} from '../../assets/AssetManifest';

describe('combat visual contracts', () => {
  it('gives every Slice 1 cutout an explicit foot anchor and bounded battlefield scale', () => {
    for (const key of [
      'administrator_slice_01',
      'archer_slice_01',
      'barrier_guardian_slice_01',
      'guardian_hound_slice_01',
    ]) {
      const visual = CHARACTER_VISUALS[key];
      expect(visual.footAnchor).toEqual(expect.objectContaining({
        x: expect.any(Number),
        y: expect.any(Number),
      }));
      expect(visual.footAnchor!.x).toBeGreaterThan(0);
      expect(visual.footAnchor!.x).toBeLessThan(1);
      expect(visual.footAnchor!.y).toBeGreaterThanOrEqual(0.9);
      expect(visual.footAnchor!.y).toBeLessThanOrEqual(1);
      expect(visual.displaySize!.height).toBeLessThanOrEqual(265);
    }
  });

  it('pins concrete icons for every player-facing intent category', () => {
    expect(Object.keys(INTENT_ICON_TEXTURES).sort()).toEqual([
      'ATTACK', 'INTERCEPT', 'MOVE', 'PUSH', 'SHOOT', 'STUN', 'SUMMON',
    ]);
    for (const icon of Object.values(INTENT_ICON_TEXTURES)) {
      expect(icon.url).toMatch(/^assets\/ui\/intent-[a-z-]+\.svg$/);
    }
  });

  it('uses an opaque dirt atlas as the logical ground and a tilemap-aware background', () => {
    expect(SLICE_GROUND_ATLAS.source).toMatchObject({
      type: 'SPRITESHEET',
      frameWidth: 256,
      frameHeight: 128,
    });
    expect(SLICE_ENVIRONMENT.source.url).toBe('assets/slice1/jungle-background-v3.png');
  });
});
