---
title: P20 Expansion Spatial Result Contract
status: under-validation
last_updated: 2026-08-20
related:
  - p19-anchor-handoff-contract.md
  - sector-1-golden-run.md
  - ../gameplay/world/barrier-territory.md
  - acceptance-evidence-matrix.md
---

# P20 첫 영역 확장의 공간 결과 계약

## Goal

주인공이 거점을 활성화한 결과를 제목과 상태표로 설명하지 않고, 동일한 영구 좌표 위에서 `닫힌 거점 활성화 → 기존 경계 seam 소멸 → 두 타일을 감싸는 새 contour → 샘 가동과 물 +1 → 세 다음 좌표 reveal`의 연쇄로 읽히게 한다.

## Authoritative boundary

- SPACE 직후 world revision은 활성화 직전 값에서 정확히 +1이며 `initial-barrier`, `frontier-east` 두 타일이 INCORPORATED다.
- `frontier-east`는 SCOUTED·SECURED·INCORPORATED·ACTIVE·stabilized·routeSafe·protagonistAtAnchor 상태를 함께 가진다.
- 공유하던 initial EAST와 frontier WEST 경계는 contour에서 사라지고 두 타일 외곽 6 segment만 남는다.
- `next-east`, `frontier-north`, `frontier-south`는 REVEALED·OUTSIDE이며 편입된 것처럼 보이지 않는다.
- 샘 가동은 water +1을 한 번만 만들며 food·world time·HP를 바꾸지 않는다.

## Scene contract

1. 화면의 가장 큰 owner는 같은 좌표계의 다섯 world tile이다. 가운데 두 owned tile은 접하고 하나의 6-edge contour에 들어간다.
2. 두 owned tile 사이에는 사라지는 이전 seam만 잠깐 남고 최종 frame에는 내부 경계가 없다.
3. 새 타일 위에는 열린 anchor node와 주인공이 함께 있고, 자물쇠 glyph는 0개다.
4. 샘은 같은 새 타일 안에서 pulse하는 물 glyph와 `+1`로 나타나며 상단 실제 water 값과 일치한다.
5. 동·북·남 세 좌표는 새 타일에서 뻗는 link 끝의 어두운 `?` tile로 나타난다. 좌표 이름을 지워도 세 다음 방향이 남는다.
6. 대형 결과 제목, 설명 문단, 상태 ledger, causality strip, 다음 좌표 목록은 0개다.
7. 다음 입력은 `확장된 두 타일→다시 시작 glyph→SPACE` 하나이며 결과 해석보다 앞서지 않는다.

## Acceptance

- DOM의 world revision, incorporated IDs, revealed IDs, contour count, utility, water가 snapshot과 일치한다.
- owned tile 2, outside revealed tile 3, active anchor 1, protagonist 1, active spring 1, next link 3, contour 6이다.
- initial EAST와 frontier WEST 내부 seam은 authoritative contour에 없고 visual outer contour만 6개다.
- spring `+1`과 상단 water가 snapshot supplies.water와 일치한다.
- 1280×720과 960×720에서 다섯 tile, contour, protagonist, spring, restart primary가 viewport 안이고 overflow 0이다.
- text-off frame에도 두 타일 편입, 외곽 contour, 주인공 anchor, spring +1, 세 다음 방향이 남는다.
- restart 전 save/load가 EXPANDED state를 그대로 복원하고 browser error는 0이다.

자동 검증은 state/presentation parity와 공간 연쇄를 판정한다. 신규 사용자가 `내가 거점을 켜서 결계가 넓어졌고, 샘 때문에 다음 세 방향으로 더 갈 수 있다`고 설명하는지는 human gate 전까지 REQUIRED다.
