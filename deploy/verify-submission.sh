#!/usr/bin/env bash
set -euo pipefail

readonly local_base='http://127.0.0.1:8010'
readonly public_base='https://openai.ktwome.cc'
readonly expected_font_sha='9599f12fd42fc0bce1cd50b47a0c022e108d7aa64dd0d1bb0ed44f3282d900b4'

verify_root() {
  local label="$1" base="$2" html headers font_sha asset_path
  html="$(curl --fail --silent --show-error --max-time 20 "${base}/")"
  [[ "${html}" == *'<title>결계의 바깥</title>'* ]] || { echo "${label}: submission title mismatch" >&2; return 1; }
  headers="$(curl --fail --silent --show-error --max-time 20 --head "${base}/")"
  grep --ignore-case --quiet '^cache-control:.*no-cache.*no-transform' <<<"${headers}" || { echo "${label}: HTML cache contract missing" >&2; return 1; }
  grep --ignore-case --quiet '^content-security-policy:.*img-src[^;]*blob:' <<<"${headers}" || { echo "${label}: CSP blob image contract missing" >&2; return 1; }
  for asset_path in $(grep -oE '/assets/[^" ]+\.(css|js)' <<<"${html}"); do
    curl --fail --silent --show-error --max-time 30 "${base}${asset_path}" >/dev/null
  done
  font_sha="$(curl --fail --silent --show-error --max-time 30 "${base}/fonts/PretendardVariable-v1.3.9.woff2" | sha256sum | awk '{print $1}')"
  [[ "${font_sha}" == "${expected_font_sha}" ]] || { echo "${label}: Pretendard SHA-256 mismatch" >&2; return 1; }
}

verify_root 'local' "${local_base}"
verify_root 'public' "${public_base}"
for path in slice1 slice2; do
  html="$(curl --fail --silent --show-error --max-time 20 "${public_base}/${path}/")"
  [[ "${html}" == *"<title>${path^}</title>"* ]] || { echo "Public ${path} regressed" >&2; exit 1; }
done
echo 'Submission root and Slice 1/2 regression paths are healthy.'
