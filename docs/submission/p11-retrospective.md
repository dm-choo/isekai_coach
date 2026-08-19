---
title: P11 Normal Combat Information Retrospective
status: technical-candidate
last_updated: 2026-08-19
related:
  - p11-normal-combat-information-contract.md
  - acceptance-evidence-matrix.md
  - p10-retrospective.md
---

# P11 정상 전투 정보 위계 회고

## Result

첫 학습 턴 뒤의 제출 전투를 Darkest Dungeon의 scene-first 비율에 맞춘 하나의 하단 action dock으로 재구성했다. 큰 player-turn banner와 전장 위에 떠 있던 plan strip을 제거하고, `actor/AP | 이동 | 기술 | 계획/실행`을 133px 높이의 한 panel에 배치했다. 적 Intent는 source letter와 이동·공격 sequence만 상시 보이며 이름·anchor·상세 효과는 hover/focus에서만 나타난다.

입력 상태에서는 이동과 세 기술이 전경이다. 행동이 계획되면 world의 cyan preview와 dock 안 plan chip, 청록 `SPACE`가 전경으로 바뀐다. 하나뿐인 target picker, 기술의 상시 `사용 가능` 문장, 이전 턴의 오래된 실행 feedback은 노출하지 않는다. 기술 설명과 불가 이유는 실제 pointer movement 또는 keyboard focus에서만 보존한다. 변경은 `SUBMISSION` presentation에만 적용해 기존 Slice2 UI 계약은 유지했다.

## Verification evidence

- `npm run typecheck`: pass
- `npm test`: 13 files, 93 tests pass
- `npm run verify:submission:normal-combat`: `NORMAL_COMBAT_INFORMATION_PASS`, turn 2 banner 0, plan inside dock, tooltip on demand, preview change, dock 133px, 4:3 overflow 0, browser error 0
- `npm run verify:submission:solo-combat`: `SOLO_COMBAT_INTERACTION_PASS`
- `npm run verify:submission:golden`: `EXPANDED`, 4:3 overflow 0, browser error 0

이 증거는 현재 working tree의 focused/product 검증이다. exact-SHA 누적 RC와 공개 URL은 커밋 뒤 별도로 판정한다. 실제 사람이 정상 턴의 위계를 더 빨리 읽는다는 증거는 아니다.

## Initial model

- **사실:** P10 첫 턴은 한 질문씩 공개하지만 turn 2에는 중앙 banner, 우측 Intent, 전장 위 plan strip, 하단 이동·기술·AP가 동시에 돌아왔다.
- **가설:** 선택 수를 줄이지 않고 관련 정보를 하단 한 panel로 묶고 상세 문장을 demand layer로 내리면 전장→응답→결과 순서가 유지된다.
- **reference:** Darkest Dungeon의 전장/하단 panel 비율과 actor→skill→result 흐름, One Step From Eden의 world cell 결과 우선을 그대로 기준으로 삼았다.
- **제약:** 전투 수치·기술·적 AI를 바꾸지 않고 제출 presentation과 그 browser contract만 소유한다.

## Judgment log

1. 전체 Slice2의 공용 JSX를 갈아엎지 않고 `SUBMISSION` 테마에만 `submission-action-dock`을 적용했다. 제출 경험을 개선하면서 기존 수직 슬라이스 회귀의 시각 계약을 불필요하게 바꾸지 않기 위해서다.
2. plan strip을 삭제하지 않고 같은 dock의 결과 영역으로 이동했다. 여러 AP 행동을 계획하는 기존 메카닉을 보존하면서도 world preview가 위치 결과를 소유하게 했다.
3. target picker는 후보가 둘 이상일 때만 보이게 했다. 하나뿐인 대상을 다시 선택하게 하는 UI는 선택이 아니라 확인 비용이기 때문이다.
4. DOM count뿐 아니라 dock·plan bounding box 포함 관계를 검증했다. ‘같은 section의 child’와 ‘실제로 화면 안에 배치됨’이 다를 수 있기 때문이다.
5. 자동 gate 통과 뒤에도 input·tooltip·outcome·4:3 캡처를 직접 비교해 오래된 feedback을 제거했다.

## Cognitive errors and misses

