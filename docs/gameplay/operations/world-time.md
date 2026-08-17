---
title: Shared World Time
status: accepted
last_updated: 2026-08-17
related:
  - parties.md
  - operation-channel.md
  - ../world/local-area-and-scouting.md
  - ../../adr/0003-shared-world-time.md
---

# Shared world time

- 본대 1작전과 별동대 1작전을 1:1 tick으로 묶지 않는다.
- 모든 부대는 같은 세계 시간에서 독립적으로 진행한다.
- 시간은 월드 타일 이동, 통로·지점 이동, 조우 기본 시간, 실제 전투 턴, 시설 상호작용, 채집, 하역과 휴식에서 파생한다.
- 전투 시간은 애니메이션 수가 아니라 턴 수를 기준으로 한다.
- 주인공 전투 도중 별동대 사건으로 현재 화면을 중단하지 않는다.
- 본대 작전 종료 뒤 실제 경과 시간만큼 별동대를 일괄 시뮬레이션한다.

세부 사건 비용은 콘텐츠 밸런스 데이터로 두며 여기서 확정하지 않는다.
