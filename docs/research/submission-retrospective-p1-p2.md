---
title: Submission P1-P2 Implementation and Process Retrospective
status: under-validation
last_updated: 2026-08-19
related:
  - ../submission/milestones.md
  - ../submission/acceptance-criteria.md
  - ../submission/sector-1-golden-run.md
  - ../development/architecture/existing-scaffold-contract.md
---

# 제출본 P1–P2 산출물·사고·개발 과정 회고

이 문서는 코드 품질만 평가하지 않는다. 무엇을 근거로 판단했는지, 사고가 어디서 좁아졌는지, 개발 과정이 경제적이었는지, 다음 스프린트가 어떤 운영 규칙을 재사용해야 하는지를 기록한다. 제품 계약은 [Submission milestones](../submission/milestones.md)가 소유하며 이 문서는 구현 증거와 다음 Task를 결정하는 research 기록이다.

## 앞으로의 Task 종료 규칙

```text
플레이어 결과 정의
→ 최종 assertion을 먼저 정의
→ 구현
→ 가장 낮은 비용의 충분한 검증
→ 산출물과 사고·개발 과정 회고
→ 부족하면 보완 Task 생성 / 충분하면 다음 milestone 이동
```

테스트 통과, 화면 한 장 또는 커밋 생성만으로 Task를 성공 처리하지 않는다. 자동화가 확인한 사실, 디렉터가 확인한 사실, 처음 보는 사람에게 아직 확인하지 않은 가설을 분리한다.

## P1 — 영토 상태와 결계 윤곽

### 의도한 플레이어 결과

한 장의 지도에서 `보이는 땅`, `위협이 제거된 땅`, `내 결계 안의 땅`이 서로 다른 상태임을 표현하고, 편입된 타일 집합의 바깥쪽에만 결계선이 이어진다.

### 구현 결과와 품질

- 지식·위협·영토·효용을 서로 독립된 상태로 저장했다.
- 정찰, 위협 제거, 안전 경로, 거점 준비, 주인공 위치를 순서대로 검사하는 편입 blocker를 만들었다.
- 한 타일 편입 전 4개, 동쪽 타일 편입 뒤 6개의 외곽선 segment를 계산한다.
- 시작 화면에서 기존 영토, 보이지만 미확보인 동쪽 frontier와 결계 contour를 함께 렌더한다.

| 요구 | 증거 | 판정 |
|---|---|---|
| 네 상태의 독립성 | `world.test.ts`의 초기 상태와 단계별 blocker assertion | 통과 |
| 인접 타일만 편입 | 인접성 및 첫 미충족 조건 unit scenario | 통과 |
| contour가 편입 집합을 따름 | 4→6 segment 및 맞닿은 내부 edge 제거 assertion | 통과 |
| 한 화면에서 상태를 구별 | 1280×720, 960×720 시작 화면 확인 | 디렉터 확인만 통과 |
| 처음 보는 사람의 판독 | 실행하지 않음 | 미검증 |

P1의 domain gate는 통과했다. 화면 판독 효과는 P5 사람 검증 전까지 `under-validation`이다.

### 사고 과정에 대한 메타인지

- **판단:** 영토를 하나의 진행도 enum으로 압축하지 않고 네 축으로 나누면 이후 편입 조건과 UI가 덜 꼬인다고 보았다.
- **잘한 점:** 이 판단을 React 화면보다 먼저 순수 상태와 blocker test로 검증했다. 덕분에 contour 표현을 바꿔도 영토 규칙을 다시 만들 필요가 없다.
- **놓친 점:** 상태 모델의 정확성에 집중하면서, 플레이어가 실제로 네 상태를 구별하는 문제를 같은 무게로 다루지 않았다. `모델이 구별한다`를 `사용자가 구별한다`에 가깝게 느낀 것은 잘못된 대리 지표 선택이었다.
- **작동한 사고 규칙:** 파생 가능한 시각 정보는 별도 저장하지 않는다. contour를 authoritative state가 아니라 편입 집합의 함수로 둔 결정은 유지한다.
- **다음에 바꿀 사고 규칙:** domain correctness와 player legibility는 서로 대체할 수 없는 별도 열로 시작부터 적는다.

### 개발 과정 회고

#### 원활했던 부분

- 순수 TypeScript 상태 → unit scenario → React 표현 순서는 수정 범위를 좁혔다.
- 시작 화면을 두 비율에서 일찍 확인해 큰 배치 문제를 다음 Task로 넘기지 않았다.
- 기존 자산과 CSS를 재사용해 P1의 목적과 무관한 art-production으로 범위를 넓히지 않았다.

#### 비효율과 원인

