---
title: Combat Ground and Grid Art
status: accepted
last_updated: 2026-08-18
related:
  - ../../../gameplay/combat/grid-and-spatial-rules.md
  - ../../../ux/views/combat-view.md
  - intent-and-ally-prediction.md
---

# Combat ground and grid art

## Ground

- 실제 플레이 공간은 배경 이미지가 아니라 논리적 `12 x 3` cell을 모두 채우는 별도 tilemap이다.
- 각 cell은 `jungle-ground-atlas-v2.png`의 불투명한 흙 frame 하나를 사용한다. 타일은 논리 좌표와 동일한 간격으로 맞붙고 어두운 bevel 경계로 개별 지형 블럭임을 드러낸다.
- 캐릭터의 발과 runtime shadow 중심은 해당 지형 블럭 중심에 고정한다. 배경의 바닥처럼 보이는 부분을 좌표 anchor로 사용하지 않는다.
- 배경은 tilemap 뒤의 울창한 숲, 안개, 수직 수목과 유적문을 소유한다. 플레이 가능한 평면이나 별도 grid를 그리지 않고 tilemap을 보조한다.
- 하단 조작 UI는 불투명 panel과 경계로 world rendering 영역에서 분리한다.

## Logical map and camera

- logical topology는 `12 x 3`을 유지한다. 화면은 항상 12열 전체를 보여주지 않고 아군·적·현재 Intent가 있는 영역을 적당한 여백과 함께 frame한다.
- `2×2` 보스 footprint와 `20×6` map은 현재 public contract가 아니라 별도 graybox 비교 대상이다. footprint·충돌·공격 origin·사거리·카메라 검증 없이 시각 크기 보정과 함께 확정하지 않는다.
- 아군 점유는 파랑, 적 점유는 빨강 계열의 낮은 바닥 ring으로 표시한다. 이동 선택과 Intent는 지형 texture를 교체하지 않고 tile 위에 일시적으로 겹친다. 사각형 면 강조는 실제 공격 effect cell에만 사용한다.
- 카메라는 평상시 보스방 전체 관계를 보여주고, 밀치기·내려찍기·투사체·타격 순간에는 짧게 대상과 원점으로 zoom/pan한다.
- 화면 projection 수치와 cell pixel size는 art 정본이 아니다. 실제 16:9, 4:3와 390px viewport screenshot으로 scale·depth·겹침을 검증한다.

## Momentary signals

- 평소에는 grid를 보이지 않게 하거나 매우 약하게 유지한다.
- 중간 이동 셀은 방향 화살표만 표시하고 최종 도착 셀만 강한 진영 outline·ground ring·예정 silhouette로 표시한다.
- 적 공격 effect cell은 붉은 면·굵은 외곽선·경고 icon을 잠깐 표시한다. 이동 경로를 공격 cell과 같은 빨간 threat로 그리지 않는다.
- `외침`의 3행 위험 표시는 공격 예정 시간에만 강하게 나타난다. 상시 바닥 tile과 다른 stroke·pattern으로 구별한다.
- 캐릭터 baseline과 행 depth가 신호보다 먼저 관계를 전달해야 한다. signal이 sprite silhouette와 이름을 덮지 않는다.
