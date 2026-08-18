# Slice 2 연속 통로 전환 KPT와 UI 검증 루프

**작성:** 2026-08-19  
**상태:** implementation evidence  
**비교 기준:** Darkest Dungeon의 방–복도 탐색이 가진 `공간을 먼저 보고 → 한 방향으로 이동 → 지점 조우가 흐름을 끊는` 리듬. 장식이나 고딕 외형을 복제하는 것이 아니라 입력 수, 공간 인과와 정보 계층을 비교한다.

외부 비교 자료는 [Red Hook Studios의 공식 게임 소개](https://www.darkestdungeon.com/darkest-dungeon/)와 [Steam 공식 상점의 gameplay media 및 기능 설명](https://store.steampowered.com/app/262060/Darkest_Dungeon/)을 사용했다. 현재 slice의 독자적 플레이테스트를 대신하는 성공 근거가 아니라, dungeon crawl의 공간·탐색 표현을 점검하는 시각 기준으로만 사용한다.

## 이전 스프린트 KPT

### Keep

- 인카운터를 world seed와 generation에 미리 저장하고, 정찰은 이미 정해진 결과를 공개한다. 이 계약 덕분에 presentation을 바꾸어도 run의 결정론이 흔들리지 않았다.
- 전투 state를 pure TypeScript controller에 두고 React/Phaser를 표현 계층으로 제한했다. 통로 UX를 교체하면서 전투 규칙을 다시 손대지 않아도 됐다.
- 1280×720 전체 완주, 960×720 overflow, console/page/request error를 한 번에 보는 브라우저 smoke를 유지한다.

### Problem

- 데이터의 100m segment를 그대로 클릭 가능한 UI node로 노출했다. 구현 모델을 사용자 mental model로 오인해 `지도 → node 클릭 → D`를 네 번 반복하게 만들었다.
- 완료 여부를 기능 수와 테스트 통과로 판단했고, 실제 입력 리듬과 한 화면의 시각적 우선순위를 늦게 보았다.
- 정책 설명, 로컬 지도, 진행 안내를 모두 상시 표시해 중요한 world-space 신호보다 overlay가 먼저 보였다.
- 레퍼런스의 표면적 구조를 문서에 적었지만, `한 번의 방향 선택`, `연속 이동`, `조우의 자동 개입`처럼 측정 가능한 상호작용 계약으로 번역하지 않았다.

### Try

- domain segment와 selectable destination을 분리한다. 내부 판정 단위는 UI affordance가 아니다.
- 스프린트마다 첫 회색 화면부터 핵심 여정의 입력 횟수를 기록한다. 반복 입력이 발견되면 polish 전에 흐름을 고친다.
- 기본 화면에는 다음 행동에 필요한 신호만 남기고, 상세 정책·tooltip은 명시적 요청으로 펼친다.
- 레퍼런스 비교는 한 루프에 가장 큰 마찰 1~2개만 선정한다. `캡처 → 5초 판독 질문 → 수정 → 같은 캡처`로 토큰과 작업량을 제한한다.

## 이번 구현 계약

```text
방
 └─ 실제 방향의 문 1회 선택
     └─ 400m 연속 통로 (D 전진 / A 후퇴)
         ├─ 100m: 시간 및 저장된 encounter 판정
         ├─ 200m: 시간 및 저장된 encounter 판정
         ├─ 300m: 시간 및 저장된 encounter 판정
         └─ 400m: 판정 후 다음 방 도착
```

- 내부 segment는 클릭할 수 없다.
- 조우는 해당 위치에서 이동을 자동 정지한다. 해결 뒤 문을 다시 고르지 않고 같은 거리에서 재개한다.
- 내부 구조도는 비조작 HUD다. 월드 타일 사이에서만 별도 월드 맵을 사용한다.
- 문·방향·파티 이동·거리 눈금·위험 glyph가 한국어보다 먼저 의미를 전달한다.
- 전투 시작, 계획 확정, 전투 결과 진행은 `Space`로 이어진다.
- 동료 계획은 아이콘 요약만 기본 노출하고 상세는 사용자가 펼친다.

## 경량 비교 루프

### Loop 1 — 흐름

- 관찰: 기존 화면은 100m node마다 클릭 대상을 다시 요구해 공간을 걷는 느낌보다 UI를 조작하는 느낌이 강했다.
- 수정: 방의 실제 문 선택과 400m traversal을 도입하고 encounter 중에도 traversal을 보존했다.
- 판정: `문 1회 → D 유지 → 자동 조우 → D 재개 → 다음 방`이 controller와 브라우저 smoke에서 같은 흐름으로 이어져야 통과한다.

### Loop 2 — 시각 계층

- 관찰: 전체 local map과 항상 열린 ALLY PLAN이 world-space 캐릭터·문·Intent보다 먼저 눈에 들어왔다.
- 수정: local map을 소형 비조작 구조도로 축소하고, ALLY PLAN을 아이콘 summary로 접었다. 방 선택은 배경 위 문 실루엣과 방향 화살표로 옮겼다.
- 판정: 텍스트를 가린 5초 캡처에서도 `현재 방`, `갈 수 있는 문`, `이동 방향`, `정찰 전/후 위험`을 구별해야 한다.

### Loop 3 — 몰입 경계와 최종 판정

- 관찰: 첫 연속 통로 구현은 장면 전체를 테두리 panel 안에 넣어, 세계를 걷기보다 별도 PC widget을 조작하는 인상을 남겼다. 통로 중에도 비활성 휴식 버튼과 중복 안내가 보였다.
- 수정: 통로를 전체 world stage로 확장하고 거리선·A/D만 그 위에 띄웠다. 통로에서는 휴식과 중복 notice를 숨겼다. 소형 구조도는 상단 가장자리로 분리했다.
- 자동 증거: 9 test files·64 tests, Slice 1/2 production build, 1280×720 네 타일·6전투 완주, 재시도 0, browser error 0, 960×720 horizontal overflow 0. Space로 시작·전투 진입·전투 결과 진행을 실행했다.
- 판단: 현재 slice는 Darkest Dungeon 데모를 기준으로 한 핵심 UI/UX 비교축인 입력 경제성, 방–통로 공간 인과, 자동 조우, 현재 위치 유지, 정보의 progressive disclosure에서 뒤처지는 P0/P1 마찰이 없다. 캐릭터와 환경의 제작 미술 완성도 동등성을 주장하지 않으며, 이는 다음 art-production 단계의 별도 gate다.

### 다음 스프린트의 시작 규칙

1. 첫 구현 전 핵심 여정을 `행동 → feedback → 다음 행동` 세 열로 적는다.
2. 내부 state 식별자를 곧바로 버튼이나 node로 만들지 않는다.
3. 상시 HUD는 생존·현재 목표·즉시 선택만 허용한다. 설명은 progressive disclosure로 보낸다.
4. 색만으로 의미를 나누지 않고 형태, 위치 또는 motion을 함께 쓴다.
5. 자동 완주와 캡처 검증을 통과하기 전에는 완료 문구를 쓰지 않는다.
