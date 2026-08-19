---
title: P16 Policy Spatial Choice Retrospective
status: technical-candidate
last_updated: 2026-08-19
related:
  - p16-policy-spatial-choice-contract.md
  - acceptance-evidence-matrix.md
  - p15-retrospective.md
---

# P16 정책 선택의 공간 결과 회고

## Result

정책 검토의 대형 `왜 사격하지 못했을까?`, 질문 제목, 설명 문단, 두 장의 text card를 제거했다. 왼쪽은 직전 전투의 동료·거리 1·인접 적·crossed shoot·실제 blocked count를 하나의 큰 lane으로 보여 준다.

오른쪽 1번은 동료가 제자리에 있고 적이 밀려나는 장면과 push `4→1`, 2번은 적이 제자리에 있고 동료가 물러나는 장면과 distance `1→3+`를 보여 준다. 선택하면 `NOW→NEXT` 5-slot에서 `PUSH` 또는 `POSITION+3` 한 곳만 강조되고, primary는 선택한 규칙 icon에서 알려진 경로 glyph로 이어지는 SPACE가 된다. pointer와 `1/Q`, `2/E`는 같은 controller action을 사용한다.

## Verification evidence

- `npm run typecheck`: pass
- `npm run verify:submission:encounter-transition`: `ENCOUNTER_TRANSITION_PASS`; blocked count 1 parity, 두 choice/lane, pointer PUSH_FIRST, keyboard KEEP_RANGE와 Q/E, 정확한 order/directive, changed slot 1, 4:3 overflow 0, browser error 0
- 같은 focused lifecycle 반복 실행: 동일 결과
- `npm run verify:submission:p3`: KEEP_RANGE가 TIME_LIMIT/HP 8/20분, PUSH_FIRST가 SECURED/HP 4/14분으로 이어지는 기존 실제 trade-off 유지, browser error 0
- production build 정상 속도 public-style 경로: 공개형 localStorage에 `KEEP_RANGE`, 기본 order, `keepRange=true`가 저장되고 선택 feedback·changed slot까지 통과했다. 단일 root preview의 예상된 `/slice1/` title 회귀에서만 이후 중단했다.
- exact-SHA `1e522aa1b40025c7c674155b4b6c9bf7f2ed2f7d` 누적 RC: `TECHNICAL_PASS`, worktree clean, 제출본 전체·Slice1·Slice2 7전투 회귀 통과
- 공개 release `/srv/ooh/releases/20260819T140340Z-1e522aa-submission`과 root·Slice1/2 health pass
- `npm run verify:submission:public`: `PUBLIC_BROWSER_PASS`; 실제 2번 입력이 저장된 `KEEP_RANGE`, 기본 order, `keepRange=true`와 일치했고 route title·browser error 0
- 직접 비교: `12-policy-spatial-choice`, `13-policy-keep-range`, `14-policy-keep-range-text-off`, `15-policy-keep-range-4x3`

기술·배포 증거는 닫혔지만 두 공간 장면을 신규 사용자가 의도한 선택 차이로 해석하는지는 human gate 전까지 REQUIRED다. P16은 technical candidate다.

## Initial model

- **사실:** `PUSH_FIRST`는 PUSH를 4순위에서 1순위로 옮기고, `KEEP_RANGE`는 순서를 유지한 채 POSITION에 최소 사거리 지침을 추가한다.
- **문제:** 기존 UI는 이 차이를 문장으로만 설명하고 5-slot bar는 선택 뒤 현재 상태만 보여 before/after를 비교할 수 없었다.
- **가설:** 같은 실패 장면에서 `적을 옮김`과 `나를 옮김`을 나란히 보여 주고 실제 한 정책 delta를 붙이면 정책이 추상 설정이 아니라 공간 대응으로 읽힌다.
- **제약:** 위임 결과를 미리 계산하거나 정답을 추천하지 않는다. 결과 trade-off는 다음 실제 simulation이 소유한다.

## Judgment log

