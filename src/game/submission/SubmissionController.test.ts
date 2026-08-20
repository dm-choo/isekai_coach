import { describe, expect, it } from 'vitest';
import { applySubmissionDefeatCost, applySubmissionRest, parseSubmissionSave, SubmissionController } from './SubmissionController';
import { computeBarrierContour, createSubmissionWorld, incorporateTile, updateSubmissionTile, type SubmissionWorldState } from './world';

describe('SubmissionController direct exploration', () => {
  it('starts alone and turns world movement into the first approach', () => {
    const controller = new SubmissionController();
    expect(controller.getSnapshot()).toMatchObject({
      mode: 'AWAKENING', prologueProgress: 0, companionJoined: false, worldTime: '10:00',
    });
    controller.advancePrologue();
    expect(controller.getSnapshot()).toMatchObject({ mode: 'SOLO_APPROACH', prologueProgress: 5 });
    controller.destroy();
  });

  it('advances shared world time by two minutes for the guarded first 100m', () => {
    const controller = new SubmissionController();
    for (let step = 0; step < 19; step += 1) controller.advancePrologue();
    expect(controller.getSnapshot()).toMatchObject({ prologueProgress: 95, worldTime: '10:00' });
    controller.advancePrologue();
    expect(controller.getSnapshot()).toMatchObject({ prologueProgress: 100, worldTime: '10:02' });
    controller.destroy();
  });

  it('automatically enters an authoritative solo encounter before any companion exists', () => {
    const controller = new SubmissionController();
    for (let step = 0; step < 20; step += 1) controller.advancePrologue();
    const snapshot = controller.getSnapshot();
    expect(snapshot).toMatchObject({
      mode: 'COMBAT',
      prologueProgress: 100,
      worldTime: '10:02',
      encounterId: 'SOLO_WARRIOR',
      encounterContent: 'GOBLIN_WARRIOR',
      companionJoined: false,
    });
    expect(snapshot.combat?.mode).toBe('INTRO');
    expect(snapshot.combat?.state.units.filter((unit) => unit.faction === 'STUDENT')).toHaveLength(1);
    expect(snapshot.combat?.state.units.filter((unit) => unit.faction === 'ENEMY')).toHaveLength(1);
    controller.destroy();
  });

  it('teaches one solo planning action before exposing the full combat vocabulary', async () => {
    const controller = new SubmissionController();
    for (let step = 0; step < 20; step += 1) controller.advancePrologue();
    controller.startEncounter();
    await Promise.resolve();
    await Promise.resolve();

    expect(controller.getSnapshot().combat).toMatchObject({ mode: 'PLAYER_TURN', isBusy: false, plannedActions: [] });
    controller.confirmPlan();
    controller.useAction('SLAM');
    expect(controller.getSnapshot().combat).toMatchObject({ mode: 'PLAYER_TURN', plannedActions: [] });

    controller.move('LEFT');
    const planned = controller.getSnapshot().combat!;
    expect(planned.plannedActions.map((action) => action.label)).toEqual(['이동']);
    expect(planned.state.units.find((unit) => unit.id === 'administrator-slice2')?.position).toEqual({ x: 3, y: 1 });
    expect(planned.previewState.units.find((unit) => unit.id === 'administrator-slice2')?.position).toEqual({ x: 2, y: 1 });

    controller.move('LEFT');
    expect(controller.getSnapshot().combat?.plannedActions).toHaveLength(1);
    controller.confirmPlan();
    expect(controller.getSnapshot().combat).toMatchObject({ mode: 'PLAYER_TURN', plannedActions: [{ label: '이동' }] });
    controller.undoLastAction();
    controller.move('UP');
    expect(controller.getSnapshot().combat?.previewState.units.find((unit) => unit.id === 'administrator-slice2')?.position).toEqual({ x: 3, y: 0 });
    controller.destroy();
  });

  it('keeps the established 400m expedition cadence after the companion joins', () => {
    const controller = joinedController();
    controller.startExpedition();
    for (let step = 0; step < 19; step += 1) controller.advanceCorridor();
    expect(controller.getSnapshot()).toMatchObject({ corridorProgress: 95, worldTime: '10:00' });
    controller.advanceCorridor();
    expect(controller.getSnapshot()).toMatchObject({ corridorProgress: 100, worldTime: '10:02' });
    controller.destroy();
  });

  it('explains the first authoritative blocker instead of silently activating early', () => {
    const controller = new SubmissionController();
    controller.activateAnchor();
    expect(controller.getSnapshot()).toMatchObject({
      mode: 'AWAKENING',
      incorporationBlocker: 'NOT_SCOUTED',
      notice: '중앙 방을 확보해 모든 통로를 먼저 정찰해야 한다.',
    });
    controller.destroy();
  });

  it('ignores unavailable primary actions instead of pretending the input was accepted', () => {
    const controller = new SubmissionController();
    expect(controller.performPrimaryAction()).toBe(false);
    expect(controller.getSnapshot().mode).toBe('AWAKENING');
    controller.destroy();
  });

  it('round-trips a stable checkpoint without changing time, position, or world state', () => {
    const controller = new SubmissionController();
    for (let step = 0; step < 19; step += 1) controller.advancePrologue();
    const save = controller.exportSave();
    expect(save).toBeDefined();
    const parsed = parseSubmissionSave(JSON.stringify(save));
    const restored = new SubmissionController({ saveData: parsed! });
    expect(restored.getSnapshot()).toMatchObject({
      mode: 'SOLO_APPROACH', prologueProgress: 95, worldTime: '10:00', companionJoined: false,
      supplies: { water: 1, food: 1 },
    });
    expect(restored.getSnapshot().world).toEqual(controller.getSnapshot().world);
    expect(parseSubmissionSave('{broken')).toBeUndefined();
    expect(parseSubmissionSave(JSON.stringify({ ...save, version: 1 }))).toBeUndefined();
    controller.destroy();
    restored.destroy();
  });

  it('migrates a v2 expanded checkpoint into the two-choice v3 world without erasing progress', () => {
    const controller = new SubmissionController({ saveData: expandedSave(2) });
    const current = controller.exportSave()!;
    const legacyWorld = {
      ...current.world,
      tiles: current.world.tiles.map((tile) => tile.id === 'frontier-east'
        ? { ...tile, revealsOnIncorporation: ['next-east', 'frontier-north', 'frontier-south'] }
        : tile.id === 'frontier-south' ? { ...tile, knowledge: 'REVEALED' as const } : tile),
    };
    const parsed = parseSubmissionSave(JSON.stringify({ ...current, version: 2, world: legacyWorld }));
    expect(parsed).toMatchObject({ version: 3, mode: 'EXPANDED', supplies: { water: 2 } });
    expect(parsed?.world.tiles.find((tile) => tile.id === 'frontier-east')?.revealsOnIncorporation)
      .toEqual(['next-east', 'frontier-north']);
    expect(parsed?.world.tiles.find((tile) => tile.id === 'frontier-south')).toMatchObject({
      knowledge: 'UNSEEN', territory: 'OUTSIDE',
    });
    controller.destroy();
  });

  it('rejects corrupt or incoherent v3 checkpoints before they can blank or deadlock the app', () => {
    const save = expandedSave(2);
    expect(parseSubmissionSave(JSON.stringify({ ...save, world: { ...save.world, tiles: [null] } }))).toBeUndefined();
    expect(parseSubmissionSave(JSON.stringify({ ...save, supplies: {} }))).toBeUndefined();
    expect(parseSubmissionSave(JSON.stringify({
      ...save, mode: 'EXPANDED', selectedFrontierId: undefined, activeFrontierId: 'frontier-north',
    }))).toBeUndefined();
    expect(parseSubmissionSave(JSON.stringify({ ...save, mode: 'DELEGATION_PLAN', policyChoice: undefined }))).toBeUndefined();
  });

  it('selects without spending, then commits the north water cost exactly once and persists it', () => {
    const controller = new SubmissionController({ saveData: expandedSave(2) });
    const before = controller.getSnapshot();
    expect(controller.selectFrontier('frontier-north')).toBe(true);
    expect(controller.getSnapshot()).toMatchObject({
      mode: 'EXPANDED', selectedFrontierId: 'frontier-north', supplies: { water: 2 },
    });
    expect(controller.getSnapshot().world).toEqual(before.world);
    expect(controller.performPrimaryAction()).toBe(true);
    expect(controller.getSnapshot()).toMatchObject({
      mode: 'CORRIDOR', activeFrontierId: 'frontier-north', paidWaterFrontierId: 'frontier-north',
      supplies: { water: 1 }, currentRoute: { targetTileId: 'frontier-north', distanceMeters: 600 },
    });
    const parsed = parseSubmissionSave(JSON.stringify(controller.exportSave()));
    const restored = new SubmissionController({ saveData: parsed! });
    expect(restored.getSnapshot()).toMatchObject({
      mode: 'CORRIDOR', selectedFrontierId: 'frontier-north', activeFrontierId: 'frontier-north',
      paidWaterFrontierId: 'frontier-north', supplies: { water: 1 }, corridorProgress: 0,
    });
    controller.destroy();
    restored.destroy();
  });

  it('keeps rejected north input fully inert while east remains a zero-water fallback', () => {
    const controller = new SubmissionController({ saveData: expandedSave(0, { springActive: false }) });
    const before = controller.exportSave();
    expect(controller.selectFrontier('frontier-north')).toBe(false);
    expect(controller.exportSave()).toEqual(before);
    expect(controller.selectFrontier('next-east')).toBe(true);
    expect(controller.performPrimaryAction()).toBe(true);
    expect(controller.getSnapshot()).toMatchObject({
      mode: 'CORRIDOR', activeFrontierId: 'next-east', supplies: { water: 0 },
      currentRoute: { targetTileId: 'next-east', waterCost: 0 },
    });
    controller.destroy();
  });

  it('rejects the north route at active-spring water zero without changing any save field', () => {
    const controller = new SubmissionController({ saveData: expandedSave(0) });
    const before = controller.exportSave();
    expect(controller.getSnapshot().frontierChoices.find((choice) => choice.id === 'frontier-north'))
      .toMatchObject({ available: false, blocker: 'WATER_REQUIRED' });
    expect(controller.selectFrontier('frontier-north')).toBe(false);
    expect(controller.exportSave()).toEqual(before);
    controller.destroy();
  });

  it.each([
    ['next-east', 400, 'SECOND_EAST_CENTER', 2],
    ['frontier-north', 600, 'SECOND_NORTH_CENTER', 1],
  ] as const)('uses the authored %s distance and center roster', (frontierId, distance, encounterId, enemies) => {
    const controller = new SubmissionController({ saveData: expandedSave(2) });
    controller.selectFrontier(frontierId);
    controller.performPrimaryAction();
    for (let meter = 0; meter < distance; meter += 5) controller.advanceCorridor();
    expect(controller.getSnapshot()).toMatchObject({ mode: 'CENTER_GATE', corridorProgress: distance });
    expect(controller.performPrimaryAction()).toBe(true);
    expect(controller.getSnapshot()).toMatchObject({ mode: 'COMBAT', encounterId });
    expect(controller.getSnapshot().combat?.state.units.filter((unit) => unit.faction === 'ENEMY')).toHaveLength(enemies);
    controller.destroy();
  });

  it('re-enters an already-paid north expedition at water zero without charging again', () => {
    const save = expandedSave(0);
    const controller = new SubmissionController({
      saveData: { ...save, selectedFrontierId: 'frontier-north', paidWaterFrontierId: 'frontier-north' },
    });
    expect(controller.getSnapshot().frontierChoices.find((choice) => choice.id === 'frontier-north'))
      .toMatchObject({ available: true, selected: true, waterPaid: true });
    expect(controller.performPrimaryAction()).toBe(true);
    expect(controller.getSnapshot()).toMatchObject({
      mode: 'CORRIDOR', activeFrontierId: 'frontier-north', supplies: { water: 0 },
    });
    controller.destroy();
  });

  it('turns a low-HP delegated retreat into a costly but winnable retry instead of a permanent loop', () => {
    const selection = new SubmissionController({
      saveData: { ...expandedSave(2), supplies: { water: 2, food: 0 }, vitals: { administratorHp: 10, allyHp: 4 } },
    });
    selection.selectFrontier('next-east');
    selection.performPrimaryAction();
    const committed = selection.exportSave()!;
    selection.destroy();
    const controller = new SubmissionController({
      saveData: {
        ...committed,
        mode: 'SCOUTED',
        world: updateSubmissionTile(committed.world, 'next-east', {
          knowledge: 'SCOUTED', corridorsScouted: true, threat: 'CONTESTED',
        }),
      },
    });
    controller.performPrimaryAction();
    controller.choosePolicy('KEEP_RANGE');
    controller.performPrimaryAction();
    controller.performPrimaryAction();
    const retreat = controller.getSnapshot();
    expect(retreat).toMatchObject({
      mode: 'DELEGATION_RESULT', vitals: { allyHp: 2 }, delegationResult: { outcome: 'RETREATED' },
      delegationRecoveryRequired: true, delegationRecoveryMinutes: 30,
    });
    const retreatMinute = retreat.worldMinute;
    expect(controller.performPrimaryAction()).toBe(true);
    expect(controller.getSnapshot()).toMatchObject({
      mode: 'POLICY_REVIEW', vitals: { allyHp: 4 }, worldMinute: retreatMinute + 30,
      delegationRecoveryRequired: false,
    });
    controller.choosePolicy('PUSH_FIRST');
    controller.performPrimaryAction();
    controller.performPrimaryAction();
    expect(controller.getSnapshot()).toMatchObject({
      mode: 'DELEGATION_RESULT', delegationResult: { outcome: 'SECURED' }, vitals: { allyHp: 3 },
    });
    controller.destroy();
  });

  it.each([
    ['next-east', 'PUSH_FIRST', 400, 'frontier-north'],
    ['frontier-north', 'KEEP_RANGE', 600, 'next-east'],
  ] as const)('finishes a persistent second incorporation through %s', (frontierId, policy, distance, otherId) => {
    const selection = new SubmissionController({
      saveData: { ...expandedSave(2), supplies: { water: 2, food: 0 }, vitals: { administratorHp: 10, allyHp: 4 } },
    });
    expect(selection.selectFrontier(frontierId)).toBe(true);
    expect(selection.performPrimaryAction()).toBe(true);
    const committed = selection.exportSave()!;
    selection.destroy();

    const targetWorld = updateSubmissionTile(committed.world, frontierId, {
      knowledge: 'SCOUTED', corridorsScouted: true, threat: 'CONTESTED',
    });
    const controller = new SubmissionController({ saveData: { ...committed, mode: 'SCOUTED', world: targetWorld } });
    expect(controller.performPrimaryAction()).toBe(true);
    controller.choosePolicy(policy);
    expect(controller.performPrimaryAction()).toBe(true);
    expect(controller.performPrimaryAction()).toBe(true);
    expect(controller.getSnapshot()).toMatchObject({
      mode: 'DELEGATION_RESULT', delegationResult: { outcome: 'SECURED', frontierId },
    });
    expect(controller.performPrimaryAction()).toBe(true);
    for (let meter = 0; meter < distance; meter += 5) controller.advanceAnchorApproach();
    expect(controller.getSnapshot()).toMatchObject({ mode: 'ANCHOR_READY', anchorProgress: distance });
    expect(controller.performPrimaryAction()).toBe(true);
    const completed = controller.getSnapshot();
    expect(completed.mode).toBe('COMPLETE');
    expect(completed.world.tiles.filter((tile) => tile.territory === 'INCORPORATED').map((tile) => tile.id))
      .toEqual(['initial-barrier', 'frontier-east', frontierId]);
    expect(completed.world.tiles.find((tile) => tile.id === otherId)).toMatchObject({
      knowledge: 'REVEALED', territory: 'OUTSIDE',
    });
    expect(computeBarrierContour(completed.world)).toHaveLength(8);

    const restored = new SubmissionController({ saveData: parseSubmissionSave(JSON.stringify(controller.exportSave()))! });
    expect(restored.getSnapshot()).toMatchObject({
      mode: 'COMPLETE', activeFrontierId: frontierId, anchorProgress: distance,
      supplies: completed.supplies, vitals: completed.vitals, worldMinute: completed.worldMinute,
    });
    expect(restored.getSnapshot().world).toEqual(completed.world);
    controller.destroy();
    restored.destroy();
  });

  it('keeps defeat costs while preserving a deterministic same-encounter retry budget', () => {
    expect(applySubmissionDefeatCost({
      vitals: { administratorHp: 0, allyHp: 2 },
      supplies: { water: 1, food: 1 },
      battleTurns: 4,
    })).toEqual({
      vitals: { administratorHp: 3, allyHp: 3 },
      supplies: { water: 0, food: 0 },
      elapsedMinutes: 9,
      usedCampSupplies: true,
    });
    expect(applySubmissionDefeatCost({
      vitals: { administratorHp: 0, allyHp: 2 },
      supplies: { water: 0, food: 1 },
      battleTurns: 4,
    })).toMatchObject({
      vitals: { administratorHp: 1, allyHp: 2 },
      supplies: { water: 0, food: 1 },
      elapsedMinutes: 9,
      usedCampSupplies: false,
    });
  });

  it('spends the one camp ration before delegation when the ally reaches the safe center badly hurt', () => {
    expect(applySubmissionRest({
      vitals: { administratorHp: 9, allyHp: 6 },
      supplies: { water: 1, food: 1 },
    })).toEqual({
      vitals: { administratorHp: 12, allyHp: 9 },
      supplies: { water: 0, food: 0 },
      elapsedMinutes: 20,
    });

    const base = new SubmissionController();
    const save = base.exportSave()!;
    base.destroy();
    const controller = new SubmissionController({
      saveData: {
        ...save,
        mode: 'SCOUTED',
        vitals: { administratorHp: 9, allyHp: 6 },
        worldMinute: 640,
        notice: '중앙 방 확보.',
      },
    });
    expect(controller.getSnapshot().preDelegationRestRequired).toBe(true);
    expect(controller.performPrimaryAction()).toBe(true);
    expect(controller.getSnapshot()).toMatchObject({
      mode: 'SCOUTED',
      worldMinute: 660,
      vitals: { administratorHp: 12, allyHp: 9 },
      supplies: { water: 0, food: 0 },
      preDelegationRestRequired: false,
    });
    expect(controller.performPrimaryAction()).toBe(true);
    expect(controller.getSnapshot().mode).toBe('POLICY_REVIEW');
    controller.destroy();
  });
});

