---
title: Slice 1 Combat UX Validation Agenda
status: under-validation
last_updated: 2026-08-17
related:
  - current-game-assessment.md
  - reference-insights.md
  - ../submission/vertical-slice.md
  - ../submission/acceptance-criteria.md
  - ../ux/views/combat-view.md
---

# Slice 1 combat UX validation agenda

## Purpose

이번 slice의 질문은 `전투 kernel이 존재하는가`가 아니다. 실제 보스방에서 플레이어가 장면을 보고 조작하고, 공격과 회피의 원인을 애니메이션으로 이해할 수 있는가를 검증한다. 좋은 결과는 기능을 많이 본 결과가 아니라 UI·UX 마찰을 재현 가능한 언어로 말할 수 있는 결과다.

아래 gate는 연구용 provisional 기준이다. 재미와 최종 사용자 적합성을 증명하지 않으며, 실제 참가자·build SHA·viewport와 함께 기록한다.

## Reference-informed principles

- Darkest Dungeon처럼 전투 장면이 화면을 지배하고, 조작은 맥락적인 bottom control과 icon 중심으로 읽혀야 한다.
- DNF처럼 side-view 깊이·캐릭터 scale·overlap을 살려 인간과 보스의 타격을 읽게 한다.
- One Step From Eden처럼 필요한 순간에만 공격 범위·위험 cell을 고대비로 표시한다.
- MDA 관점에서 기능 목록보다 목표 정서인 `읽히는 인과`, `공간적 기지`, `동료를 믿는 감각`, `복원`이 실제로 발생하는지 묻는다.
- W3C와 Riot VFX 원칙을 따라 색만으로 상태를 전달하지 않고 shape, pattern, stroke와 motion을 중복한다.

## Gate order

```text
G0 장면·턴 주체 판독
→ G1 이동/공격 동사 분리
→ G2 Intent·타격 인과
→ G3 궁수 자동행동 신뢰
→ G4 보스방 정서와 봉인 해제
→ G5 시각·기술 마찰 종합
```

G0~G2가 실패한 상태에서 policy editor, 새 적, 경제와 던전 콘텐츠를 추가하지 않는다.

## G0. Scene and turn ownership

### Hypothesis

처음 보는 사용자는 긴 설명을 읽지 않고도 아마존 정글 보스방에 들어왔으며, 현재 `<내 턴>`, `<아군 턴>`, `<적 턴>` 중 무엇인지 알아차린다.

### Task

1. intro reveal을 본다.
2. 안내 없이 지금 조작 가능한 주체와 다음 주체를 말한다.
3. 관리자·궁수·수호자의 역할을 scene에서 가리킨다.

### Provisional pass gate

- 참가자 5명 중 4명 이상이 세 턴 배너를 잘못 읽지 않는다.
- 대답에 `관리자는 전장 밖에서 명령한다`가 나오지 않는다.
- 현재 주체를 텍스트뿐 아니라 해당 캐릭터의 focus·pose·입력 affordance로 설명한다.

## G1. Movement and attack separation

### Hypothesis

사용자는 WASD 이동과 action bar의 `밀치기`·`내려찍`을 서로 다른 동사로 이해한다.

### Task

- 수호자에게 접근하지 않고 WASD로 한 칸 이동한다.
- 다음에 `밀치기`를 선택한다.
- `내려찍`이 공격이며 이동 버튼이 아님을 말한다.

### Provisional pass gate

- 참가자 5명 중 4명 이상이 이동과 공격의 차이를 설명한다.
- 이동 후보와 공격 effect area를 같은 threat 표시로 부르지 않는다.
- 버튼 이름을 읽지 않아도 이동은 발걸음, 공격은 key pose/VFX로 구분한다.

## G2. Intent and combat causality

### Hypothesis

사용자는 `짧은 타격`을 밀쳐 피하고, `광범위 공격`을 `내려찍`으로 중단한 이유를 애니메이션과 world signal로 설명한다.

### Task

1. 첫 Intent가 고정된 뒤 `밀치기`를 사용한다.
2. 궁수의 `<아군 턴>` 사격을 관찰한다.
3. 두 번째 Intent에서 WASD로 접근하고 `내려찍`한다.
4. 승리와 봉인 해제를 관찰한다.

