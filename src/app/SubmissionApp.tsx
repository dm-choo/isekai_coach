import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { type SliceActionId } from '../game/slice';
import {
  SubmissionController,
  computeBarrierContour,
  type SubmissionSnapshot,
  type SubmissionTileState,
} from '../game/submission';
import { CombatStage } from './Slice2App';

const BASE_URL = import.meta.env.BASE_URL;

export function SubmissionApp() {
  const [controller] = useState(() => {
    const verification = import.meta.env.DEV && new URLSearchParams(window.location.search).has('verify');
    return new SubmissionController(verification ? { playbackSpeed: 12, phaseDelayScale: 0.03 } : {});
  });
  const snapshot = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot);

  useEffect(() => () => controller.destroy(), [controller]);
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    window.__ISEKAI_COACH_SUBMISSION__ = { snapshot };
    return () => { delete window.__ISEKAI_COACH_SUBMISSION__; };
  }, [snapshot]);
  useEffect(() => {
    if (!import.meta.env.DEV || !snapshot.combat) return;
    window.__ISEKAI_COACH_COMBAT__ = { snapshot: snapshot.combat };
    return () => { delete window.__ISEKAI_COACH_COMBAT__; };
  }, [snapshot.combat]);
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) return;
      if (event.key === ' ') {
        if (snapshot.mode === 'INTRO') controller.startExpedition();
        else if (snapshot.mode === 'CENTER_GATE') controller.enterCenter();
        else if (snapshot.mode === 'COMBAT' && snapshot.combat?.mode === 'INTRO') controller.startEncounter();
        else if (snapshot.mode === 'COMBAT' && snapshot.combat?.mode === 'PLAYER_TURN') controller.confirmPlan();
        else if (snapshot.mode === 'COMBAT' && snapshot.combat?.mode === 'VICTORY') controller.completeEncounter();
        else if (snapshot.mode === 'COMBAT' && snapshot.combat?.mode === 'DEFEAT') controller.retryEncounter();
        else return;
        event.preventDefault();
        return;
      }
      if (snapshot.mode !== 'COMBAT' || snapshot.combat?.mode !== 'PLAYER_TURN') return;
      const directions = { w: 'UP', ArrowUp: 'UP', a: 'LEFT', ArrowLeft: 'LEFT', s: 'DOWN', ArrowDown: 'DOWN', d: 'RIGHT', ArrowRight: 'RIGHT' } as const;
      const direction = directions[event.key as keyof typeof directions];
      if (direction) {
        event.preventDefault();
        controller.move(direction);
      } else if (['1', 'q', 'Q'].includes(event.key)) {
        event.preventDefault();
        const action = snapshot.combat.actions[0];
        if (action) controller.useAction(action.id as SliceActionId);
      } else if (['2', 'e', 'E'].includes(event.key)) {
        event.preventDefault();
        const action = snapshot.combat.actions[1];
        if (action) controller.useAction(action.id as SliceActionId);
      } else if (['3', 'r', 'R'].includes(event.key)) {
        event.preventDefault();
        const action = snapshot.combat.actions[2];
        if (action) controller.useAction(action.id as SliceActionId);
      } else if (event.key.toLowerCase() === 'z') {
        event.preventDefault();
        controller.undoLastAction();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [controller, snapshot]);

  return (
    <main className="submission-shell">
      <section className="submission-world" aria-label="결계를 확장하는 첫 원정">
        {snapshot.mode === 'COMBAT' && snapshot.combat
          ? <CombatStage snapshot={snapshot.combat} run={snapshot} controller={controller} encounter={snapshot.encounterContent} />
          : snapshot.mode === 'CORRIDOR' || snapshot.mode === 'CENTER_GATE'
            ? <CorridorStage snapshot={snapshot} controller={controller} />
            : snapshot.mode === 'SCOUTED'
              ? <ScoutedStage snapshot={snapshot} />
              : <TerritoryStage snapshot={snapshot} onStart={controller.startExpedition} />}
        {snapshot.mode !== 'COMBAT' && <SubmissionHud snapshot={snapshot} />}
      </section>
    </main>
  );
}