function expandedSave(
  water: number,
  options: { readonly springActive?: boolean } = {},
) {
  const initial = new SubmissionController();
  const save = initial.exportSave()!;
  initial.destroy();
  let world = prepareForIncorporation(createSubmissionWorld(), 'frontier-east');
  world = incorporateTile(world, 'frontier-east').world;
  if (options.springActive === false) world = updateSubmissionTile(world, 'frontier-east', { utility: 'DORMANT' });
  return {
    ...save,
    mode: 'EXPANDED' as const,
    world,
    companionJoined: true,
    soloEncounterResolved: true,
    firstEncounterResolved: true,
    supplies: { water, food: 1 },
    corridorProgress: 400,
    anchorProgress: 400,
    notice: '첫 영토 편입 완료.',
  };
}

function prepareForIncorporation(world: SubmissionWorldState, tileId: string): SubmissionWorldState {
  return updateSubmissionTile(world, tileId, {
    knowledge: 'SCOUTED', corridorsScouted: true, threat: 'SECURED', routeSafe: true,
    anchorPrepared: true, protagonistAtAnchor: true,
  });
}

function joinedController(): SubmissionController {
  const initial = new SubmissionController();
  const save = initial.exportSave()!;
  initial.destroy();
  return new SubmissionController({
    saveData: {
      ...save,
      mode: 'COMPANION_JOINED',
      prologueProgress: 100,
      soloEncounterResolved: true,
      companionJoined: true,
      notice: '동료가 합류했다.',
    },
  });
}
