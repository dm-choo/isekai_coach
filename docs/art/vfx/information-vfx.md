---
title: Information VFX
status: accepted
last_updated: 2026-08-17
related:
  - visual-language.md
  - ../ui/combat-view/intent-and-ally-prediction.md
  - ../ui/map-view/tile-visibility-and-markers.md
---

# Information VFX

Intent, ally prediction, target과 push preview는 판독성을 우선한다.

- cell과 path의 논리 위치를 정확히 보존한다.
- enemy threat와 ally prediction이 겹쳐도 소유자와 순서를 구분할 수 있어야 한다.
- push preview는 source, 이동 방향, old/new attack footprint를 읽을 수 있게 한다.
- 과도한 bloom, particle과 camera motion으로 grid 정보를 가리지 않는다.
