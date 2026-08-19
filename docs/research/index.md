---
title: Research and Design Critique
status: under-validation
last_updated: 2026-08-19
related:
  - ../index.md
  - ../_meta/documentation-governance.md
  - current-game-assessment.md
  - reference-insights.md
  - territory-expansion-reference-analysis.md
  - validation-agenda.md
  - validation-agenda-slice-2.md
  - sprint-retrospective-continuous-corridor.md
  - sprint-retrospective-adaptive-intents.md
  - submission-retrospective-p1-p2.md
  - submission-retrospective-p3.md
---

# Research and design critique

이 디렉터리는 현재 게임 아이디어를 비판적으로 검토하고 다음 결정을 돕는 연구 기록이다. gameplay·narrative·UX·art·development·submission 정본을 대체하지 않는다.

## Reading order

1. [Current game assessment](./current-game-assessment.md): 현재 아이디어 브리핑, 목표 사용자·Aesthetic 가설, 강점과 위험
2. [Reference insights](./reference-insights.md): Darkest Dungeon, DNF, One Step From Eden 등에서 가져온 인사이트와 적용 한계
3. [Territory expansion reference analysis](./territory-expansion-reference-analysis.md): 영토·원정·정책 자동행동 레퍼런스의 채택·변형·기각 근거
4. [Validation agenda](./validation-agenda.md): Slice 1 보스방에서 장면·턴·이동·공격·Intent 마찰을 반증할 테스트 순서와 임시 기준
5. [Slice 2 validation agenda](./validation-agenda-slice-2.md): 네 월드 타일의 공간 판독, 정찰, 선택 충돌과 정책 전이 검증
6. [Continuous corridor sprint KPT](./sprint-retrospective-continuous-corridor.md): 100m node UI 실패 원인, 연속 통로 전환과 다음 스프린트 규칙
7. [Adaptive Intent sprint KPT](./sprint-retrospective-adaptive-intents.md): 방향·행동 순서·Intent ownership·배경 이동 교정과 다음 AI/UI 실험 규칙
8. [Submission P1–P2 process retrospective](./submission-retrospective-p1-p2.md): 산출물 품질, 판단 오류, 개발 효율과 다음 Task 운영 규칙
9. [Submission P3 same-rule delegation retrospective](./submission-retrospective-p3.md): 정책 trade-off, 동일 규칙 simulation, 판단 수정과 P4 handoff
10. [Reference screenshots](../images/reference_screenshot/README.md): 출처와 분석 목적이 기록된 비교 이미지 보관소

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
- Slice 1과 Slice 2는 전투·통로·정책 기반 기술 foundation의 증거이며 현재 제품 핵심 루프의 증거는 아니다.
- 다음 최우선 검증은 `직접 첫 탐사 → 공간 규칙 학습 → 정책 한 곳 수정 → 알려진 통로 위임 → 실제 결과 관찰 → 인접 타일 편입 → 결계선과 지역 효용 변화`다.
