# Design status

이 문서는 테스트용 구현을 확정된 게임 디자인으로 오인하지 않도록 경계를 기록한다. 아래의 **Implemented / current contract**만 현재 코드와 후속 기능이 의존해도 되는 규칙이다. 수치와 콘텐츠 선택은 명시적으로 current contract에 포함되지 않는 한 scenario/config data로 취급한다.

코드와 테스트가 이 문서와 다르면 숨은 관례를 만들지 말고 둘을 함께 갱신한다. 미정 디자인을 기술적 편의로 확정하지 않는다.

## Implemented / current contract

### Architecture

- 전투 simulation은 Phaser와 React에 의존하지 않는 순수 TypeScript domain이다.
- `BattleState`가 전투의 source of truth다. sprite 위치, tween 진행도 또는 React component state가 규칙을 결정하지 않는다.
- engine은 state transition과 구조화된 `CombatEvent` history를 만들고, presentation은 event를 해석해 화면에 재생한다.
- simulation 진행과 animation 속도는 분리된다. pause, step, 1x, 2x, 4x, instant presentation이 전투 결과를 바꾸지 않는다.
- 현재 runtime에서 pause는 presentation queue와 tween을 멈추고, step은 `CombatEvent` 하나를 재생하며, instant는 event를 생략하지 않고 zero-duration으로 소진한다. 이 조작 의미는 final UX가 아닌 dev-shell 계약이다.
- React와 Phaser는 bridge/event boundary로 통신한다. React가 Scene 내부 state를 직접 변경하지 않는다.
- 논리 grid 좌표와 화면 좌표는 분리하며 projection은 교체 가능하다.

### Grid, units, actions

- map 크기와 초기 배치는 config/scenario data다. 기본 검사 맵은 `12 x 3`이고 가운데 행에 학생과 적을 놓는다.
- 이동과 공격은 정수 `GridPosition`에서 계산한다. 기본 Move는 상하좌우 한 칸이며 경계 밖, 대각선 또는 점유 셀로 이동할 수 없다.
- 학생과 적은 faction이 다른 공통 unit model을 사용한다. 모델은 한 학생과 여러 적을 수용한다.
- 학생 행동은 AP 비용을 가지며 AP는 턴 시작 단계에서 max AP까지 회복한다. AP가 남으면 주입된 strategy를 다시 평가할 수 있다.
- Move, Defend, Thrust, Slash는 현재 샌드박스의 실제 action/effect 경로를 사용한다.
- attack footprint와 damage는 ability/pattern data에서 온다. renderer나 기술명별 특수 분기가 공격 결과를 결정하지 않는다.
- 실행 불가능한 행동은 state를 망가뜨리지 않고 실패 이유를 표현할 수 있다.
- Knockback은 경계와 점유를 검사하는 강제 이동 primitive다. 막히면 unit이 겹치거나 grid 밖으로 나가지 않는다.

### Turn and intent ordering

현재 턴은 다음 순서를 계약으로 갖는다.

1. 살아 있는 적이 intent를 고른다.
2. intent를 선언하고 aim, direction, anchor와 threat category를 잠근다.
3. telegraph footprint를 계산한다.
4. 학생 AP를 회복한다.
5. 학생 strategy를 평가하고 실행 가능한 행동을 적용한다.
6. AP가 남아 있는 동안 strategy를 다시 평가할 수 있다.
7. 살아 있는 적만 선언한 intent를 실행한다.
8. 피해, 방어, 죽음과 displacement를 event 순서로 해결한다.
9. 턴을 종료한다.

effect ordering은 engine/resolver에 명시하고 animation callback에 숨기지 않는다.

### Locked intent semantics

- intent 선언 뒤 학생이 움직여도 적은 새 위치로 재조준하지 않는다.
- intent source가 실행 전에 죽으면 해당 intent는 취소되며 공격하지 않는다.
- `BODY` intent는 source의 현재 위치를 origin으로 footprint를 다시 계산한다. source가 밀려도 선언 당시 aim/direction은 그대로다.
- `GROUND` intent는 선언 당시 origin과 footprint를 유지한다. 모델과 테스트가 이 anchor를 수용하지만 현재 정식 공격 콘텐츠는 아니다.
- BODY source가 움직여 footprint가 바뀌면 telegraph와 event history도 그 변화를 반영한다.
- 짧은 Warrior footprint는 source가 한 칸 밀린 뒤 학생을 빗나갈 수 있다.
- 긴 Spearman footprint는 같은 이동 뒤에도 학생을 포함할 수 있다.

### Damage, threats, determinism

- Defend는 modifier/effect 경로로 방어 가능한 다음 피해를 완화한다.
- `NORMAL_ATTACK`은 방어 가능하고, `UNBLOCKABLE_ATTACK`은 Defend를 우회한다.
- 두 threat category는 telegraph에서 색만이 아닌 border/pattern/icon 같은 추가 신호로 구별할 수 있어야 한다.
- combat resolution에는 명중, 치명타, 무작위 피해가 없다.
- 같은 initial state와 같은 action sequence는 같은 final state와 같은 event sequence를 만든다.
- 향후 필요한 RNG는 seed 가능한 `RandomSource` 경계로 주입하며 domain 곳곳에서 `Math.random()`을 직접 사용하지 않는다.
- 구조화된 event history는 턴, intent, AP 회복/소비, 행동, 이동, 상태, 피해/방어, knockback, 취소와 죽음 등 의미 있는 state transition을 보존한다.
- 죽은 unit은 이후 행동 또는 intent를 실행하지 않는다.