### Provisional pass gate

- 참가자 5명 중 4명 이상이 첫 공격이 빗나간 이유를 `수호자 몸/공격 원점이 함께 이동했다`고 설명한다.
- 4명 이상이 `내려찍` 이후 광범위 공격이 실행되지 않았음을 말한다.
- `사격`이 가장 앞의 적에게 투사체를 보냈다는 사실을 beam/piercing으로 오해하지 않는다.
- 피해 숫자나 긴 문구를 먼저 찾지 않고 wind-up → hit/stun → HP 변화 순서를 근거로 든다.

## G3. Ally autonomy and trust

### Hypothesis

궁수의 고정 5-slot policy가 설명 화면처럼 느껴지지 않고, 플레이어의 전투 개입과 구별되는 유용한 자율성으로 느껴진다.

### Task

- policy를 편집하지 않고 궁수의 `회피 → 포지셔닝 → 사격 → 밀치기` 중 실제 실행을 관찰한다.
- 왜 해당 행동을 했다고 생각하는지 즉시 말한다.

### Provisional pass gate

- 참가자 5명 중 4명 이상이 궁수가 자동으로 행동했다는 것을 이해한다.
- 최소 3명 이상이 궁수의 행동을 전투 결과에 기여한 것으로 보고, 관리자 직접 입력과 구별한다.
- 정책 전체를 읽지 않고 현재 실행 label/reason만으로 다음 행동을 예측한다.

## G4. Boss-room emotion and seal

### Hypothesis

전투가 puzzle board나 cockpit이 아니라 보스방 조우로 느껴지고, 승리 뒤 봉인 해제가 관리자 역할의 자연스러운 후속 행동으로 읽힌다.

### Measures

- 장면을 설명할 때 `정글`, `결계문`, `보스방` 같은 공간어가 자발적으로 나오는가
- 가장 기억에 남은 순간이 메뉴 선택인가, 수호자의 공격·중단·죽음인가
- 승리 후 왜 관리자만 봉인을 해제하는지 설명하는가
- screen을 계기판·유리 블록·퍼즐판으로 비유하는가

### Provisional pass gate

- 참가자 과반이 scene-first language로 장면을 회상한다.
- 참가자 과반이 봉인 해제를 전투 외 메뉴가 아니라 전장 행동으로 설명한다.

## G5. Visual and technical friction

다음 viewport에서 동일한 flow를 기록한다: 16:9 desktop, 4:3, 390px mobile.

- 캐릭터가 작거나 겹쳐도 누가 무엇을 하는지 읽히는가
- Intent와 이동 후보가 겹치지 않는가
- turn banner, action bar, HP/AP와 보스 HP가 장면을 가리지 않는가
- animation 중 입력이 잠기거나 잘못된 state를 보여주지 않는가
- console/page/request error가 없는가
- reset/restart 후 이전 animation이 다시 나타나지 않는가

## Evidence record

```md
### Session YYYY-MM-DD / build <SHA>

- participant profile:
- viewport/device:
- gate and scenario:
- completion time:
- observed friction:
- participant explanation:
- pass/fail against provisional gate:
- screenshot/video or console evidence:
- recommended change:
- canonical decision made: none / link
```

## Stop conditions

- G0 실패: HUD 설명을 늘리지 말고 turn banner, focus, 입력 affordance를 먼저 고친다.
- G1 실패: action 수나 policy를 늘리지 말고 WASD와 공격 affordance를 분리한다.
- G2 실패: 피해 수치보다 wind-up·origin·camera·hit-stop을 먼저 고친다.
- G3 실패: policy editor를 만들지 말고 자동행동의 timing·reason·target signal을 고친다.
- G4 실패: 보스 콘텐츠를 추가하지 말고 배경·scale·장면 전환·봉인 후속 행동을 다시 구성한다.
- G5 실패: 임의의 텍스트 패널을 추가하지 말고 layer 우선순위와 animation clarity를 줄인다.

다음 확장은 이 gate를 통과한 뒤에만 승인한다. 현재 build의 테스트 통과는 플레이어 경험 통과와 동일하지 않다.
