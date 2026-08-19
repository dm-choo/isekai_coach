---
title: P21 First Contact Ready and Responsive Retrospective
status: technical-pass-human-required
last_updated: 2026-08-20
related:
  - p21-first-contact-readiness-contract.md
  - steam-overwhelmingly-positive-quality-bar.md
  - ../submission/acceptance-evidence-matrix.md
---

# P21 첫 전투 준비와 입력 신뢰 회고

## Result

첫 이동이 시작되면 Phaser chunk와 전투 필수 asset을 미리 불러온다. 전투 진입 뒤 Phaser scene이 asset을 읽고 authoritative snapshot을 받은 시점에만 `READY`를 보낸다. 그 전에는 직전 숲·결계 장면과 붉은 위협 pulse가 화면 전체를 소유하고 combat HUD·버튼·keyboard·pointer는 state를 바꾸지 않는다.

준비 뒤에는 readiness와 같은 수명으로 입력이 열린다. keyboard listener는 매 snapshot마다 제거·재등록하지 않고 최신 snapshot ref를 읽어 전이 직후의 첫 키가 effect 교체 구간에 걸리지 않게 했다. Slice2와 제출본은 같은 계약을 사용한다.

공개본에서 이전 `HP·Intent·버튼만 있고 전장은 검은` frame은 사라졌다. 실제 공개 `02-public-solo-plan`은 background, 불투명 지형, 두 unit, 적 Intent, player ghost와 action을 함께 보여 준다.

## Verification evidence

- 지연 fixture: Phaser module·ground·combat background 요청에 각각 1,500ms 지연을 부여
- 준비 전: visible combat control 0, keyboard와 pointer 뒤 snapshot byte-equivalent, 100ms·500ms continuity frame에서 검은 전장 0
- 준비 후: readiness gate 0, 첫 전투 action visible, 첫 허용 이동→accepted feedback 브라우저 내부 실측 8ms
- `npm run verify:submission:solo-combat`: 위 readiness와 기존 위협→불안전 preview→수정→안전 실행, 1280×720·960×720, browser error 0
- exact SHA `76b813f7610d5a3bc67f9e9992667383c8bb207e`: `TECHNICAL_PASS`, clean worktree, 13 files·94 tests, 제출본 `EXPANDED`, Slice1, Slice2 4타일·7전투 회귀 통과
- production release `/srv/ooh/releases/20260819T235130Z-76b813f-submission`; 직전 rollback target `/srv/ooh/releases/20260819T164338Z-79c41c3-submission`
- `npm run verify:submission:public`: `PUBLIC_BROWSER_PASS`, 첫·합동·중앙 combat가 각 `READY` 뒤 시작, 공개 save/reload expansion과 Slice1·2 path, browser error 0

이는 화면과 입력 순서를 증명한다. 신규 사용자가 기다림을 자연스러운 위협 전환으로 느끼는지, 첫 전투를 도움 없이 이해하는지는 human gate 전까지 REQUIRED다.

## Initial model

- **사실:** controller는 Phaser와 무관하게 먼저 `COMBAT/INTRO`가 되며 React HUD도 즉시 렌더됐다.
- **문제:** lazy chunk와 image decode가 늦으면 HTML 조작 UI만 활성화된 검은 전장을 최대 수 초 노출했다.
- **가설:** 이동 중 preload, Phaser→React handshake, 준비 전 continuity layer와 input gate를 하나의 계약으로 묶으면 네트워크 속도와 무관하게 보이는 것과 가능한 것이 일치한다.
- **제약:** BattleEngine/controller authoritative ownership은 바꾸지 않고, 새 전투 규칙·설명문·loading dashboard를 만들지 않는다.

## Judgment log

1. 단순 spinner 대신 직전 세계 asset과 공격 glyph를 사용했다. 기다림도 `바깥에서 위협을 발견했다`는 장면의 일부여야 하기 때문이다.
2. preload는 최초 450ms timer가 아니라 첫 이동 뒤 시작하게 바꿨다. 첫 화면 primary가 뜨기 전에 약 10MB 전투 이미지가 네트워크를 경쟁하는 것을 피하고, 실제 접근 구간을 준비 시간으로 사용한다.
3. CSS background의 `/assets/...` 절대 경로를 버리고 `BASE_URL` custom property로 주입했다. 루트 제출본과 `/slice2/`가 같은 gate를 독립적으로 소유하기 위해서다.
4. gate는 direct child HUD를 `visibility:hidden`과 `pointer-events:none`으로 잠그고 자신이 pointer를 받는다. 눈에 안 보이는 버튼이 click되는 상태를 만들지 않는다.
5. readiness animation에는 `prefers-reduced-motion` 정지 규칙을 함께 넣었다. 새 마찰을 고치는 transition이 다른 사용자에게 새 신경 소모를 만들지 않게 하기 위해서다.
6. 기존 verifier들은 `combat.mode=INTRO`를 presentation ready의 대리값으로 사용하지 않고 실제 DOM readiness를 기다리도록 바꿨다.

