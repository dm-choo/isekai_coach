---
title: P12 Ally Policy Causality Retrospective
status: technical-candidate
last_updated: 2026-08-19
related:
  - p12-ally-policy-causality-contract.md
  - acceptance-evidence-matrix.md
  - p11-retrospective.md
---

# P12 동료 정책 인과 회고

## Result

첫 합동 전투에서 동료의 예정 행동과 실제 실행을 같은 정책 번호·행동 icon으로 연결했다. 닫힌 forecast는 `현재 상태 ○` 또는 `내 계획 ◇ → 정책 번호 + 행동`만 상시 표시한다. 플레이어가 이동을 계획하면 authoritative 위치는 바뀌지 않은 채 forecast basis와 sequence가 다시 계산된다. 상세를 펼칠 때만 1~5 정책 source, 선택 이유와 앞서 탈락한 정책 이유가 나타난다.

동료 턴에는 같은 1~5 strip에서 실제 선택된 번호를 강조하고 `✓ + 번호 + 행동 + 이유`를 보여 준다. 따라서 forecast가 약속한 정책과 실행 결과를 별도 설명문 없이 대조할 수 있다. 동료 턴의 큰 banner와 같은 내용을 반복하던 notice는 제출 presentation에서 제거했다. 기존 Slice2의 전술 편집 시점과 정책 언어, 전투 수치는 바꾸지 않았다.

## Verification evidence

- `npm run typecheck`: pass
- `npm test`: 13 files, 93 tests pass
- `npm run verify:submission:ally-policy`: `ALLY_POLICY_CAUSALITY_PASS`, 첫 합동 전투 turn 1, forecast 2 steps, 정책 번호 `[2, 3]`, 계획 전후 signature 변화, forecast/execution `POSITION` 일치, 4:3 overflow 0, browser error 0
- `npm run verify:submission:normal-combat`: `NORMAL_COMBAT_INFORMATION_PASS`
- `npm run verify:submission:golden`: `EXPANDED`, 4:3 overflow 0, browser error 0

이 증거는 현재 working tree의 규칙·브라우저 검증이다. exact-SHA 누적 RC와 공개 URL은 커밋 뒤 별도로 판정한다. 처음 보는 사람이 번호를 정책 우선순위로 읽거나 자기 계획과 동료 행동의 관계를 이해한다는 사람 증거는 아니다.

## Initial model

- **사실:** 동료 forecast는 행동 이름과 위치를 보여 줬지만 왜 그 행동을 택했는지, 실제 동료 턴에서 같은 판단이 실행됐는지 이어 주는 source identity가 없었다.
- **가설:** 정책을 새로 가르치지 않고 forecast와 execution에 같은 1~5 번호를 반복하면 플레이어는 `예정→근거→결과`를 먼저 보고 세부 이유는 필요할 때만 확인할 수 있다.
- **제약:** 기존 5-slot 정책·편집 시점·결정론적 projection을 보존하고 React가 정책 판단을 다시 구현하지 않는다.
- **판정 기준:** 화면 문구가 아니라 controller projection의 policy ID가 player plan 뒤 갱신되고, 실제 ally execution에서 같은 ID가 포착되어야 한다.

## Judgment log

1. `IntentPreviewStep`에 policy ID·rank·reason·앞서 탈락한 평가를 포함시켰다. UI에서 추론한 이유가 아니라 authoritative policy evaluator의 같은 결정을 표시하기 위해서다.
2. forecast는 기본으로 닫고 sequence만 남겼다. 정책 전체를 상시 노출하면 전장과 player response보다 설명서가 먼저 읽히기 때문이다.
3. `CURRENT`와 `PLANNED`를 원·마름모 shape로 구분했다. 색에만 의존하지 않고 player plan이 projection basis를 바꿨음을 한 자리에서 알리기 위해서다.
4. 실행 중에는 forecast와 동일한 번호 strip을 재사용했다. 새 결과 component나 별도 용어를 도입하면 두 상태를 사용자가 다시 매핑해야 하기 때문이다.
5. P12 전용 브라우저 검증이 단독 전투부터 첫 합동 전투까지 실제 제품 경로를 통과하도록 했다. 개발용 중간 state를 주입해 가장 중요한 전이 오류를 숨기지 않기 위해서다.

## Cognitive errors and misses

