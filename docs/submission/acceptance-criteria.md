---
title: Web Build Acceptance Criteria
status: accepted
last_updated: 2026-08-19
related:
  - scope.md
  - first-15-minutes.md
  - sector-1-golden-run.md
  - ../development/codex/assets/generation-and-validation.md
---

# Web Build acceptance criteria

제출본은 아래 항목을 실제 build에서 관찰하고 재현할 수 있을 때 범위상 완료다. 이 문서는 수치나 규칙을 새로 정의하지 않고 canonical owner의 결과를 확인한다.

## Core experience

현재 Slice 1 acceptance는 아래 `Slice 1 combat scene`을 먼저 적용한다. 전체 제출본의 장기 흐름은 아직 별도 under-validation이다.

### Slice 1 combat scene

- 아마존 정글 결계문 앞 장면이 scene-first로 보이고, 관리자가 전투원으로 서 있다.
- `<내 턴>`, `<아군 턴>`, `<적 턴>`이 실제 actor animation과 일치한다.
- WASD 이동과 `밀치기`·`내려찍기` 공격이 별도 입력 동사로 읽힌다.
- 수호자의 `제압`을 밀치기로 피하고 `외침`을 내려찍기로 interrupt하는 흐름이 재현된다.
- 관리자의 plan은 `Z` 마지막 하나 undo, `Space` 전체 확정이며 hover what-if가 ally policy와 enemy Intent를 함께 반영한다.
- 궁수의 고정 5-slot policy는 자동 실행되며 Slice 1에는 policy 편집 UI가 없다.
- 승리 뒤 관리자만 결계 오브젝트를 봉인 해제한다.

- 관리자 단독 규칙 학습, 원거리 동료 합류, 짧은 원정, 정책 수정, 새 조합, 보스와 결계 해제가 20~30분 골든 패스로 연결된다.
- 처음 보는 플레이어가 조작과 기본 전투 문법을 외부 설명 없이 발견한다.
- 각성·동료 합류와 결계 해제가 [승인된 premise](../narrative/index.md)와 충돌하지 않는다.

## World and operations

- 어둠, 흐림, 밝음의 [시각 상태](../gameplay/world/tile-states.md)와 내부 gameplay state가 구별된다.
- 비콘과 마력 횃불이 승인된 공개·안정화 역할을 수행한다.
- 짧은 원정의 이동·전투·휴식이 [하나의 월드 시간](../gameplay/operations/world-time.md)을 공유한다.
- 월드 시스템은 전투와 정책 선택에 영향을 주는 범위만 포함한다.

## Combat and policy

- 적 Intent와 동료 prediction이 행동 전에 구별되어 보인다.
- 이동·공격·사격·부가 효과는 구체 icon과 hover/focus tooltip으로 행동 대상·범위·피해를 설명하며, 예정된 최종 위치에는 faction별 ghost가 보인다.
- Slice 1에서 관리자의 이동·공격과 궁수의 자동 행동이 서로 다른 agency로 보인다.
- 모든 생존 적은 compact target picker와 world unit 양쪽에서 직접 선택할 수 있고, 소환수도 적 HP 색과 player action target 규칙을 따른다.
- 동료는 [최대 5-slot action policy](../gameplay/combat/policy/action-policy.md)를 위에서 아래로 평가하고 실행 가능한 첫 행동을 사용한다.
- locked aim, BODY/GROUND, source death/stun cancellation이 [전투 계약](../gameplay/combat/turn-and-intent.md)과 일치한다.
- 같은 initial state와 같은 행동은 같은 결과·전투 기록을 만들며 제출 전투에 확률 판정이 없다.
- 다시보기·정책 분석은 Slice 1 이후 장기 범위이며, 현재 scene acceptance를 막지 않는다.

## Progression through the demo

- 정책 수정 전후의 실제 결과 차이, 결계 수호자, 결계 해제와 demo 완료가 도달 가능하다.
- 결계 수호자는 주인공과 동료 1명으로 클리어 가능하되 정확한 pattern과 수치는 **under-validation** 결과를 따른다.

## Presentation and evidence

- enemy Intent와 ally prediction은 색뿐 아니라 시각 문법으로 구별된다.
- combat, map, local, operation view가 [UX owner](../ux/index.md)와 [Art owner](../art/index.md)의 정보 우선순위를 유지한다.
- 16:9와 4:3에서 핵심 조작, grid, HUD와 overlay가 가려지지 않는다.
- Canvas/WebGL 장면은 두 화면 비율의 browser screenshot으로 검증한다.
- Slice 1 smoke는 `npm run verify:combat-ux`로 Playwright 1280×720의 turn 1/tooltip/plan/turn 2 interrupt preview/turn 3 summon/turn 4 hound selection, 상태 assertion과 console errors 0건을 확인한다.

## Out of scope

[Submission scope](./scope.md#deferred-from-the-submission)의 deferred 항목은 이 acceptance criteria를 막지 않는다.
