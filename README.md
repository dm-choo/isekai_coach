# Isekai Coach combat scaffold

[![CI](https://github.com/dm-choo/isekai_coach/actions/workflows/ci.yml/badge.svg)](https://github.com/dm-choo/isekai_coach/actions/workflows/ci.yml)

브라우저에서 전투 규칙을 빠르게 실험하기 위한 해커톤용 웹 게임 골격이다. 완성된 게임이나 최종 콘텐츠를 만드는 저장소가 아니라, 확정도가 높은 그리드 전투 규칙을 실행 가능한 코드와 테스트로 고정하고 아직 논의 중인 디자인은 교체 가능한 경계 뒤에 두는 것이 목적이다.

현재 샌드박스는 다음 흐름을 검증한다.

```text
pure TypeScript simulation
  BattleState -> BattleEngine -> CombatEvent history
                                      |
                                      v
React dev shell <-> typed bridge -> AnimationDirector -> Phaser presentation
```

전투 상태의 source of truth는 Phaser sprite가 아니라 시뮬레이션의 `BattleState`다. Phaser는 구조화된 `CombatEvent`를 재생하고, React는 브리지로 명령과 스냅샷을 주고받는다. 애니메이션 완료 여부가 전투 결과를 결정하지 않는다.

현재 디자인 상태의 상세 기준은 [docs/design-status.md](docs/design-status.md)를 참고한다.

## 기술 스택

- Phaser 4.2.1
- React
- TypeScript
- Vite
- Vitest

## 실행

Node.js 20.19 이상이 필요하다.

의존성을 설치한다.

```bash
npm install
```

개발 서버를 실행한다.

```bash
npm run dev
```

code-server proxy 환경에서는 타입 검사와 테스트 후 기본 8082 포트로 실행하는 스크립트를 사용할 수 있다.

```bash
./dev_test_run.sh
# https://code.ktwome.cc/absproxy/8082/
```

도메인 테스트를 실행한다.

```bash
npm test
```

타입 검사와 프로덕션 빌드를 검증한다.

```bash
npm run build
```

현재 npm 스크립트는 다음과 같다.

| script | 역할 |
| --- | --- |
| `npm run dev` | Vite 개발 서버 |
| `npm test` | headless combat domain test |
| `npm run test:watch` | Vitest watch mode |
| `npm run typecheck` | TypeScript 정적 검사 |
| `npm run build` | TypeScript 검사 후 production bundle |
| `npm run preview` | production bundle 로컬 미리보기 |

## 디렉터리 역할

파일명은 scaffold가 다듬어지며 조금 바뀔 수 있지만, 의존 방향은 아래 역할을 유지한다.

```text
src/
  app/                 React application shell
  game/
    combat/            Phaser에 의존하지 않는 상태, 규칙, effect, event, policy, scenario data
    phaser/            scene, asset loader, grid projection, renderer, animation, React bridge
    assets/            논리 asset key와 animation state를 매핑하는 visual manifest
  ui/                  scenario controls와 dev-only debug panel
docs/
  design-status.md     확정 계약, 임시 선택, 의도적 미구현의 경계
```

도메인 코드는 Phaser, React, 픽셀 좌표, tween 이름 또는 실제 asset 경로를 알지 못해야 한다. 렌더링 계층은 논리 `GridPosition`을 교체 가능한 projection으로 화면 좌표에 옮긴다.

## 샌드박스 조작

화면의 조작부는 전투 규칙을 검사하기 위한 개발 도구이며 최종 플레이 UI가 아니다.

| 조작 | 동작 |
| --- | --- |
| Reset Battle | 선택한 시나리오의 초기 상태로 되돌린다. |
| Start | 시뮬레이션과 event 재생을 진행한다. |
| Pause | presentation queue와 진행 중인 tween을 멈추되 simulation head와 event history는 유지한다. |
| Step | 정지 상태에서 다음 `CombatEvent` 하나를 끝까지 재생한다. |
| 1x / 2x / 4x | 전투 결과는 바꾸지 않고 presentation 재생 속도만 바꾼다. |
| Instant | 같은 event를 생략하지 않고 duration 0으로 queue를 소진한다. |
| Scenario selector | 초기 상태와 scripted strategy 묶음을 교체한다. |

시나리오나 debug mode에 따라 Move, Defend, Thrust, Slash, Push 같은 수동 검사 명령이 함께 노출될 수 있다. presentation backlog가 있으면 미래 simulation state를 잘못 조작하지 않도록 수동 입력을 잠근다. 이는 최종 Gambit UI나 최종 fallback 정책을 뜻하지 않는다.

### 포함 시나리오

| 시나리오 | 확인할 결과 |
| --- | --- |
| Basic 1v1 | 3행 grid, AP 기반 학생 행동, locked enemy intent, event 흐름을 확인한다. |
| Warrior Knockback Test | 짧은 BODY-anchored 공격의 적을 밀면 footprint가 함께 이동해 학생을 빗나간다. |
| Spearman Knockback Test | 긴 BODY-anchored 찌르기는 같은 이동 뒤에도 학생에게 닿는다. |
| Kill Cancels Intent | intent를 선언한 적이 먼저 죽으면 그 intent가 실행되지 않는다. |
| Unblockable Attack Test | 가드 불가 공격이 일반 공격과 시각적으로 구별되고 Defend를 우회한다. |
| Multi-enemy 1v2 Test | 두 적이 stable spawn order로 intent를 선언·해결하고 첫 공격의 방어 소비 뒤 후속 피해를 적용한다. |

Warrior/Spearman의 명칭은 공간 규칙을 비교하기 위한 샘플 unit 표시명이지, 확정된 직업 시스템이 아니다. `Start`는 각 시나리오의 provisional scripted action을 사용해 차이를 자동 재생하며, 수동 버튼은 개별 primitive 검사에만 사용한다.

## 현재 전투 계약

### Grid와 unit

- 전투는 픽셀과 분리된 정수 `GridPosition`을 사용한다.
- 기본 샌드박스 맵은 `12 x 3`이지만 map config와 scenario data로 주입하며 전역 상수가 아니다.
- 기본 배치는 학생이 왼쪽의 가운데 행, 적이 오른쪽의 가운데 행에 있는 scenario data다.
- 플레이어와 적은 공통 unit model을 사용한다. 위치, 방향, HP, AP, 상태, 능력, intent가 데이터로 표현된다.
- 엔진 자료구조는 한 학생과 여러 적을 수용한다. bundled 시나리오는 규칙을 드러내는 최소 규모만 사용한다.

### Turn pipeline

한 턴의 명시적 순서는 다음과 같다.

1. 살아 있는 적이 행동을 골라 intent를 선언한다.
2. intent의 방향, aim, anchor와 위협 종류를 잠근다.
3. telegraph cell을 계산한다.
4. 학생 AP를 최대치까지 회복한다.
5. 주입된 학생 strategy가 다음 행동을 결정한다.
6. 실행 가능한 학생 행동을 적용하고 state와 event history를 갱신한다.
7. AP가 남았다면 strategy를 다시 평가할 수 있다.
8. 살아 있는 적만 이미 선언한 intent를 실행한다.
9. 피해, 방어, 죽음과 강제 이동을 정해진 순서로 반영한다.
10. 턴을 끝낸다.

현재 전투 해석에는 명중, 치명타, 무작위 피해가 없다. 같은 초기 상태와 같은 action sequence는 같은 최종 상태와 같은 event sequence를 만들어야 한다. 향후 무작위 선택이 필요하면 전역 `Math.random()` 대신 seed 가능한 `RandomSource` 경계 뒤에 둔다.

### AP와 기본 행동

- 샌드박스 학생의 기본 max AP는 `2`이고 턴마다 회복한다. 수치는 unit/scenario data이며 성장 규칙은 아니다.
- Move는 기본적으로 1 AP를 사용해 상하좌우 인접 셀로 이동한다. 경계 밖, 대각선, 점유 셀 이동은 실패하며 겹침을 만들지 않는다.
- Defend는 effect/modifier로 다음 방어 가능한 피해를 1 줄인다. 이 수치와 지속 방식은 임시 밸런스다.
- Thrust는 같은 행의 전방 최대 3칸을 공격하고 기본 피해 1을 준다.
- Slash는 바로 앞 열의 세로 3칸을 공격하고 기본 피해 1을 준다.
- 사거리와 footprint는 ability/attack-pattern data로 표현한다. 특정 기술명을 engine의 분기문에 계속 추가하지 않는다.
- 대상 선택은 `TargetResolver`, 효과 적용은 `EffectResolver`로 분리한다. 한 능력은 데이터에 선언된 순서로 Damage, Guard, Knockback을 조합할 수 있다.
- 실행할 수 없는 행동은 이유를 포함한 실패 결과를 반환할 수 있으며, 최종 policy fallback 규칙을 암묵적으로 결정하지 않는다.

### Intent와 강제 이동

- 적 intent는 실행 전에 공개한다. 선언 뒤 학생이 이동해도 aim과 direction은 학생의 새 위치를 추적하지 않는다.
- intent source가 죽으면 실행을 취소하고 취소 event를 남긴다.
- `BODY` anchor는 실행 시 공격자의 현재 위치를 origin으로 footprint를 다시 계산하되, 선언 시점 direction은 유지한다.
- `GROUND` anchor는 선언 시점의 셀과 footprint에 고정된다. 현재는 확장 지점과 도메인 테스트를 위한 모델이며 정식 콘텐츠가 아니다.
- Knockback은 경계와 점유를 검사하는 combat effect다. 이동할 공간이 없으면 위치를 바꾸지 않는다.
- BODY-anchored source가 밀리면 telegraph도 새 origin으로 이동하고 변경 event를 남긴다. 이것이 재조준을 뜻하지는 않는다.
- 이동 intent의 `movementPath`와 공격의 `effectCells`는 별도 데이터다. 이동 목적지는 청색 이동 신호로, 공격 범위는 threat telegraph로 그린다.

### 방어와 위협 표시

- `NORMAL_ATTACK`은 Defend로 완화할 수 있다.
- `UNBLOCKABLE_ATTACK`은 Defend로 막을 수 없다.
- 두 위협은 색뿐 아니라 border, pattern 또는 icon 같은 두 번째 시각 신호로도 구별한다. 현재 도형과 색은 placeholder다.

### Event history와 presentation

의미 있는 변화는 단순 `console.log`가 아닌 구조화된 history로 축적한다. 예를 들면 턴 시작/종료, intent 선언/변경/취소, AP 회복/소비, 이동, 능력 사용, 상태 적용, 피해/방어, knockback, 사망이 있다. 이 history는 상태 snapshot과 별도로 노출해 정책 평가 때마다 전체 로그를 복제하지 않는다. 이 기록은 replay, 전투 복기, coaching, policy debugging을 위한 기반이지만 완성된 replay UI는 아니다.

Phaser presentation에는 최소 `idle`, `move`, `attack`, `defend`, `hit`, `knockback`, `death` 상태가 있다. manifest texture가 로드되면 `SpriteUnitVisual`, 없으면 현재 도형 기반 `PlaceholderUnitVisual`이 같은 상태 계약을 소비한다. Reset과 scene detach는 진행 중 tween/timer playback을 abort한 뒤 새 generation을 시작한다.

## Placeholder asset 교체

캐릭터나 전투 규칙 코드에 파일 경로를 직접 넣지 않는다. 새 아트를 연결할 때는 다음 순서를 따른다.

1. Vite가 제공할 수 있는 asset 위치에 이미지 또는 sprite sheet를 추가한다.
2. [`src/game/assets/AssetManifest.ts`](src/game/assets/AssetManifest.ts)의 visual definition에 `source`를 추가한다. 상대 URL은 Vite `BASE_URL` 아래에서 해석된다.
3. spritesheet라면 각 상태에 frame 번호와 frame rate/repeat를 선언한다.

```ts
student_sprite_01: {
  spriteKey: 'student_sprite_01',
  source: {
    type: 'SPRITESHEET',
    url: 'assets/student_sprite_01.png',
    frameWidth: 96,
    frameHeight: 96,
  },
  displaySize: { width: 72, height: 72 },
  animations: {
    // 나머지 상태도 같은 형식으로 매핑한다.
    idle: { key: 'student_sprite_01:idle', durationMs: 500, frames: [0, 1], repeat: -1 },
  },
}
```

4. [`VisualAssetLoader.ts`](src/game/phaser/assets/VisualAssetLoader.ts)가 preload와 Phaser animation 등록을 자동 수행한다. domain 타입에는 경로나 clip 이름을 추가하지 않는다.
5. unit은 texture가 있으면 sprite adapter를, 없으면 도형 fallback을 사용한다. VFX도 동일하게 texture/ellipse fallback을 선택한다.
6. `npm test`와 `npm run build`를 실행하고, animation state와 Normal/Unblockable telegraph를 샌드박스에서 확인한다.

projection, animation timing, sprite scale과 VFX 교체는 Phaser presentation 안에서 끝나야 한다. 동일한 simulation test 결과가 유지되어야 한다.

## Provisional / intentionally undecided

다음 항목은 샌드박스 검증을 위한 임시 선택일 뿐 확정된 게임 디자인이 아니다.

- 플레이어용 Gambit 문법, 조건 조합, 우선순위, target selector와 editor UI
- 샘플 `Basic`, `Scripted`, `ManualDebug` student strategy의 행동 선택
- 적의 scripted intent strategy와 향후 AI 구성 방식
- 기본 HP/AP/피해/방어 수치와 정확한 밸런스
- 다중 대상은 stable target 순서로 순회하고 각 대상에 effect 배열 순서를 적용한다. 죽은 대상의 뒤 효과는 생략하며 막힌 displacement는 뒤 효과를 취소하지 않는 현재 ordering 계약
- 최종 map 크기, 배치, projection, animation 속도와 UI 스타일
- 던전/계약 구조, 직업, 성장, 장비, 기술 숙련, trait/quirk와 permadeath
- narrative 용어와 최종 아트 방향

임시 정책이나 데이터에는 가능한 경우 `PROVISIONAL` 주석을 남긴다. 자세한 경계는 [docs/design-status.md](docs/design-status.md)에 기록한다.

## Deferred / non-goals

이번 scaffold는 최종 Gambit editor, 완성 던전 루프, 성장/직업/trait 시스템, 완전한 replay UI, backend, DB, 인증, multiplayer/networking을 구현하지 않는다. 물리 엔진, 범용 pathfinding, ECS, 대형 global state library, 정교한 particle system이나 완성 아트도 현재 범위가 아니다.

새 기능을 추가하기 전에는 “확정된 combat scaffold를 구현하는 데 필요하거나, 미정 시스템을 실제로 교체 가능하게 만드는가?”를 기준으로 범위를 판단한다.
