---
title: P16 Policy Spatial Choice Contract
status: accepted
last_updated: 2026-08-19
related:
  - first-15-minutes.md
  - ../ux/views/policy-editor.md
  - ../gameplay/combat/policy/action-policy.md
  - p15-retrospective.md
---

# P16 정책 선택의 공간 결과 계약

## Goal

P15의 `동료—거리 1—적—사격 차단—기록`을 정책 검토에서도 같은 시각 언어로 이어, 플레이어가 긴 설명을 읽기 전에 `무엇이 실패했는지`, `두 대응이 공간을 어떻게 다르게 바꾸는지`, `정책의 어느 한 곳이 바뀌는지`를 보게 한다.

## Authoritative boundary

- `PUSH_FIRST`는 정책 순서를 `PUSH → EVADE → POSITION → SHOOT → EMPTY`로 바꾼다.
- `KEEP_RANGE`는 기본 순서를 유지하고 `policyDirectives.keepRange=true`만 추가한다.
- 위임 simulation을 실행하기 전에는 HP·턴·성공 여부를 예측하거나 정답을 표시하지 않는다.
- 이전 실제 전투 기록은 정책 선택으로 바뀌지 않는다. 화면의 before scene은 `lastCombatSummary.blockedByPolicy.SHOOT`가 소유한다.

## Scene contract

1. 왼쪽 actual record는 동료, 거리 1, 인접 적, crossed shoot와 실제 blocked count 하나만 크게 보여 준다.
2. 오른쪽에는 두 선택만 있다.
   - `PUSH_FIRST`: 동료 위치는 유지하고 인접 적을 바깥으로 밀어내는 lane, push `4→1`.
   - `KEEP_RANGE`: 적 위치는 유지하고 동료가 물러나는 lane, distance `1→3+`.
3. 선택 전 primary SPACE는 disabled이며 두 카드에 `1`, `2` 단축키가 보인다. `1/Q`, `2/E`와 pointer가 같은 authoritative choice를 만든다.
4. 선택하면 해당 lane·check와 policy delta가 함께 강조된다.
5. `NOW → NEXT`는 5-slot을 icon·rank로 보여 주되 바뀐 `PUSH` 또는 `POSITION+3`만 강조한다.
6. 대형 질문 제목, 선택 설명 문단, text-only 5-slot bar는 0개다.
7. 선택 뒤 primary는 `selected rule icon → known route glyph → SPACE` 하나이며 `DELEGATION_PLAN`으로 이어진다.

## Acceptance

- evidence kind와 blocked count가 snapshot과 같다.
- 선택 버튼 2개, primary action 1개, 선택 전 disabled다.
- pointer와 `1/Q`, `2/E`가 각각 controller의 정확한 policy·directive를 만든다.
- PUSH는 `data-policy-order=PUSH>EVADE>POSITION>SHOOT>EMPTY`, KEEP_RANGE는 기본 order와 directive `KEEP_RANGE`다.
- 선택 뒤 changed slot 1개, 선택 card 1개, primary enabled다.
- 1280×720과 960×720에서 record, 두 lane, order delta, primary가 viewport 안이고 horizontal overflow 0이다.
- text-off frame에서 실패 장면, 두 공간 대응과 선택 상태가 남는다.
- browser error 0이다.

자동화는 상태·구조·입력 parity를 판정한다. 신규 사용자가 두 선택의 차이와 trade-off를 자기 말로 설명하는지는 human gate 전까지 REQUIRED다.
