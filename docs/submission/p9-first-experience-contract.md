---
title: P9 First Experience Mechanic Contract
status: accepted
last_updated: 2026-08-19
related:
  - scope.md
  - first-15-minutes.md
  - acceptance-criteria.md
  - ../narrative/protagonist-and-companions.md
  - ../research/reference-insights.md
---

# P9 첫 경험 메카닉 계약

## Goal

플레이어는 설명을 읽어서가 아니라 직접 움직이고 싸우고 세계 오브젝트에 개입한 결과로 다음을 느껴야 한다.

> 나는 작은 안전 영역에서 혼자 깨어났다. 바깥으로 나가는 첫 위험은 내가 직접 해결했다. 내가 봉인을 풀어 동료를 얻었고, 이후부터 내 행동과 동료의 자율 행동이 함께 세계를 넓힌다.

첫 장면을 멋진 메뉴로 만드는 것이 Goal이 아니다. `주인공 단독 agency → 동료 획득 → 서로 다른 agency`를 플레이 순서 자체가 가르치는 것이 Goal이다.

## Authored mechanics

1. 시작 state에는 주인공 한 명만 존재한다. 동료 portrait, HP, policy와 자원 HUD는 없다.
2. 작은 안전 영역과 결계 밖은 하나의 연속된 world scene 안에서 물리적 경계·지면·빛·환경 반응으로 구분한다.
3. 첫 입력은 화면 밖 CTA가 아니라 주인공과 출구 사이 공간에 연결된 이동이다. 키보드와 pointer가 같은 world action을 수행한다.
4. 이동 중 위협을 만나면 별도 메뉴 없이 감속·적 reveal·grid 조립 순서로 첫 전투에 들어간다.
5. 첫 전투에는 동료 turn·prediction·policy가 존재하지 않는다. 플레이어는 적 Intent와 자기 plan의 인과 하나만 배운다.
6. 승리 뒤 다음 진행 오브젝트로 봉인된 원거리 동료가 world에 드러난다. 주인공이 직접 접근·상호작용해야 봉인이 풀린다.
7. 합류 뒤에만 동료 HP와 자동행동 prediction이 등장한다. 다음 조우가 `내 계획이 동료의 행동 조건을 바꾼다`는 두 번째 학습을 소유한다.

## Presentation is evidence, not a substitute

- 큰 설명 문장, 잡지형 headline과 화면 모서리의 `다음 행동` 카드로 mechanics를 대신하지 않는다.
- 텍스트는 이름·정확한 수치·상세 tooltip만 보조한다. 방향, 주체, 안전/위험과 상호작용 가능 여부의 1차 의미를 소유하지 않는다.
- 새 제출 경험은 기존 Slice 1·2의 배경·주인공·동료·적 bitmap을 재사용하지 않는다. 각 asset은 해당 장면의 주체·방향·위험·합류 인과를 위해 새로 만든다.
- reference fidelity는 분위기 문장이 아니라 화면 구성, 캐릭터 비율, contextual control 위치, grid signal timing과 정보 밀도를 나란히 비교한다.

## Observable evidence

### Text-off frame

모든 설명 text를 숨긴 1280×720 frame에서 처음 보는 관찰자가 세 가지를 가리킬 수 있어야 한다.

1. 조작할 주인공
2. 현재 안전 영역의 경계
3. 진행 가능한 방향 또는 상호작용 대상

### State sequence

```text
AWAKENING: protagonist only
→ SOLO_APPROACH: world movement
→ SOLO_COMBAT: protagonist + enemy
→ COMPANION_SEALED: protagonist + sealed companion object
→ COMPANION_JOINED: protagonist + companion
→ FRONTIER_APPROACH: joint travel and later joint combat
```

각 state는 이전 state의 플레이어 행동으로만 열린다. 시간 경과나 설명 버튼이 핵심 관계를 대신하지 않는다.

### Browser contract

- pointer와 `D`로 첫 이동이 즉시 눈에 보인다.
- 첫 적과의 접촉이 자동으로 전투를 시작한다.
- solo combat authoritative state에는 ally unit이 없다.
- 봉인 상호작용 전에는 ally unit·HUD·policy가 없다.
- 상호작용 뒤 같은 world coordinate에 동료가 나타나고, 이후 첫 합동 combat에 ally prediction이 존재한다.
- 16:9와 4:3에서 주인공, 경계, 목표와 contextual input이 scene 밖 panel에 밀리지 않는다.

## Stop rules

- 텍스트를 지우면 첫 행동을 찾지 못한다면 구현량과 무관하게 실패다.
- 기존 asset을 넣어야만 화면이 완성된다면 asset 제작 전 단계로 돌아간다.
- reference와 나란히 놓았을 때 장면보다 panel이 먼저 보이면 실패다.
- unit/controller test가 통과해도 state sequence가 실제 브라우저 입력으로 이어지지 않으면 완료가 아니다.
- 이 Goal이 통과하기 전에는 장기 정책, 경제, 다음 지역 콘텐츠를 추가하지 않는다.
