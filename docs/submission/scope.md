---
title: Web Build Submission Scope
status: accepted
last_updated: 2026-08-18
related:
  - vertical-slice.md
  - vertical-slice-2-four-world-tiles.md
  - first-15-minutes.md
  - sector-1-golden-run.md
  - acceptance-criteria.md
  - ../narrative/premise.md
---

# Web Build submission scope

## Project and proof goals

- repository: `dm-choo/isekai_coach`
- format: OpenAI Game Builders Seoul 제출용 Web Build
- title: 최종 타이틀은 **deferred**이며 현재 프로젝트명만 사용한다.

제출본은 다음 경험을 우선 증명한다.

1. 직접 명령하지 않아도 [정책에 따라 동료가 움직이는 전투](../gameplay/combat/policy/action-policy.md)
2. [미지의 섹터를 밝히고 개척하는 과정](../gameplay/world/index.md)
3. [시설과 장비를 복구해 결계를 돌파하는 진행](../gameplay/economy/index.md)

보조 경험은 주인공과 동료의 공간 협동, 본대·별동대를 위임하는 관리자 감각, 작전 기록을 분석해 정책을 개선하는 유능감, 비콘과 횃불로 진척을 세계에 고정하는 복원감이다. 각 규칙은 아래 포함 범위의 canonical owner가 소유한다.

첫 구현 milestone은 전체 범위를 동시에 만드는 대신 [Core vertical slice](./vertical-slice.md)에서 보스방 장면, 턴 주체, 이동·공격 분리, Intent·애니메이션 인과와 관리자 봉인 해제를 먼저 검증한다. Slice 1에서는 policy 편집·정책 수정 전이를 구현하거나 검증하지 않는다. 이 제작 순서는 승인됐지만 목표 경험의 성립 여부는 플레이테스트 전까지 under-validation이다.

두 번째 milestone은 [Four world tile expedition](./vertical-slice-2-four-world-tiles.md)에서 중앙 방과 네 통로, 통로 구간 인카운터, 누적 HP·시간, 세 고블린 Intent와 한 번의 policy 재정렬을 검증한다. Slice 2의 월드 타일 연결은 선형이며 전체 섹터 simulation, 경제와 별동대는 포함하지 않는다.

## Included canonical systems

- [세계와 관리자 전제](../narrative/index.md)
- [3행 공간, locked Intent와 무작위 없는 전투](../gameplay/combat/index.md)
- [최대 5-slot action policy](../gameplay/combat/policy/action-policy.md)
- [어둠·흐림·밝음 섹터 맵과 로컬 탐색](../gameplay/world/index.md)
- [본대·별동대와 공유 월드 시간](../gameplay/operations/index.md)
- [작전 채널, 다시보기와 분석](../gameplay/operations/operation-channel.md)
- [도감과 자동 교전](../gameplay/knowledge/index.md)
- [철광산, 슬롯 적재와 대장간](../gameplay/economy/index.md)
- [실패·저장·복구](../gameplay/operations/failure-save-and-recovery.md)
- [첫 15분](./first-15-minutes.md)과 [첫 섹터 골든 런](./sector-1-golden-run.md)

## Deferred from the submission

- 자유 조건식, AND/OR, 자연어·LLM 해석과 장기 [정책 언어](../gameplay/combat/policy/future-policy-language.md)
- 다음 섹터와 장기 campaign 콘텐츠
- 완제품 수준의 고급 replay 편집, 행동 모델 추론과 coaching
- 성장, 직업, armor·food·mastery, trait/quirk와 permadeath의 완제품 시스템
- backend, 계정, multiplayer와 network 기능
- 최종 타이틀과 승인되지 않은 세부 과거사

제외 항목을 수용하기 위한 빈 범용 framework는 제출 완료 조건이 아니다.

## Under validation

- 첫 섹터 전체 플레이 시간은 약 25~40분을 예상하지만 플레이테스트로 확정한다.
- Slice 1 public 행동 이름은 `회피`, `포지셔닝`, `사격`, `밀치기`, `내려찍기`로 고정한다. 관리자·동료 HP 10, 보스 HP 15, 사격(피해1/AP2), 밀치기(피해1/AP2), 내려찍기(피해1/AP1), 보스 3-step pattern은 최신 accepted contract다.
- 실제 resource·cargo·combat 수치는 각 canonical owner의 provisional 데이터로 조정한다.