## Cognitive errors and misses

- 기존 공개 캡처가 검은 전장을 그대로 보여 줬는데도 자동화는 controller state와 버튼 존재를 통과시켰다. `logic ready`를 `player ready`로 잘못 간주한 검증 모델의 실패다.
- 최초 input latency는 Playwright 호출 전후 wall time으로 재 약 204ms였다. tool 왕복과 browser scheduling이 제품 latency에 섞인 측정이므로 버리고, page 안의 keydown timestamp→accepted DOM feedback으로 바꿨다. clean RC 값은 8ms다.
- pointer 차단을 추가 검증하는 동안 latency probe가 세 번 실패했다. 처음에는 React의 local/parent readiness race라고 추정해 ref 수명을 정리했지만 실패가 지속됐다. debug에서 계획과 feedback이 모두 비어 있음을 확인한 뒤 probe가 `PLAYER_TURN`만 기다리고 intro animation의 `isBusy=false`를 기다리지 않았음을 찾았다. 제품 결함과 test가 아직 허용되지 않은 입력을 누른 상황을 구분하지 못한 오진이었다.
- snapshot ref 기반 listener는 위 오진의 직접 원인은 아니지만, state 전이마다 global listener를 교체하던 불필요한 gap을 제거하므로 유지했다. 회고에서는 결과가 좋다는 이유로 잘못된 최초 진단을 원인으로 기록하지 않는다.
- preload는 체감 대기를 숨기지만 Phaser chunk 1.42MB와 큰 PNG 자체를 줄이지 않는다. P21은 순서·신뢰를 닫았을 뿐 저속망의 총 대기와 asset production 비용은 후속 성능·감각 단계에 남는다.

## Process and efficiency

세 감사를 병렬화해 UX first-contact, 핵심 Aesthetic 반복성, Steam product surface를 서로 독립적으로 평가했다. 구현은 가장 먼저 관찰되는 P0 하나만 소유했고, 새 rules/content는 넣지 않았다. 기존 solo verifier에 network delay route와 세 장의 frame을 추가해 사람을 매 변경마다 부르지 않고 순서·state 불변·latency를 재현했다.

회귀 verifier의 readiness wait는 파일군을 둘로 나눠 병렬 수정했고, 제품 코드는 주 agent만 소유했다. focused 검증으로 오진을 닫은 뒤 clean SHA 누적 RC를 한 번 실행했다. 공유 worktree에서 다른 browser test와 HMR을 동시에 실행해 한 번 무효 결과가 난 점은 낭비였다. 이후 exact gate는 subagent가 모두 멈춘 깨끗한 SHA에서 단독 실행했다.

## Next rules

1. controller mode, DOM 존재, canvas attach를 player readiness의 동의어로 쓰지 않는다.
2. 보이는 control과 허용되는 input은 같은 readiness signal을 따른다.
3. latency는 browser 내부 사건 사이를 측정하고 automation 왕복 시간을 제품 수치로 기록하지 않는다.
4. 첫 화면 asset과 후속 전투 preload는 사용자 여정의 경계 뒤에서 경쟁시킨다.
5. async input 검증은 mode뿐 아니라 `isBusy=false`까지 확인한다.
6. 공유 worktree의 dev server/HMR와 release browser gate를 동시에 돌리지 않는다.
7. 자동 readiness 통과를 무설명 이해·재미 통과로 승격하지 않는다.

## Next task

P21 뒤의 최대 손실은 첫 확장이 다음 선택을 만들지 않는다는 점이다. P22는 첫 샘의 물이 실제로 두 번째 경로를 열고, 짧지만 위험한 동쪽과 길지만 안전한 북쪽 중 하나를 고른 뒤 같은 직접 탐사·정찰·정책·위임·거점 규칙으로 두 번째 contour를 만들어야 한다. 새 적·경제·범용 campaign framework보다 이 반복 동사를 먼저 증명한다.
