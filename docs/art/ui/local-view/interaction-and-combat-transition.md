---
title: Local Interaction and Combat Transition
status: accepted
last_updated: 2026-08-18
related:
  - ../../../gameplay/world/local-area-and-scouting.md
  - ../../../ux/views/local-view.md
  - ../combat-view/grid.md
---

# Local interaction and combat transition

- contextual prompt는 상호작용 대상 가까이에서만 간결하게 노출한다.
- 중앙 방과 네 경계 방은 실루엣과 출구 방향으로 구분하고, 통로 구간 이동 중에도 어느 월드 타일·방향에 있는지 잃지 않게 한다.
- 중앙 방 클리어 전의 미정찰 구간은 내용을 숨기고, 클리어 뒤에는 구간별 인카운터 종류와 위치를 월드 공간 표식으로 드러낸다.
- 정찰된 위협은 적 본체를 완전히 공개하지 않고 붉은 기척이나 오라로 암시한다.
- 전투 진입 시 현재 장면 위에 grid, Intent와 HUD가 조립되는 전환을 사용한다.
- 종료 시 같은 배경과 위치로 자연스럽게 해체한다.
- 전환은 로컬 공간과 전투 공간이 별도 세계처럼 보이지 않게 한다.