1. P15 좌하단 hook의 실제 sprite·거리 1·crossed shoot를 큰 record lane으로 그대로 확장했다. 화면 전환마다 새 문법을 만들지 않기 위해서다.
2. choice card를 설명 목록이 아니라 같은 6칸 lane의 before/after로 만들었다. PUSH는 enemy after를, KEEP_RANGE는 ally after를 진하게 두고 이전 위치는 ghost로 남겼다.
3. `4→1`과 `1→3+`는 긴 문장보다 규칙 변화의 최소 수치만 소유한다. HP·턴·성공률은 의도적으로 표시하지 않았다.
4. 5-slot은 두 행 전체를 유지하지만 changed item만 밝힌다. PUSH_FIRST는 순서 변화를, KEEP_RANGE는 POSITION slot의 `3+` directive badge를 보인다.
5. 선택 input은 pointer만 두지 않고 이미 전투에서 학습한 1/Q, 2/E 문법을 재사용했다. 카드에는 가장 단순한 1·2만 노출한다.
6. focused P13~P15 route를 정책 선택까지 연장했다. 직전 전투 summary와 policy editor를 별도 fabricated fixture 없이 직접 연결했다.

## Cognitive errors and misses

- 첫 visual pass에서 pointer로 1번을 누른 뒤 keyboard로 2번을 선택하자 1번의 흰 focus border가 남았다. focus와 selected를 모두 밝은 실선으로 처리해 서로 다른 상태를 같은 signifier로 표현한 오류였다. focus는 금색 점선 외곽, selected는 청록 실선·하단 glow·check로 분리했다.
- 두 선택의 의미를 선명하게 만들려다 정답처럼 보이는 결과 수치를 넣을 가능성이 있었다. authoritative delegation test가 KEEP_RANGE는 안전하지만 느리고 PUSH_FIRST는 빠르지만 피해가 큰 trade-off임을 다시 확인한 뒤, editor에는 공간 변화만 남기고 실제 손익은 다음 simulation에 맡겼다.
- EVADE와 POSITION은 같은 이동 asset을 공유해 5-slot icon만으로 완전 구분되지 않는다. 현재는 red/purple 하단 code와 changed directive badge를 사용했지만, 신규 사용자의 구분은 아직 human evidence가 없다. 이를 자동 PASS로 주장하지 않는다.

## Process and efficiency

controller와 simulation을 변경하지 않고 기존 canonical rule을 먼저 감사한 것이 가장 큰 비용 절감이었다. 선택 card의 effect와 5-slot delta를 snapshot의 실제 `policy`, `policyDirectives`에서 렌더링해 별도 UI state를 만들지 않았다. P15 lifecycle 말단에 P16을 붙여 중앙 전투를 재사용했고, pointer·keyboard·text-off·4:3을 한 run에서 수집했다.

production bundle은 P15 대비 CSS가 약 4.99KB, SubmissionApp JS가 약 2.67KB 늘었다. 초기 entry와 deferred Phaser chunk는 변하지 않았다. 두 공간 lane과 policy delta가 추가한 비용이며 제출 범위에서는 수용하지만, P17부터는 기존 route·stop-condition primitive를 재조합하고 새 CSS vocabulary를 더 늘리지 않는다.

재작업은 focus/selected 상태를 캡처 전 CSS contract로 명시하지 않아 한 번 발생했다. 다음 Task에서는 시각 상태마다 `selected`, `focused`, `disabled`, `result`의 shape·border·motion owner를 구현 전에 표로 고정한다.

## Next rules

1. 정책 UI는 실제 전투 기록과 authoritative policy delta에서만 정보를 만든다.
2. 예상 공간 결과와 실제 작전 결과를 같은 화면에서 섞지 않는다.
3. selected와 keyboard focus는 서로 다른 비색상 signifier를 가진다.
4. 선택지는 pointer와 기존 combat shortcut grammar를 함께 제공한다.
5. 한 lifecycle의 직전 state가 다음 화면의 evidence source인지 직접 검증한다.

## Next task

P17은 정책 선택 뒤 위임 계획 화면을 소유한다. 현재는 큰 제목, 6행 주문서, 긴 설명과 400m route가 병렬로 경쟁한다. 알려진 동쪽 route, 두 적, 동료, 주인공 동시 과업, 시간·후퇴·미확인 규칙의 stop condition을 지도 위에 직접 배치하고, 무엇을 맡기며 언제 멈추는지를 문장표보다 먼저 읽히게 해야 한다.
