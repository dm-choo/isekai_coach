---
title: Existing Scaffold Contract
status: accepted
last_updated: 2026-08-17
implementation:
  - src/game/combat/
  - src/game/slice/
  - src/game/phaser/
  - src/game/assets/AssetManifest.ts
  - src/app/App.tsx
  - deploy/
  - .github/workflows/ci.yml
related:
  - ../../gameplay/combat/index.md
  - ../../gameplay/combat/turn-and-intent.md
  - ../../gameplay/combat/policy/action-policy.md
  - ../../ux/views/combat-view.md
  - ../../art/ui/combat-view/index.md
  - ../../submission/vertical-slice.md
  - ../deployment/slice1.md
---

# Existing scaffold contract

이 문서는 현재 전투 runtime과 Slice 1 public scene이 의존하는 기술 계약을 소유한다. 게임 전체의 최종 수치나 콘텐츠를 잠그는 문서가 아니다. 구현과 문서가 어긋나면 숨은 관례를 만들지 말고 같은 변경에서 함께 갱신한다.

## Architecture

- 전투 simulation은 Phaser와 React에 의존하지 않는 pure TypeScript domain이다.
- `BattleState`가 규칙의 source of truth다. sprite 위치, tween 진행도와 React component state가 전투 결과를 결정하지 않는다.
- `BattleEngine`은 state transition과 구조화된 `CombatEvent`를 만들고, presentation은 `CombatEvent → AnimationDirector → Phaser` 순서로 확정된 사실을 재생한다.
- simulation 결과와 presentation 속도는 분리한다. pause, step, 배속과 instant는 결과·event 순서를 바꾸지 않는다.
- reset, 장면 전환과 Scene detach는 현재 presentation을 abort한다. 이전 generation의 tween/timer가 새 전투를 갱신하거나 영원히 대기하지 않는다.
- React와 Phaser는 typed bridge/event boundary로 통신한다. React가 Scene 내부 state를 직접 변경하지 않는다.
- logical grid 좌표와 화면 projection을 분리한다. 카메라가 보여주는 영역과 `12 x 3` 논리 topology는 같은 계약이 아니다.

## Grid, units, and actions

- Slice 1의 논리 맵은 `12 x 3`이다. 화면에는 점유·관련 Intent 영역을 중심으로 framing하며 빈 열 12개를 항상 노출할 필요가 없다.
- 이동은 상하좌우 인접 셀을 사용하는 WASD 동사이며 공격과 별개다. 경계 밖, 대각선, 점유 셀 이동은 허용하지 않는다.
- 관리자와 원거리 동료는 domain에서 같은 `STUDENT` faction 규칙을 공유하지만 controller가 역할과 턴 책임을 분리한다. 관리자는 전투원이며 매 턴 자신의 이동·공격을 고른다.
- 적과 아군은 공통 unit model을 사용한다. 여러 아군·적을 수용하는 domain 경계는 유지한다.
- 대상 선정과 effect 적용은 분리한다. 피해·밀치기·stun을 ability data의 effect 순서로 적용할 수 있으며 renderer가 결과를 결정하지 않는다.
- 밀치기는 경계와 점유를 검사하는 강제 이동 primitive다. 막히면 unit이 겹치거나 맵 밖으로 나가지 않는다.
- `사격`은 같은 행의 투사체이며 기본적으로 가장 앞의 적 하나에서 멈춘다. 포지셔닝은 기본적으로 이 앞선 적을 기준으로 한다.

## Slice 1 turn pipeline

1. 전투 진입 연출 뒤 적 Intent를 선언·표시한다.
2. `<내 턴>`에 관리자가 WASD 이동과 action bar 공격을 별개로 선택한다. AP가 남으면 여러 행동을 이어가거나 턴을 끝낸다.
3. `<아군 턴>`에 궁수 동료가 고정된 5-slot policy를 위에서부터 평가하고 실행 가능한 첫 행동을 한다. 이 장면에서 policy 편집은 없다.
4. `<적 턴>`에 살아 있고 중단되지 않은 locked Intent를 해결한다.
5. 피해·상태·사망·위치·Intent 취소를 event 순서로 정산하고 다음 턴을 시작한다.
6. 승리 뒤 관리자만 결계 오브젝트의 봉인을 해제한다.

## Locked Intent and interruption

