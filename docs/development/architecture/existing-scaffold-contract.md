---
title: Existing Scaffold Contract
status: accepted
last_updated: 2026-08-19
implementation:
  - src/game/combat/
  - src/game/slice/
  - src/game/slice2/
  - src/game/phaser/
  - src/game/assets/AssetManifest.ts
  - src/app/App.tsx
  - src/app/Slice2App.tsx
  - deploy/
  - .github/workflows/ci.yml
related:
  - ../../gameplay/combat/index.md
  - ../../gameplay/combat/turn-and-intent.md
  - ../../gameplay/combat/policy/action-policy.md
  - ../../ux/views/combat-view.md
  - ../../art/ui/combat-view/index.md
  - ../../submission/vertical-slice.md
  - ../../submission/vertical-slice-2-four-world-tiles.md
  - ../deployment/slice1.md
  - ../deployment/slice2.md
---

# Existing scaffold contract

이 문서는 현재 전투 runtime과 Slice 1·2 public scene이 의존하는 기술 계약을 소유한다. 게임 전체의 최종 수치나 콘텐츠를 잠그는 문서가 아니다. 구현과 문서가 어긋나면 숨은 관례를 만들지 말고 같은 변경에서 함께 갱신한다.

## Product alignment — 2026-08-19

현재 scaffold는 전투 grid, Intent·prediction, 연속 통로, 중앙 방 정찰, 세계 시간, 정책 순서와 deterministic replay의 foundation을 구현한다. 다음 승인된 제품 계약은 아직 구현하지 않았다.

- 초기 결계와 영구 월드 좌표의 지식·위협·영토·효용 직교 상태
- 편입 타일 집합을 따르는 결계 contour와 인접 편입 검증
- 직접 첫 조우 뒤 알려진 통로에 동료를 분리 배정하는 위임 작전
- 직접/위임이 같은 authoritative simulation을 쓰는 parity
- 주인공의 확장 거점 활성화와 샘·다음 좌표 효용
- 시간·보급·부상을 현재 세계에 남기는 새 실패 처리

현재 `Slice2RunController`의 선형 4타일→결계 수호자→`봉인 해제`는 회귀 fixture이며 새 제출 골든 패스가 아니다. 기존 RC 자동화는 기술 snapshot을 검증할 뿐 제품 RC 완료 증거가 아니다.

## Architecture

- 전투 simulation은 Phaser와 React에 의존하지 않는 pure TypeScript domain이다.
- `BattleState`가 규칙의 source of truth다. sprite 위치, tween 진행도와 React component state가 전투 결과를 결정하지 않는다.
- `BattleEngine`은 state transition과 구조화된 `CombatEvent`를 만들고, presentation은 `CombatEvent → AnimationDirector → Phaser` 순서로 확정된 사실을 재생한다.
- simulation 결과와 presentation 속도는 분리한다. pause, step, 배속과 instant는 결과·event 순서를 바꾸지 않는다.
- reset, 장면 전환과 Scene detach는 현재 presentation을 abort한다. 이전 generation의 tween/timer가 새 전투를 갱신하거나 영원히 대기하지 않는다.
- React와 Phaser는 typed bridge/event boundary로 통신한다. React가 Scene 내부 state를 직접 변경하지 않는다.
- logical grid 좌표와 화면 projection을 분리한다. 카메라가 보여주는 영역과 `12 x 3` 논리 topology는 같은 계약이 아니다.
- player plan은 authoritative `BattleState`와 분리된 preview projection이다. hover는 ally policy와 enemy Intent를 what-if로 계산하고, `Z`/`Space`가 각각 마지막 하나/전체 계획을 확정 경계로 보낸다.
- `Slice2RunController`가 월드 타일, 현재 방, 400m 통로 traversal과 내부 100m 판정 위치, 지속 HP·시간·policy와 인카운터 체크포인트를 소유한다. React room/corridor view와 Phaser 전투 장면은 이 상태를 표현하고 typed command만 전달한다.
- `SliceController`는 authored scenario, 관리자·동료 id와 policy 순서를 주입받아 여러 인카운터에 재사용한다. encounter 전환은 이전 presentation generation을 파기한 뒤 새 `BattleEngine`을 연결한다.
- built-in enemy behavior는 숨은 행동 예산 3과 결정론적 policy evaluator를 사용한다. 전사는 실제 명중·도착 거리, 궁수는 행·최소 사거리·사선, 투척병은 살아 있는 파티원의 순환 순서를 평가해 Intent를 만든다. 이는 자유 조건식 편집기가 아니라 Slice 2 적 archetype의 provisional policy다.

