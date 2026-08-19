---
title: Web Build Submission Scope
status: accepted
last_updated: 2026-08-19
related:
  - milestones.md
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

제출본은 다음 한 가지 인과를 우선 증명한다.

> 플레이어가 공개된 적 Intent를 보고 직접 위치를 바꾸어 동료의 자동 행동 결과를 변화시키고, 실패 원인을 바탕으로 정책 우선순위를 한 번 수정해 다음 전투에서 개선을 확인한다.

월드 탐색, 시간과 휴식은 이 전투·정책 인과에 비용과 지속 상태를 제공하는 만큼만 포함한다. 별동대, 상세 경제와 시설 복구는 핵심 증명이 읽힌 뒤의 범위로 미룬다.

첫 구현 milestone은 전체 범위를 동시에 만드는 대신 [Core vertical slice](./vertical-slice.md)에서 보스방 장면, 턴 주체, 이동·공격 분리, Intent·애니메이션 인과와 관리자 봉인 해제를 먼저 검증한다. Slice 1에서는 policy 편집·정책 수정 전이를 구현하거나 검증하지 않는다. 이 제작 순서는 승인됐지만 목표 경험의 성립 여부는 플레이테스트 전까지 under-validation이다.

두 번째 milestone은 [Four world tile expedition](./vertical-slice-2-four-world-tiles.md)에서 중앙 방과 네 통로, 통로 구간 인카운터, 누적 HP·시간, 세 고블린 Intent와 한 번의 policy 재정렬을 검증한다. Slice 2의 월드 타일 연결은 선형이며 전체 섹터 simulation, 경제와 별동대는 포함하지 않는다.

## Included canonical systems

- [세계와 관리자 전제](../narrative/index.md)
- [3행 공간, locked Intent와 무작위 없는 전투](../gameplay/combat/index.md)
- 관리자 1명과 원거리 동료 1명
- 고블린 전사·궁수·투척병과 결계 수호자
- [최대 5-slot action policy](../gameplay/combat/policy/action-policy.md)의 순서 변경 1회
- 중앙 방과 통로를 가진 짧은 선형 원정
- 지속 HP, 월드 시간, 물·식량을 사용한 휴식
- 정책 수정 전후를 비교하는 새 적 조합
- 보스, 결계 해제와 명확한 데모 종료
- 실패·체크포인트·같은 인카운터 재시도

## Deferred from the submission

- 자유 조건식, AND/OR, 자연어·LLM 해석과 장기 [정책 언어](../gameplay/combat/policy/future-policy-language.md)
- 두 번째 동료, 본대·별동대 동시 운용과 자동 개척
- 작전 채널의 완제품 다시보기·분석 화면
- 철광산 채집·적재·운송, 대장간, 장비 제작과 상세 시설 복구
- 완전한 섹터 simulation과 완료 뒤 자유 플레이
- 다음 섹터와 장기 campaign 콘텐츠
- 완제품 수준의 고급 replay 편집, 행동 모델 추론과 coaching
- 성장, 직업, armor·food·mastery, trait/quirk와 permadeath의 완제품 시스템
- backend, 계정, multiplayer와 network 기능
- 최종 타이틀과 승인되지 않은 세부 과거사

제외 항목을 수용하기 위한 빈 범용 framework는 제출 완료 조건이 아니다.

## Under validation

- 제출 골든 패스는 약 20~30분을 목표로 하되 플레이테스트로 확정한다.
- Slice 1 public 행동 이름은 `회피`, `포지셔닝`, `사격`, `밀치기`, `내려찍기`로 고정한다. 관리자·동료 HP 10, 보스 HP 15, 사격(피해1/AP2), 밀치기(피해1/AP2), 내려찍기(피해1/AP1), 보스 3-step pattern은 최신 accepted contract다.
- 실제 resource·cargo·combat 수치는 각 canonical owner의 provisional 데이터로 조정한다.
