---
title: P22 Second Expansion Choice Retrospective
status: technical-pass-human-required
last_updated: 2026-08-20
related:
  - p22-second-expansion-choice-contract.md
  - steam-overwhelmingly-positive-quality-bar.md
  - ../submission/acceptance-evidence-matrix.md
---

# P22 두 번째 영토 선택 회고

## Result

첫 영역 편입 뒤 restart 대신 실제 두 번째 원정이 열린다. 플레이어는 같은 영구 좌표에서 동쪽 `400m / 물 0 / 위협 2`와 북쪽 `600m / 물 1 / 위협 1`을 보고, 포인터 또는 `D·W`로 타일을 고른 뒤 `SPACE`로 출발을 확정한다. 선택 중에는 시간·물·HP·world revision이 변하지 않고, 북쪽의 물은 확정 순간 한 번만 지불된다.

두 경로는 같은 `CORRIDOR → 중앙 직접 전투 → SCOUTED → 정책 검토 → 위임 → 주인공 거점 연결` 규칙을 다시 사용한다. 어느 경로든 최종 `COMPLETE`에서 incorporated tile 3개와 outer contour 8개가 남고, 고르지 않은 타일은 `REVEALED / OUTSIDE`로 유지된다. 남쪽은 P22에서 `UNSEEN`이며 선택지처럼 렌더하지 않는다.

정식 checkpoint는 v3로 올라갔고 v2를 먼저 지우지 않고 읽어 정규화한다. 손상되거나 mode와 active route가 모순된 v3는 앱을 blank/deadlock 상태로 만들기 전에 거부한다. 직접 전투 패배 비용은 `DEFEAT` 화면을 보고 있는 동안 이미 durable checkpoint에 반영되어 새로고침으로 회피할 수 없다.

## Player-facing trade-off

실제 골든 HP 4, 11:08 상태에서 동일 BattleEngine으로 얻은 최선 결과는 다음과 같다.

| 경로 | 최선 정책 | 결과 | 세계 시간 | 물 | 피해 |
|---|---|---|---:|---:|---:|
| 동쪽 | 접근 시 밀치기 | SECURED | 15분 | 0 | 1 |
| 북쪽 | 사거리 유지 | SECURED | 16분 | 1 | 0 |

동쪽은 빠르고 물을 보존하지만 HP를 잃고, 북쪽은 HP를 보존하지만 더 멀고 물을 쓴다. 이는 simulation 차원의 비지배 벡터다. 두 번째 편입 직후 제출본이 끝나므로 플레이어가 이 손익을 실제 미래 가치로 느끼는지는 아직 사람 증거가 없다.

## Verification evidence

- exact SHA `fdc3e47401a0c35c9161ab0c6c5fca234277b3c1`: clean worktree `TECHNICAL_PASS`
- 13 files, 117 tests, typecheck와 production build 통과
- focused route×policy deterministic replay와 watched BattleEngine trace parity 통과
- `verify:submission:territory-choice`: 동쪽 pointer·북쪽 W parity, 선택 무과금, 확정 시 북쪽 물 1회 차감, water 0 북쪽 pointer·keyboard 완전 불변, 동쪽 fallback, 양 checkpoint reload 통과
- 북쪽 완료 fixture: incorporated 3, contour 8, internal seam 0, 비선택 동쪽 OUTSIDE, COMPLETE reload 통과
- 1280×720·960×720과 text-off, 북쪽 facts와 주인공 overlap 0, 미발견 tile DOM 0, 물 부족 glyph 독립 대비, overflow 0, browser error 0
- `verify:submission:failure`: DEFEAT UI 중 durable AWAKENING checkpoint, defeatCount 1, +7분, 물·식량 각 1 소비와 HP 복구가 reload 뒤 보존
- 저체력 위임: KEEP_RANGE → RETREATED HP 2 → 후송 +30분·HP 4 → PUSH_FIRST → SECURED, 영구 loop 없음
- 누적 RC: 제출본 전체, Slice1, Slice2 4타일·7전투 모두 통과
- 공개 release `/srv/ooh/releases/20260820T011549Z-fdc3e47-submission`
- `verify:submission:public`: 첫 편입 후 동·북만 reveal, 남쪽 unseen, 선택 전 confirm 0, W 북쪽 선택 무과금, SPACE 물 1회 차감, 북쪽 CORRIDOR reload, Slice1·2 route와 browser error 0

