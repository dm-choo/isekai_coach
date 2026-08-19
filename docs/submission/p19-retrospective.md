---
title: P19 Anchor Handoff Retrospective
status: under-validation
last_updated: 2026-08-20
related:
  - p19-anchor-handoff-contract.md
  - p18-retrospective.md
  - acceptance-evidence-matrix.md
---

# P19 확보 경로와 주인공 거점 연결 회고

## Result

위임 성공 뒤의 대형 영문 label, 제목, 설명 문단, notice, 캐릭터 이름표를 제거했다. 장면에는 ground에 고정된 주인공, 뒤로 흐르는 배경과 지면, 아직 잠긴 확장 거점만 크게 남는다. 하단에는 `동료 check → 400m 확보 경로 → 주인공 현재 위치 → 잠긴 거점`을 한 축으로 배치했다. 이동 중 primary는 `주인공→잠긴 거점→D`, 도착 뒤 primary는 `주인공→빛나지만 잠긴 거점→SPACE` 하나다.

D와 pointer hold는 동일한 authoritative action을 사용해 step당 5m를 이동한다. 주인공은 화면상 x를 유지하고 world layer만 움직인다. 400m에는 8분이 지나고 `protagonistAtAnchor=true`가 되지만 `territory=OUTSIDE`와 자물쇠는 유지된다. 따라서 동료의 역할은 길 확보, 주인공의 역할은 현장 이동과 결계 연결이라는 경계를 화면과 state 양쪽에서 보존한다.

## Verification evidence

- `npm run verify:submission:p4`: EXPANDED; pointer·keyboard progress parity, 주인공 screen x 고정과 backdrop·ground 이동, 400m +8분, 도착 후 routeSafe·anchorPrepared·protagonistAtAnchor true와 territory OUTSIDE, SPACE 뒤에만 편입·contour 6·샘 활성·물 +1, browser error 0
- 13 files, 93 unit tests: pass
- production build: pass; P18 공개본 대비 CSS `117,340→120,902` bytes(+3,562), SubmissionApp JS `115,778→116,648` bytes(+870)
- 직접 비교: golden `12-anchor-approach`, `12-anchor-approach-text-off`, `12-anchor-approach-4x3`, `13-anchor-ready`, `13-anchor-ready-text-off`, `13-anchor-ready-4x3`
- 1280×720과 960×720에서 protagonist·anchor·route rail·primary가 viewport 안이고 overflow 0

자동·시각 증거는 input/state/time/presentation parity를 닫는다. 신규 사용자가 설명 없이 `동료가 길을 열었고 주인공이 그곳까지 가서 영역을 연결해야 한다`고 설명하는지는 human gate 전까지 REQUIRED다.

## Initial model

- **사실:** P18 완료 시 frontier는 이미 routeSafe·anchorPrepared지만 territory는 OUTSIDE이며 protagonistAtAnchor는 false다.
- **문제:** 기존 장면은 이 역할 경계를 행동으로 보여주지 않고 `되찾은 길`, `아직 내 영토 아님`, `주인공 현장 도착`이라는 문장으로 해설했다.
- **가설:** P17/P18에서 학습한 route와 goal 문법 위에 확보한 동료와 이동하는 주인공을 동시에 놓으면, 새 dashboard 없이 역할 인과를 복원할 수 있다.
- **제약:** 도착은 활성화가 아니다. ready 표현이 territory 편입처럼 보이면 authoritative state와 시각 의미가 충돌한다.

## Judgment log

1. 주인공 sprite는 screen anchor에 고정하고 backdrop·ground만 서로 다른 속도로 움직였다. 실제 state가 5m 단위 progress만 소유하므로 걷기 animation이나 임의의 world 좌표를 만들지 않았다.
2. route rail의 출발점에는 흐린 동료와 check를 남겼다. 단순 progress bar로 바꾸면 누가 길을 확보했는지 사라져 P18 결과와 P19 행동의 인과가 끊기기 때문이다.
3. 도착한 거점은 청록 glow를 얻지만 lock glyph를 유지했다. `상호작용 가능`은 강조하고 `이미 편입됨`은 표현하지 않기 위해서다.
4. main world의 거점과 rail의 goal, primary의 goal에 같은 diamond/core 형태를 재사용했다. 위치가 달라도 같은 대상을 다시 해석하지 않게 하기 위해서다.
5. P18 next rule에 따라 별도 card·metric·grid를 만들지 않고 기존 route·goal·actor vocabulary를 조합했다.
6. text-off와 4:3을 production build 전에 먼저 확인했다. 텍스트 제거 시 동료 완료, 주인공 이동, 닫힌 목적지, D에서 SPACE로 바뀌는 다음 행동이 모두 남았다.

