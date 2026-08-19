---
title: Tile Visibility and Markers
status: accepted
last_updated: 2026-08-19
related:
  - ../../../gameplay/world/tile-states.md
  - ../../../ux/views/map-view.md
  - ../../vfx/information-vfx.md
---

# Tile visibility and markers

- 어둠, 흐림과 밝음은 세 기본 명도·색조로 읽힌다.
- 편입 영토는 연속된 결계 contour, 불안정은 손상된 효용 marker와 환경 변화로 표현한다.
- 본대·별동대, 이동 경로, 지역 핵, 확장 거점, 시설과 작업 상태는 서로 충돌하지 않는 marker family를 쓴다.
- 지역 핵이 감지한 시설은 흐림 실루엣이며 위치와 존재를 알려도 세부 내용을 모두 공개하지 않는다.
- 내부 tile state를 색 하나씩 추가해 직접 시각화하지 않는다.
