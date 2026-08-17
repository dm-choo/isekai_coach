---
title: External Reference Insights
status: under-validation
last_updated: 2026-08-17
related:
  - index.md
  - current-game-assessment.md
  - validation-agenda.md
---

# External reference insights

## Method and limits

- 확인일: 2026-08-17
- 우선순위: 원 논문, 개발자·개발사 공식 회고, 실무 가이드, 대규모 사용자 연구
- 아래 `Application`은 출처가 직접 말한 결론이 아니라 이 프로젝트에 대한 **추론**이다.
- 성공한 게임의 표면을 복제하지 않는다. 해당 사례가 해결한 문제와 trade-off만 가져온다.
- 외부 근거는 canonical decision이 아니다. 채택 시 owner 문서나 ADR에서 다시 승인한다.

## Current combat-view references

### Darkest Dungeon: scene-first hierarchy

- **Source:** Red Hook Games [official site](https://www.darkestdungeon.com/darkest-dungeon/) and [Steam store page](https://store.steampowered.com/app/262060/Darkest_Dungeon/). 비교용 캡처는 [`docs/images/reference_screenshot/darkest-dungeon-combat.jpg`](../images/reference_screenshot/darkest-dungeon-combat.jpg)에 둔다.
- **External evidence:** 전투 공간과 캐릭터가 화면의 주된 시각 anchor이고, 하단 contextual control·icon·짧은 label이 행동을 받친다. 전투를 설명 패널의 모음으로 만들지 않는다.
- **Application:** Slice 1은 scene-first 정글 보스방, 하단 중앙 `밀치기`·`내려찍` action bar, world-space Intent를 사용한다. 긴 policy dashboard와 cockpit형 텍스트를 public scene에서 제거한다.
- **Caution:** Darkest Dungeon의 party composition·stress·art style을 가져오는 것이 아니다. 이 프로젝트가 채택하는 것은 장면/조작 hierarchy뿐이다.

### Dungeon Fighter Online: side-view depth and impact

- **Source:** [Dungeon Fighter Online official Steam page](https://store.steampowered.com/app/495910/Dungeon_Fighter_Online/).
- **External evidence:** side-scrolling 2D action framing에서 인물의 pose, 무기 궤적과 hit feedback이 전투 이해와 타격감의 주된 신호가 된다.
- **Application:** 캐릭터를 논리 cell보다 크게 렌더링하고, 서로 일부 겹칠 수 있는 깊이 있는 바닥·baseline을 사용한다. WASD 이동, `밀치기`, `내려찍`을 서로 다른 pose와 camera feedback으로 분리한다.
- **Caution:** real-time combo·속도·던전 진행을 이 slice에 추가하지 않는다. 가져오는 것은 인간 scale, depth와 impact의 시각적 우선순위다.

### One Step From Eden: momentary grid clarity

- **Source:** [One Step From Eden official Steam page](https://store.steampowered.com/app/960690/One_Step_From_Eden/). 비교용 캡처는 [`docs/images/reference_screenshot/one-step-from-eden-grid.jpg`](../images/reference_screenshot/one-step-from-eden-grid.jpg)에 둔다.
- **External evidence:** 캐릭터와 장면이 유지되는 가운데 필요한 cell, 공격 영역과 상태가 짧은 고대비 signal로 빠르게 읽힌다.
- **Application:** logical map `12 x 3`을 줄이지 않고 occupied/relevant area를 camera로 frame한다. 평소에는 이어진 흙바닥을 보이고, 적 Intent·이동 후보·광범위 공격 affected cells만 순간적으로 강조한다.
- **Caution:** 카드·실시간 grid 전투·색 조합을 복제하지 않는다. 상시 바둑판을 피하고 signal timing을 참고한다.

세 reference에서 채택하는 공통 결론은 `장면 우선 + 큰 실루엣 + 필요한 순간의 명확한 signal`이다. 이것은 [Slice 1 canonical scope](../submission/vertical-slice.md)의 UI·UX 가설이며, 실제 사용성 통과 여부는 [validation agenda](./validation-agenda.md)에서 검증한다.

## Experience and audience models

### MDA: feature list보다 원하는 감정에서 역산한다

- **Source:** Robin Hunicke, Marc LeBlanc, Robert Zubek, [MDA: A Formal Approach to Game Design and Game Research](https://www.cs.northwestern.edu/~hunicke/MDA.pdf)
- **External evidence:** Mechanics는 데이터·알고리즘, Dynamics는 플레이 중의 동작, Aesthetics는 시스템과 상호작용할 때의 바람직한 정서 반응으로 구분한다. 플레이어 관점을 보면 feature-driven보다 experience-driven 설계를 촉진한다고 설명한다.
- **Application:** 이 프로젝트의 Aesthetic을 아트 키워드가 아니라 `읽히는 인과`, `저작된 자율성`, `공간적 기지`, `복원`, `절제된 애착`으로 정의한다. 각 제출 기능이 이 감정 중 무엇을 실제로 만드는지 묻는다.
- **Caution:** MDA는 성공 공식을 주지 않는다. 같은 mechanics가 목표 사용자와 presentation에 따라 다른 dynamics를 만들 수 있다.

### Quantic Foundry: 목표 사용자 가설의 어휘

- **Source:** Nick Yee, [Gamer Motivation Model Reference](https://quanticfoundry.com/wp-content/uploads/2019/04/Gamer-Motivation-Model-Reference.pdf)
- **External evidence:** 대규모 설문 데이터를 바탕으로 Strategy, Challenge, Discovery, Design, Fantasy 등 게임 동기를 구분한다.
- **Application:** 1차 사용자 가설을 Strategy·Mastery/Challenge·Discovery가 높은 reflective systems tactician으로 두고 모집·인터뷰 문구를 설계한다.
- **Caution:** 동기 모델에서 제품 persona를 자동으로 도출할 수 없다. 실제 build를 보여주기 전의 분류는 가설일 뿐이다.

### Skill atoms: 행동과 학습을 짧은 고리로 본다

- **Source:** Daniel Cook, [The Chemistry of Game Design](https://lostgarden.com/2021/03/13/the-chemistry-of-game-design-2/)
- **External evidence:** 플레이를 decision, action, feedback와 학습이 반복되는 atom으로 보고, 앞선 숙련이 다음 atom의 전제가 되는 구조를 설명한다.
- **Application:** 정책 editor의 완성도를 메뉴 기능 수로 평가하지 않고 `원인을 본다 → 한 항목을 바꾼다 → 결과가 달라진다 → 원리를 다른 상황에 옮긴다`는 학습 고리로 평가한다.
- **Caution:** atom을 체크리스트로만 분해하면 전체 감정과 pacing을 놓칠 수 있다.

## Combat and autonomous-party references

### Into the Breach: 공개 위험과 다용도 밀치기

- **Sources:** Subset Games, [Into the Breach official page](https://subsetgames.com/itb.html); Justin Ma interview, [Road to the IGF: Into the Breach](https://www.gamedeveloper.com/game-platforms/road-to-the-igf-subset-games-i-into-the-breach-i-)
- **External evidence:** 적 공격을 미리 보여주고 counter를 분석하게 하며, 낮은 무작위성과 명확한 실패 원인, 서로 다른 목표와 우선순위, 여러 용도로 쓰이는 push가 전술 선택을 만든다고 개발자가 설명한다.
- **Application:** `BODY Intent 원점 밀치기`를 단일 데모 gimmick이 아니라 여러 문제를 해결하는 핵심 동사로 확장하되, 피해만 높은 기술보다 위치·보호·사격선·동료 policy를 동시에 건드리게 한다.
- **Caution:** Into the Breach의 완전정보 퍼즐을 그대로 복제하면 동료 정책과 세계 복구가 장식이 된다. 이 프로젝트의 차별점은 자동 동료의 조건까지 바뀌는 데 있어야 한다.

### Final Fantasy XII: 자동화의 승리감과 시스템·콘텐츠 비용

- **Source:** PlayStation Blog, [How Final Fantasy XII's Gambit created one of the most distinct RPGs ever](https://blog.playstation.com/archive/2017/07/07/extended-play-how-final-fantasy-xiis-gambit-created-one-of-the-most-distinct-rpgs-ever)
- **External evidence:** Gambit은 빠른 실시간 전투의 통제 문제를 풀었고 세밀한 설정으로 강적을 이길 때 승리감을 주었다. 개발진은 시스템이 전체로 맞물릴 때까지 품질을 판단하기 어려웠고 콘텐츠 양이 크게 늘었다고 회고한다.
- **Application:** 정책 자동화의 잠재력은 높지만, 더 많은 명령·조건을 설계하기 전에 최소 표현력의 policy가 실제 전투에서 작동하는 수직 절편을 끝까지 검증한다.
- **Caution:** FFXII의 Gambit은 조건과 대상 지정이 풍부하다. 5개의 원자 행동만 가진 현재 정책이 같은 깊이를 낼 것이라고 추정하면 안 된다.

### Human-AI guidelines: 자동행동 신뢰에 대한 유추

- **Source:** Microsoft Research, [Guidelines for Human-AI Interaction](https://www.microsoft.com/en-us/research/articles/guidelines-for-human-ai-interaction-eighteen-best-practices-for-human-centered-ai-design/)
- **External evidence:** 시스템 능력·품질을 명확히 하고, 맥락에 맞는 정보를 보여주며, 잘못됐을 때 효율적인 수정과 이유 설명을 지원하고, 행동 결과와 전역 제어를 전달하라고 권한다.
- **Application:** 동료는 학습 AI가 아니어도 사용자는 자동행동에 비슷한 신뢰 문제를 겪는다. 실행 가능 조건, 실제 선택 이유, 실행되지 않은 상위 정책과 수정 결과를 짧게 확인하게 한다.
- **Caution:** 업무용 AI guideline을 게임에 그대로 적용하면 놀라움과 발견을 없앨 수 있다. 적 규칙의 discovery와 이미 알려진 policy의 예측 가능성을 구분한다.

## Decision quality and optimization

### Sid Meier: 선택은 상황적 trade-off여야 한다

- **Source:** Game Developer, [Sid Meier on games as sets of interesting decisions](https://www.gamedeveloper.com/design/gdc-2012-sid-meier-on-how-to-see-games-as-sets-of-interesting-decisions)
- **External evidence:** 항상 첫 선택이 맞거나 결과가 임의적이면 흥미로운 결정이 아니며, 선택에는 trade-off, 상황성, 플레이어 표현과 충분한 정보가 필요하다고 설명한다.
- **Application:** policy slot의 `순서 변경`이 진짜 결정인지 측정한다. 행동의 실행 가능성과 비용이 상황에 따라 바뀌지 않으면 editor는 장식이다.
- **Caution:** 모든 선택을 완벽하게 균형 잡으려 하면 명확한 학습과 power moment도 사라진다. 상황별 우위와 전체 지배를 구분한다.

### Soren Johnson: 플레이어는 규칙이 보상하는 최적화를 한다

- **Source:** Soren Johnson, [Water Finds a Crack](https://www.designer-notes.com/game-developer-column-17-water-finds-a-crack/)
- **External evidence:** 플레이어는 보상 대비 위험을 최적화하고, 단일 지배 전략이나 안전하지만 지루한 반복이 다른 선택을 없앨 수 있다고 설명한다.
- **Application:** 기본 policy가 얼마나 많은 조합을 자동 해결하는지 matrix로 측정하고, 반복 관전·세부 물류처럼 안전하지만 시간만 쓰는 최적 행동이 생기는지 본다.
- **Caution:** 강한 전략을 발견하는 즐거움까지 제거해서는 안 된다. 문제는 좋은 전략이 존재하는 것이 아니라 모든 상황에서 다른 선택을 무효화하는 것이다.

## Onboarding and explanation

### Celia Hodent: learning mode의 제한된 주의 자원

- **Source:** Celia Hodent, [The Gamer's Brain, Part 2: UX of Onboarding and Player Engagement](https://celiahodent.com/gamers-brain-ux-onboarding/)
- **External evidence:** onboarding에서는 제한된 working memory와 주의 자원을 고려해 학습을 우선순위화하고 분산해야 하며, 새로운 effortful item 약 3개를 동시에 처리하는 것을 상한으로 보라고 제안한다. affordance와 명확한 signifier가 인지 비용을 줄인다.
- **Application:** 첫 15분의 14개 beat를 `몇 개를 노출했는가`가 아니라 각 순간 플레이어가 새로 처리해야 하는 개념 수와 다음 상황에서의 회상으로 평가한다.
- **Caution:** 3은 제품·사용자와 과제에 따라 달라지는 실무 heuristic이지 절대 법칙이 아니다.

## Restoration and world meaning

### Terra Nil: 복원은 배경이 아니라 매 순간의 동사다

- **Source:** Science Friday interview with lead designer Sam Alfred, [This Video Game Prioritizes Restoring an Ecosystem Over Profits](https://www.sciencefriday.com/segments/video-game-environment/)
- **External evidence:** Terra Nil은 황무지를 생태계로 복원하고 시설까지 회수하는 목표를 중심에 두며, 자연을 추출 도구가 아니라 플레이어 판단의 전면에 놓고 생태계 균형을 정체성으로 삼았다.
- **Application:** Isekai Coach의 비콘·시설·물류도 단순 진행 체크가 아니라 정보, 경로, 위임과 전투 policy의 선택을 바꿔야 `복원`이 Aesthetic이 된다.
- **Caution:** 이 게임은 생태 복원 게임이 아니다. Terra Nil의 구체 mechanics가 아니라 테마를 행동으로 만드는 일관성만 참고한다.

## Visual language and accessibility

### Riot VFX: 시각적 영향은 gameplay 영향과 일치해야 한다

- **Source:** Riot Games, [League's VFX Style Guide](https://nexus.leagueoflegends.com/en-us/2017/10/dev-leagues-vfx-style-guide/)
- **External evidence:** VFX의 목표를 gameplay clarity, clutter 최소화, theme 강화와 delight로 두고, 효과의 시각적 크기·강도가 gameplay 영향과 맞아야 한다고 설명한다.
- **Application:** Intent, 현재 동료 예측과 후보 예측을 동시에 최대로 밝히지 않는다. 입력 단계와 중요도에 따라 한 층을 전경으로 두고 나머지는 형태·명도·timing으로 낮춘다.
- **Caution:** 경쟁 MOBA의 즉시 판독 기준을 턴제 화면에 그대로 적용할 필요는 없지만, 작은 화면과 정보 충돌 문제에는 유효하다.

### NieR:Automata UI: 무균질한 SF를 고유 motif와 물성으로 깨뜨린다

- **Source:** Hisayoshi Kijima, PlatinumGames, [UI Design in NieR:Automata](https://www.platinumgames.com/official-blog/article/9624?age-verified=89aae493bb7)
- **External evidence:** `systematic and sterile but beautiful`이라는 초기 방향이 무미건조해질 수 있어 음악 기보의 암시, analog monitor 질감과 warm beige를 더했고, 색 의존을 줄이면서 단순한 조작을 추구했다고 설명한다.
- **Application:** 흑연·청백 tech UI에 이 세계만의 motif와 복구 전후의 물성을 더한다. 색을 늘리기보다 선 두께, pattern, 형상과 motion으로 정보를 구분한다.
- **Caution:** beige, 음악 기보와 화면 distortion은 NieR의 해법이다. 복제 대상이 아니라 `고유한 서사 근거를 가진 motif가 필요한 이유`의 사례다.

### W3C: 색은 유일한 정보 채널이 될 수 없다

- **Source:** W3C, [Understanding Success Criterion 1.4.1: Use of Color](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color)
- **External evidence:** 색 차이를 정보 전달, 행동 지시와 요소 구분의 유일한 수단으로 쓰지 말아야 한다.
- **Application:** Slice 1에서는 `짧은 타격`/`광범위 공격`, enemy Intent/ally action과 이동 후보를 icon, pattern, stroke와 motion으로 중복 부호화한다. 가드 가능/불가 분기를 새로 만들지 않는다.
- **Caution:** 기준 준수만으로 전술적 판독 속도까지 보장되지는 않는다. 실제 크기와 대표적인 색각 조건에서 시간 제한 판독 테스트가 필요하다.

## Synthesis

외부 자료들이 공통으로 지지하는 것은 `더 많은 기능`이 아니다.

1. 원하는 감정에서 mechanics를 역산한다.
2. 위험과 자동행동의 원인을 읽히게 한다.
3. policy 선택이 상황적 trade-off를 만들게 한다.
4. 행동, feedback와 학습을 짧게 연결한다.
5. onboarding에서 한 번에 처리할 새 개념을 줄인다.
6. 복원과 visual theme를 실제 행동과 정보 계층에 연결한다.
7. 성공 사례의 표면이 아니라 그것이 해결한 문제를 가져온다.

이 종합은 [current game assessment](./current-game-assessment.md)의 비평과 [validation agenda](./validation-agenda.md)의 실험으로 연결한다.