- 첫 검증은 단독 전투 turn 2 진입만 기다리고 `isBusy=false`를 기다리지 않은 채 내려찍기를 입력했다. turn 값과 입력 가능 상태를 같은 것으로 가정한 오류였다. 이후 모든 phase 입력은 `mode + turn + !busy`를 함께 gate하도록 고쳤다.
- 첫 `MutationObserver`는 동료 행동 중 포착한 `POSITION`을 phase 종료 때의 `EMPTY` DOM으로 다시 덮었다. 순간 사건의 history와 현재 DOM snapshot을 혼동했다. 첫 non-empty policy ID를 불변으로 저장하도록 바꾸고 forecast와 비교했다.
- 자동 인과 assertion이 통과한 뒤 캡처를 보니 compact execution 위에 큰 `동료 턴` banner와 동일 notice가 겹쳤다. 값의 일치만 검증하고 정보의 중복을 놓친 것이다. 제출 동료 턴에서는 compact execution을 단일 phase/result owner로 두고 중복 요소가 0개인지 assertion을 추가했다.
- 첫 공개 검증은 turn 2 action dock이 나타난 것만 보고 내려찍기를 찾았다. 캡처상 전장은 turn 2였지만 controller는 아직 busy여서 기술이 비활성 상태였다. 다시 한 번 `보이는 phase = 입력 가능한 상태`로 취급한 오류였다. 첫 수정은 개발 build에만 노출되는 controller bridge를 기다려 production에서 timeout됐다. 공개 gate는 내부 bridge가 아니라 `.is-busy`가 사라지고 실제 control이 활성화되는 사용자 관찰 가능 조건을 기다리도록 고쳤다. 또한 한국어 기술명을 selector로 쓰지 않고 안정적인 `data-action-id`를 노출해 검증이 번역 문구에 의존하지 않게 했다.
- 펼친 상세 card는 4:3에서 전장을 일부 덮는다. 기본 closed이고 의도적으로 요구한 순간에만 열리며 actor와 조작 dock을 가리지 않아 이번 범위에서는 허용했다. 다중 적 장면에서 source detail을 연 채 비교하는 사용 패턴은 사람 관찰 전까지 확정하지 않는다.

## User boundary and delegated judgment

사용자가 고정한 것은 정책형 오토 배틀러라는 핵심, 텍스트를 읽지 않아도 대략의 행위와 인과가 보이는 UI, 전장을 가리지 않는 점진 공개, 구현 과정 자체의 회고다. 구현자가 결정한 것은 1~5 source 번호, 원·마름모 basis, first non-empty execution 포착, 상세 card의 정보 순서다. 새 정책 조건, 정책 편집 시점, 동료 AI 밸런스는 이번 Task에서 확정하지 않았다.

## Efficiency

`domain metadata 단위 테스트 → submission-only compact UI → 약 15초 P12 전용 실제 경로 → 4:3과 실행 순간 캡처 → 정상 전투·제품 golden` 순서가 효과적이었다. 긴 누적 RC를 UI iteration마다 돌리지 않고, 단독 전투에서 첫 합동 전투까지의 핵심 전이를 한 focused route가 소유했다.

낭비는 검증 코드가 제품의 busy state와 순간 DOM 수명을 처음부터 모델링하지 못해 두 번 재실행한 데서 생겼다. 반대로 캡처를 assertion 뒤에도 검토한 덕분에 중복 banner를 커밋 전에 발견했다. 다음에는 phase 전이를 검증할 때 `authoritative readiness`, `event sequence`, `stable presentation frame`을 서로 다른 관찰 대상으로 먼저 선언한다.

## Next rule

1. preview와 execution은 사람이 읽는 이름이 아니라 동일한 authoritative ID를 공유한다.
2. 순간 상태 검증은 마지막 DOM 값이 아니라 ordered event history 또는 첫 유효 사건을 보존한다.
3. 입력 전에는 화면 phase뿐 아니라 controller의 busy/ready 상태를 함께 기다린다.
4. 새 compact owner를 만들면 같은 phase를 설명하던 banner·notice·toast의 중복을 감사한다.
5. 자동 인과 통과 뒤에도 INPUT·DETAIL·EXECUTION 세 frame을 직접 비교한다.
6. focused route는 실제 이전 장면에서 진입하되, 누적 RC보다 짧게 유지한다.

## Next task

P13은 복도 이동에서 첫 합동 조우로 넘어가는 전환을 소유한다. 현재 큰 `SCOUTED ENCOUNTER` overlay와 제목·설명문이 전장을 가리고, 이동하던 세계와 전투가 별개 화면처럼 끊긴다. 기존 `SPACE로 조우 시작` 계약은 보존하되, 세계의 정지→적 source reveal→배치/위협→입력 가능을 작은 시각 gate와 같은 장면 안의 변화로 읽히게 해야 한다. 새 콘텐츠보다 이 전환에서 필요한 조작과 결과를 찾는 비용을 먼저 줄인다.
