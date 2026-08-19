---
title: Submission Golden Run
status: accepted
last_updated: 2026-08-19
related:
  - scope.md
  - first-15-minutes.md
  - acceptance-criteria.md
  - milestones.md
  - vertical-slice-2-four-world-tiles.md
---

# Submission golden run

제출본의 골든 런은 `/slice2/` 하나에서 시작해 결계 해제와 데모 완료까지 이어지는 축소된 20~30분 경로다. 철광산, 대장간, 장비 제작, 별동대와 분석 모드는 이 경로에 포함하지 않는다.

## Player path

| 구간 | 플레이어가 하는 일 | 획득해야 하는 멘탈모델 | 자동 증거 |
|---|---|---|---|
| 시작 | SPACE로 원정 시작, 동쪽 문 진입 | 지금 가능한 입력 하나 | progressive disclosure |
| 타일 1 통로 | D 이동, 전사 조우, WASD 프리뷰와 SPACE 확정 | 이동→공격, 입력→예정→결과 | first combat cue, input feedback |
| 타일 1 중앙 | 복합 조우 해결, 정찰, 필요 시 휴식 | 중앙 방→통로 공개, HP↔자원+20분 | minimap reveal, persistent state |
| 타일 2 | 궁수·전사 조합 대응 | 사격선과 돌진 경로의 충돌 | intent ownership, BODY sequence |
| 정책 수정 | 캐릭터 창에서 사격 우선순위 상승 | 첫 실행 가능 정책과 안전↔피해 trade-off | before/after action counts |
| 타일 3 | 전사·투척병 조합 대응 | BODY는 적과 함께, GROUND는 땅에 고정 | ground anchor evidence |
| 타일 4 | 세 적의 새 조합을 추가 설명 없이 해결 | 배운 규칙의 전이 | multi-intent transfer |
| 결계문 | 누적 HP와 정책으로 결계 수호자 격파 | RUN 선택이 최종 전투까지 지속 | boss-entry vitals equality |
| 종료 | 관리자가 봉인을 해제하고 데모 완료 | 전투 승리와 관리자 권한의 구분 | seal released, demo complete |

## Authoritative run contracts

- 선형 월드 타일 4개, 각 타일은 중앙 방·경계 방 4개·방향별 400m 통로를 가진다.
- 기본 경로는 서쪽 방 → 중앙 방 → 동쪽 방이며 북·남 통로는 같은 타일 안의 선택적 우회다.
- 출발 10:00, 100m 이동 2분, 전투 한 턴 1분, 사건 5분, 휴식 20분이다.
- 관리자 최대 HP 14, 원거리 동료 최대 HP 12가 조우 사이와 결계 수호자전에 유지된다.
- 이동 AP 1, 사격 AP 2/피해 1, 밀치기 AP 2/피해 1, 내려찍기 AP 2/피해 2다.
- 기본 정책은 `회피 → 포지셔닝 → 사격 → 밀치기 → 빈 슬롯`이며 비전투 중 순서를 바꿀 수 있다.
- 결계 수호자는 기존 `제압 → 외침 → 하수인 소환` 계약과 HP 15를 재사용한다.
- 보스 격파 뒤 별도 `봉인 해제`를 실행해야만 데모 완료 상태가 된다.

## Automated golden path evidence

`npm run verify:slice2`는 다음 경로를 결정론적으로 실행한다.

```text
원정 시작
→ 첫 통로 전투와 잘못된 입력 피드백
→ 중앙 방 정찰과 휴식
→ 정책 결과 확인 및 사격 우선 변경
→ 4타일 / 고블린 6전투
→ 누적 HP 그대로 결계 수호자 진입
→ 보스 격파
→ 봉인 해제
→ 데모 완료
```

2026-08-19 `5515391` 직전 로컬 증거는 7전투, 재시도 0회, 이동 32구간, 전투 52턴, 사건 10분, 휴식 1회, 12:26 도착, 최종 관리자 HP 1·동료 HP 8이다. 이 숫자는 회귀 기준이지 최종 밸런스 판정이 아니다.

## Lightweight human gates

### 디렉터 확인 — 각 Goal 배포 뒤 3~5분

- 새로 바뀐 한 장면만 본다.
- `무엇을 눌러야 하는가`, `눌린 것이 보이는가`, `왜 그 결과가 났는가`만 답한다.
- 방향이 틀렸을 때만 Goal을 다시 연다.

### 새로운 사람 1명 — 3~5개 Goal 누적 뒤

설명 없이 시작하게 하고 15분 또는 중단 시점까지 관찰한다. 질문에 대신 답하지 않는다.

- 처음 막힌 시각과 화면
- 스스로 발견한 조작
- 중앙 방과 정찰의 인과
- 정책 변경에서 기대한 결과
- 실제로 포기했다고 느낀 것

### 큰 milestone — 새로운 사람 2~3명

- 2명 이상이 외부 설명 없이 첫 전투를 시작하고 계획을 확정한다.
- 2명 이상이 중앙 방을 정찰 원인으로 지목한다.
- 최소 두 종류의 정책 또는 경로 선택이 나온다.
- 2명 이상이 BODY/GROUND와 정책 변경 결과를 자기 말로 설명한다.
- 보스·봉인 해제까지 도달 가능한 사람이 최소 1명 있다.

이 기준을 통과하기 전에는 20~30분, 재미, 직관성 또는 선택 충돌을 validated로 올리지 않는다.

## M7 handoff

M7은 새 콘텐츠 milestone이 아니다. 정확한 SHA에서 테스트·build·공개 배포·복구 경로·브라우저 증거·사람 gate 결과를 묶고, P0/P1 결함을 닫은 Release Candidate를 고정한다.
