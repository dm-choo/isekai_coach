---
title: P23 Combat Grounding and Impact Contract
status: accepted
last_updated: 2026-08-20
related:
  - steam-overwhelmingly-positive-quality-bar.md
  - p22-second-expansion-choice-retrospective.md
  - ../art/ui/combat-view/grid.md
  - ../art/character/proportions-and-rendering.md
  - ../art/character/animation-and-weapon-layering.md
  - ../art/vfx/action-and-system-vfx.md
---

# P23 전투 접지와 타격 인과 계약

## Goal

전투를 `배경 위에 세운 36개 마름모와 작은 말`이 아니라, 같은 정글 세계의 흙 위에서 큰 전투원이 서로 행동하고 충돌하는 장면으로 읽히게 한다.

플레이어가 한국어 HUD를 읽지 않아도 다음 세 사실은 한 장면과 한 번의 공격만으로 남아야 한다.

1. 캐릭터가 어느 지면과 행에 서 있는가.
2. 누가 누구에게 어떤 방향으로 공격했는가.
3. 접촉한 순간 피해와 위치 변화가 왜 발생했는가.

전투 결과와 정책 규칙은 바꾸지 않는다. P23은 이미 확정된 `BattleEngine fact → PresentationPort → Phaser` 경계 안에서 같은 사실을 더 정확하고 만족스럽게 보여 주는 표현 작업이다.

## Failure evidence

- 현재 제출본은 각 cell을 세로로 긴 마름모로 잘라 굵은 외곽선과 함께 36번 반복한다. 검은 사다리꼴 foundation까지 합쳐져 실제 흙바닥이 아니라 울타리·벽·유리다리처럼 읽힌다.
- 캐릭터 발과 점유 ring은 배경의 바닥보다 위에 떠 있는 마름모 중앙에 놓인다. 배경·tilemap·unit baseline이 서로 다른 평면을 주장한다.
- 제출본 캐릭터는 높이 `126~135px`로 축소되었고, 현재 unit test가 그 작은 상한을 품질 계약처럼 고정한다. 합동전에서는 작은 body·HP·Intent·ghost가 한 덩어리로 겹치고 화면 오른쪽은 크게 빈다.
- 모든 제출본 캐릭터가 단일 정지 PNG다. 공격 pose가 끝난 다음 별도 damage event에서 대상 container 전체가 깜빡여, 공격 원점·접촉·피해가 하나의 시간 흐름으로 이어지지 않는다. HP와 Intent까지 함께 깜빡인다.
- 현 browser verifier는 계획 화면까지만 캡처하거나 `12x` playback을 사용한다. 실제 속도 contact frame과 피해 반응에 대한 증거가 없다.

## Reference translation

표면 그림을 복제하지 않고 reference가 해결한 정보 문제를 가져온다.

- **Darkest Dungeon:** 전장이 HUD보다 먼저 보이고, 큰 전투원 실루엣과 하나의 연속된 바닥선이 양 진영 관계를 만든다. P23은 큰 body, 연속 baseline, 하단 contextual control이라는 계층만 차용한다.
- **One Step From Eden:** grid는 상시 장식이 아니라 위험과 선택이 필요한 순간에 강해진다. P23의 논리 cell은 유지하되 평시 영구 외곽선을 제거하고 Intent·prediction 때만 형태를 드러낸다.
- **현재 제출본 정글:** `frontier-combat-v1.png`의 수관·유적·청록 결계 깊이는 far background로 유지한다. 별도 opaque terrain composition이 그 앞에서 실제 플레이 표면을 소유한다.

외부 screenshot은 비교 자료일 뿐 production asset이나 생성 seed로 사용하지 않는다.

## Preserved contracts

