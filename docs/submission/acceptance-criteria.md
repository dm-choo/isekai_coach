---
title: Web Build Acceptance Criteria
status: accepted
last_updated: 2026-08-19
related:
  - scope.md
  - acceptance-evidence-matrix.md
  - first-15-minutes.md
  - sector-1-golden-run.md
  - ../gameplay/world/barrier-territory.md
  - ../gameplay/operations/delegated-expeditions.md
---

# Web Build acceptance criteria

제출본은 아래 결과를 같은 build에서 실제로 관찰하고 재현할 수 있을 때 범위상 완료다.

## Core experience

- 시작 화면만 보고 초기 결계 안과 바깥 frontier를 구분할 수 있다.
- 직접 첫 조우, 규칙 관찰, 정책 수정, 알려진 통로 위임이 끊기지 않는 한 흐름이다.
- 위임 결과가 전투력 숫자가 아니라 실제 경로·공간 행동·피해·시간으로 설명된다.
- 동료가 경로를 확보해도 주인공이 거점을 활성화하기 전에는 영토가 편입되지 않는다.
- 활성화 뒤 실제 결계선이 한 타일 바깥으로 움직이고 샘과 다음 좌표가 열린다.
- 플레이어가 `전투 승리`와 `영토 편입`, `영토 편입`과 `안정화`를 서로 다른 개념으로 볼 수 있다.

## Information and control

- 모든 시점에 primary action 하나가 화면에서 가장 먼저 읽힌다.
- 키보드와 pointer 입력 모두 hover/focus, press, accepted/rejected와 result 상태를 구분한다.
- 사용할 수 없는 행동은 state를 바꾸지 않고 입력 근처에 구체 이유를 보여 준다.
- 적 Intent, 관리자 plan과 동료 prediction은 색뿐 아니라 형태·anchor·animation 문법으로 구별된다.
- 같은 적이 여러 명이어도 source→path→target 관계를 추적할 수 있다.
- 정책 화면은 직전 실제 행동과 막힌 상위 규칙을 먼저 보여 주며 전체 설명을 기본으로 펼치지 않는다.
- 위임 화면은 목적지, 경로, 예상 시간, 보급, 중단 조건을 한 장에서 확인시킨다.

## World and simulation

- 타일의 지식·위협·영토·효용 상태가 내부적으로 독립되어 있다.
- 중앙 방 해결이 해당 타일 통로 정찰의 유일하고 결정론적인 원인이다.
- 직접 플레이와 위임 작전이 같은 방·통로·전투 grid·시간·Intent 규칙을 사용한다.
- 모든 부대는 같은 세계 시간을 공유하며 Decision은 해당 부대만 멈춘다.
- 패배와 재시도는 encounter를 다시 추첨하지 않으며 시간·보급·부상 비용을 지우지 않는다.
- 편입은 현재 영토와 상하좌우로 인접한 확보 타일에만 가능하다.
- 불안정화되어도 편입 소속과 시설은 유지되고 안전 이동·생산·정찰만 손상된다.

## Submission scope

- 주인공 1명과 동료 1명으로 전체 골든 런을 완료할 수 있다.
- 최초 frontier 타일 하나와 다음 좌표 공개만으로 제품 proof가 끝난다.
- 샘의 물 보충이 다음 원정 가능 거리를 이해 가능한 방식으로 바꾼다.
- 철광산, 대장간, 다중 부대, 섹터 보스와 장기 성장 없이도 핵심 cycle이 성립한다.
- 16:9와 4:3에서 결계선, 현재 좌표, primary action, grid와 정책 결과가 가려지지 않는다.

## Automated gates

- typecheck와 규칙 unit tests
- fixed-seed 직접/위임 parity scenario
- 영토 상태 전이와 잘못된 편입 거부 scenario
- save/load·retry determinism scenario
- 첫 15분 browser golden path와 console error 0건
- 기존 Slice 1·2 combat/corridor regression

## Human gates

큰 milestone마다 새로운 사람 2~3명에게 무설명 테스트한다.

- 2명 이상이 초기 결계와 다음 frontier를 자기 말로 구분한다.
- 2명 이상이 외부 도움 없이 첫 조우를 시작하고 plan을 확정한다.
- 2명 이상이 동료 행동 하나의 원인을 정책 또는 공간 규칙으로 설명한다.
- 2명 이상이 위임 작전을 시작하고 결과에서 핵심 손익을 찾는다.
- 2명 이상이 결계 확장을 자신의 탐사·위임 결과로 연결한다.
- 최소 1명이 다음에 확장할 좌표나 필요한 준비를 자발적으로 말한다.

통과 전에는 직관성, 핵심 경험 또는 재미를 validated로 올리지 않는다.
