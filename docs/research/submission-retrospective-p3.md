---
title: Submission P3 Same-Rule Delegation Retrospective
status: under-validation
last_updated: 2026-08-19
related:
  - ../submission/milestones.md
  - ../submission/sector-1-golden-run.md
  - ../gameplay/combat/policy/action-policy.md
  - ../gameplay/operations/delegated-expeditions.md
  - ../gameplay/operations/world-time.md
---

# 제출본 P3 동일 규칙 위임 산출물·사고·개발 과정 회고

## Goal과 최종 assertion

플레이어 결과는 `직접 전투에서 본 공간 문제를 정책 한 곳으로 바꾸고, 정찰된 통로에 위임한 뒤, 실제 좌표·행동·HP·시간 기록으로 손익을 이해한다`이다.

구현 전 최종 assertion은 다음과 같았다.

```text
직접 전투 기록
→ 공간 원인 하나 선택
→ 알려진 400m 통로와 중단 조건 확인
→ 같은 BattleEngine simulation
→ source → decision → result 복원
→ 세계 시간은 동시 작업을 합산하지 않음
→ 성공해도 타일은 아직 OUTSIDE
```

## 산출물 결과

### 정책과 simulation

- 기존 5-slot action policy에 선택적인 `사거리 유지` 공간 지침을 추가했다.
- 위임은 별도 전투력 수치나 승률표가 아니라 BattleEngine, 같은 ability, Intent, 충돌, 피해, AP와 좌표 규칙을 실행한다.
- 정찰된 fixture는 직접 본 궁수와 전사를 다른 시작 행·거리에서 사용하며 새 적 규칙을 추가하지 않는다.
- policy step마다 turn, cycle, 선택 policy, 막힌 상위 policy 이유, 실제 이동 좌표 또는 ability를 기록한다.
- 400m 이동 8분에 실제 전투 턴을 더해 별동대 소요 시간을 만든다.

### 플레이어 선택과 실제 trade-off

첫 구현 가설은 `사거리 유지`가 안전하게 통로를 확보할 것이라는 것이었다. simulation은 이 가설을 반증했다.

| 한 곳의 변경 | 실제 결과 | HP | 시간 | 경로 |
|---|---:|---:|---:|---|
| 사거리 유지 | 12턴 시간 한도 중단 | 10→8 | 20분 | 위협 잔존 |
| 밀치기 1순위 | 6턴 승리 | 8→4 | 14분 | 안전 경로 확보 |

사거리 유지는 HP를 보존하지만 근접 전사를 끝내지 못한다. 밀치기 우선은 피해를 감수하고 경로를 확보한다. 시스템은 앞 선택을 오답으로 삭제하지 않고 기록과 경과 시간을 남긴 뒤 정책 재조정을 허용한다.

### UI 결과

- 정책 화면은 전체 판정 dashboard 대신 직전 실제 사격 실패 원인과 관련 1칸 공간을 먼저 보여 준다.
- 선택 화면은 `가까우면 먼저 밀친다`와 `사격 거리를 계속 지킨다` 두 공간 대응만 노출한다.
- 위임 확인은 실제 400m 경로, 관찰된 적 둘, 현재 HP, HP 2 이하 후퇴, 12턴 한도와 미확인 규칙 Decision을 한 장에 보여 준다.
- 결과 화면은 `SOURCE → DECISION → RESULT`, 실제 policy log, 피해·턴·시간·HP와 shared time을 분리한다.
- 실패 뒤 Space로 같은 기록에서 정책을 다시 조정한다.

## 검증 증거

| 계약 | 증거 | 판정 |
|---|---|---|
| 같은 입력의 결정론 | operation result 전체 deep equality | 통과 |
| 같은 좌표 규칙 | 실제 BattleEngine event 179/89개, policy step의 from→to와 ability 기록 | 통과 |
| 변경 전후 실제 결과 차이 | keep-range TIME_LIMIT와 push-first SECURED domain assertion | 통과 |
| source→decision→result 복원 | browser DOM 세 단계와 actual log assertion | 통과 |
| 중단 뒤 재조정 | keep-range 실행→중단→정책 화면→push-first 재위임 browser route | 통과 |
| shared world time | 첫 시도 max(주인공 5, 별동대 20), 재시도 max(기완료 0, 별동대 14) | 통과 |
| 위임만으로 편입 금지 | `routeSafe=true`, `threat=SECURED`, `anchorPrepared=true`, `territory=OUTSIDE` | 통과 |
| 레이아웃과 런타임 | 1280×720, 960×720 overflow 0, console/page/request error 0 | 통과 |
| 새로운 사람의 손익 설명 | 실행하지 않음 | 미검증 |

P3의 자동 기술 gate는 닫혔다. P2·P3 누적 V4 사람 검증 전까지 정책 선택의 직관성과 손익 설명은 `under-validation`이다.

## 사고 과정 메타회고

### 맞았던 판단

