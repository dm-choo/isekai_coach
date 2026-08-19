---
title: Map View UX
status: accepted
last_updated: 2026-08-19
related:
  - ../../gameplay/world/sector-map.md
  - ../../gameplay/world/tile-states.md
  - ../../gameplay/world/barrier-territory.md
  - ../../art/ui/map-view/index.md
---

# Map view UX

- 어둠, 흐림과 밝음의 세 지식·안전 상태를 읽을 수 있어야 한다.
- 편입 영토는 타일 채색만으로 표현하지 않고 연속된 결계 contour와 내부 지면·기후 반응으로 구분한다.
- 불안정한 편입 타일은 결계선 안에 남아 있되 효용·위험 marker가 손상된 상태로 보인다. 회색이라는 이유로 바깥 영토처럼 보이면 안 된다.
- 정찰, 확보, 편입, 안정화를 네 가지 강한 색으로 각각 칠하지 않는다. 선택한 타일의 detail과 icon 계층에서 상태를 해석한다.
- 본대와 별동대의 위치·경로, 시설과 작업 상태를 표시한다.
- 편입 가능한 타일은 현재 결계선과 맞닿은 면을 강조하고, 비인접 타일은 보이더라도 편입 후보처럼 보이지 않는다.
- 표현 단계보다 많은 내부 tile state를 과도한 색 분리로 직접 노출하지 않는다.
- 타일 선택에서 로컬 영역으로 진입하고, 작전 중인 별동대는 해당 작전 채널로 연결한다.
