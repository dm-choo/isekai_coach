---
title: Slice 2 Deployment Contract
status: accepted
last_updated: 2026-08-18
implementation:
  - ../../../vite.config.ts
  - ../../../deploy/openai-8010.caddy
  - ../../../deploy/install-slice2.sh
  - ../../../deploy/verify-slice2.sh
  - ../../../scripts/verify-slice2.mjs
related:
  - index.md
  - ../../submission/vertical-slice-2-four-world-tiles.md
  - ../architecture/existing-scaffold-contract.md
---

# Slice 2 deployment contract

## Public endpoint

- URL: [https://openai.ktwome.cc/slice2/](https://openai.ktwome.cc/slice2/)
- Vite base: `/slice2/`
- release root: `/srv/ooh/current/slice2`
- loopback origin: `http://127.0.0.1:8010`

기존 `/` OOH application과 `/slice1/` 보스방을 그대로 유지하고 `/slice2/*`만 새 build가 소유한다.

## Build and release

최초 한 번만 제한된 root 배포 명령을 설치한다.

```bash
npm run deploy:setup
```

이후 일반 Slice 2 release는 비밀번호 없이 build, 원자 배포, endpoint와 공개 브라우저 smoke를 연속 실행한다.

```bash
npm run deploy:slice2
```

root 배포기 또는 Caddy fragment 자체가 변경된 경우에만 `npm run deploy:setup`을 다시 실행한다. sudoers는 root 소유 `/usr/local/sbin/isekai-coach-deploy`의 정확한 `slice1`·`slice2` 인수만 허용하며 저장소의 수정 가능한 shell script나 임의 경로에는 권한을 주지 않는다.

수동 복구 절차는 다음과 같다.

```bash
npm test
npm run typecheck
npm run build:slice2
npm run verify:slice2
sudo ./deploy/install-slice2.sh
./deploy/verify-slice2.sh
npm run verify:slice2:public
```

배포 script는 현재 shared release를 복사하되 `slice2/`만 교체하고, Caddy fragment와 release symlink를 원자적으로 전환한다. 실패 시 이전 release와 fragment를 복구한다.

## Verification boundary

- `/`, `/slice1/`, `/slice2/` title과 path ownership
- HTML이 참조하는 JS/CSS와 Pretendard font
- 세 고블린 RGBA asset
- HTML 재검증을 강제하는 `Cache-Control: no-cache, no-transform`과 CSP
- 1280×720 전체 4타일 완주
- 960×720에서 수평 overflow 0
- 중앙 방 정찰, 4타일 전환, policy 변경, 세 적 조합과 결과 화면
- console, page와 failed request error 0건

배포 성공은 탐색 판독, 선택 충돌이나 재미 가설의 통과를 뜻하지 않는다.
