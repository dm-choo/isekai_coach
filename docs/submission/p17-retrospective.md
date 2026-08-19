---
title: P17 Delegation Route Retrospective
status: technical-candidate
last_updated: 2026-08-19
related:
  - p17-delegation-route-contract.md
  - p16-retrospective.md
  - acceptance-evidence-matrix.md
---

# P17 위임 경로와 중단 조건 회고

## Result

위임 계획의 대형 제목, 설명 문단, 6행 주문서와 두 장의 동시 작업 text card를 제거했다. 화면의 가장 큰 owner는 이제 `동료+선택 정책 → 0/200/400m 경로 → 전사·궁수 → 경계 방`이다. 동료에는 실제 HP와 P16에서 선택한 정책 badge가 붙고, 알려진 두 적에는 attack/shoot icon이 붙는다.

경로 아래 한 strip은 `HP≤2→pause`, `12턴→pause`, `미확인→pause`, 물·식량 `×0`을 형태와 최소 수치로 보여 준다. 하단은 하나의 시계에서 주인공 5분 lane과 동료 `8+?` lane이 갈라져 다시 합쳐지며, 합산이 아니라 더 오래 걸린 작업만큼 시간이 흐르는 규칙을 공간으로 표시한다. primary는 선택 정책 icon→play→SPACE 하나다. 예상 성공·HP·턴은 넣지 않아 실제 simulation이 결과를 계속 소유한다.

## Verification evidence

- `npm run typecheck`: pass
- `npm run verify:submission:encounter-transition`: `ENCOUNTER_TRANSITION_PASS`; KEEP_RANGE state parity, 400m·8분·위협 2, stop condition 3, HP 2·12턴·unknown pause·보급 0, 주인공 5분과 `MAX_NOT_SUM`, text panel 0, 4:3 overflow 0, browser error 0
- 같은 focused lifecycle을 시각 수정 뒤 반복 실행: 동일 결과
- `npm run verify:submission:p3`: KEEP_RANGE는 TIME_LIMIT/HP 8/20분, PUSH_FIRST는 SECURED/HP 4/14분이며 routeSafe·anchorPrepared true, territory OUTSIDE, browser error 0
- 직접 비교: `16-delegation-route-plan`, `17-delegation-route-text-off`, `18-delegation-route-4x3`

exact-SHA 누적 RC와 공개 배포 증거는 implementation commit 뒤 현재 SHA에서 새로 수집한다. 자동·시각 증거는 계획 정보의 존재와 상태 일치를 닫지만, 신규 사용자가 세 stop symbol과 두 병렬 lane을 올바르게 설명하는지는 human gate 전까지 REQUIRED다.

## Initial model

- **사실:** 경로 400m, 이동 8분, 전사·궁수, HP 2 이하 후퇴, 12턴 제한, 미확인 규칙 정지, 위임 중 보급 미사용, 주인공 준비 5분은 이미 controller와 simulation에 존재한다.
- **문제:** 기존 화면은 동일 정보를 제목·주문서·동시 작업 card로 복제해, 플레이어가 경로를 보는 대신 문서를 읽게 했다.
- **가설:** actor와 rule을 실제 경로 위에 붙이고 중단 조건을 한 strip으로 압축하면, 번역 전에도 `누가 어디로 가며 무엇에서 멈추는지`의 거친 의미가 남는다.
- **제약:** policy editor의 선택을 복제 상태로 만들지 않고 snapshot을 사용하며, 결과를 예측하거나 추천하지 않는다.

## Judgment log

1. P16의 policy icon과 기존 route actor를 재사용하고, 새 정보 vocabulary는 pause·shared clock·merge line으로 제한했다.
2. 중단 조건은 서로 다른 card가 아니라 같은 높이·같은 `조건→정지` 문법 네 칸으로 만들었다. 보급은 조건이 아니므로 마지막 칸에 pause를 두지 않았다.
3. 동료 HP와 policy는 route 시작 actor에 붙였다. 화면의 다른 영역에서 다시 찾게 하지 않기 위해서다.
4. 전사와 궁수의 이름표 대신 실제 sprite와 이미 학습한 attack/shoot icon을 사용했다. 세부 이름은 접근성 label이 소유한다.
5. 병렬 시간은 결과 계산식이 아니라 계획 구조만 보여 준다. `8+?`는 이동은 알려졌지만 전투 시간은 실제 수행 전 미정임을 보존한다.
6. focused P13~P16 lifecycle 말단을 P17까지 연장해 fabricated plan fixture 없이 실제 직전 전투와 정책 선택을 source로 사용했다.

