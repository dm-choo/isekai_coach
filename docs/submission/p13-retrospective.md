---
title: P13 Seamless Encounter Transition Retrospective
status: technical-candidate
last_updated: 2026-08-19
related:
  - p13-seamless-encounter-contract.md
  - acceptance-evidence-matrix.md
  - p12-retrospective.md
---

# P13 연속 조우 전환 회고

## Result

복도 200m에서 첫 합동 조우에 진입할 때 전장을 가리던 `SCOUTED ENCOUNTER`, 대형 적 이름, notice 설명과 상단 중복 제목을 제출 presentation에서 제거했다. 파티·적 sprite와 HP bar는 계속 보이고, 적 쪽의 붉은 `! + 공격` pulse와 하단 `공격 icon → SPACE`만 남는다.

`SPACE` 뒤에는 CombatStage를 교체하지 않고 같은 element 안에서 gate가 사라지며 Intent·동료 forecast·action dock이 나타난다. 첫 단독 전투의 승인 문법을 반복해 새 기호를 만들지 않았다. 변경은 제출 presentation의 일반 encounter에 한정했고 기존 Slice2 UI와 첫 단독 전투 gate는 유지했다.

## Verification evidence

- `npm run typecheck`: pass
- `npm run verify:submission:encounter-transition`: `ENCOUNTER_TRANSITION_PASS`, 첫 합동 조우 200m, title/설명 0, single primary action, 같은 CombatStage 유지, Intent·response·ally forecast 전이, 4:3 overflow 0, browser error 0
- 직접 비교: `00-threat-revealed`, `01-threat-revealed-text-off`, `02-threat-revealed-4x3`, `03-same-stage-input`

이 증거는 현재 working tree의 장면 구조와 브라우저 동작을 검증한다. exact-SHA 누적 RC와 공개 URL은 커밋 뒤 별도로 판정한다. 처음 보는 사람이 이것을 길 위의 조우로 이해한다는 사람 증거는 아니다.

## Initial model

- **사실:** 이전 frame은 이미 파티와 적을 전장에 배치한 뒤 중앙의 대형 제목과 설명문으로 거의 전부 가렸다. 복도에서 이동하던 세계보다 UI modal이 먼저 읽혔다.
- **가설:** 같은 전장을 계속 보여 주고 위협 pulse와 기존 `공격 icon + SPACE`만 남기면 `이동이 멈춤→적 발견→대치 승인`이 문장 없이 이어진다.
- **reference:** Pokémon Legends: Arceus의 환경·대상·작은 조작 prompt 공존, Darkest Dungeon의 좌측 파티·우측 적·하단 command 순서를 배치 규칙으로 사용했다.
- **제약:** 사용자가 고정한 수동 조우 시작, 전투 state와 spawn 위치, 기존 Slice2 presentation을 바꾸지 않는다.

## Judgment log

1. overlay 자체를 없애지 않고 pointer gate만 투명하게 남겼다. 조우 전에는 이동·기술 입력을 막되 세계를 시각적으로 가리지 않기 위해서다.
2. 적 이름·강함을 새 panel에 옮기지 않았다. sprite·적 HP bar가 identity를 소유하고 상세한 위협은 시작 뒤 Intent가 소유하게 했다.
3. pulse는 첫 합동 조우의 단일 위협 발견만 표시한다. 다중 적 각각의 source와 path는 기존 A/B/C Intent가 더 정확하게 소유하므로 P13에서 가짜 위치 매핑을 만들지 않았다.
4. `SPACE` 뒤 React element identity까지 검증했다. 배경 이미지가 같다는 캡처만으로는 실제 동일 장면 전환인지 증명할 수 없기 때문이다.
5. text-off frame에서도 party/enemy 대치, 붉은 threat, 공격 icon과 SPACE가 남는지 확인했다.

## Cognitive errors and misses