## Grid, units, and actions

- Slice 1의 논리 맵은 `12 x 3`이다. 현재 public scene은 12×3 직사각형 atlas tile을 하나의 이어진 흙바닥처럼 모두 투영하고, 점유·이동·Intent cell만 별도 신호로 강조한다.
- 이동은 상하좌우 인접 셀을 사용하는 WASD 동사이며 공격과 별개다. 경계 밖, 대각선, 점유 셀 이동은 허용하지 않는다.
- 관리자와 원거리 동료는 domain에서 같은 `STUDENT` faction 규칙을 공유하지만 controller가 역할과 턴 책임을 분리한다. 관리자는 전투원이며 매 턴 자신의 이동·공격을 고른다.
- 적과 아군은 공통 unit model을 사용한다. 여러 아군·적을 수용하는 domain 경계는 유지한다.
- 대상 선정과 effect 적용은 분리한다. 피해·밀치기·stun을 ability data의 effect 순서로 적용할 수 있으며 renderer가 결과를 결정하지 않는다.
- 밀치기는 경계와 점유를 검사하는 강제 이동 primitive다. 막히면 unit이 겹치거나 맵 밖으로 나가지 않는다.
- `사격`은 같은 행 3~6칸 clear line의 투사체다. 최소 사거리 이전을 포함한 첫 생존 전투원에서 멈추며, 유효 사거리 밖 또는 같은 진영의 몸이면 피해 없이 차단된다.
- 이동 후 공격 Intent는 `plannedMovementPath`와 현재 점유로 잘린 `movementPath`를 모두 보존한다. renderer와 resolution은 같은 잘린 경로·최종 공격 원점을 사용하고, event history도 `UNIT_MOVED → ABILITY_USED` 순서를 보존한다.
- 이동과 능력 사용은 authoritative unit facing을 갱신한다. AnimationDirector는 해당 event를 재생하기 전에 같은 방향을 renderer에 반영해 좌우를 지난 뒤에도 sprite와 공격 방향이 어긋나지 않게 한다.

## Slice 1 turn pipeline

1. 전투 진입 연출 뒤 적 Intent를 선언·표시한다.
2. `<내 턴>`에 관리자가 WASD 이동과 action bar 공격을 별개로 선택한다. AP가 남으면 여러 행동을 이어가거나 턴을 끝낸다.
3. `<아군 턴>`에 궁수 동료가 고정된 5-slot policy를 위에서부터 평가하고 실행 가능한 첫 행동을 한다. 이 장면에서 policy 편집은 없다.
4. `<적 턴>`에 살아 있고 중단되지 않은 locked Intent를 해결한다.
5. 피해·상태·사망·위치·Intent 취소를 event 순서로 정산하고 다음 턴을 시작한다.
6. 승리 뒤 관리자만 결계 오브젝트의 봉인을 해제한다.

## Locked Intent and interruption

- Intent 선언 뒤 아군이 움직여도 적은 재조준하지 않는다.
- `BODY` Intent는 source의 현재 body 위치에서 같은 direction으로 footprint를 다시 계산한다. 따라서 수호자를 `밀치기`하면 `제압`·`외침`의 공격 원점과 범위도 함께 이동한다.
- `GROUND` 계약은 선언 당시 origin과 footprint를 유지한다. Slice 1의 보스 공격은 BODY anchor다.
- `제압`은 2칸 이동 뒤 1×1 BODY 공격, 피해 6, 중단 불가다.
- `외침`은 5×3 BODY Intent, 피해 2이며 차징 중 `#근거리공격`에 적중하면 현재 Intent만 취소된다.
- 세 번째 pattern은 원거리 동료 추적 하수인 소환이며, 하수인 cap은 없다. 하수인은 HP 1, `돌진` 3×1 피해 2를 사용하고 대상이 있으면 피해 후 바로 앞에 정지한다.
- source가 실행 전에 죽거나 stun으로 interrupt되면 Intent를 취소하고 공격 effect를 실행하지 않는다.
- 이동 경로와 공격 effect cell은 별도 의미다. 이동 목적지를 빨간 공격 threat처럼 표시하지 않는다.

## Determinism and history