## Cognitive errors and misses

- ready glow를 강하게 만들수록 거점이 이미 활성화됐다고 읽힐 위험이 있다. 이를 막기 위해 main glyph의 자물쇠와 OUTSIDE state를 SPACE 직전까지 유지했지만, 사람이 실제로 `활성화 가능`과 `활성화 완료`를 구분하는지는 아직 증거가 없다.
- route rail의 작은 actor는 인과용 표식이고 main actor가 실제 주인공이다. 자동 검증은 각 역할의 개수를 판정하지만, 작은 주인공이 별도 부대로 오인되는지는 human gate에서 관찰해야 한다.
- 현재 public 전체 경로의 TIME_LIMIT 결과는 이전 전투 피해가 누적돼 재시도 시작 HP가 낮다. P19 공개 검증은 실제 저장된 SCOUTED checkpoint를 복원한 뒤 성공 정책을 선택해 거점 상태를 검증하도록 설계했다. 이는 anchor 메카닉을 production state에서 고립해 검증하는 branch이지, 사람의 정상 플레이 동선을 대체하는 증거가 아니다.
- CSS 순증 +3,562 bytes는 기존 route primitive를 재사용했어도 main anchor·grounding·responsive 규칙이 추가된 결과다. P20에서 또 다른 progress rail이나 goal shape를 만드는 것은 허용하지 않는다.

## User and delegation boundary

사용자가 정한 방향은 동료가 공간 정책을 수행해도 주인공의 결계 확장이 최종 영역 편입 행위가 되는 구조, 텍스트를 모르는 사람도 거친 의미를 읽는 UI, 좌표와 이동 시간이 실제 규칙인 세계다. 400m rail의 구성, ready lock, icon primary와 검증 branch는 그 방향 안에서 자율 결정했다. 이동 거리·시간·편입 조건·보급 수치는 변경하지 않았다.

## Process and efficiency

새 simulation이나 fixture를 만들지 않고 P18 SECURED 다음 state를 기존 P4 golden에 연장했다. 하나의 helper가 진행 중·도착 후와 두 화면비의 actor count, progress parity, primary, retired copy, bounds를 함께 검사한다. public verifier는 debug global 대신 실제 SCOUTED save를 복원하고 normal controller input만 사용한다.

가장 중요한 과정 개선은 구현 전에 `ready지만 OUTSIDE`를 계약의 부정 조건으로 고정한 것이다. 덕분에 화려한 활성화 연출을 먼저 만들었다가 state 의미를 되돌리는 재작업이 없었다. 반면 CSS가 단일 파일에 계속 누적되는 구조는 검색과 삭제 범위를 넓힌다. P20은 새 스타일을 쓰기 전에 P15 contour, P17 goal, P19 anchor primitive의 조합으로 장면을 만들 수 있는지 먼저 판정한다.

## Next rules

1. 도착·상호작용 가능·활성화 완료는 서로 다른 state와 시각 표식으로 유지한다.
2. 누가 준비하고 누가 완료하는지 actor를 경로 양 끝에 남긴다.
3. progress bar만 그리지 않고 authoritative 거리와 world layer motion을 함께 검증한다.
4. public의 중간 메카닉 검증 branch와 사람의 정상 동선을 같은 증거로 부르지 않는다.
5. 새 장면은 기존 contour·route·goal·anchor vocabulary를 먼저 재조합한다.

## Next task

P20은 SPACE 뒤 실제 영역 확장을 소유한다. 현재 expanded 화면은 다시 큰 제목과 설명 문단, 상태 ledger, 좌표 목록으로 결과를 읽게 한다. 닫힌 거점의 활성화가 실제 contour를 한 칸 밀고, 새 영토 안의 샘이 효용을 얻어 물을 보충하며, 그 경계 밖에 다음 좌표가 열린다는 연쇄를 하나의 공간 변화로 보여줘야 한다. 이때 승리·확보·도착과 다른 `편입 완료` 표식을 사용하되 새로운 dashboard 문법은 만들지 않는다.