- 첫 focused verifier의 기본 포트를 `4190`으로 골랐다. Vite는 정상 기동했지만 WHATWG forbidden-port 목록 때문에 Node `fetch`가 `bad port`로 거부했고, 서버 readiness timeout처럼 보였다. 기존 검증 포트와 겹치지 않는지만 보고 브라우저 허용 범위를 확인하지 않은 실수다. `4191`로 옮겨 약 10초 gate를 복구했다.
- 초기 자동 assertion은 구조만 통과시킬 수 있었기 때문에 캡처 세 장을 직접 비교했다. 실제 frame에서 pulse가 적 위쪽에 붙고 button이 전장 밖 하단 여백을 사용해 actor를 가리지 않는 것을 확인한 뒤 유지했다.
- corridor DOM 자체는 CombatStage로 교체된다. P13이 보장하는 연속성은 combat `INTRO→PLAYER_TURN`의 같은 전장이지, CorridorStage와 Phaser canvas의 완전한 단일 DOM 연속성은 아니다. 배경·지면의 시각 연결은 개선됐지만 진정한 world-to-battle seamless camera는 더 큰 rendering architecture Task다.
- 일반 submission encounter에도 같은 단일 pulse가 사용된다. 이는 ‘위협이 드러남’에는 맞지만 다중 적 source 표식으로 해석하면 틀린다. 계약에서 pulse와 A/B/C ownership을 분리했고, 다중 조우의 실제 첫 frame은 후속 audit 대상으로 남겼다.

## User boundary and delegated judgment

사용자가 고정한 것은 Darkest Dungeon식 복도 이동, 전투 시 자연스러운 transition, SPACE 승인, 텍스트를 모르는 사람도 대략 이해하는 UI와 레퍼런스 충실도다. 구현자가 결정한 것은 title 제거, pulse 위치·크기, 하단 142px gate와 같은 element identity assertion이다. 자동 전투 시작이나 새 encounter 정보·수치는 도입하지 않았다.

## Efficiency

`기존 corridor/encounter 캡처 비교 → reference의 배치 규칙 추출 → submission-only markup/CSS → 약 10초 실제 제품 경로 gate → 세 비율/상태 캡처` 순서가 효과적이었다. 새 배경이나 sprite를 만들지 않고 문제를 일으키던 정보 계층만 제거했다.

낭비는 금지 포트 선택으로 약 30초 timeout을 두 번 겪은 것이다. 다음 브라우저 verifier 포트는 먼저 `fetch(new URL())`로 허용 여부를 확인하거나 이미 사용 중인 안전한 42xx 범위를 사용한다. 한편 P13 focused route가 단독 전투→동료 해방→복도를 실제로 통과하므로 개발 state 주입으로 생길 수 있는 전이 누락은 피했다.

## Next rule

1. encounter의 identity는 world actor와 HP bar가, 위협의 상세는 Intent가, 승인 입력은 단일 gate가 각각 소유한다.
2. 제목을 줄였다고 끝내지 않고 text-off·4:3·same-element 전이를 함께 검증한다.
3. 투명 overlay는 보이지 않는 입력 차단 역할과 button pointer ownership을 명시한다.
4. source처럼 보이는 표식은 실제 authoritative entity mapping이 없으면 generic threat 이상의 의미를 부여하지 않는다.
5. 브라우저 verifier 포트도 런타임 제약의 일부로 취급한다.

## Next task

P14는 첫 합동 전투 이후의 승리→복도 복귀를 같은 기준으로 감사한다. 현재 `PATH SECURED / 인카운터 해결 / 현재 HP와 소요 턴이 원정에 유지`라는 대형 결과 overlay가 다시 세계를 가리며, 무엇이 바뀌었는지 문장으로 설명한다. 적 소멸·경로 안전화·HP/시간 반영→같은 200m 지점에서 이동 재개를 world state 변화와 하나의 `SPACE`로 읽히게 하는 것이 다음 후보다.
