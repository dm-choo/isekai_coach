import { useEffect, useMemo, useState } from 'react';
import { computeBarrierContour, createSubmissionWorld, type SubmissionTileState } from '../game/submission';

const BASE_URL = import.meta.env.BASE_URL;

export function SubmissionApp() {
  const [world] = useState(createSubmissionWorld);
  const contour = useMemo(() => computeBarrierContour(world), [world]);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    window.__ISEKAI_COACH_SUBMISSION__ = { world, contour };
    return () => { delete window.__ISEKAI_COACH_SUBMISSION__; };
  }, [contour, world]);

  return (
    <main className="submission-shell">
      <section className="submission-world" aria-label="초기 결계와 동쪽 미지의 영토">
        <div className="submission-sky" />
        <div className="submission-canopy" />
        <header className="submission-topbar">
          <div className="submission-mark"><i /><span><small>10:00 · DAY 1</small><strong>깨어난 정원</strong></span></div>
          <div className="submission-resources" aria-label="원정 보급"><span>◉ <b>1</b></span><span>◆ <b>1</b></span></div>
        </header>

        <div className="territory-stage">
          <div className="world-copy">
            <small>THE FIRST BOUNDARY</small>
            <h1>이 선 안이<br />지금의 세계다.</h1>
            <p>동쪽에서 오래 멈춘 물소리가 들린다.</p>
          </div>
          <div className="tile-field">
            {world.tiles.map((tile) => <WorldTile key={tile.id} tile={tile} />)}
            {contour.map((segment) => <i
              key={segment.id}
              className={`barrier-edge is-${segment.edge.toLowerCase()}`}
              style={tilePosition(segment.x, segment.y)}
            />)}
            <div className="world-party" style={tilePosition(0, 0)}>
              <img src={`${BASE_URL}assets/slice1/administrator-v2.png`} alt="관리자" />
              <img src={`${BASE_URL}assets/slice1/archer-v2.png`} alt="원거리 동료" />
              <span>현재 위치</span>
            </div>
          </div>
          <button type="button" className="primary-expedition" aria-label="동쪽 경계 조사 시작">
            <span><small>다음 행동</small><strong>동쪽 경계 조사</strong></span><kbd>SPACE</kbd>
          </button>
        </div>

        <footer className="submission-footer">
          <p><i /> 결계 안 · 안전</p>
          <span>동쪽 frontier는 보이지만 아직 내 영토가 아니다.</span>
        </footer>
      </section>
    </main>
  );
}

function WorldTile({ tile }: { readonly tile: SubmissionTileState }) {
  const state = tile.knowledge === 'UNSEEN' ? 'unseen' : tile.territory === 'INCORPORATED' ? 'owned' : 'frontier';
  return <article
    className={`submission-tile is-${state}`}
    style={tilePosition(tile.coordinate.x, tile.coordinate.y)}
    aria-label={`${tile.name}: ${tile.knowledge}, ${tile.territory}`}
  >
    <div className="tile-terrain" />
    {state === 'owned' && <span className="tile-heart">✦</span>}
    {state === 'frontier' && <span className="tile-question">?</span>}
    <strong>{state === 'unseen' ? '' : tile.name}</strong>
    <small>{state === 'owned' ? '결계 안' : state === 'frontier' ? '미확보' : ''}</small>
  </article>;
}

function tilePosition(x: number, y: number): React.CSSProperties {
  return {
    left: `calc(38% + ${x * 224}px)`,
    top: `calc(50% + ${y * 148}px)`,
  };
}