- P1 직후 회고를 작성하지 않았다. 완료를 `테스트와 캡처가 생김`으로 판단했고, 다음 Task가 사용할 교훈을 외부화하는 일을 산출물로 세지 않았다.
- 색·작은 상태 문구 의존성을 발견했지만 P5 검증 부채로 명시하지 않았다. 머릿속의 유보 판단이 문서화되지 않으면 이후에는 완료 사실처럼 취급될 위험이 있다.

### 다음 스프린트에 넘길 규칙

1. 영토 상태 변경은 `state assertion`과 `색을 제외한 형태 판독`을 따로 검증한다.
2. contour 변경 전후를 같은 browser scenario에서 캡처한다.
3. 머릿속의 미검증 조건은 Task 종료 전에 반드시 표의 `미검증` 행으로 외부화한다.

## P2 — 직접 탐험과 중앙 방 정찰

### 의도한 플레이어 결과

플레이어가 초기 결계에서 동쪽 frontier로 직접 나가, 하나의 연속 통로를 걷고, 공간 규칙을 전투에서 경험하고, 중앙 방 확보가 네 통로 정찰을 일으킨다는 인과를 이해한다.

### 현재 구현 결과

- 시작 화면의 유일한 주 행동과 `Space`가 직접 원정을 시작한다.
- `D`를 누르는 동안 배경과 지면이 이동하고 파티는 화면의 기준 위치를 유지한다.
- 100m마다 세계 시간이 2분 흐르며 200m의 고정 조우에서 이동이 자동 정지한다.
- 조우는 기존 BattleEngine, SliceController와 CombatStage를 재사용한다. 별도 간이 전투 규칙을 만들지 않았다.
- 첫 전투 해결 뒤 같은 거리에서 이동을 재개하고, 400m에 중앙 방 입구가 나타난다.
- 중앙 방 전투를 해결하면 frontier가 `SCOUTED/CONTESTED`로 변하고 네 통로 정찰 화면으로 전환된다.

### 산출물의 네 축 비판 평가

| 축 | 확인된 강점 | 현재 부족한 점 |
|---|---|---|
| 버그 | 시작→통로→200m 조우 controller test, browser console error 0, horizontal overflow 0 | 실제 UI로 두 전투를 해결해 `SCOUTED`까지 도달하는 자동 경로가 아직 없다 |
| 마찰 | 첫 화면은 주 행동 하나, 통로는 D 하나, 조우는 자동 개입 | 첫 전투는 기존 Slice2의 정보량을 그대로 가져와 신규 사용자의 인지 부하가 여전히 높다 |
| 조작감 | 홀드 입력 동안 배경이 움직이고 손을 떼면 정지하며 조우가 입력을 자동 회수한다 | 조우 직전 감속, 명확한 input pulse와 audio가 없어 이동의 물성은 최소 수준이다 |
| 다이내믹 | 탐험 위치·시간·HP·전투 턴이 같은 run state에 남는다 | 첫 전사 조우가 어떤 공간 문제를 학습시켰는지 다음 선택과 아직 연결되지 않는다 |

| 요구 | 현재 증거 | 판정 |
|---|---|---|
| 첫 입력으로 탐험 시작 | controller test와 browser Space 입력 | 통과 |
| 100m 시간 비용 | 95m/100m 경계 unit assertion | 통과 |
| 200m 자동 조우 | 고정 위치·시간·적 구성 assertion과 browser 캡처 | 통과 |
| 배경 이동과 파티 기준 위치 | 1280×720 캡처 | 부분 통과, 수치 assertion 필요 |
| 중앙 방→네 통로 정찰 | controller code path와 정찰 화면 | 증거 불충분 |
| 무설명 첫 전투 확정과 정찰 인과 | 신규 사용자 확인 없음 | 미검증 |

따라서 P2는 `구현 후보`이지 milestone 완료가 아니다.

### 사고 과정에 대한 메타인지

#### 실제 판단의 흐름

1. P2에서 새 전투를 만들지 않고 Slice2 전투를 재사용해야 규칙 분기를 막을 수 있다고 판단했다.
2. 시작→통로→첫 조우를 가장 위험한 연결부로 보고 controller test와 브라우저 세 장을 우선했다.
3. 코드상 중앙 전투 승리 뒤 `SCOUTED` 전이가 연결된 것을 보고 P2 구현이 충분히 닫혔다고 느꼈다.
4. 그 확신으로 회고와 전체 경로 검증 전에 커밋하고 P3 정책 작업으로 주의를 전환했다.

#### 판단이 맞았던 부분

- 기존 CombatStage를 작은 구조적 interface 뒤에서 재사용한 것은 올바른 범위 절감이었다. 전투 규칙을 제출본 전용으로 복제하지 않았다.
- 상태 전이를 먼저 typecheck하고 UI를 붙인 순서는 컴파일 오류와 런타임 표현 오류를 분리하는 데 효과적이었다.
- 최대 세 장의 핵심 캡처만 사용한 것은 검증 비용을 제어하면서도 한국어 font fallback 문제를 발견하기에 충분했다.