자동 증거는 state·비용·좌표·복구·표현 일치를 증명한다. 처음 보는 사람이 두 손익을 발견하고 자신의 상태에 맞춰 선택하며, 샘이 북쪽 선택을 열었다고 설명하는지는 human gate 전까지 REQUIRED다.

## Initial model

- **사실:** P20은 첫 편입, 샘 water +1과 다음 좌표 reveal까지 이미 만들었지만 다음 행동은 restart뿐이었다.
- **문제:** 첫 확장의 효용이 이후 의사결정을 바꾸지 않아 영역 확장이 반복 동사가 아니라 엔딩 연출이었다.
- **가설:** 새 범용 campaign이나 적을 만들기 전에 기존 규칙을 두 번째 좌표에 다시 적용하고 두 비지배 경로를 고르게 하면 핵심 Aesthetic의 최소 반복성을 증명할 수 있다.
- **제약:** 선택은 영구 좌표에서 일어나고, 직접 학습 뒤 위임하며, 최종 편입은 주인공만 수행한다. 새 dashboard·추천·성공 확률·세 번째 frontier는 만들지 않는다.

## Judgment log

1. `EXPANDED`를 그대로 선택 mode로 승격하고 terminal `COMPLETE`만 추가했다. 첫 cycle을 복제한 새 상태군을 만들지 않아 rules와 save surface를 줄였다.
2. pointer·방향키는 선택만 하고 `SPACE`가 비용을 확정한다. 즉시 출발은 오입력 하나가 비가역 resource 소비가 되는 문제를 만들기 때문이다.
3. 경로 정의를 한 catalog로 모아 controller, delegation, UI와 test가 거리·시간·물·fixture를 따로 하드코딩하지 않게 했다.
4. 북쪽 availability는 water 값만이 아니라 첫 샘 `ACTIVE`와 water 1을 함께 요구한다. 초기 water가 남은 경로에서도 첫 확장의 인과가 사라지지 않게 했다.
5. 북쪽은 단일 장거리 궁수, 동쪽은 가까운 전사와 궁수로 구성했다. 신규 ability 없이 시작 좌표가 policy의 가치를 바꾸는지 먼저 검증했다.
6. 선택 타일에는 이동 segment, clock, threat, water를 함께 두고 추천 표시는 넣지 않았다. 플레이어가 손익을 비교하되 정답을 대신 고르지 않게 했다.
7. 실패한 위임이 retreat threshold에서 영구 정지하면 결계 안 후송으로 30분을 지불하고 HP 4까지 복구한다. 실패의 대가는 보존하되 합법적 선택 하나가 save를 파괴하지 않게 했다.

## Cognitive errors and misses

- 첫 happy-path 구현은 골든 HP 4에서 성공 정책만 사용해 통과했다. 적대적 감사가 동쪽 `KEEP_RANGE` 후 HP 2에서 두 정책 모두 계속 후퇴하는 영구 loop를 찾았다. deterministic이라는 사실을 `모든 합법적 선택이 복구 가능하다`와 혼동한 오류다.
- 직접 전투 패배 화면에서 outer mode는 계속 `COMBAT`라 `exportSave`가 undefined를 반환했고, reload는 전투 전 checkpoint로 돌아갔다. 버튼 retry만 검증해 실제 브라우저 종료 경계를 빠뜨렸다. 패배 snapshot으로부터 동일한 recovery save를 미리 계산해 UI 버튼과 persistence가 한 함수를 사용하도록 고쳤다.
- 첫 focused browser run은 bounds·error·state가 모두 PASS였지만 캡처 하단에 큰 검은 사다리꼴이 남았다. 그림자로 추정했으나 실제로는 `UNSEEN` 남쪽 tile을 낮은 opacity로 렌더한 것이었다. 알려지지 않은 좌표를 희미하게 보이는 선택지로 만든 상태·표현 불일치였다.
- 검은 tile을 제거한 뒤에도 북쪽의 위협·water facts가 중앙 주인공 뒤에 가려졌다. DOM bounds는 viewport 안이었지만 서로의 overlap은 검사하지 않았다. facts를 타일 바깥 빈 공간으로 옮기고 actor overlap 0을 계약으로 추가했다.
- blocked 타일 전체를 opacity·grayscale 처리하자 차단 원인인 water glyph까지 사라졌다. `불가`와 `왜 불가`를 같은 attenuation으로 처리한 정보 위계 오류였다. terrain과 일반 facts만 흐리고 water 취소 표식은 독립 대비로 남겼다.
- route UI에 거리와 위협·water는 있었지만 accepted contract의 travel time이 빠졌다. 거리와 시간이 선형이라 중복이라고 암묵적으로 축약했으나, 위임 화면의 세계 시간과 선택 비용을 연결하려면 clock도 필요했다. 코드 판단으로 계약을 조용히 줄이지 않고 작은 clock glyph를 복구했다.
- v3 parser는 버전 번호만 올리고 내부 world tile과 mode coherence를 충분히 검사하지 않아 `tiles:[null]`, 빈 supplies, active/selection 모순을 수용했다. 정상 export round-trip만으로 저장 강건성을 판단한 실수다.