- **simulation을 UI보다 먼저 만들었다.** 이 순서 덕분에 화면 문구에 맞춰 결과를 꾸미지 않고 실제 정책 행동으로 선택지를 결정했다.
- **같은 엔진을 재사용했다.** 위임용 power score를 만들지 않아 직접/위임 규칙 drift를 구조적으로 막았다.
- **실패를 playable result로 보존했다.** 시간 한도 중단을 버그나 밸런스 실패로 지우지 않고 재정책 루프로 연결해 게임의 정책 미학을 강화했다.
- **최종 assertion을 먼저 적었다.** P2와 달리 UI 몇 장이 아니라 실패→재조정→성공→영토 밖 상태까지 검증 범위를 유지했다.

### 틀렸던 판단과 수정

- **문서의 유력 가설을 정답처럼 예상했다.** 기존 정본이 사거리 유지를 대표 예로 든 탓에 나도 그것이 안전 경로를 확보할 것이라 예상했다. simulation 결과는 피해는 줄지만 24턴까지도 전사를 제거하지 못했다.
- **처음에는 결과를 성공 쪽으로 튜닝하려 했다.** policy 이동 heuristic을 더 정교하게 바꿨지만 결과는 안전한 정체였다. 여기서 적 HP나 피해를 임의로 낮추지 않고 두 선택의 trade-off로 재해석한 것이 전환점이었다.
- **빈도를 의미와 혼동했다.** 전투 분석 카드가 가장 많이 막힌 `AP 부족`을 대표 원인으로 골랐다. 수치상 맞지만 플레이어가 조치할 공간 원인이 아니었다. `유효 사거리`처럼 다음 decision과 연결되는 원인을 우선하도록 요약 규칙을 바꿨다.
- **재시도의 동시 작업을 한 번 더 예약했다.** 첫 설계에서는 이미 끝난 주인공의 5분 준비를 재위임에도 반복 계산했다. 거점 준비 state를 확인해 재시도에서는 주인공 추가 시간이 0이 되도록 수정했다.

### 다음 스프린트에 남길 인지 규칙

1. 정본의 example outcome도 simulation 전까지 가설이다.
2. 선택지가 예상과 다르면 먼저 실제 trade-off인지 본 뒤에만 밸런스를 바꾼다.
3. 분석 요약은 빈도보다 `다음 조치와의 인과`를 우선한다.
4. retry는 결과만 재실행하지 않고 이전 시도의 세계 상태·시간·준비 완료를 상속한다.
5. 자동화가 성공한 선택만 통과시키지 말고 실패→복구 path도 같은 browser run에서 실행한다.

## 개발 과정 효율 회고

### 경제적이었던 부분

- P2 browser verifier에 선택적 P3 stage를 추가해 전투 자동 플레이와 오류 수집을 복제하지 않았다.
- domain test로 정책 결과와 결정론을 빠르게 반복한 뒤, 화면이 안정된 시점에만 약 30초의 전체 browser route를 실행했다.
- UI는 기존 sprite와 intent icon을 재사용하고 operation log를 notable step 4개로 압축했다.
- P3 WIP를 열기 전에 P2의 코드 변경을 모두 닫아 두어 이번에는 Task 사이 context가 섞이지 않았다.

### 낭비와 개선점

- 처음 keep-range heuristic을 `정답으로 만들기` 위해 한 차례 확장했다. 결과를 먼저 비교하고 선택의 역할을 정했다면 이 수정 탐색을 더 짧게 할 수 있었다.
- full P2→P3 browser route를 UI 소폭 수정마다 반복하면 비용이 커진다. domain·component 수준 실패가 없을 때만 전체 route를 실행하는 현재 ladder를 유지한다.
- P2 verifier 파일명이 P3까지 담당해 책임 이름이 낡기 시작했다. P4에서 제품 골든 경로로 확장할 때 `verify-submission-golden.mjs`로 승격하고 P2/P3 stage는 옵션으로 보존한다.

## 새 Task — P4 결계 확장과 지역 효용

### 플레이어 결과

동료가 확보한 안전 경로를 주인공이 실제로 지나 경계 방의 확장 거점을 활성화하고, 결계선·영토·샘·다음 좌표가 한 인과로 변한다.

### 최종 assertion

```text
DELEGATION_RESULT(SECURED, OUTSIDE)
→ 주인공 400m 안전 경로 이동
→ protagonistAtAnchor=true
→ 거점 활성화
→ incorporateTile 성공
→ contour 4→6
→ frontier INCORPORATED + spring ACTIVE + water +1
→ east/north/south next coordinates REVEALED
```

### P4가 보존할 규칙

- 위임 성공만으로 영토를 편입하지 않는다.
- 주인공 이동 시간은 다시 세계 시간에 반영한다.
- 잘못된 순서는 기존 authoritative blocker의 구체 이유로 거부한다.
- contour와 utility는 별도 축이지만 같은 활성화 사건의 결과로 화면에 이어진다.
- P4 종료 전 산출물·사고·개발 과정 회고를 작성한다.