function TerritoryStage({ snapshot, onStart }: { readonly snapshot: SubmissionSnapshot; readonly onStart: () => void }) {
  const contour = useMemo(() => computeBarrierContour(snapshot.world), [snapshot.world]);
  return <div className="territory-stage is-intro">
    <div className="submission-sky" />
    <div className="submission-canopy" />
    <div className="world-copy">
      <small>THE FIRST BOUNDARY</small>
      <h1>이 선 안이<br />지금의 세계다.</h1>
      <p>동쪽에서 오래 멈춘 물소리가 들린다.</p>
    </div>
    <div className="tile-field">
      {snapshot.world.tiles.map((tile) => <WorldTile key={tile.id} tile={tile} />)}
      {contour.map((segment) => <i key={segment.id} className={`barrier-edge is-${segment.edge.toLowerCase()}`} style={tilePosition(segment.x, segment.y)} />)}
      <div className="world-party" style={tilePosition(0, 0)}>
        <img src={`${BASE_URL}assets/slice1/administrator-v2.png`} alt="관리자" />
        <img src={`${BASE_URL}assets/slice1/archer-v2.png`} alt="원거리 동료" />
        <span>현재 위치</span>
      </div>
    </div>
    <button type="button" className="primary-expedition" aria-label="동쪽 경계 조사 시작" onClick={onStart}>
      <span><small>다음 행동</small><strong>동쪽 경계 조사</strong></span><kbd>SPACE</kbd>
    </button>
    <footer className="submission-footer"><p><i /> 결계 안 · 안전</p><span>보이는 땅도 확보하기 전에는 내 영토가 아니다.</span></footer>
  </div>;
}

function CorridorStage({ snapshot, controller }: { readonly snapshot: SubmissionSnapshot; readonly controller: SubmissionController }) {
  const activeTimer = useRef<number | undefined>(undefined);
  const stop = () => {
    if (activeTimer.current !== undefined) window.clearInterval(activeTimer.current);
    activeTimer.current = undefined;
  };
  const start = () => {
    stop();
    controller.advanceCorridor();
    activeTimer.current = window.setInterval(controller.advanceCorridor, 78);
  };
  useEffect(() => {
    const keyDown = (event: KeyboardEvent) => {
      if (event.repeat || (event.key.toLowerCase() !== 'd' && event.key !== 'ArrowRight')) return;
      event.preventDefault();
      start();
    };
    const keyUp = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === 'd' || event.key === 'ArrowRight') stop();
    };
    window.addEventListener('keydown', keyDown);
    window.addEventListener('keyup', keyUp);
    window.addEventListener('blur', stop);
    return () => {
      stop();
      window.removeEventListener('keydown', keyDown);
      window.removeEventListener('keyup', keyUp);
      window.removeEventListener('blur', stop);
    };
  }, [controller]);
  useEffect(() => stop, [snapshot.mode]);

  const progress = snapshot.corridorProgress / 400;
  const atGate = snapshot.mode === 'CENTER_GATE';
  return <div className={`submission-corridor ${atGate ? 'is-gate' : ''}`}>
    <div className="corridor-moving-backdrop" style={{ backgroundPositionX: `${progress * -980}px` }} />
    <div className="corridor-moving-ground" style={{ backgroundPositionX: `${progress * -720}px` }} />
    <div className="corridor-shade" />
    <div className="submission-travel-copy"><small>물안개 전초지 · 서쪽 통로</small><strong>{atGate ? '중앙 방 도착' : '미정찰 통로'}</strong></div>
    <div className="submission-travel-party"><img src={`${BASE_URL}assets/slice1/administrator-v2.png`} alt="관리자" /><img src={`${BASE_URL}assets/slice1/archer-v2.png`} alt="원거리 동료" /></div>
    <div className="submission-destination"><i>◇</i><span>{atGate ? '중앙 방' : `${400 - snapshot.corridorProgress}m`}</span></div>
    <div className="submission-distance" aria-label={`${snapshot.corridorProgress}미터 이동`}><i style={{ width: `${progress * 100}%` }} />{[100, 200, 300].map((meter) => <b key={meter} style={{ left: `${meter / 4}%` }} />)}<span>{snapshot.corridorProgress} / 400m</span></div>
    {atGate
      ? <button type="button" className="corridor-primary" onClick={controller.enterCenter}><span><small>발소리 2 · 출구 4</small><strong>중앙 방 진입</strong></span><kbd>SPACE</kbd></button>
      : <button type="button" className="corridor-primary hold-control" onPointerDown={start} onPointerUp={stop} onPointerLeave={stop}><span><small>누르는 동안 이동</small><strong>동쪽으로 전진</strong></span><kbd>D</kbd></button>}
    <div className="submission-travel-notice" role="status"><i />{snapshot.notice}</div>
  </div>;
}