- Slice 1 combat resolution에는 명중·치명타·무작위 피해가 없다. 같은 initial state와 입력 sequence는 같은 state와 event sequence를 만든다.
- `Math.random()`은 domain에서 사용하지 않는다. 미래 확률 시스템은 seed 가능한 경계를 먼저 만든 뒤 별도 결정으로 추가한다.
- event history는 턴, Intent, AP 회복·소비, 이동, 능력 사용, 상태, 피해, 밀치기, 취소와 사망 등 의미 있는 transition을 보존한다.
- 죽은 unit은 이후 행동·Intent를 실행하지 않는다.
- Slice 2 통로 인카운터 추첨은 seed와 `encounterGeneration`을 사용하는 월드 계층에만 존재한다. 추첨 결과를 state에 저장하며 전투, 왕복과 체크포인트 재시도는 다시 추첨하지 않는다.
- 재침식은 encounter generation을 증가시키지만 시설·지형과 소비한 일회성 보상 key를 보존한다.

## Slice 2 expedition pipeline

1. 서쪽 경계 방에서 현재 월드 타일에 진입하고 4구간 서쪽 통로를 따라 이동한다.
2. 통로 전투 구간 또는 중앙 방 위협에 진입하면 같은 stage에서 12×3 combat presentation을 활성화한다.
3. 중앙 방 전투 승리는 타일의 네 통로 종류·위치를 정찰한다.
4. 동쪽 통로의 위협을 해결해 안전 경로를 만들고 동쪽 경계 방에서 다음 타일로 이동한다.
5. 관리자·동료 HP, 이동 수, 전투 턴과 policy 순서는 네 타일 동안 유지한다.
6. 모든 비전투 장면의 캐릭터 정보에서 5-slot policy를 재정렬할 수 있다. 전투 중에는 현재 locked forecast를 보존하기 위해 편집하지 않는다.
7. 타일 4 동쪽 경계 방을 통과하면 원정 요약을 표시한다.

Slice 2 enemy intent는 포지셔닝 뒤 장거리 BODY 사격, 4칸 ADVANCE 뒤 근접 공격, 고정 GROUND 폭탄을 사용한다. 전사는 네 방향을 매 턴 다시 평가하고 투척병은 파티원을 순환 표적화하지만, 잠근 Intent는 같은 턴 안에서 재조준하지 않는다. 전투원 밀치기는 BODY 사격 원점을 옮기지만 이미 잠긴 폭탄 footprint는 옮기지 않는다. 관리자의 가로막기 방어가 공개 경로를 실제로 차단한 이동 공격에 소비되면 engine이 피해 1 반격을 한 번 정산한다.

## Presentation contract

- 전투 장면의 플레이 평면은 `12 x 3` 불투명 흙 tilemap이 소유한다. 정글 배경은 숲과 유적의 원경만 보조하며, Intent는 tilemap 위의 일시 overlay다.
- 캐릭터와 보스는 cell보다 크게 보일 수 있고 서로 겹칠 수 있다. depth는 행 위치와 이동에 따라 갱신한다.
- `<내 턴>`, `<아군 턴>`, `<적 턴>`은 배너·상태 변화·행동 애니메이션으로 명시한다. 텍스트만으로 현재 주체를 추측하게 하지 않는다.
- `idle`, `move`, `attack`, `hit`, `knockback`, `stun`, `death`와 봉인 해제 연출은 서로 구별되어야 한다. 이동과 공격을 같은 tween으로 축약하지 않는다.
- 투사체, wind-up, 타격, hit-stop·camera feedback과 죽음은 전투 인과를 시간 순서로 전달한다.
- HP bar는 foot anchor에서 계산한 sprite 상단 밖에 둔다. idle은 sprite의 기준 위치를 옮기지 않으며, 같은 animation state 재설정은 무시해 death tween을 반복 시작하지 않는다.
- 여러 적의 공개 Intent는 안정적인 intent 배열 순서에서 A/B/C 표식과 고유 색을 얻는다. HTML 카드, sprite 위 Intent, 이동 화살표·공격 cell·최종 shadow가 같은 표식을 공유한다. 색만으로 ownership을 구분하지 않는다.
- 공격 대상 선택기는 현재 계획 state에서 적중 가능한 적이 하나 이상일 때만 나타나며, 원거리의 비유효 적을 선택된 대상으로 유지하지 않는다.
- asset manifest는 등록된 bitmap/spritesheet를 사용하되 fallback visual도 유지한다. simulation은 asset key나 clip 이름을 알지 않는다.

