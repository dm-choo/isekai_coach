---
title: Submission Acceptance Evidence Matrix
status: technical-candidate
last_updated: 2026-08-20
related:
  - acceptance-criteria.md
  - release-candidate.md
  - human-playtest-card.md
  - ../research/submission-retrospective-p8.md
  - p10-retrospective.md
  - p11-retrospective.md
  - p12-retrospective.md
  - p13-retrospective.md
  - p14-retrospective.md
  - p15-retrospective.md
  - p16-retrospective.md
  - p17-retrospective.md
  - p18-retrospective.md
  - p19-retrospective.md
  - p20-retrospective.md
  - ../product/p21-first-contact-readiness-retrospective.md
  - ../product/p22-second-expansion-choice-retrospective.md
---

# 제출본 수용 기준 증거 매트릭스

이 문서는 테스트 개수나 milestone 완료감을 수용 범위 coverage로 착각하지 않기 위한 역추적 표다. 정본은 [acceptance criteria](./acceptance-criteria.md)이며, 각 행은 하나 이상의 실행 가능한 증거를 가져야 한다. 자동 증거가 사람의 이해·직관·재미를 대신하지 않는다.

상태 문법:

- **A**: 자동화된 authoritative 또는 browser gate가 소유한다.
- **V**: 자동 증거와 캡처를 사람이 확인했다.
- **H**: 신규 사용자 무설명 관찰만 닫을 수 있다.
- **REQUIRED**: 아직 외부 사람 증거가 없다. 이 행을 validated라고 부르지 않는다.

## Core experience

| Acceptance row | Evidence owner | 상태 |
|---|---|---|
| 초기 결계와 바깥 frontier 구분 | golden `00-awakening`, 물리적 cyan 경계·연속 지면·오른쪽 출구 | A+V, 의미 이해는 H REQUIRED |
| 단독 각성→첫 위협→동료 해방 | `verify:submission:golden`의 authoritative solo unit 수, sealed world object, 합류 전후 HUD assertion | A+V, 동료 획득 의미는 H REQUIRED |
| 직접 조우→규칙 관찰→정책 수정→알려진 통로 위임 | `verify:submission:golden`의 단일 complete cycle | A+V, 무설명 흐름은 H REQUIRED |
| 위임 결과가 경로·행동·피해·시간으로 설명됨 | 실제 400m routeSafe verdict, 12×3 finalState·movement/policy trace, four metric, shared `max()`의 TIME_LIMIT/SECURED parity와 text-off·양 비율 캡처 | A+V, 손익 설명은 H REQUIRED |
| 동료 확보만으로 편입되지 않음 | golden이 `routeSafe=true`, `territory=OUTSIDE`를 동시에 검증 | A |
| 동료가 연 길을 주인공이 직접 이어야 편입 가능 | P4 golden의 ally check→400m rail→protagonist marker→closed anchor, D/pointer parity, 이동 +8분과 도착 후 `protagonistAtAnchor=true`·`territory=OUTSIDE`, text-off·양 비율 캡처 | A+V, 역할 분리 이해는 H REQUIRED |
| 주인공 활성화 뒤 contour·샘·다음 좌표 변화 | world unit + golden의 두 owned tile·6-edge outer contour·active anchor/spring +1·동/북 linked OUTSIDE tile, 남쪽 UNSEEN, text-off·양 비율 캡처 | A+V, 인과 설명은 H REQUIRED |
| 첫 샘이 두 번째 비지배 frontier 선택을 열고 같은 규칙으로 다시 확장 | P22 route catalog·4 route×policy replay, pointer east/W north 선택 무과금→SPACE 비용, 두 번째 direct/scout/policy/delegation/anchor와 COMPLETE owned 3·contour 8 | A+V, 손익·샘 인과 설명은 H REQUIRED |
| 승리/편입/안정화를 별개로 읽음 | 독립 world state + 위임 route check, P19 OUTSIDE lock, P20 열린 anchor·외곽 contour·active spring의 순차 공간 표식 | A+V, 실제 개념 구분은 H REQUIRED |

## Information and control

