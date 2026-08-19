---
title: Submission Root Deployment
status: accepted
last_updated: 2026-08-19
related:
  - index.md
  - ../../../deploy/openai-8010.caddy
  - ../../../deploy/install-passwordless-deploy.sh
  - ../../../deploy/verify-submission.sh
  - ../../submission/release-candidate.md
---

# Submission root deployment

- public URL: `https://openai.ktwome.cc/`
- release root: `/srv/ooh/current`
- build command: `npm run build:submission`
- release command: `npm run deploy:submission`

`npm run deploy:setup`을 한 번 sudo로 실행하면 root-owned `/usr/local/sbin/isekai-coach-deploy`의 정확한 `submission` 인수만 passwordless로 허용한다. 저장소의 수정 가능한 shell, 임의 인수와 일반 root shell은 허용하지 않는다.

submission 배포는 기존 OOH root 파일을 새 build로 교체하되 이전 release의 `/slice1/`, `/slice2/` 디렉터리를 새 release에 복사한다. 배포 전 Caddy fragment와 `/srv/ooh/current` target을 기록하며 실패하면 둘 다 이전 상태로 되돌린다.

완료는 local/public root title·assets·font, `/slice1/`, `/slice2/` 보존과 public browser golden path를 각각 검증해야 한다. service active나 release directory 생성만으로 완료를 주장하지 않는다.