## Cognitive errors and misses

- 첫 구현의 병렬 시간은 공통 시계 뒤에 주인공과 동료를 한 줄로 배치했다. 데이터와 bounds test는 통과했지만 캡처에서는 `주인공 다음 동료`의 순차 작업처럼 읽혔다. 자동 검증의 `MAX_NOT_SUM` attribute를 실제 시각 의미로 착각한 오류였다. 공통 시계에서 위·아래 lane으로 갈라지고 5분 endpoint가 더 짧으며 `8+?`가 더 길게 끝난 뒤 합쳐지도록 고쳤다.
- stop strip의 심볼은 text-off에서도 남지만, heart·clock·question과 pause가 신규 사용자에게 정확히 같은 문법으로 읽힌다는 증거는 없다. 익숙한 기호를 썼다는 이유로 human comprehension을 통과 처리하지 않는다.
- 경로의 적 위치는 알려진 순서를 설명하지만 실제 위임 전투의 초기 grid 좌표를 의미하지 않는다. route plan과 combat preview가 섞이지 않도록 grid cell이나 예상 공격 범위는 넣지 않았다.

## User and delegation boundary

사용자가 정한 방향은 결계 확장형 영역 정책 오토배틀러, 텍스트를 몰라도 거친 의미가 보이는 UI, 동일 규칙 위임과 경제적인 검증이다. 경로 중심 배치, stop strip의 구체 shape, 병렬 lane의 배치와 자동 assertion은 그 방향 안에서 자율 결정했다. 경로 수치·중단 규칙·정책 결과는 새로 설계하지 않고 기존 authoritative state를 보존했다.

## Process and efficiency

구현 전에 controller·simulation의 실제 수치를 감사해 UI copy가 별도 규칙이 되는 것을 막았다. P16에서 이미 사용한 asset과 primary grammar를 재사용했고, focused run 한 번에 pointer/keyboard 전이 이후 P17 state·두 비율·text-off를 수집했다. 기존 P3 golden의 문자열 주문서 assertion도 DOM 구조·authoritative data assertion으로 교체해 UI 문구 변경이 규칙 검증을 깨지 않게 했다.

production bundle은 직전 P16 공개본 대비 CSS `107,353→113,059` bytes(+5,706), SubmissionApp JS `112,521→113,332` bytes(+811)다. 첫 build에서 CSS가 +7,741 bytes였지만 제거된 제목·주문서·동시작업 card의 죽은 규칙을 찾아 2,035 bytes를 회수했다. route·stop·branch/merge shape가 남긴 순증은 수용하되 P18은 새 dashboard vocabulary를 더하지 않고 P17의 경로와 actor primitive를 재사용한다.

재작업은 한 번 발생했다. 원인은 병렬이라는 추상 관계를 DOM attribute로만 명세하고, `두 lane이 실제로 갈라져 보여야 한다`는 shape acceptance를 구현 전에 더 엄격히 쓰지 않은 것이다. 다음 Goal부터 관계형 UI는 state parity 외에 text-off 캡처에서 source·branch·merge가 실제로 구분되는지를 첫 visual gate로 둔다.

## Next rules

1. 관계형 UI는 attribute parity보다 먼저 text-off에서 source·branch·target shape를 판정한다.
2. 계획 장면은 알려진 입력과 중단 조건만 표시하고 simulation 출력은 예측하지 않는다.
3. 하나의 authoritative 수치는 한 장면에서 가장 가까운 actor 또는 path 한 곳만 소유한다.
4. 기존 자동 검증이 copy를 찾으면 구조·state parity assertion으로 바꾼다.
5. human comprehension이 없는 familiar icon은 검증 완료가 아니라 명시적 human 질문으로 남긴다.

## Next task

P18은 현재 위임 결과 화면을 소유한다. 결과 화면은 다시 큰 제목·설명·세 장의 causality card·로그·동시 시간 text panel이 경쟁한다. 실제 경로 위에 행동 trace와 피해·시간·중단 또는 확보 지점을 되돌려 놓고, `선택한 정책이 어디에서 어떤 결과를 냈는지`를 읽은 뒤 정책 수정 또는 경계 이동으로 이어져야 한다.