#### 판단이 틀렸던 부분과 인지 편향

- **로컬 성공의 전체 성공 대체:** 시작→첫 조우가 연결되자 중앙 방까지도 같은 방식으로 작동할 것이라 낙관했다. 코드 경로의 존재는 end-to-end 실행 증거가 아니다.
- **진행 욕구에 의한 종료 서두름:** 다음 핵심인 정책 위임이 더 흥미롭고 제품 차별점에 가까워 보여, 현재 Task의 닫힘보다 다음 Task 착수를 우선했다.
- **증거 선택 편향:** 이미 통과한 79개 테스트와 빌드를 강하게 보고, 정작 P2 gate가 요구하는 `정찰 인과를 읽음` 증거가 없다는 사실을 약하게 보았다.
- **암묵적 회고:** 문제를 머릿속에서 인지한 것으로 회고가 끝났다고 취급했다. 다음 스프린트가 재사용할 수 있게 외부화하지 않으면 회고가 아니다.
- **사용자 개입 의존:** 자율적으로 종료 게이트를 지켜야 했지만 사용자가 “왜 회고하지 않느냐”고 중단해야 했다. 이는 workflow 자체의 실패다.

### 개발 과정의 효율성 평가

#### 경제적이었던 작업

- early typecheck, 변경 모듈 unit test, 1280×720 핵심 장면 확인 순으로 V0→V2를 올렸다.
- CombatStage 재사용으로 기존 intent·target·input feedback UI를 다시 구현하지 않았다.
- 스크린샷과 로그를 제한해 토큰과 브라우저 실행량을 과도하게 늘리지 않았다.

#### 낭비가 발생한 작업

- 사용 중인 port와 기본 Slice2 환경으로 dev server를 한 번 잘못 실행했다. 실행 profile을 확인하지 않은 단순 preflight 실패다.
- 첫 CSS에서 한국어 label에 Latin-only mono/serif를 강제해 사각형 glyph가 생겼다. 프로젝트의 기본 font 계약을 상속했으면 수정이 불필요했다.
- P2가 닫히기 전에 P3 정책 지시문을 수정해 WIP가 두 Task에 걸쳤다. context switching과 회고 지연을 만들었다.
- P2 verifier를 구현과 함께 만들지 않아, 지금 다시 전체 경로를 복원해야 한다.

### 다음 스프린트가 그대로 사용할 운영 규칙

1. **최종 assertion 선작성:** 첫 edit 전에 `어떤 최종 state와 화면이 Task 완료를 증명하는가`를 한 문장으로 적는다.
2. **WIP 1:** 현재 Task의 검증·회고가 끝나기 전 다음 Task 파일을 수정하지 않는다.
3. **역방향 증거 감사:** 플레이어 결과에서 시작해 필요한 상태·입력·화면·사람 증거를 역으로 추적한다.
4. **커밋 명칭 정직성:** 사람 gate나 end-to-end가 남으면 `완료`가 아니라 구현 checkpoint로 취급한다.
5. **실행 preflight:** branch, `VITE_SLICE`, port, URL을 한 번 확인한 뒤 browser loop를 시작한다.
6. **기본 font 상속:** 한국어 UI에는 Latin-only `font:` shorthand를 사용하지 않는다.
7. **회고 gate:** `산출물 평가 + 판단 평가 + 효율 평가 + 다음 규칙 + 새 Task`가 문서에 없으면 Task를 닫지 않는다.

## 새 Task — P2 closure

### 플레이어 결과

한 번 시작한 원정이 별도 지도 조작 없이 중앙 방 정찰까지 이어지고, 화면이 `중앙 방 확보 → 네 통로 정찰`의 원인을 복원한다.

### 최종 assertion

브라우저가 `INTRO → CORRIDOR(200m) → FIRST_WARRIOR → CORRIDOR(400m) → CENTER_GUARD → SCOUTED`를 실제 UI 입력으로 통과하고, 마지막 화면에 네 방향과 중앙 방 확보 인과가 존재한다.

### 종료 조건

- 전용 browser route가 재시도 예산 안에서 `SCOUTED`에 도달한다.
- party X 고정, background-position 변화, 200m 자동 정지, 400m 중앙 방, 네 방향 정찰을 assertion한다.
- console, page, request error가 0이고 1280×720과 960×720에서 수평 overflow가 없다.
- 이 문서에 closure 결과와 과정 메타회고를 갱신한 뒤에만 P3를 재개한다.

### 다음 작업이 의존해도 되는 사실