| Acceptance row | Evidence owner | 상태 |
|---|---|---|
| 실행 단계의 primary action 하나, 영토 선택은 선택→확정 분리 | 첫 이동 `D`, 봉인 `SPACE`, contextual `assertPrimaryAction`; EXPANDED의 동·북 두 tile은 비용 없는 선택이고 선택 뒤에만 confirm `SPACE` 하나 | A+V |
| 첫 단독 전투가 위협→이동→예정 결과→실행 순으로 공개됨 | `verify:submission:solo-combat`의 위험/안전 preview, controller input gate, 둘째 턴 full-control assertion | A+V, 무설명 이해는 H REQUIRED |
| 전장이 준비된 뒤에만 첫 전투 입력이 열림 | P21 1,500ms 지연 fixture의 100/500ms continuity frame, 준비 전 keyboard·pointer state 불변, Phaser handshake 뒤 첫 accepted feedback 8ms와 공개 `READY` 경로 | A+V, 체감 대기는 H REQUIRED |
| 정상 전투가 전장→응답→계획 결과→실행 위계를 유지함 | `verify:submission:normal-combat`의 scene-first Intent, dock containment, demand tooltip, INPUT/OUTCOME assertion | A+V, 실제 신경 소모 감소는 H REQUIRED |
| 동료 forecast→정책 번호→계획 재계산→실행이 같은 인과 문법을 사용함 | `verify:submission:ally-policy`의 CURRENT/PLANNED signature와 동일 policy ID 실행 포착 | A+V, 번호의 의미 이해는 H REQUIRED |
| 복도 조우가 제목 카드 없이 적 reveal→SPACE→같은 전장 입력으로 이어짐 | `verify:submission:encounter-transition`의 title 0, single action, same CombatStage identity, 양 비율 캡처 | A+V, 조우 의미 이해는 H REQUIRED |
| 첫 합동 승리가 적 소멸→경로 check→시간 비용→200m 복귀로 이어짐 | `verify:submission:encounter-transition`의 victory title/notice 0, HP·minute·progress parity와 복귀 frame | A+V, 경로 확보 의미는 H REQUIRED |
| 중앙 방 승리가 중앙점 check→네 방향 통로·위험 reveal로 이어짐 | `verify:submission:encounter-transition`의 확인 전후 `corridorsScouted` 경계, center/route/room/threat 수, 양 비율·text-off 캡처 | A+V, 공간 인과 이해는 H REQUIRED |
| keyboard/pointer와 accepted/rejected/result 구분 | `verify:submission:interaction`, golden pointer east·keyboard W north와 focused branch parity | A |
| 불가 행동은 state 불변과 구체 이유 | controller early-activation, water 0 북쪽 pointer/W byte-equivalent state, 독립 water 취소 glyph | A+V |
| 적 Intent/관리자 plan/동료 prediction 비색상 문법 | 기존 `verify:combat-ux`, Slice 1 browser regression | A+V |
| 같은 적 다수의 source→path→target 추적 | Slice 1/2 combat regression과 multi-enemy intent tests | A |
| 정책 화면이 실제 실패→두 공간 대응→정확히 한 정책 변화로 이어짐 | encounter lifecycle의 blocked-count parity, 두 lane, pointer·`1/Q`·`2/E`, order/directive delta와 text-off·양 비율 캡처 | A+V, 선택 차이 이해는 H REQUIRED |
| 위임 한 장에 목적지·경로·시간·보급·중단 조건 | encounter lifecycle의 실제 선택 policy parity, route party·400m·두 위협·goal, stop 3·supply 0, 5분/8분 `MAX_NOT_SUM`, text-off·양 비율 캡처 | A+V, stop·병렬 의미 이해는 H REQUIRED |

## World and simulation

| Acceptance row | Evidence owner | 상태 |
|---|---|---|
| 지식·위협·영토·효용 독립 | `world.test.ts` | A |
| 중앙 방 해결만으로 네 통로 결정론적 정찰 | controller transition + encounter lifecycle의 확인 전 false/확인 후 true + golden map-state assertion | A+V, 원인 설명은 H REQUIRED |
| 낮은 HP로 중앙 방을 확보해도 기존 휴식 비용을 거쳐 위임 cycle이 이어짐 | public production checkpoint의 동료 HP≤6에서 단일 rest primary, 물·식량 각 -1·20분·양 캐릭터 HP +3, rest 뒤에도 SCOUTED 유지와 연속 TIME_LIMIT→SECURED→P19 진입 | A+V, 비용 이해는 H REQUIRED |
| 직접/위임이 동일 grid·ability·intent·collision·time 규칙 사용 | independent action-trace replay through `BattleEngine` | A |
| 공유 월드 시간, Decision은 해당 부대만 정지 | golden이 병렬 작업 시간을 합산하지 않고 `max()`로 검증 | A |
| 패배가 재추첨·비용 초기화 없이 안전 영토로 복귀 | `verify:submission:failure`의 DEFEAT UI 중 durable 비용 저장, reload 보존, defeat→retreat→re-entry | A+V |
| 합법적 저체력 위임 선택이 영구 loop를 만들지 않음 | P22 KEEP_RANGE RETREATED HP2→후송 30분·HP4→PUSH_FIRST SECURED, save/reload와 attempt 2 | A |
| 손상·모순 checkpoint가 blank/deadlock을 만들기 전에 거부됨 | v3 parser의 tile shape, supplies, mode↔active↔selection, policyChoice coherence unit cases와 v2 migration | A |
| 인접 확보 타일만 편입 | incorporation blocker/contour unit scenarios | A |
| 불안정화가 소속·시설은 보존하고 안전·생산·정찰만 손상 | `destabilizeTile` preservation scenario | A |

