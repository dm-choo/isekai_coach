---
title: Territory Expansion Reference Analysis
status: under-validation
last_updated: 2026-08-19
related:
  - ../narrative/premise.md
  - ../gameplay/world/barrier-territory.md
  - ../gameplay/operations/delegated-expeditions.md
  - ../gameplay/combat/policy/future-policy-language.md
  - ../gameplay/economy/territory-utility-and-infrastructure.md
---

# Territory expansion reference analysis

## Decision filter

레퍼런스는 다음 인과를 더 강하게 만들 때만 채택한다.

```text
좌표가 있는 세계의 직접 탐사
→ 공간 규칙 학습
→ 정책형 위임
→ 인접 영토 편입
→ 결계 확장
→ 회복된 땅의 효용
```

유명하거나 장르가 비슷하다는 이유만으로 UI·성장·자원을 복제하지 않는다. 아래의 `External evidence`는 출처가 직접 설명하는 사실이고, `Inference`와 `Decision`은 이 프로젝트에 대한 해석이다.

## Darkest Dungeon — 원정과 영지 사이의 의미

**External evidence.** Red Hook은 플레이어 목표를 조상의 영지를 되찾는 것으로 제시하고, 결함 있는 영웅을 모집·훈련해 여러 지역으로 이끌며 스트레스·기근·질병·어둠을 함께 감당한다고 설명한다. [Darkest Dungeon official site](https://www.darkestdungeon.com/darkest-dungeon/)

**Inference.** 전투 승리만이 아니라 원정에서 생긴 손실이 영지로 돌아와 다음 원정 준비를 바꾸기 때문에 던전과 거점이 하나의 캠페인 의미를 갖는다.

**Adopt.** 원정의 HP·부상·보급·세계 시간과 정책 학습을 영토로 되가져오고, 회복한 영토가 다음 원정을 지원하게 한다.

**Transform.** 선택 가능한 반복 던전을 영구 월드 좌표에 흩어진 방·통로·타일로 바꾼다. 완료한 장소는 목록에서 사라지지 않고 결계선, 시설과 경로로 남는다.

**Reject.** 제출본에서는 permadeath와 복잡한 스트레스·질병을 넣지 않는다. 이는 영토 확장보다 손실 관리가 전면에 나올 위험이 있다.

## Northgard — 인접 영토와 지역 효용

**External evidence.** Northgard의 공식 API는 Zone을 플레이어가 식민화하고 활용할 수 있는 땅으로 정의하며, 각 Zone이 접근 가능한 이웃과 소유권·건물·colonization 진행을 가진다고 설명한다. Player는 발견한 Zone과 소유한 Zone을 별도로 보유한다. [Northgard Zone API](https://northgard.net/doc/api/current/Zone.html), [Northgard Player API](https://northgard.net/doc/api/current/Player.html)

**Inference.** 시야, 인접성, 소유, 지역 생산을 분리하면 지도 한 칸의 편입이 단순 fog 제거가 아니라 경제·방어·다음 경로 선택이 된다.

**Adopt.** 인접한 확보 타일만 편입하고, 각 타일의 지역 효용과 제한된 시설 위치가 다음 확장 방향에 영향을 주게 한다.

**Transform.** 즉시 자원 지불로 소유권을 사는 대신, 직접 탐사·안전 경로·주인공의 확장 거점 활성화를 요구한다. 결계 외곽선이 소유 타일의 실제 contour를 따른다.

**Reject.** 주민을 실시간으로 건물 사이에 재배치하는 RTS 노동 관리와 다수의 병렬 생산 수치는 초기 제출본에 넣지 않는다.

## Unicorn Overlord and Final Fantasy XII — 사전 정책과 자동행동

**External evidence.** ATLUS는 Unicorn Overlord에서 조건으로 기술이 언제 어떻게 자동 사용될지 미리 조정한다고 설명하며, 공식 팁은 우선순위와 `Full Column` 같은 조건 변경이 실제 자동행동 결과를 바꾸는 사례를 제시한다. [Official feature page](https://unicornoverlord.atlus.com/), [Official tactics tips](https://unicornoverlord.atlus.com/media/pdf/unicorn_overlord_tips.pdf) Square Enix는 Final Fantasy XII의 Gambit을 파티 AI를 사용자화하는 기능으로 설명한다. [Square Enix Final Fantasy portal](https://na.finalfantasy.com/news/1079)

**Inference.** 자동행동은 플레이어가 실행 원리를 사전에 예측하고 결과에서 어느 규칙이 발동했는지 추적할 수 있을 때 전략이 된다.

**Adopt.** 위에서 아래로 평가하는 action priority, 공간 조건, 실행 불가 이유와 동일 상태 replay를 사용한다.

**Transform.** HP 비율과 적 종족 같은 조건만 늘리지 않고 `행`, `거리`, `위험 칸`, `이동 경로`, `Intent footprint`를 정책의 핵심 어휘로 둔다. 정책은 전투 화면 밖 위임에서도 같은 좌표 simulation을 제어한다.

**Reject.** 처음부터 방대한 조건 목록, 중첩 AND/OR와 수십 개 슬롯을 제공하지 않는다. 기본 플레이의 멘탈모델이 편집기 해독으로 바뀌기 때문이다.

## Against the Storm — 확장의 압력과 지역 차이

**External evidence.** 공식 위키는 세계 지도에서 도시와 완료한 정착지를 발판으로 안개를 밝히고 더 먼 Seal로 진행하며, 거리별 최소 난이도와 생물군계·modifier가 지역 선택을 바꾼다고 설명한다. 또한 개척과 시간·인구·벌목이 Hostility를 높인다. [World Map](https://wiki.hoodedhorse.com/Against_the_Storm/World_Map), [Hostility](https://wiki.hoodedhorse.com/Against_the_Storm/Hostility)

**Inference.** 확장이 항상 이득만 주지 않고 유지 부담과 지역별 문제가 늘어날 때, 어느 방향을 먼저 연결하고 무엇을 안정화할지 선택이 생긴다.

**Adopt.** 바깥으로 갈수록 새로운 지역 규칙을 추가하고, 외곽 영토·보급 경로·세계 시간으로 관리 압력을 만든다. 위협은 숨은 난수 대신 관찰 가능한 원인과 경고를 가진다.

**Transform.** 전역 Hostility 막대 대신 실제 타일과 경로의 불안정으로 압력을 공간화한다.

**Reject.** 주기마다 정착지와 지도를 씻어내는 구조는 채택하지 않는다. 이 게임의 핵심 보상은 영구 좌표에 누적되는 `내 세계`이기 때문이다. 전체 캠페인을 끝내는 임의의 전역 타이머도 초기에는 사용하지 않는다.

## Coherent result

네 사례에서 가져오는 것은 서로 다른 하위 문제의 해법이다.

| Problem | Borrowed principle | Project-specific form |
|---|---|---|
| 원정이 캠페인과 분리됨 | Darkest Dungeon의 원정↔거점 손실·회복 | 원정 결과가 영토·보급·정책 지식으로 귀환 |
| 지도 확장이 단순 fog 제거임 | Northgard의 발견·소유·지역 효용 분리 | 탐사·확보·편입·안정화의 직교 상태 |
| 자동전투가 구경이나 전투력 비교임 | 사전 조건·우선순위 기반 자동행동 | 공간 지침이 실제 좌표 simulation을 제어 |
| 확장 방향에 갈등이 없음 | 지역 차이와 확장 압력 | 경로 불안정·거리·지역 규칙·효용의 trade-off |

이 조합이 실제로 `내 세계가 커진다`는 감각과 정책 수정의 재미를 만드는지는 제출본 무설명 플레이테스트 전까지 **under-validation**이다.
