---
title: Isekai Coach Canonical Documentation
status: accepted
last_updated: 2026-08-19
related:
  - _meta/documentation-governance.md
  - submission/scope.md
  - research/index.md
---

# Isekai Coach canonical documentation

이 디렉터리는 `dm-choo/isekai_coach`의 최신 설계 정본이다. 과거 계약은 별도 복사본이 아니라 Git history에서 찾는다. 문서를 추가하거나 수정하기 전에 [문서 거버넌스](./_meta/documentation-governance.md)를 따른다.

## Canonical owners

- [Gameplay](./gameplay/index.md): 규칙, 상태 전이, 콘텐츠 역할
- [Narrative](./narrative/index.md): 세계 전제, 인물, 관리자 시스템, 용어
- [UX](./ux/index.md): 플레이 흐름과 뷰별 상호작용
- [Art](./art/index.md): 캐릭터, UI, VFX의 시각 언어
- [Development](./development/index.md): 구현 경계, 현재 scaffold, Codex 생산 절차
- [Submission](./submission/index.md): 이번 Web Build 제출 범위와 acceptance criteria
- [ADR](./adr/index.md): 구조적 결정과 대안
- [Templates](./_templates/index.md): canonical 문서와 ADR 작성 형식

## Decision support

- [Research](./research/index.md): 외부 근거, 현재 아이디어 비평과 플레이테스트 가설. 정본 계약을 직접 소유하지 않으며, 채택된 결론은 해당 canonical owner나 ADR로 옮긴다.

## Product definition reading order

1. [World premise](./narrative/premise.md)와 [Barrier and restoration](./narrative/barrier-and-restoration.md): 무엇을 왜 확장하는가
2. [Campaign and sector structure](./gameplay/world/campaign-structure.md): 완제품 메인 콘텐츠가 어떻게 반복·확장되는가
3. [Barrier territory](./gameplay/world/barrier-territory.md): 탐사·확보·편입·안정화가 어떻게 다른가
4. [Delegated expeditions](./gameplay/operations/delegated-expeditions.md)와 [Spatial policy](./gameplay/combat/policy/future-policy-language.md): 직접 학습이 어떻게 자동화로 전이되는가
5. [Territory utility and infrastructure](./gameplay/economy/territory-utility-and-infrastructure.md): 회복한 땅이 다음 확장을 어떻게 돕는가
6. [Reference analysis](./research/territory-expansion-reference-analysis.md): 레퍼런스의 채택·변형·기각 근거
7. [Submission scope](./submission/scope.md), [Golden run](./submission/sector-1-golden-run.md), [Milestones](./submission/milestones.md): 무엇을 먼저 구현하고 무엇으로 통과를 판정하는가

## Status summary

- **accepted**: `내 세계가 커진다`는 핵심 경험, 영구 좌표의 전투·방·통로·월드 계층, 인접 영토 편입과 결계 contour, 직접 첫 탐사와 동일 규칙 정책 위임, 공유 시간, 위치 기반 영토 효용, 축소된 제출 증명 cycle
- **under-validation**: 무설명 인과 이해, 정책 trade-off, 재침식 압력, 안정화·시설·경제의 상세 규칙과 제출 플레이 시간
- **provisional**: 맵 크기·거리, 피해/AP, 자원·적재 슬롯과 기존 Slice 1·2 fixture 수치
- **deferred**: 다중 별동대, 장기 정책 언어, 복합 경제·시설·외교·성장, 다음 섹터 콘텐츠와 완제품 replay

최종 게임 타이틀은 아직 확정하지 않는다. 현재 이름은 저장소와 문서 라우팅을 위한 프로젝트명이다.