function ScoutedStage({ snapshot }: { readonly snapshot: SubmissionSnapshot }) {
  return <div className="submission-scouted">
    <div className="submission-sky" /><div className="submission-canopy" />
    <div className="scouted-copy"><small>CENTRAL ROOM SECURED</small><h1>길의 모양을<br />알아냈다.</h1><p>중앙 방과 연결된 네 통로가 동시에 정찰되었다.</p></div>
    <div className="scout-map" aria-label="정찰된 중앙 방과 네 통로">
      <span className="scout-line is-north" /><span className="scout-line is-east" /><span className="scout-line is-south" /><span className="scout-line is-west" />
      <i className="scout-room is-north">↑</i><i className="scout-room is-east">→</i><i className="scout-room is-south">↓</i><i className="scout-room is-west">←</i>
      <strong className="scout-center"><b>✓</b><small>중앙 방</small></strong>
      <em className="scout-threat is-east">⚔</em><em className="scout-threat is-north">!</em>
    </div>
    <div className="scout-causality"><span><b>1</b>중앙 방 확보</span><i>→</i><span><b>4</b>모든 통로 정찰</span></div>
    <aside className="scouted-next"><small>관찰된 문제</small><strong>동료는 적이 너무 가까워지면 사격하지 못했다.</strong><p>다음 단계에서 이 전투 기록으로 동료 정책을 한 번 수정합니다.</p></aside>
  </div>;
}

function SubmissionHud({ snapshot }: { readonly snapshot: SubmissionSnapshot }) {
  return <header className="submission-topbar">
    <div className="submission-mark"><i /><span><small>{snapshot.worldTime} · DAY 1</small><strong>{snapshot.mode === 'SCOUTED' ? '물안개 전초지' : '깨어난 정원'}</strong></span></div>
    <div className="submission-resources" aria-label="원정 보급"><span><img src={`${BASE_URL}assets/ui/supply-water.svg`} alt="물" /><b>{snapshot.supplies.water}</b></span><span><img src={`${BASE_URL}assets/ui/supply-ration.svg`} alt="식량" /><b>{snapshot.supplies.food}</b></span></div>
  </header>;
}

function WorldTile({ tile }: { readonly tile: SubmissionTileState }) {
  const state = tile.knowledge === 'UNSEEN' ? 'unseen' : tile.territory === 'INCORPORATED' ? 'owned' : 'frontier';
  return <article className={`submission-tile is-${state}`} style={tilePosition(tile.coordinate.x, tile.coordinate.y)} aria-label={`${tile.name}: ${tile.knowledge}, ${tile.territory}`}>
    <div className="tile-terrain" />
    {state === 'owned' && <span className="tile-heart">✦</span>}
    {state === 'frontier' && <span className="tile-question">?</span>}
    <strong>{state === 'unseen' ? '' : tile.name}</strong>
    <small>{state === 'owned' ? '결계 안' : state === 'frontier' ? '미확보' : ''}</small>
  </article>;
}

function tilePosition(x: number, y: number): React.CSSProperties {
  return { left: `calc(38% + ${x * 224}px)`, top: `calc(50% + ${y * 148}px)` };
}
