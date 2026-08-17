---
title: Documentation Governance
status: accepted
last_updated: 2026-08-17
related:
  - ../index.md
  - ../research/index.md
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

`research`는 canonical owner가 아니다. 외부 근거, 비평, 사용자 가설과 검증 제안을 보존하는 decision-support 계층이다. 연구 결론을 채택할 때는 관련 gameplay·narrative·UX·art·development·submission owner 또는 ADR에서 별도로 승인한다.

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

## Conversational approval and documentation sync

사용자가 구체적인 직전 제안에 대해 `진행해`, `그래`, `해봐`, `좋아`, `그렇게 하자`와 같이 짧게 답하면, 별도 제한이나 반문 맥락이 없는 한 해당 제안에 동의한 것으로 취급한다. 승인은 직전 제안의 명시된 범위에만 적용하며, 함께 언급되지 않은 확장 기능이나 외부 작업까지 포괄하지 않는다.

승인이 확인되면 다음을 수행한다.

1. 승인된 결정과 아직 검증할 효과를 분리한다. `이 방향으로 구현한다`는 `accepted`일 수 있지만 `사용자가 목표 감정을 느낀다`는 플레이테스트 전까지 `under-validation`이다.
2. 구체적인 구현 작업은 문서 갱신으로 흐름을 끊지 않고 먼저 완결·검증한다. 하나의 coherent task가 끝난 뒤 실제 구현 사실을 기준으로 canonical owner, research hypothesis, development status와 관련 router를 동기화한다.
3. 설계·기획만 수행하는 작업은 승인 즉시 owner를 갱신한다. 코드 작업은 늦어도 같은 milestone의 commit·handoff 전에 문서를 갱신한다.
4. 구현 상태는 development 문서에 별도로 반영하고, 설계 승인만으로 구현 완료를 주장하거나 구현 도중의 미검증 상태를 완료 사실처럼 기록하지 않는다.
5. 작업 중 새 결정이 생기면 완료 시점에 승인 범위, 검증 결과와 남은 가설을 함께 반영한다.
6. 직전 제안이 여러 상충안이거나 승인 범위를 특정할 수 없고 결과가 크게 달라질 때만 다시 확인한다.

사소한 구현 세부를 매 대화마다 문서로 만들지는 않는다. 후속 설계·검증·구현이 의존할 결정, 상태 변경, 범위 변경과 중요한 가설을 기록한다.

## Conflict handling

문서와 코드가 다르면 어느 쪽도 조용히 정본으로 승격하지 않는다. 승인된 최신 설계는 gameplay/UX/art owner에, 현재 구현 사실은 development에 기록하고 차이를 명시한다. 새 결정을 문서 작성자가 임의로 만들지 않는다.

외부 사례와 전문가 견해도 정본보다 우선하지 않는다. 연구 문서는 `외부 근거`, `현재 문서에서 확인한 사실`, `추론`, `권고`를 구분하고, 플레이테스트 없이 목표 사용자나 미학적 효과를 확정 사실로 쓰지 않는다.
