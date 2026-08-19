---
title: ADR-0005 Action-policy Priority First
status: accepted
last_updated: 2026-08-19
related:
  - ../gameplay/combat/policy/action-policy.md
  - ../gameplay/combat/policy/future-policy-language.md
  - ../ux/views/policy-editor.md
---

# ADR-0005: Action-policy priority first

## Context

정책 기반 전투의 가치를 15분 안에 가르쳐야 한다. 자유 조건식, targeting 언어와 node graph를 먼저 도입하면 한 번의 원인-결과 수정이 복잡해지고 제출 범위가 편집기 제작으로 이동한다.

## Decision

제출본은 동료별 최대 5개의 원자 행동을 위에서 아래로 평가하는 action-policy priority를 먼저 사용한다. 실행 가능한 첫 행동을 택하고 AP가 남으면 갱신된 상태에서 처음부터 다시 평가한다. 직접 조우에서 관찰한 공간 원칙을 위임으로 전이하기 위해 제한된 공간 지침 하나를 함께 검증한다. 자유 조건·표적·태그·결과 제약은 후속 정책 언어의 단계적 확장으로 둔다.

## Alternatives considered

- 자유 조건식과 AND/OR를 제출본부터 제공
- 자연어 또는 LLM 기반 정책 해석
- node/card graph 편집기
- 디자이너가 정답 조건 preset을 제공

## Consequences

정책 수정의 원인과 결과를 읽기 쉽고 튜토리얼 범위를 통제하면서도 자동행동이 공간 게임으로 남는다. 표현력은 제한되며 장기 정책 언어와 target guidance를 추가할 때 기존 action priority를 보존하는 확장 경계가 필요하다.

## Canonical docs

- [Submission action policy](../gameplay/combat/policy/action-policy.md)
- [Spatial policy language](../gameplay/combat/policy/future-policy-language.md)
- [Policy editor UX](../ux/views/policy-editor.md)
