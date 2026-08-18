---
title: Isekai Coach Canonical Documentation
status: accepted
last_updated: 2026-08-18
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

## Status summary

- **accepted**: 전투 공간·Intent·결정론, action-policy 우선순위 계약, 중앙 방·네 경계 방·분절 통로 월드 타일, 재침식 인카운터 재추첨, 본대/별동대, 공유 월드 시간, Slice 1과 Slice 2 제작 범위
- **under-validation**: Slice 1 실제 전투 UX·타격감, Slice 2 탐색 판독·선택 충돌·정책 전이, 총 플레이 시간, 재침식 시간과 개별 전투 수치
- **provisional**: 맵 크기·거리, 피해/AP, 자원·적재 슬롯 수와 scaffold 샘플 값
- **deferred**: 장기 정책 언어 구현, 고급 리플레이 편집, 행동 모델 추론, 다음 섹터와 완제품 시스템

최종 게임 타이틀은 아직 확정하지 않는다. 현재 이름은 저장소와 문서 라우팅을 위한 프로젝트명이다.
