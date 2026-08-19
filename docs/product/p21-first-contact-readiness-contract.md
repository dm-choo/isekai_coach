---
title: P21 First Contact Ready and Responsive Contract
status: accepted
last_updated: 2026-08-20
related:
  - steam-overwhelmingly-positive-quality-bar.md
  - ../submission/p10-solo-combat-interaction-contract.md
  - ../submission/acceptance-criteria.md
---

# P21 첫 전투 준비와 입력 신뢰 계약

## Goal

플레이어가 첫 위협을 만난 순간부터 전장이 완전히 보인 뒤에만 조작할 수 있고, 첫 입력이 즉시 preview와 수락 feedback을 바꾸게 한다.

## Failure evidence

- 공개 캡처 `02-public-solo-plan`에는 HP·Intent·조작 UI가 있지만 전장이 검다.
- `CombatStage`의 HTML HUD는 즉시 렌더되지만 `PhaserCanvas`는 lazy module, font readiness, Phaser preload와 asset decode 뒤에 붙는다.
- controller keyboard와 pointer는 presentation readiness와 무관하게 활성화되어 보이지 않는 전장의 state를 바꿀 수 있다.
- 제한망 실측에서는 combat UI와 canvas 사이가 약 2초까지 벌어졌다. 절대 시간보다 `보이기 전에 조작 가능`한 순서가 P0다.

## Player-visible outcome

- 각성 이동 중 전투 runtime과 필수 asset fetch를 시작한다.
- 전투 진입 뒤 canvas가 준비될 때까지 직전 세계 장면과 위협 pulse가 화면을 소유한다. 검은 빈 전장은 노출하지 않는다.
- Phaser가 state를 받은 뒤 React에 명시적으로 ready를 알린다.
- ready 전에는 combat primary, 이동, 기술, SPACE와 pointer가 state를 바꾸지 않는다.
- ready가 되면 gate가 사라지고 Intent→전장→조작이 한 frame hierarchy로 나타난다.

## Preserved contracts

- BattleEngine·controller가 authoritative state를 소유하고 Phaser는 presentation만 소유한다.
- 첫 조우의 위협→위험 이동 수정→안전 이동 실행 학습 순서는 바꾸지 않는다.
- keyboard·pointer parity, save/reload, 16:9·4:3과 Slice1·2 회귀를 보존한다.
- 새 설명문, 전투 규칙, 적, 정책 조건은 추가하지 않는다.

## Automated acceptance

- cold와 warm 모두 `[data-combat-presentation=READY]` 전에 보이는 combat control이 0개다.
- ready 전 SPACE·WASD·QER·pointer가 combat state를 바꾸지 않는다.
- 지연 fixture의 0/100/500ms frame에 검은 빈 전장이 없고 continuity gate가 viewport를 채운다.
- ready 뒤 첫 이동 input은 100ms 안에 preview position과 accepted feedback을 함께 바꾼다.
- report는 combat 진입→ready와 첫 입력→preview 시간을 기록한다.
- console, page, request error 0이며 기존 solo combat과 누적 domain test가 통과한다.

## Human acceptance

- 신규 사용자 3명 모두 도움 없이 첫 전투를 시작한다.
- 모두 90초 안에 위험 칸을 피하고 plan을 확정한다.
- 아무도 `눌린 건가`, `무엇을 조작해야 하나`, `화면이 안 뜬다`고 묻지 않는다.

사람 gate 전에는 조작감이 검증됐다고 부르지 않는다. P21 기술 종료 조건은 보이지 않는 입력과 검은 전환을 자동·시각 증거로 제거하는 것이다.

