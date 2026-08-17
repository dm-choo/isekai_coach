---
title: Existing Scaffold Contract
status: accepted
last_updated: 2026-08-17
implementation:
  - src/game/combat/
  - src/game/phaser/
  - src/game/assets/AssetManifest.ts
  - src/app/App.tsx
  - .github/workflows/ci.yml
related:
  - ../../gameplay/combat/index.md
  - ../../gameplay/combat/policy/action-policy.md
  - ../../ux/views/combat-view.md
  - ../../art/ui/combat-view/index.md
---

# Existing scaffold contract

이 문서는 현재 코드와 후속 구현이 의존할 수 있는 전투 scaffold 계약을 소유한다. 수치와 콘텐츠 선택은 아래에서 명시적으로 구현 계약이라 하지 않는 한 scenario/config data 또는 provisional 값이다. 코드와 이 문서가 다르면 숨은 관례를 만들지 말고 둘을 함께 갱신한다.

## Architecture

- 전투 simulation은 Phaser와 React에 의존하지 않는 pure TypeScript domain이다.
- `BattleState`가 전투의 source of truth다. sprite 위치, tween 진행도 또는 React component state가 규칙을 결정하지 않는다. 전체 구조화 event history는 state snapshot과 분리해 다룰 수 있다.
- engine은 state transition과 `CombatEvent` history를 만들고, presentation은 `CombatEvent -> AnimationDirector -> Phaser` 방향으로 확정된 사실을 재생한다. animation callback이 전투 결과를 결정하지 않는다.
- simulation 진행과 presentation 속도는 분리된다. pause, step, 1x, 2x, 4x, instant presentation이 전투 결과나 event 순서를 바꾸지 않는다.
- 현재 dev runtime에서 pause는 presentation queue와 tween을 멈추고, step은 `CombatEvent` 하나를 재생하며, instant는 event를 생략하지 않고 zero-duration으로 소진한다.
- reset, scenario switch와 Scene detach는 현재 presentation을 abort한다. 이전 generation의 tween/timer Promise가 새 전투를 갱신하거나 영구 대기하지 않는다.
- React와 Phaser는 typed bridge/event boundary로 통신한다. React가 Scene 내부 state를 직접 변경하지 않는다.
- logical grid 좌표와 화면 좌표는 분리하며 projection은 교체 가능하다.

## Grid, units, and actions

- map 크기와 초기 배치는 config/scenario data다. 현재 기본 검사 맵은 `12 x 3`이고 가운데 행에 학생과 적을 둔다.
- 이동과 공격은 정수 `GridPosition`에서 계산한다. 기본 Move는 상하좌우 한 칸이며 경계 밖, 대각선 또는 점유 셀로 이동할 수 없다.
- 학생과 적은 faction이 다른 공통 unit model을 사용한다. 모델은 한 학생과 여러 적을 수용한다.
- 학생 행동은 AP 비용을 가지며 AP는 턴 시작 단계에서 max AP까지 회복한다. AP가 남으면 주입된 strategy를 다시 평가할 수 있다.
- Move, Defend, Thrust, Slash는 현재 샌드박스의 실제 action/effect 경로를 사용한다.
- attack footprint와 damage는 ability/pattern data에서 온다. renderer나 기술명별 특수 분기가 공격 결과를 결정하지 않는다.
- ability 대상 선택과 effect 적용은 분리되어 Damage, Guard, Knockback을 하나의 effect 배열에서 조합할 수 있다. effect 순서는 engine/resolver에 명시하며 tween에 숨기지 않는다.
- 실행 불가능한 행동은 state를 변경하지 않고 실패 이유를 반환할 수 있다.
- Knockback은 경계와 점유를 검사하는 강제 이동 primitive다. 막히면 unit이 겹치거나 grid 밖으로 나가지 않는다.

## Current turn pipeline

현재 scaffold는 다음 순서를 구현 계약으로 갖는다.

1. 살아 있는 적이 intent를 고른다.
2. intent를 선언하고 aim, direction, anchor와 threat category를 잠근다.
3. telegraph footprint를 계산한다.
4. 학생 AP를 max AP까지 회복한다.
5. 학생 strategy를 평가하고 실행 가능한 행동을 적용한다.
6. AP가 남아 있으면 갱신된 상태에서 strategy를 다시 평가할 수 있다.
7. 살아 있는 적만 선언한 intent를 실행한다.
8. 피해, 방어, 죽음과 displacement를 구조화 event 순서로 해결한다.
9. 턴을 종료한다.

