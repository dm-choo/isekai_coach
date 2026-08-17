---
title: Future Policy Language
status: deferred
last_updated: 2026-08-17
related:
  - action-policy.md
  - ../../knowledge/bestiary.md
  - ../../../adr/0005-action-policy-first.md
---

# Future policy language

## Accepted direction

제출본 이후 정책 언어는 다음 순서로 확장한다.

1. 행동 정책: 무엇을 할 것인가
2. 표적 지침: 누구를 우선할 것인가
3. 관찰된 적 태그 필터: 어떤 행동·대상 후보를 제외할 것인가
4. 결과 기반 제약: 행동 후 예상 결과가 조건을 만족할 때만 허용

도감에서 관찰한 `#반격`, `#자폭`, `#피격강화`, `#집중`, `#전투성장`, `#소환` 같은 태그를 해금할 수 있다.

## Deferred implementation

정확한 문법, UI, 조합 규칙과 데이터 모델은 제출본 이후로 미룬다. 도감은 `반격 회피` 같은 디자이너 정답형 preset protocol을 제공하지 않는다.
