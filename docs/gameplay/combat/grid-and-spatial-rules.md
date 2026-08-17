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

- 전투는 3행 기반 가변 너비 논리 grid에서 진행한다.
- 논리 `GridPosition`과 화면 projection을 분리한다.
- 주인공, 동료와 적은 같은 경계·점유·이동 규칙을 사용한다.
- 기본 이동은 상하좌우 인접 셀이고 대각선, 경계 밖, 점유 셀 이동은 허용하지 않는다.
- 공격 범위는 방향에 상대적인 pattern data로 표현한다.
- 이동 경로와 공격 effect cell은 별도 의미이며 같은 threat 표시를 사용하지 않는다.

## Provisional

- 제출본 전투 폭 후보는 10~12칸이다.
- 현재 scaffold 검증 맵은 `12 × 3`이며 최종 전장 크기가 아니다.

## Ownership boundaries

Intent의 고정 방향과 anchor는 [Turn and Intent](./turn-and-intent.md), 위치를 선택하는 동료 규칙은 [Positioning](./actions/positioning.md), grid의 화면 형태는 [Grid art](../../art/ui/combat-view/grid.md)가 소유한다.
