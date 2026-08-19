---
title: P19 Anchor Handoff Contract
status: under-validation
last_updated: 2026-08-20
related:
  - p18-delegation-result-contract.md
  - sector-1-golden-run.md
  - acceptance-evidence-matrix.md
---

# P19 확보 경로와 주인공 거점 연결 계약

## Goal

동료가 안전하게 만든 길만으로 영토가 편입되지 않으며, 주인공이 그 400m를 직접 이동해 닫힌 경계 거점에 도착하고 활성화해야 한다는 역할 분리를 설명문 없이 행동으로 잇는다.

## Authoritative boundary

- 진입 시 frontier는 `routeSafe=true`, `anchorPrepared=true`, `territory=OUTSIDE`, `protagonistAtAnchor=false`다.
- 주인공은 D 또는 pointer hold 한 step에 5m 이동하며, 100m마다 2분, 총 400m에 8분이 든다.
- 배경과 지면이 주인공 뒤로 움직이고 주인공의 화면상 ground anchor는 고정된다.
- 400m 도착은 `protagonistAtAnchor=true`, mode `ANCHOR_READY`만 만들며 territory는 여전히 OUTSIDE다.
- SPACE 활성화 전에는 편입·contour·utility·보급 변화가 없다.

## Scene contract

1. main world에는 ground에 고정된 주인공, 확보된 route glow와 지면, 닫힌 anchor 하나만 크게 남는다.
2. anchor는 접근 중에는 어둡고 닫힌 diamond+core, 도착하면 밝아지지만 SPACE 전까지 열린 영토로 표현하지 않는다.
3. 하단 route rail은 `동료 check → 0~400m track → 주인공 현재 위치 → 닫힌 anchor`를 한 줄로 보인다.
4. travel primary는 `주인공→anchor→D`, ready primary는 `주인공→밝아진 anchor→SPACE` 하나다.
5. 대형 영문 label, 제목, 설명 문단, notice 문장, 캐릭터 이름표는 0개다.
6. 진행 중과 도착 후 모두 `territory=OUTSIDE`를 DOM state로 보존한다.

## Acceptance

- pointer hold와 keyboard D가 같은 `advanceAnchorApproach`를 사용하고 progress feedback을 즉시 바꾼다.
- 진행 중 party screen x는 고정되고 backdrop·ground position은 바뀐다.
- progress 0~399에는 primary `approach-anchor/D`, 400에는 `activate-anchor/SPACE` 하나다.
- 400m에서 world minute +8, protagonistAtAnchor true, routeSafe·anchorPrepared true, territory OUTSIDE다.
- route rail ally 1, protagonist marker 1, anchor goal 1이며 visible progress와 snapshot 값이 같다.
- 1280×720과 960×720에서 protagonist, anchor, rail과 primary가 viewport 안이고 overflow 0이다.
- text-off frame에도 확보 주체, 주인공 이동, 닫힌 목표와 D/SPACE 변화가 남는다.
- browser error 0이다.

자동 검증은 이동·시간·영토 경계와 표현 parity를 판정한다. 신규 사용자가 `동료가 길을 열고 주인공이 땅을 연결한다`고 설명하는지는 human gate 전까지 REQUIRED다.