- Intent 선언 뒤 아군이 움직여도 적은 재조준하지 않는다.
- `BODY` Intent는 source의 현재 body 위치에서 같은 direction으로 footprint를 다시 계산한다. 따라서 수호자를 `밀치기`하면 짧은 타격의 공격 원점과 범위도 함께 이동한다.
- `GROUND` 계약은 선언 당시 origin과 footprint를 유지한다. Slice 1의 보스 공격은 BODY anchor다.
- `짧은 타격`은 한 칸 범위의 치명적 BODY 공격이며 stun으로 중단되지 않는다.
- `광범위 공격`은 3개 행을 덮는 BODY Intent이며 `내려찍`의 확정 stun으로 중단할 수 있다.
- source가 실행 전에 죽거나 stun으로 interrupt되면 Intent를 취소하고 공격 effect를 실행하지 않는다.
- 이동 경로와 공격 effect cell은 별도 의미다. 이동 목적지를 빨간 공격 threat처럼 표시하지 않는다.

## Determinism and history

- Slice 1 combat resolution에는 명중·치명타·무작위 피해가 없다. 같은 initial state와 입력 sequence는 같은 state와 event sequence를 만든다.
- `Math.random()`은 domain에서 사용하지 않는다. 미래 확률 시스템은 seed 가능한 경계를 먼저 만든 뒤 별도 결정으로 추가한다.
- event history는 턴, Intent, AP 회복·소비, 이동, 능력 사용, 상태, 피해, 밀치기, 취소와 사망 등 의미 있는 transition을 보존한다.
- 죽은 unit은 이후 행동·Intent를 실행하지 않는다.

## Presentation contract

- 전투 장면은 정글 배경과 이어진 흙바닥을 우선하며, 상시 유리 발판처럼 보이는 grid를 그리지 않는다.
- 캐릭터와 보스는 cell보다 크게 보일 수 있고 서로 겹칠 수 있다. depth는 행 위치와 이동에 따라 갱신한다.
- `<내 턴>`, `<아군 턴>`, `<적 턴>`은 배너·상태 변화·행동 애니메이션으로 명시한다. 텍스트만으로 현재 주체를 추측하게 하지 않는다.
- `idle`, `move`, `attack`, `hit`, `knockback`, `stun`, `death`와 봉인 해제 연출은 서로 구별되어야 한다. 이동과 공격을 같은 tween으로 축약하지 않는다.
- 투사체, wind-up, 타격, hit-stop·camera feedback과 죽음은 전투 인과를 시간 순서로 전달한다.
- asset manifest는 등록된 bitmap/spritesheet를 사용하되 fallback visual도 유지한다. simulation은 asset key나 clip 이름을 알지 않는다.

## Slice 1 authored surface

- `src/game/slice/scenario.ts`는 관리자, 활 동료와 결계 수호자가 아마존 정글 결계문에서 만나는 단일 authored fixture를 정의한다.
- 관리자 action bar의 승인된 이름은 `밀치기`, `내려찍`이며, WASD 이동은 action bar 공격과 분리한다.
- 궁수 동료의 고정 5-slot policy는 `회피 → 포지셔닝 → 사격 → 밀치기 → 빈 슬롯`이다. public scene에서 순서를 수정하지 않는다.
- public 전투에서 임의의 `방어 전개`, `맥동 밀치기`, `신호 창격` 명칭이나 정책 편집 dashboard를 노출하지 않는다.
- 승리 화면의 다음 행동은 `봉인 해제`이며, 이것이 관리자 특수성의 전장 표현이다.
- 배포는 `/slice1/` path만 소유하고 기존 `openai.ktwome.cc/` root application을 보존한다.

## Deferred

- 범용 조건·target·동료별 preset을 편집하는 policy editor와 자연어·node graph 정책 언어
- tracking/re-targeting 적, pull·dash·charge·swap·관통·폭발 같은 확장 effect
- 완성 enemy AI, intent deck/weight와 보스 authoring tool
- 탐색, 본대·별동대, 월드 시간, 작전 채널, 경제, 성장·장비·직업·기벽의 runtime
- 최종 캐릭터 family, 전체 sprite sheet, 모든 배경·VFX와 완전한 replay/coaching UI
- backend, DB, authentication, multiplayer와 networking

## Verification contract

- Node 기반 domain/controller 테스트는 Phaser 없이 실행한다.
- CI는 `npm ci`, `npm test`, `npm run build`를 실행한다.
- Slice 1은 controller의 intro → push → ally shots → WASD → slam interrupt → victory/봉인 해제 흐름을 테스트한다.
- Chromium에서 desktop과 390px viewport를 확인하고 initial, 각 턴 배너, Intent, 타격·stun·죽음·victory, console/page/request error를 기록한다.
- 배포 완료는 `/slice1/` 공개 검증과 기존 root 보존 검증을 별도로 통과해야 한다.