- 동일한 combat engine과 presentation을 직접 탐사와 이후 위임 비교에 재사용할 수 있다.
- 100m는 2분이며 첫 고정 조우는 200m에서 이동을 중단한다.
- 아직 의존하면 안 되는 가설은 `신규 사용자가 첫 전투와 정찰 인과를 무설명으로 이해한다`이다.

## P2 closure 실행 결과

### 산출물 증거

2026-08-19 현재 `npm run verify:submission:p2`가 실제 브라우저 입력으로 아래 경로를 완주했다.

```text
INTRO
→ D 이동과 world scroll
→ 200m FIRST_WARRIOR
→ 6턴, 재시도 0
→ 같은 200m에서 이동 재개
→ 400m CENTER_GATE
→ CENTER_GUARD
→ 8턴, 재시도 0
→ SCOUTED 10:22
```

- 파티의 화면 X는 이동 전후 동일했고 background와 ground position은 변했다.
- 중앙 방 1개와 연결 방 4개가 렌더됐고 `중앙 방 확보 → 모든 통로 정찰` 문구가 같은 장면에 존재했다.
- frontier는 `SCOUTED`, `CONTESTED`, `OUTSIDE`, `corridorsScouted=true`였다. 정찰을 안전 또는 영토 편입으로 잘못 승격하지 않았다.
- 960×720의 horizontal overflow는 0이었다.
- console, page, failed request error는 0이었다.

P2의 자동 기술 gate는 닫혔다. 처음 보는 사람의 무설명 판독은 P2·P3 누적 V4에서 확인하므로 UX 가설은 계속 `under-validation`이다.

### closure 사고 과정 메타회고

- **최종 assertion 선작성은 효과가 있었다.** 구현 전에 `SCOUTED까지 실제 UI 입력으로 도달`을 적어 두자 이전처럼 첫 조우 캡처에서 멈추지 않았다.
- **검증기도 가설이라는 사실을 재확인했다.** 첫 실행은 CSS transition이 끝나기 전에 background position을 읽어 정상 동작을 실패로 판정했다. 화면 state가 아니라 player-visible timing을 검사할 때는 안정화 조건이 필요하다.
- **시간 계약을 코드보다 단순하게 기억했다.** 두 번째 실행은 400m의 이동 8분만 기대하고 전투 6턴을 누락했다. 실제 state가 10:14인 이유를 추적해 검증식을 `이동 시간 + 실제 전투 턴`으로 고쳤다. 테스트 기대값을 통과시키려고 제품 state를 바꾸지 않은 판단은 옳았다.
- **역방향 증거 감사가 누락을 드러냈다.** 최종 SCOUTED에서 출발해 거꾸로 보니, 재개 지점·중앙 입구·두 번째 전투·정찰 상태를 각각 assertion해야 한다는 것이 명확해졌다.
- **자동 플레이의 역할을 제한했다.** 재시도 0 완주는 deterministic 경로와 치명적 회귀의 증거이지, 전투가 재미있거나 처음 보는 사람이 이해한다는 증거가 아니다.

### closure 개발 효율 회고

#### 재사용할 부분

- 기존 Slice2 smoke player의 가장 작은 전투 heuristic만 재사용해 새로운 테스트 전용 우회 API를 제품 controller에 넣지 않았다.
- 스크린샷을 intro, corridor, first encounter, center gate, scouted와 4:3 final로 제한했고 report에는 최종 계약 수치만 남겼다.
- 실패할 때 전체 suite를 반복하지 않고 P2 verifier만 다시 실행했다. 가장 낮은 실패 gate에서 수정한다는 원칙을 지켰다.

#### 개선할 부분

- 첫 browser assertion부터 transition 안정화 시간을 계약에 포함했어야 했다. 다음 verifier는 animation이 있는 값에 즉시 equality를 사용하지 않는다.
- 세계 시간 기대값은 문자열을 손으로 적지 않고 authoritative duration 항목으로 조합해야 한다.
- 장시간 browser process의 완료 출력이 도구 경계보다 늦게 도착해 별도 process 확인을 한 번 수행했다. 다음 실행은 verifier 자체 progress log와 명시적 final report write를 유지해 완료 여부를 빠르게 구별한다.

### P3에 전달하는 실행 규칙

1. 위임 결과의 시간도 `고정 이동/작업 시간 + 실제 BattleEngine 턴`으로 계산한다.
2. 직접 전투와 위임 parity는 최종 승패만이 아니라 action log, turn, HP와 좌표 이동을 비교한다.
3. 정책 변경 UI를 만들기 전에 `이전 전투 evidence → 한 변경 → 같은 규칙 결과`의 최종 assertion을 먼저 쓴다.
4. 사람 검증 전에는 `직관적이다`라고 쓰지 않고 자동화가 확인한 인과 요소만 보고한다.
