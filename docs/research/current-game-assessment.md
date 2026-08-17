---
title: Current Game Idea Assessment
status: under-validation
last_updated: 2026-08-17
related:
  - ../submission/scope.md
  - ../submission/vertical-slice.md
  - ../submission/first-15-minutes.md
  - ../gameplay/combat/turn-and-intent.md
  - ../gameplay/combat/policy/action-policy.md
  - ../art/ui/foundations.md
  - reference-insights.md
  - validation-agenda.md
---

# Current game idea assessment

## Executive verdict

현재 아이디어는 **매우 강한 전투 논문을 가진, 아직 과적재된 제품**이다. 최근 UI 검토에서 드러난 가장 큰 실패는 규칙 부족이 아니라 전투가 게임 장면이 아닌 텍스트 cockpit처럼 보였다는 점이다.

가장 독자적인 약속은 자동전투 자체도, 이세계도, 복구 경영도 아니다. 플레이어가 보스방에서 전투원으로 직접 움직이고, 공개된 적 Intent와 동료의 자동 행동을 애니메이션으로 읽고, `밀치기`와 `내려찍`으로 적의 시간·공간을 깨뜨리는 경험이다. 장기적으로 policy 편집이 더해질 수 있지만 Slice 1의 첫 질문은 그 편집기가 아니다.

반면 첫 제출 범위는 이 고리를 증명하기 전에 로컬 탐색, 단독 전투, 장비, 비콘, 두 동료, 부대 분리, 합동 전투, 별동대 자동전투, 다시보기, 분석, 정책 편집, 물류, 대장간, 던전과 보스까지 요구한다. 좋은 아이디어가 부족한 문제가 아니라, 서로 다른 좋은 아이디어가 핵심 증거를 흐릴 위험이 더 크다.

따라서 현재 판정은 다음과 같다.

- **계속 만들 가치가 있는가:** 그렇다. 공간 전투와 정책 위임의 결합은 충분히 차별적이다.
- **현재 범위를 그대로 완성하면 강점이 자동으로 드러나는가:** 아니다.
- **다음 우선순위:** 콘텐츠 생산보다 핵심 인과와 목표 사용자의 반응을 먼저 검증한다.
- **지금 확정하면 안 되는 것:** 더 복잡한 정책 언어, 장기 성장, 상세 물류, 대규모 콘텐츠 양.

## Slice 1 reframe after UI review

현재 승인된 수직 슬라이스의 가설은 다음이다.

> scene-first 아마존 보스방에서 `<내 턴> → <아군 턴> → <적 턴>`과 이동·공격·Intent·피격 애니메이션이 명확하면, 플레이어는 설명 패널 없이도 관리자 전투원과 활 동료의 역할을 이해하고 UI·UX 마찰을 실제 게임 플레이 언어로 지적할 수 있다.

따라서 Slice 1에서 검증하지 않는 것:

- 전투 중 policy reorder나 policy editor의 가치
- 결정론적 퍼즐로서의 최적해 탐색
- 원격 운영자로서의 관리자 fantasy

Slice 1은 `아마존 정글 → 결계 수호자 조우 → 밀치기로 짧은 타격 회피 → 궁수 사격 → WASD 접근 → 내려찍으로 광범위 공격 중단 → 봉인 해제`의 한 장면을 통해 combat UX friction을 찾는다. 이 reframe은 기존 장기 게임 아이디어를 폐기하지 않지만, 현재 구현의 성공 조건을 좁힌다.

## Current idea briefing

### One-sentence pitch

자연에 삼켜진 세계에서 깨어난 관리자가 전투원으로 동료와 함께 정글의 결계를 돌파하고, 적 Intent와 자동 동료의 행동을 읽어 공간을 조작하며 세계를 복구하는 전술 게임이다.

### Player loop

```text
보스방 장면과 적 Intent를 읽는다
→ 관리자가 WASD로 이동하고 공격을 별개로 선택한다
→ 궁수 동료가 고정 5-slot policy로 자동 행동한다
→ 적의 wind-up·타격·stun·죽음을 관찰한다
→ 관리자만 결계 오브젝트의 봉인을 해제한다
→ 이후 build에서 policy 편집·복구·장기 운영을 검증한다
```

