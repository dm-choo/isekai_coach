---
title: Submission P7 Public Release Retrospective
status: technical-release
last_updated: 2026-08-19
related:
  - ../submission/milestones.md
  - ../submission/acceptance-criteria.md
  - ../submission/human-playtest-card.md
  - submission-retrospective-p6.md
---

# 제출본 P7 루트 배포·공개 검증 산출물·사고·개발 과정 회고

## Goal과 최종 assertion

로컬 RC를 통과한 제출 제품을 root에 원자적으로 배포하고, 공개 HTTPS에서 실제 첫 조작과 checkpoint 복원, 기존 Slice 1·2 보존을 다시 증명한다.

```text
clean implementation SHA 005be86 technical RC
→ documentation HEAD c063e52 production build
→ atomic root release switch
→ local + public HTTP contract
→ public Playwright input + reload
→ Slice 1/2 regression routes preserved
```

## result — 공개 산출물

- 공개 URL: `https://openai.ktwome.cc/`
- release: `/srv/ooh/releases/20260819T083258Z-c063e52-submission`
- 이전 release: `/srv/ooh/releases/20260819T055216Z-5515391-slice2`
- Caddy backup: `/etc/caddy/ooh.caddy.bak.20260819T083258Z-1223554`
- root title: `결계의 바깥`
- 보존 경로: `/slice1/` → `Slice1`, `/slice2/` → `Slice2`
- public pointer travel: 0m→10m
- public reload: 10m→10m, 자동 저장 표시 유지
- public browser console/page/request error: 0

## evidence — 배포 단계를 분리한 증거

| 단계 | 증거 | 판정 |
|---|---|---|
| implementation | 86 unit, submission golden, Slice 1·2 RC at `005be86` | 통과 |
| build | root base, title, split assets at `c063e52` | 통과 |
| authorization | `sudo -n -l /usr/local/sbin/isekai-coach-deploy submission` | 허용 |
| atomic publish | 새 release 생성 후 `/srv/ooh/current` 전환 | 통과 |
| server config | Caddy validate/restart, backup 보존 | 통과 |
| local origin | title, assets, Pretendard SHA, cache/CSP | 통과 |
| public HTTP | root와 두 slice title/assets/font | 통과 |
| public browser | 시작 CTA, pointer 이동, localStorage reload, 4:3 supply bounds | 통과 |
| rollback | 이전 release와 Caddy backup 경로 존재 | 준비됨, 실행하지 않음 |
| V5 사람 검증 | 신규 사용자 2명 | **미실행** |

배포와 기술 공개 검증은 완료다. 직관성·15~25분 pacing·재미와 핵심 경험의 실제 전달은 사람 gate 전까지 validated가 아니다.

## metacognition — 사고와 개발 과정 회고

### 맞았던 판단

1. **배포를 구현 완료와 분리했다.** 로컬 RC 성공을 공개 성공으로 취급하지 않고 build, publish, HTTP, browser를 별도 증거로 만들었다.
2. **root 교체가 regression 경로를 지우지 않게 했다.** release installer가 이전 `/slice1/`, `/slice2/`를 복사한 뒤 root dist를 배치했고 실제 공개 title로 다시 확인했다.
3. **공개 smoke에 state debugger를 노출하지 않았다.** production DOM과 실제 input/localStorage만으로 첫 조작을 검증했다.
4. **시각 의심을 assertion으로 바꿨다.** 첫 공개 캡처에서 식량 pill이 어둡게 보여 두 resource의 DOM count와 viewport bounds를 추가로 검사했다.

### 판단 오류와 수정

- passwordless 권한을 확인하려고 허용 인자 없이 `sudo -n /usr/local/sbin/isekai-coach-deploy`를 호출해 `password is required`를 받았다. 이는 설치 실패가 아니라 sudoers의 exact command allowlist와 다른 명령이었다. `sudo -n -l ... submission`으로 비파괴 preflight를 고쳤다.
- public curl 검증만으로 충분하다고 볼 수 있었지만, 과거의 `배포 성공 로그는 사용자 조작 성공이 아니다`라는 문제를 반복하지 않기 위해 Playwright 공개 smoke를 추가했다.
- 처음 공개 캡처의 어두운 요소를 곧바로 CSS bug로 단정하지 않았다. DOM bounds와 count를 측정해 실제 clipping이 아님을 확인했다.

### 아직 주장하지 않는 것

- 신규 사용자가 키 설명 없이 첫 15분을 이해한다.
- 정책 두 선택의 trade-off가 흥미롭고 명확하다.
- 실제 플레이 시간이 15~25분이다.
- 결계 확장이 행복감이나 쾌감을 준다.
- 느린 네트워크에서 전투 lazy chunk 대기가 충분히 짧다.

## efficiency — 개발 과정 효율 회고

### 경제적이었던 부분

- root 배포 명령 하나가 production build, passwordless publish, local/public HTTP 검증을 연속 수행했다.
- 공개 browser smoke는 full combat를 반복하지 않고 가장 위험한 배포 경계인 boot, first input, persistence와 route 보존만 약 10초에 확인했다.
- release directory와 Caddy backup을 자동으로 남겨 별도 수동 백업 작업을 만들지 않았다.

### 비효율과 다음 개선

- sudo preflight 명령을 exact allowlist와 먼저 대조했으면 불필요한 실패 출력이 없었다.
- P7에서 public verifier를 뒤늦게 작성했다. 다음 release부터는 deploy script의 후속 고정 gate로 재사용한다.
- 기술 검증은 충분히 자동화됐지만 사람 gate 수집은 외부 협력이 필요하다. 이를 코드 작업과 섞지 않고 여섯 줄 playtest card로 최소화했다.

## next rule — 다음 스프린트와 release에 남길 규칙

1. release 완료는 `build → publish → local HTTP → public HTTP → public browser` 다섯 증거가 모두 있어야 한다.
2. sudoers는 설치 여부가 아니라 exact command allowlist로 preflight한다.
3. 공개 runtime에는 검증용 authoritative state hook을 노출하지 않는다.
4. 캡처의 의심 신호는 먼저 DOM/state assertion으로 확인한 뒤 수정한다.
5. 기술 release와 사람 경험 validation을 같은 완료 문장으로 합치지 않는다.
6. 다음 변경은 V5에서 처음 끊긴 인과 하나만 Goal로 연다.

## next task — 외부 입력이 필요한 V5

구현과 공개 기술 release에서 더 진행할 안전한 자동 작업은 없다. 다음 판단에는 실제 신규 사용자 관찰이 필요하다. `docs/submission/human-playtest-card.md`로 2명만 같은 build에서 테스트하고, 결과 여섯 줄씩을 다음 스프린트 입력으로 사용한다.