- authoritative map과 전투 좌표는 계속 `12 x 3`이다.
- 이동 가능 여부, 충돌, 사거리, Intent, 피해, knockback과 정책 결과는 `BattleEngine`만 결정한다.
- Phaser camera, sprite, terrain, VFX와 tween은 전투 상태를 만들거나 수정하지 않는다.
- 점유 cell은 body 크기가 아니라 발 아래 faction ring과 순간적 cell signal로 판정한다.
- 적 Intent, 플레이어 prediction, 동료 예정 silhouette의 색·owner marker·effect cell 의미는 유지한다.
- pointer·WASD·Q/E/R/1/2·SPACE 입력 의미와 P21 readiness gate를 유지한다.
- Slice1과 Slice2의 독립 visual theme와 공개 route는 회귀하지 않는다.

## Continuous terrain

### Surface

- 제출본 전투는 `ground-atlas-v1.png`의 opaque dirt를 이용한 하나의 연속 playfield composition을 사용한다.
- 36개 cell은 같은 surface 안의 논리 표본이다. 각 cell마다 atlas 전체를 축소 복제하거나 굵은 diamond bevel을 다시 그리지 않는다.
- terrain은 세 행의 깊이를 담는 낮고 넓은 흙 평면으로 보이며, far background에 이미 그려진 바닥을 좌표 근거로 사용하지 않는다.
- 상·하단은 foliage shadow와 흙 색 gradient로 배경에 연결한다. 검은 foundation polygon, 밝은 cell gap, 세로로 선 diamond wall은 남기지 않는다.
- 평시 cell seam은 없거나 저대비여야 한다. 공격 effect, 이동 destination, 점유와 선택 순간에는 기존 polygon signal이 terrain 위에 나타난다.

### Projection and baseline

- cell polygon은 전면을 향해 세운 마름모가 아니라 바닥 원근으로 읽히는 낮은 형태를 사용한다.
- 세 행의 발 baseline은 뒤에서 앞으로 단조롭게 내려오며, sprite depth와 shadow 중심이 같은 행 순서를 따른다.
- 발 anchor와 shadow 중심은 logical cell baseline에서 각각 `4 display px`, `3px` 이내다.
- readiness gate가 사라질 때 다른 장소로 hard cut하지 않는다. 첫 위협 준비 frame도 실제 전투와 같은 frontier environment를 사용한다.

## Scene framing and silhouette

- 살아 있는 unit, 보이는 Intent와 현재 prediction을 relevant bounds로 삼아 전투 camera의 평상시 focus를 정한다. 항상 12열 전체와 빈 공간을 같은 비중으로 보여 주지 않는다.
- camera framing은 전투 관계를 확대하되 현재/예정 위치와 effect cell을 잘라내지 않는다. ability focus 뒤에는 고정 화면 중앙이 아니라 계산된 combat focus로 돌아온다.
- 제출본 인간형 unit의 목표 표시 높이는 `170~200px`, 비인간형 고블린은 역할별 `165~195px`의 첫 검증 band를 사용한다. 정확한 값은 1280·960 screenshot의 가림 결과로 ±10% 조정한다.
- 크기를 키워도 발 ring은 logical cell 크기를 유지한다. sprite outline이나 투명 PNG canvas를 hitbox처럼 사용하지 않는다.
- 같은 열·인접 행의 일부 overlap은 허용하지만, 서로 다른 body 수, 주무기, HP owner와 공격 방향이 남아야 한다. own HP bar는 own opaque body bounds를 가리지 않는다.
- 현재 submission cutout은 identity와 역할 silhouette를 유지하는 structural seed다. 최종 `4.5~5.5등신·거친 3단 명암` family 교체는 이 구조가 통과한 뒤 한 art brief로 제작한다.

## Contact and damage sequence

피해가 있는 한 행동은 다음 순서로 재생한다.

```text
source wind-up
→ movement / projectile
→ directional contact shape
→ 60–90ms visual hold
→ target body-only flash + 반대 방향 recoil
→ HP front/lag 변화 + damage number
→ knockback / status
→ 계산된 combat focus와 idle 복귀
```

