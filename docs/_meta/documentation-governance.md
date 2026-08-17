---
title: Documentation Governance
status: accepted
last_updated: 2026-08-17
related:
  - ../index.md
  - ../adr/0001-canonical-docs-and-git-history.md
  - ../_templates/canonical-doc.md
---

# Documentation governance

## One concept, one owner

각 계약은 한 문서만 소유한다. 다른 계층은 복제하지 않고 owner를 링크한다.

- gameplay: 규칙과 상태 전이
- narrative: 세계·인물·용어의 의미
- UX: 노출 시점, 흐름, 상호작용
- art: 형태, 색, 질감, 동작의 시각 기준
- development: 코드 경계, 구현 상태, 생산·검증 절차
- submission: 기존 정본 중 제출본에 포함할 범위와 완료 기준
- ADR: 구조적 선택의 이유와 대안

## Status vocabulary

문서 상태와 섹션 상태에는 아래 네 값만 쓴다.

- `accepted`: 후속 설계와 구현이 의존할 수 있다.
- `under-validation`: 유력하지만 실험이나 플레이테스트가 필요하다.
- `provisional`: 쉽게 교체할 수 있는 수치, 샘플 콘텐츠, 임시 구현이다.
- `deferred`: 현재 제출본이나 작업 범위에서 의도적으로 미룬다.

여러 상태를 한 문서에서 다뤄야 한다면 frontmatter는 주 계약의 상태를 쓰고, 비주 계약 섹션에 상태를 명시한다. 상태가 다른 내용을 문장 하나에 섞지 않는다.

## Current truth and history

정본은 최신 계약만 보여준다. 폐기된 설계의 `_archive`, `legacy`, `old-v1`, `backup` 복사본을 만들지 않는다. 변경 이유가 후속 구조에 중요할 때만 ADR을 남기고, 과거 전문은 Git history에서 조회한다.

## Routing and links

- populated non-leaf directory에는 책임과 상태 요약을 가진 `index.md`가 있어야 한다.
- repository 내부 링크는 상대 경로를 사용한다.
- leaf 문서는 독립 계약, 독립 acceptance criteria, 다중 참조, 별도 구현·테스트 owner 중 하나가 있을 때 분리한다.
- implementation frontmatter는 실제 코드 경계를 확인했을 때만 적는다.

## Change procedure

1. 변경할 개념의 canonical owner를 찾는다.
2. 승인 상태와 구현 상태를 구분한다.
3. owner 문서만 계약을 수정하고 관련 router·cross-link를 갱신한다.
4. 구조적 대체라면 ADR을 추가하거나 갱신한다.
5. 상대 링크, directory router, 상태 혼합, 구현 경로를 검증한다.
6. 코드 변경이 동반되면 관련 테스트와 [existing scaffold contract](../development/architecture/existing-scaffold-contract.md)를 함께 검토한다.

## Conflict handling

문서와 코드가 다르면 어느 쪽도 조용히 정본으로 승격하지 않는다. 승인된 최신 설계는 gameplay/UX/art owner에, 현재 구현 사실은 development에 기록하고 차이를 명시한다. 새 결정을 문서 작성자가 임의로 만들지 않는다.