## Locked Intent

- intent 선언 뒤 학생이 움직여도 적은 새 위치로 재조준하지 않는다.
- intent source가 실행 전에 죽으면 intent를 취소하며 공격하지 않는다.
- `BODY` intent는 source의 현재 위치를 origin으로 footprint를 다시 계산한다. source가 밀려도 선언 당시 aim과 direction은 유지한다.
- `GROUND` intent는 선언 당시 origin과 footprint를 유지한다. 모델과 테스트가 anchor를 수용하지만 현재 정식 공격 콘텐츠는 아니다.
- BODY source가 움직여 footprint가 바뀌면 telegraph와 event history도 `INTENT_AREA_CHANGED`로 그 변화를 반영한다.
- 이동 intent는 `movementPath`, 능력 intent는 `effectCells`를 사용한다. 이동 셀을 공격 threat로 표시하지 않는다.
- 짧은 Warrior footprint는 source가 한 칸 밀린 뒤 학생을 빗나갈 수 있고, 긴 Spearman footprint는 같은 이동 뒤에도 학생을 포함할 수 있다.

## Damage, threats, determinism, and history

- Defend는 modifier/effect 경로로 방어 가능한 다음 피해를 완화한다.
- `NORMAL_ATTACK`은 방어 가능하고, `UNBLOCKABLE_ATTACK`은 Defend를 우회한다.
- 두 threat category는 telegraph에서 색뿐 아니라 border, pattern 또는 icon 같은 비색상 신호로 구별할 수 있어야 한다.
- 현재 combat resolution에는 명중, 치명타, 무작위 피해가 없다.
- 같은 initial state와 같은 action sequence는 같은 final state와 같은 event sequence를 만든다.
- 미래 RNG는 seed 가능한 `RandomSource` 경계로 주입하며 domain에서 `Math.random()`을 직접 사용하지 않는다.
- event history는 턴, intent, AP 회복·소비, 행동, 이동, 상태, 피해·방어, knockback, 취소와 죽음 등 의미 있는 transition을 보존한다.
- 죽은 unit은 이후 행동 또는 intent를 실행하지 않는다.

## Presentation and development surface

- Phaser는 grid, unit, facing, HP/AP, 현재 턴, intent와 telegraph를 placeholder 또는 등록된 visual asset으로 표시한다.
- unit presentation은 `idle`, `move`, `attack`, `defend`, `hit`, `knockback`, `death` 상태를 구별할 수 있다.
- simulation은 asset key나 animation clip 이름을 모른다.
- asset manifest와 visual definition은 논리 sprite/VFX key와 animation state를 optional image/spritesheet source 또는 generated fallback에 매핑한다. Scene preload와 animation registry가 manifest를 소비한다.
- React sandbox는 reset, start, pause, event 단위 step, 1x/2x/4x/instant와 scenario 선택을 제공하는 dev-only shell이다.
- Basic 1v1, Warrior Knockback, Spearman Knockback, Kill Cancels Intent, Unblockable Attack, Multi-enemy 1v2는 독립 scenario data로 규칙을 드러낸다.

## Provisional scaffold choices

다음은 테스트와 시각 검증을 위한 임시 선택이며 canonical game design이 아니다.

- 기본 map `12 x 3`, 학생 `x = 1`, 적 `width - 2`, 가운데 행인 샌드박스 배치
- 기본 unit HP 약 5, 학생 max AP 2, 현재 기술 AP 비용과 피해 1
- Defend의 “다음 방어 가능한 피해 1 감소” 수치와 소모 시점
- 현재 Thrust가 같은 행 전방 최대 3칸, Slash가 바로 앞 열의 세로 3칸인 ability data
- `BasicStudentStrategy`, scripted/manual debug strategy의 선택 순서와 fallback 행동
- deterministic scripted enemy intent strategy; 향후 intent deck, weighted choice, boss script 중 선택
- 샌드박스 scenario 배치, turn 수, 버튼 배치와 debug panel 정보량
- enemy rank와 stable spawn order를 사용하는 deterministic tie-break의 구체적 우선순위
- target selector별 tie-break utility의 구체적 기준. 범용 HP/거리 규칙 하나로 통합하지 않는다.
- 다중 대상에 각 effect를 적용하는 현재 순서, 사망한 대상의 후속 effect 생략, 막힌 displacement 뒤 후속 effect를 계속 적용하는 방식
- placeholder 도형, 색, icon, tween duration, VFX, pseudo-2.5D projection과 카메라 구도
- HP/AP HUD 표현과 최종 segmented bar 디자인
- player-facing 정책, trait, class, dungeon, narrative에 연결하기 위한 현재 명칭과 얇은 interface

