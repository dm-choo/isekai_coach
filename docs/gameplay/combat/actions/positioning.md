---
title: Positioning Action
status: accepted
last_updated: 2026-08-17
related:
  - evade.md
  - weapon-actions.md
  - ../policy/action-policy.md
---

# Positioning

- Slice 1의 궁수는 기본 `사격`이 닿도록 같은 행의 가장 앞선 적을 기준으로 한 칸 이동한다. 향후 특정 적 우선 정책은 별도 확장이다.
- 현재 위치에서 이미 그 공격이 가능하면 실행하지 않는다.
- 현재 턴의 공개 정보만 사용하고 다단계 콤보를 역산하지 않는다.
- 탐욕적이고 결정론적인 판단이며 완전 최적 AI를 목표로 하지 않는다.

구체적인 동일 거리 tie-break는 아직 확정하지 않는다.