### Current pillars

1. 직접 명령하지 않아도 정책에 따라 움직이는 동료
2. 공개·고정된 Intent와 밀치기로 공격 원점을 바꾸는 3행 공간 전투
3. 본대와 별동대를 통한 위임
4. 작전 기록과 분석을 통한 정책 개선
5. 비콘, 횃불, 시설과 장비를 통한 섹터 복구

### What is already coherent

- 관리자라는 서사는 시스템 UI, 동료 위임, 기록 분석과 시설 해제를 자연스럽게 정당화한다.
- 무작위 없는 전투, 공개 Intent와 분석 기록은 `왜 이런 결과가 났는가`를 설명하려는 같은 철학을 공유한다.
- BODY Intent의 원점을 밀어 공격 범위를 옮기는 규칙은 공간 개입이 단순 피해 계산을 넘어 아군의 조건과 적의 결과를 동시에 바꾸게 한다.
- 비콘과 횃불은 추상적인 진행률을 세계의 가시적 변화로 바꾸는 좋은 매개다.

## Target-user hypothesis

목표 사용자는 아직 조사로 확인되지 않았다. 아래는 현재 설계가 가장 강하게 부르는 1차 사용자 가설이다. Quantic Foundry의 동기 모델은 Strategy를 장기적 사고와 의사결정, Discovery를 탐색·실험, Mastery를 도전과 숙련으로 설명하지만, 그 분류가 이 게임의 실제 고객을 보증하지는 않는다. 근거는 [reference insights](./reference-insights.md)에 정리한다.

### Primary hypothesis: reflective systems tactician

- 혼자 천천히 읽고 계획하는 전술 플레이를 좋아한다.
- 캐릭터를 매 순간 직접 조작하기보다 `내가 만든 원칙이 제대로 작동하는 장면`에서 만족을 느낀다.
- 실패를 불운보다 이해 가능한 원인으로 돌리고, 한 번의 수정으로 개선을 확인하고 싶어 한다.
- 복잡한 시스템은 좋아하지만 프로그래밍 문법이나 계기판 같은 UI 자체를 목표로 삼지는 않는다.
- 세계 탐색과 복구를 전투 바깥의 휴식이 아니라 시스템 이해가 축적되는 장기 맥락으로 받아들인다.
- 예상 동기 우선순위는 Strategy·Mastery·Discovery가 높고, Fantasy·Completion은 이를 지지하는 수준이다.

### Secondary hypothesis

애니메이션풍 캐릭터와 황폐한 세계의 복원 서사에 끌리지만, 고난도 액션보다 명확한 전술 퍼즐과 동료 관계를 선호하는 플레이어다. 이 사용자는 시스템 설명이 과하면 가장 먼저 이탈할 수 있으므로 중요한 확장 사용자다.

### Anti-target

다음 사용자를 동시에 만족시키려 하면 중심 경험이 흐려질 가능성이 높다.

- 반사신경, 손맛과 즉각적인 직접 조작을 최우선으로 보는 액션 사용자
- 전투 인과를 읽거나 실패를 복기하기 싫어하는 사용자
- 랜덤 획득, 치명타와 확률적 반전의 스릴을 핵심으로 기대하는 사용자
- 동료가 자율적으로 움직이는 순간을 통제권 상실로만 느끼는 사용자
- 서사 감상만 원하고 정책 편집이나 공간 추론을 원하지 않는 사용자

Anti-target을 배제한다는 뜻은 아니다. 핵심을 흐리지 않는 접근성 지원과 난이도 조정은 가능하지만, 이들의 기대를 중심으로 설계를 바꾸면 현재 아이디어의 차별점이 사라진다.

## Target Aesthetic hypothesis