Provisional code는 가능한 경우 다음 의미를 명시한다.

```ts
// PROVISIONAL:
// The final player-facing Gambit / combat doctrine system
// is intentionally undecided.
// Do not treat this implementation as canonical game design.
```

이 기존 주석의 “final system”은 scaffold strategy가 최종 player-facing 언어가 아니라는 뜻이다. 이후 승인된 [5-slot action policy](../../gameplay/combat/policy/action-policy.md)를 미정으로 되돌리지 않는다. Provisional 구현을 계약으로 승격할 때는 기획 결정, domain test와 이 문서를 같은 변경에서 갱신한다.

## Deferred implementation surface

다음은 현재 scaffold가 의도적으로 구현하지 않거나 완제품으로 만들지 않은 영역이다. 이 목록은 최신 게임 디자인의 승인 상태를 바꾸지 않고, 구현 부재만 설명한다.

- 승인된 5-slot action-policy editor와 동료별 player-facing 정책 UI
- 자유 조건식, AND/OR, 복잡한 targeting editor, node/card UI, 자연어·LLM policy 해석 같은 장기 정책 언어
- tracking/re-targeting 적. 기본 intent는 locked aim이고 예외 적은 나중에 명시적으로 추가한다.
- Meteor, Trap, Explosion Zone 같은 실제 GROUND 콘텐츠
- pull, dash, charge, swap, 관통, 폭발 등 확장 effect와 attack 콘텐츠
- 완성 enemy AI, intent deck/weight 시스템과 scripted boss authoring tool
- Contract/Dungeon/Room, 섹터·로컬 탐색, 본대·별동대, 공유 월드 시간, 작전 채널, 경제와 지식 시스템의 runtime 구현
- 성장, 능력치 성장, 장비, 기술 숙련·변형, 직업, trait/quirk, permadeath의 완제품 구현
- 기벽을 강제 policy rule로 삽입하는 최종 우선순위 규칙
- 최종 narrative presentation, UI design system, 캐릭터 illustration, 완성 sprite sheet, 배경과 VFX
- 완전한 replay/review/coaching UI. 현재는 deterministic state와 event history 기반만 제공한다.
- backend, DB, authentication, multiplayer, networking
- physics engine, pathfinding library, ECS, 대형 global state library와 정교한 particle system
- accuracy, critical, random damage. seedable interface 설계 전에는 미래 확률 시스템도 combat resolution에 추가하지 않는다.

사용하지 않는 범용 framework나 빈 abstraction을 미래 가능성만으로 추가하지 않는다. 실제 다음 실험에 필요한 가장 작은 경계를 확장한다.

## Alignment with current canonical design

현재 scaffold와 최신 승인 설계를 함께 읽을 때 다음 차이를 숨기지 않는다.

- 코드의 faction과 UI는 주인공 측을 `STUDENT`로 부르고 한 학생 strategy가 자동 행동한다. 최신 턴 계약은 [주인공 후보 행동과 동료 예측·자동 실행](../../gameplay/combat/turn-and-intent.md)을 요구한다.
- [제출본 5-slot action policy](../../gameplay/combat/policy/action-policy.md)는 승인되었지만 현재 strategy/debug controls가 이를 구현하지 않는다.
- 맵, 로컬 탐색, 부대, 월드 시간, 작전 채널, 경제, 도감, 내러티브와 제출 흐름은 문서 정본에는 있으나 현재 전투 runtime에는 없다.
- 현재 React sandbox, debug controls와 scenario browser는 개발 검증 surface이며 [최종 UX](../../ux/index.md)나 [Art](../../art/index.md)의 구현 완료를 뜻하지 않는다.
- 최신 weapon action의 범위·효과와 scaffold의 Thrust/Slash 샘플 data가 다르면 gameplay 문서가 디자인 정본이고, 이 문서의 값은 current provisional implementation이다.

## Verification contract

- Node 기반 domain/controller 테스트는 Phaser renderer 없이 실행한다.
- GitHub Actions는 pull request와 `main` push에서 `npm ci`, `npm test`, `npm run build`를 실행한다.
- 실제 sprite/VFX를 추가할 때는 manifest source/frame 등록, generated fallback 유지, 상태별 animation과 telegraph smoke test를 함께 수행한다.
- Canvas/WebGL presentation은 브라우저 screenshot으로 16:9와 4:3을 확인한다.