### Presentation and development surface

- Phaser는 grid, unit, facing, HP/AP, 현재 턴, intent와 telegraph를 placeholder로 표시한다.
- unit presentation은 `idle`, `move`, `attack`, `defend`, `hit`, `knockback`, `death` 상태를 구별할 수 있다.
- `CombatEvent -> AnimationDirector -> Phaser` 의존 방향을 지키며 simulation은 asset key나 animation clip 이름을 알지 않는다.
- asset manifest/visual definition은 논리 sprite/VFX key와 animation state를 실제 asset 또는 generated fallback에 매핑한다.
- React sandbox는 reset, start, pause, step, speed와 scenario 선택을 제공하는 dev-only shell이다.
- Basic 1v1, Warrior Knockback, Spearman Knockback, Kill Cancels Intent, Unblockable Attack 시나리오는 각각 독립적인 scenario data로 규칙을 드러낸다.

## Provisional

아래는 현재 검증을 실행하기 위해 가장 단순하게 선택한 값 또는 strategy다. 코드에 존재하더라도 canonical game design이 아니다.

- 기본 map `12 x 3`, 학생 `x = 1`, 적 `width - 2`, 가운데 행이라는 샌드박스 배치
- 기본 unit HP 약 5, 학생 max AP 2, 각 기술의 AP 비용과 피해 1이라는 수치
- Defend가 “다음 방어 가능한 피해 1 감소”로 동작하는 정확한 mitigation 수치와 소모 시점
- Thrust가 같은 행 전방 최대 3칸, Slash가 바로 앞 열의 세로 3칸이라는 초기 ability data
- `BasicStudentStrategy`, scripted/manual debug strategy의 선택 순서와 fallback 행동
- deterministic scripted enemy intent strategy; intent deck, weighted choice 또는 boss script 중 무엇을 최종 채택할지는 미정
- 샌드박스의 scenario 배치, turn 수, 버튼 배치와 debug panel 정보량
- enemy rank 및 stable spawn order를 이용할 수 있는 deterministic tie-break 방식의 구체적 우선순위
- target selector별 tie-break utility의 구체적인 기준. 하나의 범용 HP/거리 규칙은 만들지 않는다.
- placeholder 도형, 색, icon, tween duration, VFX, pseudo-2.5D/grid projection과 카메라 구도
- HP/AP HUD의 표현 방식과 최종 세그먼트 bar 디자인
- player-facing 정책, trait, class, dungeon 및 narrative와 연결하기 위한 이름과 얇은 interface

Provisional code에는 가능한 경우 다음 의미의 주석을 유지한다.

```ts
// PROVISIONAL:
// The final player-facing Gambit / combat doctrine system
// is intentionally undecided.
// Do not treat this implementation as canonical game design.
```

Provisional 항목을 current contract로 승격하려면 기획 결정, domain test와 이 문서를 같은 변경에서 갱신한다.

## Deferred

다음은 현재 scaffold에서 의도적으로 구현하지 않거나 완제품으로 만들지 않는다.

- 최종 Gambit/combat doctrine 문법과 editor
- 자유 조건식, AND/OR 조합, 복잡한 priority/targeting editor, node/card UI, 자연어 또는 LLM policy 해석
- tracking/re-targeting 적. 기본 intent는 locked aim이며 예외 적은 나중에 명시적으로 추가한다.
- Meteor, Trap, Explosion Zone 같은 실제 GROUND-anchored 콘텐츠
- pull, dash, charge, swap, 관통, 폭발 등 확장 effect/attack 콘텐츠 전반
- 완성 enemy AI, intent deck/weight 시스템과 scripted boss authoring tool
- 최종 Contract/Dungeon/Room 루프, 분기형 원정, 로그라이트 진행과 콘텐츠
- 성장, 능력치 성장, 장비, 기술 숙련/변형, 직업, 캐릭터 trait/quirk, permadeath
- 기벽을 강제 policy rule로 삽입하는 최종 우선순위 규칙
- 최종 narrative, 용어, UI design system, art direction, 캐릭터 일러스트, sprite sheet, 배경과 완성 VFX
- 완전한 replay/review/coaching UI. 현재는 deterministic state와 event history 기반만 둔다.
- backend, DB, authentication, multiplayer, networking
- physics engine, pathfinding library, ECS framework, 대형 global state library와 정교한 particle system
- accuracy/critical/random damage. RNG가 필요한 미래 시스템도 seedable interface 설계 전에는 combat resolution에 추가하지 않는다.

Deferred 기능의 가능성을 이유로 사용하지 않는 범용 framework나 빈 abstraction을 미리 추가하지 않는다. 실제 다음 실험에 필요한 가장 작은 경계를 확장한다.
