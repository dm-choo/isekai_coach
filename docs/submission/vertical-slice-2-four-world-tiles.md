---
title: Slice 2 — Four World Tile Expedition
status: under-validation
last_updated: 2026-08-18
related:
  - scope.md
  - vertical-slice.md
  - ../gameplay/world/local-area-and-scouting.md
  - ../gameplay/world/tile-states.md
  - ../gameplay/combat/policy/action-policy.md
  - ../ux/views/local-view.md
  - ../research/validation-agenda-slice-2.md
  - ../development/deployment/slice2.md
---

# Slice 2 — Four world tile expedition

## Decision

**Accepted on 2026-08-18:** Slice 2는 전투판 네 장이 아니라 선형으로 연결된 월드 타일 네 개를 클리어하는 짧은 원정이다. 각 월드 타일은 중앙 방, 상·하·좌·우 경계 방, 중앙 방과 각 경계 방을 잇는 4구간 통로를 가진다.

Slice 1이 단일 보스방의 전투 판독과 조작 마찰을 찾았다면, Slice 2는 탐색 중 공개되는 인카운터, 누적 체력·시간과 서로 다른 적 Intent가 실제 선택 충돌을 만드는지 검증한다.

## Primary hypothesis — under-validation

> 플레이어가 중앙 방을 확보해 통로 위험을 정찰하고, 네 월드 타일 동안 체력과 시간을 유지한 채 서로 다른 적 Intent를 상대하면, 매 전투의 즉시 피해량이 아니라 앞으로 남은 경로까지 고려한 선택을 한다.

하위 가설은 다음과 같다.

1. 플레이어는 중앙 방과 네 통로의 관계, 현재 위치와 다음 월드 타일 방향을 설명 없이 판독한다.
2. 중앙 방 클리어가 모든 통로 정찰의 원인으로 읽힌다.
3. 매우 긴 사거리의 고블린 궁수, 빠르게 접근하는 고블린 전사와 고정 지면을 폭격하는 고블린 투척병이 서로 다른 대응을 요구한다.
4. 최소 두 상황에서 동료 보호, 플레이어 체력, 사격선과 소요 시간 중 하나를 포기해야 한다.
5. 타일 2 뒤 정책 순서를 한 번 바꾸면 타일 3에서 동료 행동과 결과의 변화가 보인다.
6. 타일 4의 처음 보는 적 조합에서 외운 답이 아니라 Intent anchor와 위치 규칙을 전이한다.

## Route contract

```text
[월드 타일 1] → [월드 타일 2] → [월드 타일 3] → [월드 타일 4]
```

- 월드 타일 연결은 이번 slice에서 선형이다.
- 각 타일의 진입은 서쪽 경계 방, 다음 타일로 나가는 출구는 동쪽 경계 방으로 고정한다.
- 북쪽과 남쪽 내부 통로·경계 방은 존재하지만 바깥 출구는 봉쇄한다. 선택 인카운터와 회복 사건을 배치할 수 있다.
- 각 통로는 4개의 구간을 가진다.
- 필수 진행은 `서쪽 경계 방 → 서쪽 통로 → 중앙 방 확보 → 동쪽 통로 → 동쪽 경계 방`이다.
- 중앙 방 확보 뒤 네 통로의 인카운터 종류와 위치를 공개한다.
- 중앙 방과 동쪽 안전 경로를 확보하면 현재 타일을 클리어하고 다음 타일로 이동할 수 있다.

## Expedition state

네 타일 동안 다음 상태를 유지한다.

- 관리자 현재·최대 HP
- 원거리 동료 현재·최대 HP
- 누적 이동 시간과 전투 턴
- 현재 동료 5-slot policy 순서
- 해결한 인카운터와 정찰 상태
- 현재 타일·방·통로 구간

전투 패배 재시도는 해당 인카운터 직전 체크포인트를 복원한다. 단순 재시도나 저장·불러오기는 인카운터 구성을 다시 추첨하지 않는다.

## Enemy roster

### 고블린 궁수 — accepted role, provisional tuning

- 전장 대부분을 덮는 매우 긴 직선 사거리로 같은 행의 가장 앞 대상을 공격한다.
- BODY anchor이므로 밀려나면 잠긴 방향을 유지한 채 사격선의 원점과 범위가 이동한다.
- 근접 압박에는 약하지만 방치하면 지속 체력을 깎는다.

### 고블린 전사 — accepted role, provisional tuning

- 단검을 들고 한 Intent 안에서 여러 칸을 빠르게 전진한 뒤 근접 공격한다.
- 원거리 동료를 빠르게 압박하므로 즉시 차단, 밀치기 또는 화력 유지가 충돌한다.
- BODY anchor와 이동 경로를 모두 미리 보여준다.

### 고블린 투척병 — accepted Slice 2 addition, provisional tuning

- 플레이어 또는 동료의 현재 위치를 중심으로 폭탄 착탄 지점을 잠근다.
- GROUND anchor이므로 투척병을 밀어도 착탄 지점은 움직이지 않는다.
- 궁수·전사와 함께 등장했을 때 `적을 밀어 Intent를 바꾸기`와 `아군을 이동해 피하기`가 서로 다른 해법임을 드러낸다.

정확한 HP, 피해, 전진 거리와 출현 수는 자동 시뮬레이션과 플레이테스트로 조정한다.

## Four-tile curriculum

