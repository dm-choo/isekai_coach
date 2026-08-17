---
title: Grid and Spatial Rules
status: accepted
last_updated: 2026-08-17
related:
  - turn-and-intent.md
  - actions/positioning.md
  - ../../ux/views/combat-view.md
  - ../../art/ui/combat-view/grid.md
implementation:
  - src/game/combat/spatial/
  - src/game/phaser/rendering/GridProjector.ts
---

# Grid and spatial rules

## Accepted contract

- 전투는 3행 기반 논리 grid에서 진행하며 Slice 1 topology는 `12 x 3`이다.
- 논리 `GridPosition`과 화면 projection을 분리한다.
- 화면 tile은 논리 좌표를 보존하는 정렬된 직사각형 atlas tile로 투영한다. atlas의 장식·카메라 crop은 논리 topology를 바꾸지 않는다.
- 주인공, 동료와 적은 같은 경계·점유·이동 규칙을 사용한다.
- 기본 이동은 상하좌우 인접 셀이고 대각선, 경계 밖, 점유 셀 이동은 허용하지 않는다.
- 공격 범위는 방향에 상대적인 pattern data로 표현한다.
- 이동 경로와 공격 effect cell은 별도 의미이며 같은 threat 표시를 사용하지 않는다.

## Provisional

- `12 x 3`을 화면에 몇 열까지 frame할지, event zoom과 empty-area cropping의 정확한 수치는 under-validation이다.
- 최종 게임의 전장 폭과 다수 unit 배치는 별도 콘텐츠 결정이다.

## Ownership boundaries

Intent의 고정 방향과 anchor는 [Turn and Intent](./turn-and-intent.md), 위치를 선택하는 동료 규칙은 [Positioning](./actions/positioning.md), grid의 화면 형태는 [Grid art](../../art/ui/combat-view/grid.md)가 소유한다.
