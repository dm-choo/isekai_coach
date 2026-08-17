---
title: Tile Visibility and Markers
status: accepted
last_updated: 2026-08-17
related:
  - ../../../gameplay/world/tile-states.md
  - ../../../ux/views/map-view.md
  - ../../vfx/information-vfx.md
---

# Tile visibility and markers

- 어둠, 흐림과 밝음은 세 기본 명도·색조로 읽힌다.
- 과거 개척과 횃불 안정화는 별도 기본 색이 아니라 흔적, 테두리와 icon을 사용한다.
- 본대·별동대, 이동 경로, 비콘, 시설과 작업 상태는 서로 충돌하지 않는 marker family를 쓴다.
- 비콘이 감지한 시설은 흐림 실루엣이며 위치와 존재를 알려도 세부 내용을 모두 공개하지 않는다.
- 내부 tile state를 색 하나씩 추가해 직접 시각화하지 않는다.