- source의 attack state는 contact까지 유지한다. `ABILITY_USED` 직후 idle로 먼저 돌아가지 않는다.
- 피격은 target body adapter에만 적용한다. unit container 전체 alpha를 바꿔 HP·Intent·owner signal을 함께 깜빡이지 않는다.
- melee는 source→target vector를 따라 arc·spark와 recoil 방향을 정한다. projectile는 화살이 target에 닿는 위치에서 contact signal로 이어진다.
- blocked damage는 청록 shield ring과 짧은 방어 recoil로 구분하고 피해 숫자를 만들지 않는다.
- scene 전체를 정지시키는 global pause를 사용하지 않는다. controller speed·abort·retry와 안전하게 합성되는 짧은 awaitable hold/tween만 사용한다.
- presentation 중단, retry와 destroy 뒤 tint·alpha·camera·무한 tween이 다음 전투에 남지 않는다.

## Automated acceptance

개발 중에는 focused unit test와 `verify:submission:combat-feel`만 반복한다. feature candidate가 닫힌 clean SHA에서 누적 RC를 한 번 실행한다.

- 기존 combat event/state signature가 P23 전후 완전히 동일하다.
- terrain composition은 opaque하며 내부 coverage hole과 영구 굵은 cell outline이 없다.
- projection 인접성, 세 행 baseline/depth 단조성, foot/shadow 오차가 계약 범위 안이다.
- five submission roles의 display band, anchor와 weapon silhouette source가 명시되어 있다.
- 실제 속도 non-verify 첫 단독전에서 input accepted·plan commit 신호가 각각 `100ms` 안에 시작한다.
- `ABILITY_USED → contact → DAMAGE_DEALT → UNIT_KNOCKED_BACK` presentation cursor가 같은 source/target으로 진행되고 각 beat가 `0ms`로 붕괴하지 않는다.
- 피해량, HP와 최종 위치는 기존 engine 결과와 같다.
- 1280×720·960×720에서 HUD overflow 0, 중요 owner overlap 0, browser error 0이다.
- actual-speed 안정 frame, contact peak, damage response 세 장을 새 artifact로 남긴다. 과거 screenshot은 현재 품질 증거로 재사용하지 않는다.
- abort/retry/reload 뒤 camera·tint·alpha·tween leak 0이다.
- 기존 P1~P22, Slice1·Slice2 누적 회귀가 유지된다.

## Human acceptance

P21~P23을 한 build로 묶어 신규 사용자 두 명에게 먼저 맡기고 판정이 갈릴 때만 세 번째 사용자를 추가한다.

- text를 가린 안정 frame을 보고 두 명 모두 지면을 `벽·다리`가 아닌 하나의 흙 전장으로 설명한다.
- 2초 안에 살아 있는 body 수와 각 진영을 맞힌다.
- 한 번의 muted 공격을 보고 두 명 모두 attacker, target, 접촉 순간과 피해 발생 순서를 지목한다.
- 어느 cell/행을 점유하는지와 이동 후 도착 위치를 ring·baseline만으로 설명한다.
- SPACE 실행 반응과 한 번의 melee hit이 답답하거나 무반응이라고 평가되지 않는다.

이는 timing·state 자동 검증을 `타격감이 좋다`는 사람 증거로 승격하지 않기 위한 gate다.

## Out of scope

- 전투 규칙, 수치, AI, policy와 encounter 변경
- 새 적·능력·세 번째 expansion
- 최종 캐릭터 spritesheet와 무기별 production key pose
- audio·진동·음량 설정
- 전체 UI redesign과 key remapping
- campaign content와 Steam packaging

P23 종료 조건은 효과 수가 아니다.

> 같은 전투 사실이 하나의 지면 위에서 `원점 → 접촉 → 결과`로 읽히고, 어느 텍스트를 지워도 전투원이 어디에 서서 누구를 때렸는지가 남는다.
