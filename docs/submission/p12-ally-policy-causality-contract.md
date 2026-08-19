---
title: P12 Ally Policy Causality Contract
status: accepted
last_updated: 2026-08-19
related:
  - p11-normal-combat-information-contract.md
  - first-15-minutes.md
  - ../gameplay/ally-policy.md
---

# P12 동료 정책 인과 계약

## Goal

첫 동료 합류 전투에서 플레이어가 긴 정책 설명을 읽지 않고 다음 관계를 발견한다.

> 동료 예정 행동에는 정책 우선순위 번호가 있다 → 내 계획 뒤 forecast가 다시 계산된다 → 동료 턴에 같은 번호의 정책이 실제 행동으로 실행된다.

정책 편집을 앞당기거나 새로운 Gambit 문법을 만드는 것이 Goal이 아니다. 이미 존재하는 결정론적 정책의 source와 결과를 같은 시각 문법으로 연결한다.

## Progressive disclosure

### Forecast

- 닫힌 ally card에는 동료 초상, `현재 상태 ○` 또는 `내 계획 ◇`, 화살표와 `정책 번호 + 행동 icon`만 보인다.
- forecast step은 선택된 `policyId`, 현재 순서의 `policyRank`, 선택 이유와 앞에서 탈락한 정책을 authoritative projection에서 함께 받는다.
- 플레이어 계획이 바뀌면 basis가 `CURRENT → PLANNED`로 바뀌고 forecast sequence가 같은 자리에서 다시 그려진다.

### Why

- 상세 정책은 기본으로 닫혀 전장을 가리지 않는다.
- 펼치면 1~5 정책 icon strip에서 forecast가 사용한 번호만 강조한다.
- 각 step은 선택 이유와 그 전에 실패한 번호·이유를 보여 준다. 이 text는 demand layer이며 기본 조작에 필요하지 않다.

### Result

- 동료 턴에는 같은 1~5 strip을 다시 사용한다.
- 현재 선택된 번호와 icon을 강조하고, 그 아래에 `✓ + 번호 + 행동 icon + 결과 이유`를 표시한다.
- forecast와 execution은 이름이나 색만이 아니라 동일한 번호와 icon으로 연결된다.

## Automated evidence

- 첫 합동 전투 player turn에 policy-linked ally card 1개, 기본 closed
- forecast 모든 step이 policy rank/id를 가짐
- detail closed 시 policy strip·이유 0개, open 시 policy slot 5개와 blocked-before reason 존재
- player plan 전 `CURRENT`, 계획 후 `PLANNED`; authoritative actor 위치는 유지되고 preview와 forecast projection만 갱신
- 계획된 첫 forecast policy와 ally execution에서 포착된 policy ID가 같음
- 16:9와 4:3에서 card/detail이 viewport 안이며 browser error 0

## Human gate

처음 보는 사람이 번호를 우선순위로 이해하고, 자기 계획이 동료 행동을 바꿀 수 있다고 스스로 말하는지는 신규 사용자 관찰이 필요하다. 자동 gate는 이 멘탈 모델의 실제 형성을 통과로 주장하지 않는다.
