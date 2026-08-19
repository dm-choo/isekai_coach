---
title: Policy Editor UX
status: under-validation
last_updated: 2026-08-19
related:
  - ../../gameplay/combat/policy/action-policy.md
  - ../flows/replay-and-analysis.md
  - ../../submission/first-15-minutes.md
---

# Policy editor UX

이 문서는 정책 작성 경험을 소유한다. 기존 Slice 1 보스방에서는 fixed 5-slot 궁수 policy를 관찰만 하지만 새 제출 골든 패스에서는 직접 조우 뒤 한 곳을 수정한다.

- 최대 5개의 원자 행동 슬롯을 위에서 아래 우선순위로 보여준다.
- 제출본 핵심 편집은 정책 순서 또는 제한된 `사거리 유지` 지침 중 직전 결과와 연결된 한 곳이다.
- 각 정책의 실행 가능 여부는 현재 상태에 따라 평가되지만 전체 판정표를 전투뷰에 상시 표시하지 않는다.
- 분석 모드에서는 당시 실행되지 않은 상위 정책의 이유를 확인할 수 있다.
- 첫 편집 화면은 전체 규칙표보다 직전 실제 행동, 막힌 상위 정책과 관련 공간을 먼저 보여 준다.
- 변경 뒤 알려진 통로 위임의 실제 이동·행동·피해·시간으로 효과를 확인한다. 시스템이 개선 또는 정답으로 채점하지 않는다.

자유 조건식, AND/OR, 자연어, node graph와 복잡한 target editor는 제출본에 없다.
