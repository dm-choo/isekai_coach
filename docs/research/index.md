---
title: Research and Design Critique
status: under-validation
last_updated: 2026-08-17
related:
  - ../index.md
  - ../_meta/documentation-governance.md
  - current-game-assessment.md
  - reference-insights.md
  - validation-agenda.md
---

# Research and design critique

이 디렉터리는 현재 게임 아이디어를 비판적으로 검토하고 다음 결정을 돕는 연구 기록이다. gameplay·narrative·UX·art·development·submission 정본을 대체하지 않는다.

## Reading order

1. [Current game assessment](./current-game-assessment.md): 현재 아이디어 브리핑, 목표 사용자·Aesthetic 가설, 강점과 위험
2. [Reference insights](./reference-insights.md): Darkest Dungeon, DNF, One Step From Eden 등에서 가져온 인사이트와 적용 한계
3. [Validation agenda](./validation-agenda.md): Slice 1 보스방에서 장면·턴·이동·공격·Intent 마찰을 반증할 테스트 순서와 임시 기준
4. [Reference screenshots](../images/reference_screenshot/README.md): 출처와 분석 목적이 기록된 비교 이미지 보관소

## Evidence labels

- **Canonical fact**: 현재 정본 문서에 이미 승인된 사실
- **External evidence**: 논문, 개발자 인터뷰, 개발사 가이드 등 외부 자료가 직접 말하는 내용
- **Inference**: canonical fact와 external evidence를 이 프로젝트에 대입한 해석
- **Recommendation**: 아직 승인되지 않은 설계 또는 실험 제안

## Authority boundary

- 이 디렉터리의 기본 상태는 `under-validation`이다.
- 좋은 레퍼런스는 방향을 제안할 뿐 이 게임의 성공을 증명하지 않는다.
- 연구 권고가 채택되면 해당 canonical owner를 수정하고, 구조적 결정이면 ADR을 남긴다.
- 채택되지 않은 권고를 구현 요구사항처럼 사용하지 않는다.
- 플레이테스트 결과는 날짜, build SHA, 참가자 조건과 함께 기록한다.

## Current research status

- 목표 사용자는 아직 실제 사용자 조사로 검증하지 않은 **가설**이다.
- 목표 Aesthetic은 현재 mechanics와 art direction을 한 경험 언어로 묶은 **제안**이다.
- 현재 가장 먼저 검증할 것은 `보스방 장면 인식 → 턴 주체 판독 → WASD 이동/공격 분리 → Intent 읽기 → 밀치기·중단 → 동료 자동행동 → 봉인 해제`의 실제 플레이 흐름이다.
- Slice 1에서는 policy 편집과 정책 수정 전이를 검증하지 않는다. 고정 5-slot 궁수 동료가 전투 장면에서 신뢰 가능한 자율성으로 읽히는지만 확인한다.
