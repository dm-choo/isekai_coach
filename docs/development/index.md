---
title: Development Canonical Index
status: accepted
last_updated: 2026-08-17
related:
  - ../index.md
  - architecture/index.md
  - codex/index.md
---

# Development

이 디렉터리는 현재 구현이 보장하는 기술 계약과 Codex를 이용한 생산·검증 절차를 소유한다. 게임 규칙의 정본은 [Gameplay](../gameplay/index.md), 화면 경험의 정본은 [UX](../ux/index.md), 시각 기준의 정본은 [Art](../art/index.md)다.

## Canonical documents

- [Architecture](./architecture/index.md): 기존 전투 scaffold의 구현 계약과 최신 승인 설계와의 차이
- [Codex workflows](./codex/index.md): 코드 밖 생산 작업의 저장·검증 경계

## Status summary

- **accepted**: 순수 TypeScript 전투 domain, 단방향 event presentation, deterministic resolution, bridge와 projection 경계
- **under-validation**: 실제 sprite/VFX를 연결한 뒤의 화면 크기·frame·anchor 계약
- **provisional**: 샌드박스 수치, scripted strategy, placeholder timing·도형·색·카메라
- **deferred**: 최종 정책 편집기와 완제품 콘텐츠 시스템, backend·network·범용 framework

승인된 최신 게임 규칙과 현재 코드가 다를 때는 게임 규칙을 이 디렉터리에 복제하지 않는다. [Existing scaffold contract](./architecture/existing-scaffold-contract.md)의 alignment 섹션에서 구현 차이만 추적한다.