## Slice 1 authored surface

- `src/game/slice/scenario.ts`는 관리자, 활 동료와 결계 수호자가 아마존 정글 결계문에서 만나는 단일 authored fixture를 정의한다.
- 관리자 action bar의 승인된 이름은 `밀치기`, `내려찍기`이며, WASD 이동은 action bar 공격과 분리한다.
- 궁수 동료의 고정 5-slot policy는 `회피 → 포지셔닝 → 사격 → 밀치기 → 빈 슬롯`이다. public scene에서 순서를 수정하지 않는다.
- public 전투에서 임의의 `방어 전개`, `맥동 밀치기`, `신호 창격` 명칭이나 정책 편집 dashboard를 노출하지 않는다.
- 승리 화면의 다음 행동은 `봉인 해제`이며, 이것이 관리자 특수성의 전장 표현이다.
- 배포는 `/slice1/` path만 소유하고 기존 `openai.ktwome.cc/` root application을 보존한다.

## Slice 2 authored surface

- `src/game/slice2/world.ts`는 네 월드 타일과 각 타일의 중앙·경계 방, 방향별 4구간 통로, seed 기반 인카운터 생명주기를 정의한다.
- `src/game/slice2/scenarios.ts`는 고블린 궁수·전사·투척병, 네 중앙 방의 학습 순서와 encounter ID 기반 진형·정예 spec을 정의한다.
- `enterCorridor(direction)`은 방의 실제 문에서 다음 방까지 하나의 400m traversal을 시작한다. `advanceTravel`은 100m 경계마다 시간·판정 위치·인카운터를 원자적으로 정산하고, 전투 뒤에도 traversal을 보존한다.
- 통로 presentation은 파티 screen position을 고정하고 배경·지면 texture offset을 이동한다. encounter는 별도 map 화면을 끼우지 않고 같은 stage에서 combat scene으로 전환한다.
- 필수 경로에는 통로 전투 2회와 중앙 방 전투 4회를 배치한다. 북·남 선택 통로의 추가 인카운터는 정찰 뒤 선택할 수 있다.
- `/slice2/`가 Slice 2 build를 소유하며 `/`와 `/slice1/`을 보존한다.

## Deferred

- 범용 조건·target·동료별 preset을 편집하는 policy editor와 자연어·node graph 정책 언어
- tracking/re-targeting 적, pull·dash·swap·관통 같은 확장 effect
- 범용 enemy intent deck/weight authoring tool과 사용자에게 공개되는 enemy policy editor
- 본대·별동대, 전체 월드 시간, 작전 채널, 경제, 성장·장비·직업·기벽의 runtime
- 최종 캐릭터 family, 전체 sprite sheet, 모든 배경·VFX와 완전한 replay/coaching UI
- backend, DB, authentication, multiplayer와 networking

## Verification contract

- Node 기반 domain/controller 테스트는 Phaser 없이 실행한다.
- CI는 `npm ci`, `npm test`, `npm run build`를 실행한다.
- Slice 1은 controller의 intro → plan/undo/confirm → ally positioning/shooting → `제압` 회피 → `내려찍기` interrupt → 하수인 소환/돌진 흐름을 테스트한다.
- Chromium에서 desktop viewport의 initial, 각 턴 배너, Intent, plan preview, 타격·stun·소환·하수인과 console/page/request error를 기록한다. mobile viewport와 전투 완주·봉인 해제는 별도 검증 항목이다.
- 배포 완료는 `/slice1/` 공개 검증과 기존 root 보존 검증을 별도로 통과해야 한다.
- Slice 2는 seed/재침식/정찰/지속 상태, 투사체 차폐, 가로막기 반격, 적 policy·방향 전환·폭탄 표적 순환·이동 후 공격 event 순서, 진형 spec과 100m 전진·후퇴 unit test를 검증한다. Chromium에서는 1280×720 전체 4타일 완주, 960×720 overflow, 비전투 policy 편집, 배경 scroll, 실제 유효 표적만 노출, A/B/C Intent ownership, 접힌 ALLY PLAN/tooltip과 console/page/request error를 검증한다.
- Slice 2 배포 완료는 `/`, `/slice1/`, `/slice2/`을 각각 검증해야 한다.