## Process and efficiency

먼저 Aesthetic·domain·verification 감사를 병렬화해 `두 번째 실제 선택` 하나만 Goal로 고정했다. route catalog, world topology, migration과 UI 파일의 병목을 서로 나눠 읽은 덕분에 새 범용 framework 없이 기존 mode를 재사용할 수 있었다. 구현 뒤 focused unit/browser를 먼저 돌리고 clean SHA에서만 15-step 누적 RC를 한 번 실행했다.

효율을 가장 크게 높인 것은 happy path 뒤의 적대적 감사였다. 추가 콘텐츠를 만들기 전에 저체력 오답, refresh, malformed save를 검사해 실제 진행 불능 두 건을 발견했다. 반대로 시각 검증은 처음에 너무 자동화 중심이었다. `overflow 0`과 `browser error 0`이 검은 미발견 tile이나 actor occlusion을 말해 주지 못했다. 최종 캡처를 원본으로 직접 본 뒤에야 원인을 찾았고, 그 관찰을 다시 구조적 selector·overlap·contrast gate로 환원했다.

공유 worktree에서는 제품, golden/RC, failure, public verifier를 파일 단위로 분리했다. subagent가 모두 멈춘 뒤 commit하고 clean SHA RC를 실행해 이전 P21의 HMR 오염을 반복하지 않았다. Slice2 golden 하나가 약 287초로 RC 비용 대부분을 차지하므로 feature마다 전체 RC를 돌리지 않고 focused 후보가 닫힌 뒤 한 번만 실행한 판단은 유지한다.

## Next rules

1. 성공 경로뿐 아니라 모든 노출된 선택에서 `실패 → 대가 → 복구 가능한 다음 행동`을 검증한다.
2. 패배 비용은 retry 버튼 시점이 아니라 패배가 확정된 durable boundary에 저장한다.
3. save parser는 타입뿐 아니라 mode·route·selection의 coherence를 검사한다.
4. bounds 0을 occlusion 0이나 가독성 PASS로 해석하지 않는다. 중요한 정보 owner끼리 overlap을 별도 측정한다.
5. blocked state는 대상과 원인을 함께 흐리지 않는다. 원인 glyph는 오히려 대비를 유지한다.
6. `UNSEEN`은 다음 선택 UI에 희미한 타일로 렌더하지 않는다.
7. accepted contract를 구현 중 축약하려면 중복처럼 보여도 기록하고 다시 판단한다.
8. focused gate 뒤 clean SHA에서만 무거운 Slice1·2 누적 RC를 한 번 실행한다.
9. 자동 비지배 벡터를 실제 선택 갈등이나 재미의 사람 증거로 승격하지 않는다.

## Next task

P22는 영역 확장을 두 번 이어 핵심 동사의 최소 반복성을 만들었지만 전투 장면은 여전히 세계 장면보다 prototype처럼 보인다. 다음 최대 손실 P23은 새 적·능력·설명문보다 먼저 전장의 연속 지면, unit의 cell 접지와 큰 실루엣, 공격 source→contact→damage의 즉각적인 감각 feedback을 같은 시각 문법으로 묶는다.

P23 종료 뒤 P21~P23을 한 build로 묶어 신규 사용자에게 첫 행동 발견, 두 경로 손익 설명, 전투 인과와 체감 만족을 함께 확인한다.
