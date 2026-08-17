---
title: Web Build Acceptance Criteria
status: accepted
last_updated: 2026-08-17
related:
  - scope.md
  - first-15-minutes.md
  - sector-1-golden-run.md
  - ../development/codex/assets/generation-and-validation.md
---

# Web Build acceptance criteria

제출본은 아래 항목을 실제 build에서 관찰하고 재현할 수 있을 때 범위상 완료다. 이 문서는 수치나 규칙을 새로 정의하지 않고 canonical owner의 결과를 확인한다.

## Core experience

- [첫 15분의 14개 경험](./first-15-minutes.md)이 순서상 누락 없이 도달 가능하다.
- 첫 15분 뒤 [첫 섹터 완결](./sector-1-golden-run.md#sector-completion)과 완료 후 자유 플레이가 가능하다.
- 각성·동료 해방·시설 복구가 [승인된 premise](../narrative/index.md)와 충돌하지 않는다.

## World and operations

- 어둠, 흐림, 밝음의 [시각 상태](../gameplay/world/tile-states.md)와 내부 gameplay state가 구별된다.
- 비콘과 마력 횃불이 승인된 공개·안정화 역할을 수행한다.
- 본대와 별동대가 [하나의 월드 시간](../gameplay/operations/world-time.md)에서 진행하며 현재 본대 화면을 별동대 사건이 강제로 중단하지 않는다.
- 각 부대의 [작전 채널](../gameplay/operations/operation-channel.md)이 사실을 보존하고 Decision 사건은 해당 부대만 대기시킨다.

## Combat and policy

- 적 Intent와 동료 prediction이 행동 전에 구별되어 보인다.
- 주인공 후보 행동이 동료 예상 행동을 어떻게 바꾸는지 확인한 뒤 실행할 수 있다.
- 동료는 [최대 5-slot action policy](../gameplay/combat/policy/action-policy.md)를 위에서 아래로 평가하고 실행 가능한 첫 행동을 사용한다.
- locked aim, BODY/GROUND, source death cancellation, NORMAL/UNBLOCKABLE이 [전투 계약](../gameplay/combat/turn-and-intent.md)과 일치한다.
- 같은 initial state와 같은 행동은 같은 결과·전투 기록을 만들며 제출 전투에 확률 판정이 없다.
- 다시보기와 분석에서 실제 정책 결정, 실행하지 않은 상위 정책 이유와 전후 턴·시간·피해를 확인할 수 있다.

## Progression through the sector

- 철광산 확보, 슬롯 적재·운송, 대장간 복구와 장비 제작이 [경제 정본](../gameplay/economy/index.md)에 맞게 연결된다.
- 횃불 경로 안정화, 최종 던전, 결계 수호자, 결계 해제와 demo 완료가 도달 가능하다.
- 결계 수호자는 주인공과 동료 1명으로 클리어 가능하되 정확한 pattern과 수치는 **under-validation** 결과를 따른다.

## Presentation and evidence

- enemy Intent와 ally prediction은 색뿐 아니라 시각 문법으로 구별된다.
- combat, map, local, operation view가 [UX owner](../ux/index.md)와 [Art owner](../art/index.md)의 정보 우선순위를 유지한다.
- 16:9와 4:3에서 핵심 조작, grid, HUD와 overlay가 가려지지 않는다.
- Canvas/WebGL 장면은 두 화면 비율의 browser screenshot으로 검증한다.

## Out of scope

[Submission scope](./scope.md#deferred-from-the-submission)의 deferred 항목은 이 acceptance criteria를 막지 않는다.
