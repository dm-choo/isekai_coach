---
title: Combat Ground and Grid Art
status: accepted
last_updated: 2026-08-17
related:
  - ../../../gameplay/combat/grid-and-spatial-rules.md
  - ../../../ux/views/combat-view.md
  - intent-and-ally-prediction.md
---

# Combat ground and grid art

## Ground

- 전장은 투명한 유리 발판이 아니라 아마존 정글의 이어진 흙바닥이다.
- 행과 점유 관계는 낮은 명도의 baseline, 식생 틈과 얕은 지형 mark로 암시한다. 셀 사이에 큰 margin·padding을 두어 징검다리처럼 보이게 하지 않는다.
- 캐릭터는 논리 셀보다 큰 1×2에 가까운 실루엣을 가지며 서로 일부 겹칠 수 있다. 캐릭터를 작게 만든 이유가 그리드 수가 되어서는 안 된다.

## Logical map and camera

- logical topology는 `12 x 3`을 유지한다. 화면은 항상 12열 전체를 보여주지 않고 아군·적·현재 Intent가 있는 영역을 적당한 여백과 함께 frame한다.
- 카메라는 평상시 보스방 전체 관계를 보여주고, 밀치기·내려찍·투사체·타격 순간에는 짧게 대상과 원점으로 zoom/pan한다.
- 화면 projection 수치와 cell pixel size는 art 정본이 아니다. 실제 16:9, 4:3와 390px viewport screenshot으로 scale·depth·겹침을 검증한다.

## Momentary signals

- 평소에는 grid를 보이지 않게 하거나 매우 약하게 유지한다.
- 현재 선택 가능한 이동 셀만 얇은 청색 outline/발자국으로 표시한다.
- 적 공격 effect cell은 붉은 면·굵은 외곽선·경고 icon을 잠깐 표시한다. 이동 경로를 공격 cell과 같은 빨간 threat로 그리지 않는다.
- `광범위 공격`의 3행 표시도 공격 예정 시간에만 나타난다. 상시 바닥 tile이나 퍼즐판이 아니다.
- 캐릭터 baseline과 행 depth가 신호보다 먼저 관계를 전달해야 한다. signal이 sprite silhouette와 이름을 덮지 않는다.