[MDA framework](https://www.cs.northwestern.edu/~hunicke/MDA.pdf)에서 Aesthetic은 시각 스타일이 아니라 플레이 중 유발하려는 바람직한 정서 반응이다. 이 기준으로 현재 게임의 목표 Aesthetic을 **복구하는 관리자적 숙련감**으로 명명한다.

플레이어가 느껴야 하는 핵심 문장은 다음과 같다.

> 처음에는 버려진 세계와 동료의 행동이 불투명했지만, 나는 규칙을 읽고 작은 개입을 설계해 그들을 믿을 수 있게 만들었으며, 그 이해가 세계를 실제로 되살렸다.

### Aesthetic pillars

| Pillar | Desired feeling | Supporting mechanics | Failure mode |
| --- | --- | --- | --- |
| 읽히는 인과 | `내가 왜 성공·실패했는지 안다` | 공개 locked Intent, 결정론, 분석 이유 | 정보가 많지만 원인은 더 안 보임 |
| 저작된 자율성 | `직접 명령하지 않았지만 내 원칙대로 움직였다` | 5-slot 정책, 자동 동료, 별동대 | 동료가 봇처럼 멍청하거나 주인공의 수동 퍼즐에 종속됨 |
| 공간적 기지 | `피해량이 아니라 위치 하나로 판을 뒤집었다` | 밀치기, BODY/GROUND, 3행 | 최적 위치를 반복하는 정답 퍼즐 |
| 복원 | `이해와 승리가 세계에 남았다` | 비콘, 횃불, 시설, 밝아지는 타일 | 전투와 무관한 자원 체크리스트 |
| 절제된 애착 | `차갑고 정밀하지만 살아 있는 세계와 동료다` | 러프한 자연, 관리자 광학 UI, 인물 반응 | 차가운 HUD와 무명 동료만 남아 정서적으로 무균질해짐 |

### Visual-emotional arc

현재 시각 언어의 가장 좋은 방향은 `차가운 정밀함` 하나가 아니라 다음의 변화다.

```text
불투명하고 황폐한 자연
→ 관리자 신호가 인과를 정렬함
→ 동료 행동이 신뢰 가능한 패턴이 됨
→ 복구된 장소에 온도·움직임·생활감이 돌아옴
```

흑연·검정, 백색 기술선, 청백 광학 효과는 해석과 통제에 적합하다. 그러나 세계와 인물까지 계속 저채도·냉색으로 유지하면 복구가 감정적으로 보이지 않는다. 비콘의 기하학 신호가 자연의 유기적 변화로 번지는 식의 반복 모티프와, 복구 전후의 온도·리듬 차이를 별도 아트 실험으로 검증할 필요가 있다. 이것은 아직 art 정본이 아닌 **권고**다.

## Scorecard

아래 점수는 현재 문서만 보고 내린 연구자 판단이며 플레이테스트 결과가 아니다.

| Dimension | Score | Assessment |
| --- | ---: | --- |
| 차별성 | 9/10 | 공개 Intent, BODY 원점 밀치기와 정책 동료의 결합이 뚜렷하다. |
| 핵심 인과의 일관성 | 8/10 | 결정론·예측·분석·정책 수정이 같은 철학을 공유한다. |
| 목표 사용자 적합 가능성 | 8/10 | 시스템 전술 사용자에게 강한 약속이지만 실제 persona 검증은 없다. |
| 감정적 잠재력 | 7/10 | 복원과 동료 신뢰가 강하지만 동료 A/B는 아직 기능 컨테이너에 가깝다. |
| 온보딩 명료성 | 4/10 | 첫 15분의 개념·뷰 전환 수가 지나치게 많다. |
| 제출 범위 현실성 | 3/10 | 하나의 짧은 build가 증명하려는 시스템이 너무 많다. |
| 장기 시스템 확장성 | 6/10 | 전투 커널은 좋지만 정책 깊이와 결정론 콘텐츠 비용은 미검증이다. |
| 현재 증거 수준 | 2/10 | 정본과 구현 테스트는 있으나 목표 사용자 플레이테스트 증거가 없다. |

## What is genuinely strong

### 1. A signature causal verb exists

적 행동을 미리 보여주고 밀치기로 위험을 바꾸는 전술은 이미 검증된 명료성을 가진다. [Into the Breach 개발자 인터뷰](https://www.gamedeveloper.com/game-platforms/road-to-the-igf-subset-games-i-into-the-breach-i-)에서도 명확한 규칙, 낮은 무작위성, 다양한 목표와 다용도 밀치기가 중요한 선택을 만든다고 설명한다. 이 게임은 거기에 `동료 정책의 실행 조건까지 바뀐다`는 고유한 층을 추가할 수 있다.

좋은 점은 밀치기가 피해, 방어, 사격선, 동료의 행동 선택과 적 Intent를 한 번에 건드릴 수 있다는 것이다. 이 하나의 동사가 실제로 여러 문제를 푼다면 기술 수를 늘리지 않고도 깊이를 만들 수 있다.

### 2. Policy editing can produce an unusually honest learning loop

정책 편집의 가치는 메뉴 자유도가 아니라 `실패 → 원인 확인 → 한 항목 수정 → 같은 조건에서 개선 → 처음 보는 변형에도 적용`의 학습에 있다. [Dan Cook의 skill atom 설명](https://lostgarden.com/2021/03/13/the-chemistry-of-game-design-2/)처럼 행동, 피드백과 학습이 짧은 고리를 이루고 이후 숙련의 전제가 될 때 시스템은 단순한 설정 화면이 아니라 게임이 된다.

특히 과거 기록을 정책 변경으로 다시 계산하지 않는 계약은 정직하다. 플레이어가 예쁜 예측 문장이 아니라 실제 결과 차이를 보게 한다.

### 3. Determinism serves the fantasy, not only the engine

무작위 없는 전투는 디버깅 편의를 넘어 관리자 판타지를 지지한다. 플레이어가 결과를 동료의 정책, 자신의 공간 개입과 적 규칙에 귀속할 수 있기 때문이다. 다만 결정론은 자동으로 깊이를 만들지 않는다. 새로운 배치, 목표, 제한과 공개되는 지식이 충분하지 않으면 한번 푼 퍼즐이 된다.

### 4. Fiction and interface can reinforce each other

관리자 권한, 봉인된 비콘, 작전 채널과 분석 UI는 서로 다른 기능에 하나의 서사적 이유를 준다. 잘 구현하면 `메뉴를 보는 시간`도 세계 안에서 관리자가 된 시간으로 느껴질 수 있다.

### 5. Restoration can give systems mastery an emotional consequence

분석을 잘해서 수치가 올랐다는 보상보다, 어둡던 경로가 안정되고 버려진 시설에 움직임과 동료의 생활이 돌아오는 보상이 더 오래 남는다. [Terra Nil의 개발자 인터뷰](https://www.sciencefriday.com/segments/video-game-environment/)가 보여주듯 복원이 게임의 정체성이 되려면 환경이 배경이나 자원 원천이 아니라 매 순간 판단의 전면에 있어야 한다.

### 6. The five-slot cap is a sensible defense against cockpit complexity

자유 조건식, 자연어와 node graph를 제외한 결정은 현 단계에 맞다. [Final Fantasy XII 개발 회고](https://blog.playstation.com/archive/2017/07/07/extended-play-how-final-fantasy-xiis-gambit-created-one-of-the-most-distinct-rpgs-ever)에서도 Gambit은 자동 실시간 전투를 제어하는 해법이자 미세 조정의 승리감을 주었지만, 완성에 가까워질 때까지 전체가 작동하는지 판단하기 어려웠다고 말한다. 더 많은 표현력을 먼저 추가하기보다 작은 정책이 실제로 흥미로운 결과를 만드는지 봐야 한다.

## P0 risks: resolve before adding breadth

### P0-1. The game currently has several possible identities

직접 조작 전술, 동료 정책 자동전투, 세계 탐색·복구, 물류 운영, 작전 다시보기 중 어느 것이 `이 게임을 하는 이유`인지 아직 플레이로 증명되지 않았다. 문서에서는 이들이 잘 연결되지만 실제 사용자는 화면과 입력이 바뀔 때마다 다른 게임을 배운다.

**판단:** 정책으로 동료를 설계하는 게임이 중심이라면, 주인공 전술·복구·물류는 모두 `정책의 조건과 결과를 더 흥미롭게 만든다`는 역할을 가져야 한다. 그렇지 않은 시스템은 제출본에서 압축하거나 늦춰야 한다.

### P0-2. The first 15 minutes are a curriculum, not yet an experience

현재 첫 15분은 14개 순차 사건과 여러 조작 모드를 담는다. [Celia Hodent의 onboarding 분석](https://celiahodent.com/gamers-brain-ux-onboarding/)은 학습 중에는 동시에 처리할 노력이 큰 항목을 약 3개 이하로 보고 학습을 분산하라고 권한다. 정확한 숫자를 보편 법칙처럼 적용할 수는 없지만, 현재 흐름은 개념을 체험하기보다 기능을 한번씩 통과할 위험이 명백하다.

**실패 징후:** 플레이어가 비콘은 기억하지만 왜 정책을 바꿨는지 설명하지 못하거나, 정책 편집까지 도달했지만 다음 전투에서 무엇이 달라질지 예측하지 못한다.

**권고:** 첫 15분의 목표를 `모든 기능 노출`이 아니라 `핵심 인과를 자신의 말로 설명하고 한 번 일반화`로 바꿀 수 있는지 검증한다. 실패하면 툴팁을 늘리지 말고 사건과 화면 전환을 줄인다.

### P0-3. Five atomic actions may be simple but not expressive

위에서부터 첫 실행 가능 행동을 고르는 방식은 이해하기 쉽다. 그러나 행동의 실행 가능 조건이 충분히 상황적이지 않으면 정책 순서는 매번 같은 정답을 내는 정적 loadout이 된다. [Sid Meier의 interesting decisions 강연 요약](https://www.gamedeveloper.com/design/gdc-2012-sid-meier-on-how-to-see-games-as-sets-of-interesting-decisions)은 늘 첫 선택이 옳거나 무작위로 고르는 선택은 흥미롭지 않으며, 상황적 trade-off와 충분한 정보가 필요하다고 지적한다.

**권고:** 조건 언어를 늘리기 전에 서로 다른 배치·Intent·장비에서 같은 5개 행동 순서가 얼마나 자주 지배하는지 측정한다. 한 순서가 대부분의 조합을 해결한다면 행동별 비용과 실행 가능 조건부터 고친다.

### P0-4. Perfect prediction may make companions irrelevant

전체 동료 행동 연쇄를 미리 계산하고 주인공이 매 AP마다 정확히 최적화할 수 있다면, 플레이어는 `동료를 설계한 관리자`보다 `모든 수를 직접 푼 전술가`로 승리를 귀속할 수 있다. 그러면 동료 정책은 agency가 아니라 긴 애니메이션이 된다.

**권고:** 규칙을 숨기거나 확률을 넣지 말고, 현재 행동만 보여주는 예측·국소 변화만 보여주는 예측·전체 연쇄 예측을 비교한다. 무엇을 감추느냐가 아니라 어떤 정보가 정책 신뢰를 돕고 어떤 정보가 수동 최적화를 대신 수행하는지 측정한다.

### P0-5. The submission scope can consume the project before the thesis is proven

[Final Fantasy XII 회고](https://blog.playstation.com/archive/2017/07/07/extended-play-how-final-fantasy-xiis-gambit-created-one-of-the-most-distinct-rpgs-ever)는 개념이 정해져 있어도 콘텐츠 양이 폭증하고 자동전투 전체가 맞물리는 데 예상보다 긴 시간이 들었다고 설명한다. 현재 build는 작은 팀이 짧은 시간에 전투, 정책, 다중 뷰, 월드 시간, 경제, 저장과 보스를 모두 신뢰 가능하게 만들어야 한다.

**권고:** `비콘 해방 → 합동 전투 → 별동대 실패 → 이유 확인 → 한 번의 정책 수정 → 변형 전투 개선 → 세계가 변함`만으로 먼저 수직 절편을 만든다. 이 절편이 목표 감정을 만들지 못하면 경제·던전·보스가 구해주지 못한다.

## P1 risks: stabilize after the core proof

### P1-1. Replay can feel like administration work

짧고 결정론적인 전투를 매번 처음부터 다시 보는 것은 분석이 아니라 마찰이 될 수 있다. 기본 진입점은 `왜 이 행동이 실행되지 않았는가`에 즉시 답하는 이벤트 점프여야 하고, 전체 replay는 맥락이 필요할 때 선택하는 도구인지 검증해야 한다.

자동 동료를 AI 서비스와 동일시할 수는 없지만, [Microsoft의 human-AI interaction guidelines](https://www.microsoft.com/en-us/research/articles/guidelines-for-human-ai-interaction-eighteen-best-practices-for-human-centered-ai-design/)가 제안하는 능력 범위 명시, 이유 설명, 효율적 수정과 결과 전달은 `예측 가능한 자동행동`의 신뢰 설계에 유용한 유추다.

### P1-2. Players will find a dominant policy and repeat it

[Soren Johnson의 설계 글](https://www.designer-notes.com/game-developer-column-17-water-finds-a-crack/)은 플레이어가 최소 위험의 보상을 최적화하고 단일 지배 전략이 다른 선택을 잠식한다고 설명한다. 기본 정책이 대부분의 전투를 해결하면 사용자는 재미를 없애려고 한 것이 아니라 게임이 가르친 최적 행동을 따를 뿐이다.

대책은 주기적으로 정답 정책을 금지하는 hard counter가 아니다. 서로 다른 목표, 시간 비용, 위치 제약과 동료 조합이 같은 행동을 상황에 따라 좋거나 나쁘게 만들어야 한다.

### P1-3. Companions are mechanically important but emotionally thin

현재 동료 A/B는 부대와 무기 역할을 운반하지만 성격, 관계와 반응은 deferred다. 정책 게임에서 동료가 단순 executor로만 보이면 `신뢰를 쌓는 기쁨`이 사라지고 programmable pawn만 남는다.

제출본에 장대한 개인 서사가 필요한 것은 아니다. 정책이 예상대로 작동했을 때의 고유 반응, 위험을 피한 뒤의 짧은 태도, 같은 명령을 서로 다르게 체현하는 animation timing처럼 전투 인과를 해치지 않는 최소한의 인격 증거가 필요하다.

### P1-4. Information clarity and visual identity can conflict

한 전투 화면에 적 Intent, 현재 동료 예측, 주인공 후보 이후 예측, 이동 경로, HP/AP, 정책 label과 실행 순서가 겹칠 수 있다. [Riot의 VFX guide](https://nexus.leagueoflegends.com/en-us/2017/10/dev-leagues-vfx-style-guide/)는 gameplay clarity, clutter 최소화, theme와 delight를 함께 목표로 두고 시각적 충격량이 gameplay 영향과 맞아야 한다고 설명한다.

현재의 빨강 대 청색 체계는 시작점으로 좋지만, 정보 계층이 색 수를 늘리는 방식으로 해결되면 4:3과 작은 브라우저에서 무너진다. 입력 단계별로 지금 필요한 층만 보여주고, shape·stroke·motion을 의미의 주 채널로 유지해야 한다.

### P1-5. The art direction can become polished but generic

흑연, 검정, 백색 기술선, 청백 glow, 저채도 anime 캐릭터는 조합만으로는 여러 SF·서브컬처 UI와 구별되지 않는다. [NieR:Automata UI designer의 회고](https://www.platinumgames.com/official-blog/article/9624?age-verified=89aae493bb7)는 `systematic and sterile but beautiful`이라는 초기 방향만 따르면 무미건조해져 음악 기보와 analog monitor의 물성을 더했다고 설명한다.

이 게임도 특정 작품의 표면을 모방하지 말고 세계 고유의 반복 모티프 하나가 필요하다. 후보는 `관리자의 기하학적 신호가 복구될수록 유기적 붓질과 생명 움직임으로 번진다`는 변환이다. 실제 screenshot test를 통과하기 전에는 정본으로 확정하지 않는다.

### P1-6. Restoration and logistics may be a thematic promise without a decision loop

철광산, 적재, 운송, 대장간이 전투 외 체크리스트라면 복구는 이름만 남는다. [Terra Nil 인터뷰](https://www.sciencefriday.com/segments/video-game-environment/)의 중요한 점은 자연 복원이 배경 연출이 아니라 자원 균형과 매 순간 행동 자체라는 것이다.

이 게임의 복구도 전투와 정책에 되돌아와야 한다. 예를 들어 시야, 알려진 적 규칙, 안전한 경로, 가능한 위임과 정책 지식이 달라져야 한다. 그렇지 않다면 제출본에서는 상세 물류보다 전후 변화 연출이 더 정직하다.

### P1-7. Determinism shifts cost from randomness to content design

확률을 제거하면 억울함은 줄지만 불확실성과 재플레이가 자동으로 생기지 않는다. 새로운 적 규칙을 알아가는 과정, 여러 목표의 충돌, 시작 배치, 제한된 시간과 조합 변화가 충분해야 한다. 이미 이해한 상황을 수치만 키우는 방식은 관리자적 숙련감보다 정답 암기가 된다.

## Hard recommendations

### Protect

- public locked Intent와 BODY/GROUND 차이
- 밀치기가 공격 원점과 동료 행동 조건을 함께 바꾸는 상호작용
- 동일 상태와 입력의 동일 결과
- 실패 원인과 실행되지 않은 정책 이유를 확인할 수 있는 기록
- `한 번의 정책 수정이 다음 실제 변형에서도 통한다`는 검증
- 비콘처럼 진행이 세계에 가시적으로 남는 복구 신호

### Prove before expanding

- 5-slot 정책이 조건 언어 없이도 상황적 선택을 만드는가
- 전체 동료 prediction이 신뢰를 돕는가, 수동 최적화를 대신하는가
- full replay가 필요한가, 짧은 why view가 더 유용한가
- 복구·물류가 다음 전투 판단을 바꾸는가
- 동료가 정책 슬롯이 아니라 인물로 기억되는가

### Delay or compress if the proof is weak

- 상세 채집·운송과 다중 자원 경제
- 복잡한 작전 채널 타임시프트 UI
- 별도 보스 전용 규칙과 대량 적 콘텐츠
- 더 많은 정책 슬롯, 조건식과 자연어
- 긴 과거사와 장기 성장

이 목록은 삭제 결정이 아니다. 핵심 검증을 통과할 때까지 제출본의 비용을 통제하라는 연구 권고다.

## Go/no-go questions

다음 질문에 플레이테스트 증거로 답하지 못하면 콘텐츠를 더 만들지 않는 편이 낫다.

1. 신규 사용자가 한 번 본 뒤 `왜 밀치면 저 공격은 빗나가고 이 찌르기는 맞는지` 설명할 수 있는가?
2. 실패 후 정책 한 항목을 고쳐 같은 상황을 개선하고, 처음 보는 변형에도 같은 원리를 적용할 수 있는가?
3. 승리 원인을 주인공의 완전 수동 계산이 아니라 자신이 만든 동료 정책에도 귀속하는가?
4. 첫 15분 뒤 세 가지 약속 중 무엇이 가장 독특했는지 같은 답을 하는가?
5. UI를 지운 screenshot과 넣은 screenshot 모두에서 `황폐하지만 되살아남`, `차갑고 정밀함`, `읽기 쉬움`이 동시에 보이는가?

구체적 방법과 임시 통과 기준은 [validation agenda](./validation-agenda.md)에 둔다.

## Final assessment

이 프로젝트의 문제는 아이디어가 약한 것이 아니다. **강한 중심 아이디어 주위에 완제품의 기능이 너무 빨리 모였다.**

가장 유망한 최종 사용자 경험은 복잡한 설정을 즐기는 프로그래머 판타지가 아니다. 작은 정책을 세우고, 동료가 그 정책을 스스로 수행하는 것을 믿게 되며, 공간적 개입 한 번과 정책 수정 한 번으로 전투와 세계가 명료해지는 경험이다. 그 감정이 나오면 복구, 위임과 서사가 강한 증폭기가 된다. 그 감정이 나오지 않으면 더 많은 시설과 replay 기능은 정교한 관리 업무가 된다.

따라서 지금은 `좋은 전투 커널`을 `좋은 게임 경험`으로 입증하는 단계다. 증거가 나오기 전까지 범위보다 인과, 기능보다 Aesthetic, 설명보다 사용자 자신의 예측을 우선한다.

## Scope note for current build

이 문서의 policy editing, replay, 물류와 장기 복구에 대한 비평은 전체 게임의 후속 가설이다. 현재 public Slice 1에 policy reorder·동일 상태 재전투·분석 dashboard가 없다고 해서 해당 장기 아이디어가 승인되거나 폐기된 것은 아니다. Slice 1에서는 먼저 장면 우선 전투가 성립하는지 검증하고, 그 결과를 바탕으로 후속 policy UX의 필요와 정보량을 다시 결정한다.