- 첫 CSS는 plan strip을 `position: relative`로 바꿨지만 이전의 `left: 50%`와 `bottom: calc(...)`를 초기화하지 않았다. DOM상 dock 안에 있어도 화면에서는 오른쪽 위로 떠 있었다. 첫 geometry assertion이 `x 957, y 477, width 569`를 잡아냈다. layout mode를 바꿀 때는 position 값 전부를 reset해야 한다.
- 첫 P11 gate는 계층·tooltip·overflow를 통과했지만 캡처에 이전 턴의 `행동 1개 확정 · 실행 시작`이 남았다. state가 turn 2라도 `inputFeedback` 수명은 자동으로 끝나지 않는다는 점을 놓쳤다. 새로운 INPUT 상태에서 오래된 COMMITTED feedback만 숨기고 이를 assertion으로 추가했다.
- 첫 안정 캡처를 420ms 뒤 찍었을 때 상단 HP bar text가 전환 frame에서 부분적으로 보였다. 제품 상태와 presentation 안정 시점이 같다고 가정한 검증 타이밍 오류였다. 800ms 안정 frame으로 바꾸고 이후 캡처를 판정했다.
- 첫 clean-SHA RC의 Slice2 회귀에서 target picker 1개가 사라져 중단됐다. 제출 테마만 바꾼다는 경계를 정했지만 `enemies.length > 1` 조건을 공용 JSX에 적용한 실수였다. `compact ? 1 : 0` 기준으로 제출 dock만 단일 대상을 숨기고 legacy Slice2는 기존 후보 표시를 유지하도록 고쳤다.
- 오른쪽 plan 영역은 복수 대상·복수 행동을 수용하기 위해 입력 상태에서 다소 비어 보인다. 현재 한 적 장면에서는 과한 폭일 수 있으나, 이를 즉흥적으로 줄이면 다중 적 상태에서 다시 깨질 수 있어 이번에는 4:3과 계획 상태까지 검증된 구조를 유지했다. 실제 다중 적 제출 장면의 시선 밀도는 다음 관련 audit에서 다시 판정한다.

## User boundary and delegated judgment

사용자가 고정한 것은 레퍼런스를 실제 배치·비율까지 충실히 따르는 것, 텍스트 비의존, 신경 소모 감소, 전장을 가리지 않는 UI와 과정 회고다. 구현자가 결정한 것은 dock 133px, 네 영역의 폭, 단일 대상 picker 제거, normal turn Intent 압축과 stale feedback 수명 처리다. 메카닉·밸런스·장기 UI 스타일은 새로 확정하지 않았다.

## Efficiency

`reference 3장 비교 → 정보 계약 → submission-only markup/CSS → 17초 focused browser → 직접 캡처 → P10/제품 golden` 순서가 효과적이었다. 4분대 누적 Slice2 회귀를 시각 수치 조정마다 돌리지 않았고, plan 위치 오류는 첫 6초 run에서 바로 중단됐다.

낭비는 CSS layout 전환 시 잔여 inset을 한 번에 reset하지 않은 것과, stale feedback을 초기 assertion에 포함하지 않은 데서 발생했다. 둘 다 긴 golden 전에 닫혔으므로 release 왕복은 생기지 않았다.

## Next rule

1. layout positioning model을 바꾸면 `top/right/bottom/left/transform`을 전부 명시적으로 감사한다.
2. DOM ancestry가 아니라 실제 bounding containment를 UI 구조의 증거로 사용한다.
3. phase가 바뀌면 control뿐 아니라 이전 phase의 feedback·focus·hover 수명도 함께 검사한다.
4. icon-first UI는 text-off 캡처와 deliberate tooltip 캡처를 한 쌍으로 남긴다.
5. submission-only 개선은 legacy presentation과 분리하고 누적 RC에서 둘을 모두 검증한다.
6. 공용 JSX의 조건 변경에는 presentation flag가 실제 분기에 포함됐는지 diff에서 별도로 확인한다.

## Next task

P12는 첫 동료 합류 전투에서 이 게임의 고유 메카닉인 정책 인과를 소유한다. 플레이어가 `동료가 무엇을 하려는지 → 어느 정책 우선순위 때문에 그런지 → 내 계획이 동료 예정을 어떻게 바꿨는지 → 실제 결과가 무엇인지`를 긴 정책 설명 없이 연결할 수 있어야 한다. 새 정책 기능보다 forecast·source policy·result의 world/UI 인과를 먼저 감사하고 점진 공개한다.
