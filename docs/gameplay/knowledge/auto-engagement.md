---
title: Auto-engagement Authorization
status: accepted
last_updated: 2026-08-19
related:
  - bestiary.md
  - ../operations/operation-channel.md
  - ../operations/parties.md
  - ../operations/delegated-expeditions.md
---

# Auto-engagement authorization

- 별동대가 미확인 몬스터를 만나면 전투 시작 전에 해당 별동대만 정지한다.
- 주인공이 그 적과 한 번 교전한 뒤 자동 교전을 허가할 수 있다.
- 모든 기술을 보지 못했어도 허가할 수 있지만 경고할 수 있다.
- 알려진 적은 별동대의 action-policy와 같은 결정론적 전투 규칙으로 자동 교전한다.
- 적이 알려져 있어도 미관찰 지형 효과, 경로 규칙 또는 되돌릴 수 없는 사건이 있으면 Decision에서 멈춘다.
- 자동 교전 허가는 실제 simulation을 전투력 수치 비교로 바꾸지 않는다.

정확한 적 행동 모델을 자동으로 추론해 정답을 제시하지 않는다.
