import { describe, expect, it } from 'vitest';
import {
  createSlice2World,
  encounterAt,
  isEncounterVisible,
  rerollErodedTile,
  resolveNodeEncounter,
} from './world';

describe('Slice 2 world tile lifecycle', () => {
  it('creates four deterministic five-room tiles with four 4-segment corridors', () => {
    const left = createSlice2World(42);
    const right = createSlice2World(42);

    expect(right).toEqual(left);
    expect(left.tiles).toHaveLength(4);
    for (const tile of left.tiles) {
      expect(tile.rooms).toHaveLength(5);
      expect(Object.values(tile.corridors).every((corridor) => corridor.length === 4)).toBe(true);
    }
  });

  it('scouts every corridor only after the center encounter is resolved', () => {
    const tile = createSlice2World(42).tiles[0];
    expect(isEncounterVisible(tile, 'north-1')).toBe(false);

    const scouted = resolveNodeEncounter(tile, 'room-center');
    expect(scouted.corridorsScouted).toBe(true);
    expect(isEncounterVisible(scouted, 'north-1')).toBe(true);
  });

  it('rerolls on every erosion generation but never from ordinary reads', () => {
    const original = createSlice2World(42).tiles[1];
    const sameRead = encounterAt(original, 'north-3');
    expect(encounterAt(original, 'north-3')).toEqual(sameRead);

    const firstErosion = rerollErodedTile(original, 42);
    const secondErosion = rerollErodedTile(firstErosion, 42);
    expect(firstErosion.encounterGeneration).toBe(1);
    expect(secondErosion.encounterGeneration).toBe(2);
    expect(firstErosion.corridorsScouted).toBe(false);
    expect(encounterAt(secondErosion, 'room-center')?.resolved).toBe(false);
  });

  it('keeps one-time recovery rewards consumed across erosion generations', () => {
    const world = createSlice2World(42);
    const tile = world.tiles.find((candidate) => Object.values(candidate.corridors).flat().some((segment) => segment.encounter.content === 'RECOVERY_CACHE'));
    expect(tile).toBeDefined();
    const recovery = Object.values(tile!.corridors).flat().find((segment) => segment.encounter.content === 'RECOVERY_CACHE')!;
    const consumed = resolveNodeEncounter(tile!, recovery.id);
    const eroded = rerollErodedTile(consumed, world.seed);
    expect(encounterAt(eroded, recovery.id)?.content).not.toBe('RECOVERY_CACHE');
  });
});