| 월드 타일 | 역할 | 필수 검증 |
|---|---|---|
| 1 | 구조와 규칙 소개 | 중앙 방 확보 → 모든 통로 정찰, 고블린 전사의 이동 경로 판독 |
| 2 | 선택 충돌 노출 | 긴 사거리 궁수와 빠른 전사 사이에서 동료 보호·화력·HP가 충돌 |
| 정책 검토 | 원인 확인 | 실행된 정책과 상위 슬롯 실패 이유를 보고 슬롯 한 번 재정렬 |
| 3 | 수정 인과 확인 | 비슷하지만 배치가 다른 전투에서 동료의 선택과 한 결과 지표가 변화 |
| 4 | 전이 시험 | 궁수·전사·투척병의 처음 보는 조합을 추가 설명과 정책 수정 없이 해결 |

## Included implementation

- 고정 seed로 재현 가능한 4개 선형 월드 타일 원정
- 중앙 방 1개, 경계 방 4개, 방향별 4구간 통로 데이터 모델
- 통로 구간별 `없음`, `전투`, `사건` 인카운터
- 중앙 방 클리어에 따른 전체 통로 정찰
- 방·통로 이동, 현재 위치와 월드 타일 진행 UI
- 현재 장면에서 전투 grid와 HUD가 활성화되는 전환
- 관리자·원거리 동료 HP와 누적 턴 지속
- 고블린 궁수, 고블린 전사, 고블린 투척병
- 공개 Intent, 이동 경로, BODY/GROUND anchor 차이와 최종 상태 preview
- 타일 2 뒤 한 번의 policy 순서 변경과 이유 표시
- 인카운터 체크포인트 재시도와 원정 결과 요약
- `/slice2/` 독립 build와 공개 배포 검증

## Non-goals

- 비선형 월드 맵과 절차적 월드 전체 생성
- Slice 2 플레이 중 재침식 대기와 관리 simulation; 재침식 재추첨은 domain test로만 검증한다.
- 함정·자원·시설·경제의 완제품 상호작용
- 별동대와 동시 월드 시간 진행
- 자유 조건식, AND/OR 또는 자연어 policy editor
- 장비, 성장, 직업, 장기 저장과 backend
- 최종 sprite sheet, voice, music와 production audio mix
- 네 타일의 수치로 전체 게임 밸런스를 확정하는 것

## Implemented facts

- `Slice2RunController`가 네 타일의 현재 위치, 지속 HP, 이동 수, 전투 턴, policy와 encounter checkpoint를 소유한다.
- 모든 타일은 중앙 방·네 경계 방·방향별 4구간 통로를 같은 data contract로 생성한다.
- 고정 world seed가 최초 통로 구성을 만들고 `encounterGeneration` 기반 재침식 재추첨을 pure TypeScript로 검증한다.
- 필수 선형 경로에는 통로 전투 2회와 중앙 방 전투 4회가 있다. 북·남 선택 통로에는 사건·회복·추가 전투가 추첨될 수 있다.
- 고블린 궁수는 2칸 blind spot 뒤 전장 끝까지 이어지는 BODY 사격, 전사는 4칸 ADVANCE 뒤 근접 타격, 투척병은 3행 GROUND 폭탄을 사용한다.
- 관리자와 동료는 최대 AP 3, 이동 AP 1, 공격 AP 2 문법을 공유한다. 내려찍기는 피해 2의 순수 `#근거리공격`이며 고블린 전사는 HP 3이다.
- 이동형 적의 공개 경로는 현재 점유를 반영해 점유 cell 직전에서 끝나며, 최종 shadow와 공격 effect는 실제 도착점에서 다시 투영한다.
- built-in ImageGen으로 제작하고 chroma-key alpha cleanup을 거친 세 RGBA goblin cutout을 manifest/preload pipeline으로 사용한다.
- 타일 2 뒤 기존 policy 유지 또는 `사격 → 회피 → 포지셔닝 → 밀치기 → 빈 슬롯` 재정렬을 한 번 선택한다.
- Vite production base는 `/slice2/`이며 원자 배포 script가 기존 `/`와 `/slice1/`을 보존한다.

## Local verification completed

2026-08-18 구현 milestone:

- Vitest: 8 files, 51 tests pass.
- TypeScript: `tsc --noEmit`.
- Vite production `/slice2/` build.
- scripted Chromium 1280×720 전체 원정: 4 tiles cleared, 6 combats, 22 combat turns, retries 0, administrator HP 3/14, ally HP 10/12.
- 근접 적 이동 경로를 플레이어가 점유한 상태를 자동 재현해 점유 직전 최종 shadow, 축약된 이동 화살표와 재투영된 공격 cell을 screenshot으로 확인했다.
- policy는 타일 2 뒤 `SHOOT → EVADE → POSITION → PUSH → EMPTY`로 변경되고 타일 3·4에서 유지됐다.
- 960×720: horizontal overflow 0.
- console, page와 failed request error: 0건.

이 수치는 자동 heuristic 한 경로의 회귀 증거다. 의미 있는 선택, 공간 이해와 체감 난도는 외부 플레이테스트 전까지 `under-validation`이다.

## Completion gate

Slice 2는 단순히 네 타일을 이동할 수 있을 때 완료되지 않는다. 다음을 모두 증명해야 한다.

1. 네 타일과 각 타일의 중앙·경계 방·통로 4구간이 동일한 데이터 계약으로 동작한다.
2. 중앙 방 클리어 전후 통로 정보가 정확히 변한다.
3. 세 적의 Intent가 서로 다른 공간 대응을 실제 전투 결과로 만든다.
4. HP·시간·정책과 해결 상태가 타일 전환 뒤 유지된다.
5. policy 수정 전후 동료 행동의 인과가 기록된다.
6. 동일 seed와 입력은 동일한 월드 구성과 전투 event history를 만든다.
7. production build와 `/slice2/` public browser smoke가 통과한다.

재미, 선택의 의미와 전이 학습은 [Slice 2 validation agenda](../research/validation-agenda-slice-2.md)의 플레이테스트 전까지 `under-validation`이다.
