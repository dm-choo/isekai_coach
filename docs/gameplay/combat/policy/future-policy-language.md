---
title: Spatial Policy Language
status: accepted
last_updated: 2026-08-19
related:
  - action-policy.md
  - ../../knowledge/bestiary.md
  - ../../../adr/0005-action-policy-first.md
---

# Spatial policy language

## Accepted direction

정책 언어는 자동전투를 강함 비교가 아니라 공간 원칙의 실행으로 유지해야 한다. 다음 순서로 확장한다.

1. 행동 정책: 무엇을 할 것인가
2. 표적 지침: 누구를 우선할 것인가
3. 공간 지침: 어느 행·거리·엄폐·경로를 선호하거나 피할 것인가
4. 관찰된 적 태그 필터: 어떤 행동·대상 후보를 제외할 것인가
5. 결과 기반 제약: 행동 후 예상 위치·피해·충돌이 조건을 만족할 때만 허용

도감에서 관찰한 `#반격`, `#자폭`, `#피격강화`, `#집중`, `#전투성장`, `#소환` 같은 태그를 해금할 수 있다.

## Grammar constraints

- 정책은 현재 simulation에서 관찰 가능한 사실만 참조한다.
- 공간 조건은 화면의 grid·행·거리·위험 영역과 같은 어휘를 사용한다.
- 실행 전에 현재 상태에서 선택될 행동과 이유를 preview할 수 있어야 한다.
- 실행하지 못한 상위 규칙은 한 문장의 구체 원인을 남긴다.
- 디자이너가 적 하나의 정답을 이름 붙인 preset으로 제공하지 않는다.
- 전투 정책과 원정 작업 preset을 하나의 거대한 조건 편집기로 합치지 않는다.

## Submission boundary

제출본은 최대 5개 action priority와 하나의 제한된 공간 지침만 사용한다. 후보는 `사거리 유지`, `위험 칸 회피`, `지정 행 유지`이며, 실제 제출 규칙은 한 개만 선택해 입력→결과 인과를 검증한다.

정확한 조건 조합 UI, AND/OR, nested rule과 데이터 모델은 제출본 이후로 **deferred**다.