## Submission scope

| Acceptance row | Evidence owner | 상태 |
|---|---|---|
| 주인공 1·동료 1로 골든 런 완주 | `verify:submission:golden` | A |
| 두 frontier를 연속 편입하고 두 번째 contour에서 proof 종료 | P22 first EXPANDED choice + north/east COMPLETE, incorporated 3·contour 8·비선택 OUTSIDE | A+V |
| 샘 물 보충이 다음 원정 가능성을 바꿈 | active spring + water `+1`, 북쪽 availability와 SPACE water 1회 차감, water 0 동쪽 fallback | A+V, 이해는 H REQUIRED |
| deferred 경제·보스·다중 부대 없이 cycle 성립 | complete cycle build와 scope audit | A+V |
| 16:9·4:3 핵심 요소가 가려지지 않음 | golden opening captures + interaction 960×720 + P22 cold-load 양 비율·route facts/actor overlap 0·critical bounds·overflow 0 | A+V |

## Release evidence

| Layer | Command / record | 승격 조건 |
|---|---|---|
| focused rules | `npm test -- --run src/game/submission` | 변경 모듈 0 failure |
| first experience | `npm run verify:submission:interaction` | text-independent solo opening, D/pointer, v3 checkpoint와 v2 fallback |
| first solo combat | `npm run verify:submission:solo-combat` | delayed readiness→blocked hidden input→8ms accepted feedback→threat→unsafe revise→safe execute→full controls, both ratios, error 0 |
| normal combat hierarchy | `npm run verify:submission:normal-combat` | scene-first action dock, result focus, both ratios, error 0 |
| ally policy causality | `npm run verify:submission:ally-policy` | closed forecast, 5-slot source, plan recomputation, forecast/execution policy identity, both ratios, error 0 |
| encounter and decision lifecycle | `npm run verify:submission:encounter-transition` | threat reveal→same-stage input→200m return→central scouting→record-linked choice→map-first plan→actual TIME_LIMIT result, both ratios, error 0 |
| failure contract | `npm run verify:submission:failure` | safe retreat, persistent cost, no reroll, browser error 0 |
| second territory choice | `npm run verify:submission:territory-choice` | east/north parity, payment, water block, COMPLETE/reload, overlap·text-off, error 0 |
| product golden | `npm run verify:submission:golden` | first EXPANDED, two unselected choices, pointer/W parity, both ratios, browser error 0 |
| cumulative technical RC | `npm run verify:submission-rc` | clean exact SHA, submission + Slice 1·2 전부 통과 |
| production | `npm run deploy:submission` then `npm run verify:submission:public` | 새 release, public v3 input/reload, first expansion, north selection/payment/reload, Slice1·2 routes |
| human | [human playtest card](./human-playtest-card.md) | acceptance human rows의 2명 이상 증거 |

## Unclosed evidence

- 신규 사용자 2명 이상의 무설명 기록이 없으므로 직관성, 핵심 경험 전달, 재미는 **REQUIRED**다.
- 두 경로의 HP·time·water 손익, 첫 샘과 북쪽 unlock, 비선택 타일이 결계 밖에 남는다는 인과는 자동 상태만 통과했으며 사람 설명 증거는 **REQUIRED**다.
- 실제 사람 기준 15~25분 pacing은 자동 playback 시간으로 추론하지 않는다.
- 느린 네트워크에서 검은 전장과 준비 전 입력은 자동 지연 fixture로 닫혔다. continuity transition의 실제 체감 대기는 아직 사람 검증이 없다.
- 위 항목은 콘텐츠 추가로 우회하지 않고 같은 build의 관찰 증거로 닫는다.
