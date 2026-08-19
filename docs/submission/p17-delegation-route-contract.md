---
title: P17 Delegation Route Contract
status: under-validation
last_updated: 2026-08-19
related:
  - first-15-minutes.md
  - sector-1-golden-run.md
  - p16-policy-spatial-choice-contract.md
---

# P17 위임 경로와 중단 조건 계약

## Goal

정책 선택 뒤 플레이어가 주문서 표를 읽지 않고 `누구에게 어떤 규칙으로 어느 길을 맡기는지`, `길에서 무엇을 만나는지`, `언제 멈추는지`, `같은 시간에 주인공은 무엇을 하는지`를 한 공간 계획으로 확인하게 한다.

## Authoritative boundary

- 동쪽 400m, 이동 8분, 알려진 고블린 전사·궁수, `retreatAtHp=2`, 전투 12턴 제한, 미확인 규칙 중단, 위임 중 보급 미사용 규칙은 그대로 둔다.
- 주인공의 첫 확장 회로 준비는 5분이며 동료 작전과 합산하지 않고 더 오래 걸린 쪽만큼 세계 시간이 흐른다.
- 선택된 `PUSH_FIRST` 또는 `KEEP_RANGE`는 P16의 authoritative `policy`·`policyDirectives`를 그대로 사용한다.
- 성공률·예상 HP·예상 전투 턴·추천 판정은 표시하지 않는다. 실제 simulation 결과가 다음 화면을 소유한다.

## Scene contract

1. 중앙의 가장 큰 owner는 `동료+선택 정책 → 0/200/400m route → 관찰된 두 적 → 경계 방`이다.
2. 동료에는 현재 HP bar와 선택한 정책 icon·delta가 붙는다.
3. 알려진 적은 route의 실제 상대 위치에 붙고 attack/shoot icon으로 종류를 구분한다.
4. 중단 조건은 route 아래 한 strip에 붙는다: `HP≤2→pause`, `clock 12→pause`, `?→pause`; 물·식량 `×0`는 소모하지 않음을 보인다.
5. 하단 병렬 lane은 한 clock origin에서 주인공 `5`와 동료 `8+?`가 동시에 출발해 합산이 아님을 선으로 보인다.
6. 대형 heading, 설명 문단, 6행 주문서와 별도 concurrent text cards는 0개다.
7. primary는 `선택 정책 icon → play → SPACE` 하나다.

## Acceptance

- route distance 400, known threats 2, selected policy가 snapshot과 같다.
- route party 1, threat 2, goal 1, stop condition 3, supply-use 0 marker 1이다.
- HP bar와 `retreatAtHp=2`, turn=12, protagonist=5, travel=8+?가 authoritative 값과 같다.
- primary action은 1개이며 SPACE로 동일한 `runDelegation`을 실행한다.
- 1280×720과 960×720에서 route, stop strip, parallel lane, primary가 viewport 안이고 overflow 0이다.
- text-off frame에도 actor, policy, path, two threats, stop, parallel timing과 start action이 남는다.
- browser error 0이다.

자동 검증은 계획 정보와 state parity를 판정한다. 신규 사용자가 이를 `동료에게 맡기되 조건에서 멈춘다`, `주인공도 동시에 움직인다`고 설명하는지는 human gate 전까지 REQUIRED다.
