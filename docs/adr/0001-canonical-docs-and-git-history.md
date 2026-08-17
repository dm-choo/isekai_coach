---
title: ADR-0001 Canonical Docs and Git History
status: accepted
last_updated: 2026-08-17
related:
  - ../_meta/documentation-governance.md
  - ../index.md
---

# ADR-0001: Canonical docs and Git history

## Context

한 개의 상태 문서에 구현 사실, 최신 설계, 임시 수치와 미정 항목이 함께 있으면 현재 계약의 owner가 불분명해지고 오래된 “미정”이 새 승인을 덮을 수 있다. 반대로 폐기 문서를 archive로 계속 복사하면 검색 결과에 여러 진실이 남는다.

## Decision

개념마다 최신 계약을 소유하는 canonical 문서 하나를 둔다. gameplay, narrative, UX, art, development와 submission은 책임별 계층으로 나누고 populated non-leaf directory는 `index.md`로 라우팅한다. 정본에는 `accepted`, `under-validation`, `provisional`, `deferred`만 사용한다. 과거 전문은 별도 archive가 아니라 Git history에 남긴다.

## Alternatives considered

- 하나의 거대한 design 문서 유지
- 날짜나 버전이 붙은 `legacy`·`old`·`archive` 복사본 유지
- 구현 코드와 주석만을 설계 정본으로 사용

## Consequences

현재 owner와 상태를 빠르게 찾을 수 있고 중복 계약이 줄어든다. 문서 변경자는 owner와 cross-link를 함께 관리해야 하며 구조적 대체 이유만 ADR로 남겨야 한다. 과거 내용을 보려면 Git history가 필요하다.

## Canonical docs

- [Documentation governance](../_meta/documentation-governance.md)
- [Documentation index](../index.md)
