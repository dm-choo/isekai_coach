---
title: Web Build Submission Scope
status: accepted
last_updated: 2026-08-19
related:
  - milestones.md
  - first-15-minutes.md
  - sector-1-golden-run.md
  - acceptance-criteria.md
  - ../narrative/premise.md
  - ../gameplay/world/barrier-territory.md
---

# Web Build submission scope

## Product proof

- repository: `dm-choo/isekai_coach`
- format: OpenAI Game Builders Seoul 제출용 Web Build
- title: 최종 타이틀은 **deferred**이며 현재 프로젝트명만 사용한다.

제출본은 다음 한 사이클을 실제 플레이로 증명한다.

> 작은 결계에서 출발한 플레이어가 인접한 미지의 좌표를 직접 탐사해 공간 규칙을 배우고, 동료 정책을 한 번 바꿔 알려진 통로를 위임하고, 주인공이 확보된 땅을 편입해 결계선과 다음 원정 능력이 실제로 확장되는 것을 본다.

전투의 개별 선택은 이 사이클의 학습 언어이고, 정책 자동전투는 세계 규모의 반복 탐사를 위임하는 수단이다. 보스 격파나 봉인 해제만으로 제품 증명을 대체하지 않는다.

## Included systems

- 작은 초기 결계 타일과 상하좌우 좌표를 가진 고정 월드 일부
- 중앙 방·경계 방·400m 통로와 100m 인카운터 구간을 가진 첫 frontier 타일
- 관리자 1명과 원거리 동료 1명
- 직접 첫 조우에서 관찰하는 위치·사거리·Intent 규칙
- 결정론적 12×3 전투와 관리자 직접 행동, 동료 자동행동
- 최대 5-slot action priority와 제한된 공간 지침 하나의 수정
- 중앙 방 해결로 네 통로를 정찰하는 인과
- 주인공의 거점 조사와 동료의 알려진 통로 확보를 분리한 최소 위임 작전
- 같은 좌표·전투 규칙을 사용하는 화면 밖 simulation과 작전 결과 요약
- 공유 월드 시간, 지속 HP와 물·식량
- 인접 타일의 확장 거점 직접 활성화, contour 기반 결계 확장
- 편입 타일의 샘 활성화와 물 1회 보충
- 새로 접근 가능한 다음 좌표 하나와 명확한 데모 종료
- 패배 시 시간·보급·부상을 남기고 안전 영토로 후퇴하는 최소 실패 처리

## Content boundary

제출 경로는 `초기 결계 타일 → 첫 frontier 타일 → 다음 frontier 좌표 공개`만 사용한다. 첫 frontier 타일에는 직접 학습 조우, 중앙 목표, 위임 가능한 알려진 통로, 확장 거점과 샘이 있다. 이 좁은 공간이 전체 제품 구조를 축소해 보여 준다.

기존 `/slice1/`과 `/slice2/`는 전투·통로·정책 foundation과 회귀 장면이다. 현재 구현된 `봉인 해제` 결말은 새 제출본의 제품 결말이 아니며 의미와 흐름을 교체해야 한다.

## Deferred

- 두 번째 동료와 두 개 이상의 동시 별동대
- 섹터 전체 규모, 지역 핵, 섹터 보스와 장기 campaign
- 철광산·대장간·장비·노동자·복합 생산망
- 시설 건설 UI와 완제품 물류 자동화
- 자유 조건식, nested AND/OR, 자연어 정책과 node graph
- 완제품 replay 편집과 행동 모델 추론
- 직업·성장·quirk·스트레스·질병·permadeath
- 외부 세력 외교와 완성된 복구 사회
- backend, 계정, multiplayer와 network 기능
- 최종 타이틀과 세부 과거사

제외 항목을 위한 빈 범용 framework는 제출 완료 조건이 아니다.

## Under validation

- 골든 패스 목표 시간은 15~25분이다.
- 제한된 공간 지침의 첫 후보는 `사거리 유지`다.
- 첫 frontier의 적 조합, 피해/AP, 샘 보충량과 실패 비용의 정확한 수치는 provisional이다.
- 플레이어가 설명 없이 `내 행동이 동료 정책과 영토 확장에 이어졌다`고 이해하는지는 사람 gate 전까지 under-validation이다.
