---
title: ADR-0007 No Combat RNG in the Submission
status: accepted
last_updated: 2026-08-17
related:
  - ../gameplay/combat/turn-and-intent.md
  - ../gameplay/combat/policy/action-policy.md
  - ../ux/flows/replay-and-analysis.md
  - ../development/architecture/existing-scaffold-contract.md
---

# ADR-0007: No combat RNG in the submission

## Context

제출본의 핵심 학습 루프는 실패 원인을 관찰하고 정책 하나를 바꾼 뒤 같은 조건에서 결과 차이를 이해하는 것이다. 명중, 치명타, 무작위 피해나 확률 기절이 끼면 정책 수정의 효과와 우연을 분리하기 어렵고 replay 분석의 설명력이 낮아진다.

## Decision

제출본 combat resolution에는 명중, 치명타, 무작위 피해, 확률 상태와 동일 상태에서 달라지는 동료 행동을 넣지 않는다. 같은 initial state와 action sequence는 같은 final state와 event sequence를 만든다. 미래 RNG는 필요할 때 seed 가능한 경계로만 주입한다.

## Alternatives considered

- 일반적인 hit·critical 확률 사용
- 피해 범위 roll만 허용
- 결과를 저장하되 simulation 자체는 unseeded RNG 사용
- 연출상 RNG와 규칙 RNG를 구분하지 않음

## Consequences

Intent, prediction, replay와 정책 비교가 설명 가능하고 테스트 재현성이 높다. 확률로 다양성을 만드는 콘텐츠는 제출본에서 사용할 수 없으며, 향후 RNG를 추가하면 seed, event 기록과 replay 계약을 함께 설계해야 한다.

## Canonical docs

- [Turn and Intent](../gameplay/combat/turn-and-intent.md)
- [Action policy](../gameplay/combat/policy/action-policy.md)
- [Replay and analysis](../ux/flows/replay-and-analysis.md)
- [Existing scaffold contract](../development/architecture/existing-scaffold-contract.md)
