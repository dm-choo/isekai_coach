#!/usr/bin/env bash
set -Eeuo pipefail

if ((EUID != 0)); then
  echo 'Run as root: sudo ./deploy/install-slice2.sh' >&2
  exit 1
fi

readonly project_dir='/home/ktwome/workspace/isekai_coach'
readonly dist_dir="${1:-${project_dir}/dist}"
readonly release_root='/srv/ooh'
readonly caddy_fragment='/etc/caddy/ooh.caddy'
readonly caddyfile='/etc/caddy/Caddyfile'
readonly caddy_env='/etc/nest/caddy.env'
readonly source_fragment="${project_dir}/deploy/openai-8010.caddy"

[[ -f "${dist_dir}/index.html" ]] || { echo "Missing validated slice build: ${dist_dir}/index.html" >&2; exit 1; }
[[ -L "${release_root}/current" ]] || { echo "Missing shared release link: ${release_root}/current" >&2; exit 1; }
[[ -f "${source_fragment}" ]] || { echo "Missing Caddy source: ${source_fragment}" >&2; exit 1; }

previous_release="$(readlink -f "${release_root}/current")"
case "${previous_release}" in
  "${release_root}"/releases/*) ;;
  *) echo "Refusing unexpected current release: ${previous_release}" >&2; exit 1 ;;
esac

stamp="$(date -u +%Y%m%dT%H%M%SZ)"
commit_id="$(git -c safe.directory="${project_dir}" -C "${project_dir}" rev-parse --short HEAD 2>/dev/null || printf 'worktree')"
release_dir="${release_root}/releases/${stamp}-${commit_id}-slice2"
caddy_backup="${caddy_fragment}.bak.${stamp}-$$"
fragment_installed=0
link_switched=0

rollback() {
  local exit_code="${1:-1}"
  trap - ERR INT TERM
  set +e
  echo 'Deployment failed; restoring the previous shared release and Caddy fragment.' >&2
  if ((link_switched == 1)); then
    ln -sfn "${previous_release}" "${release_root}/.current-next"
    mv -Tf "${release_root}/.current-next" "${release_root}/current"
  fi
  if ((fragment_installed == 1)); then cp -a -- "${caddy_backup}" "${caddy_fragment}"; fi
  caddy validate --config "${caddyfile}" --adapter caddyfile >/dev/null && systemctl restart caddy.service
  exit "${exit_code}"
}

trap 'rollback "$?"' ERR
trap 'rollback 130' INT TERM

if [[ -r "${caddy_env}" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "${caddy_env}"
  set +a
fi

caddy validate --config "${source_fragment}" --adapter caddyfile >/dev/null
cp -a -- "${caddy_fragment}" "${caddy_backup}"
install -d -o root -g caddy -m 0755 "${release_root}" "${release_root}/releases" "${release_dir}"
shopt -s dotglob nullglob
for existing_path in "${previous_release}"/*; do
  existing_name="$(basename -- "${existing_path}")"
  case "${existing_name}" in slice2|.slice2-previous*) continue ;; esac
  cp -a -- "${existing_path}" "${release_dir}/"
done
shopt -u dotglob nullglob
install -d -o root -g caddy -m 0755 "${release_dir}/slice2"
cp -a "${dist_dir}/." "${release_dir}/slice2/"
find "${release_dir}" -type d -exec chmod 0755 {} +
find "${release_dir}" -type f -exec chmod 0644 {} +
chown -R root:caddy "${release_dir}"

install -o root -g caddy -m 0644 -- "${source_fragment}" "${caddy_fragment}"
fragment_installed=1
caddy validate --config "${caddyfile}" --adapter caddyfile >/dev/null
ln -sfn "${release_dir}" "${release_root}/.current-next"
mv -Tf "${release_root}/.current-next" "${release_root}/current"
link_switched=1
systemctl restart caddy.service

root_html="$(curl --fail --silent --show-error --max-time 10 http://127.0.0.1:8010/)"
slice1_html="$(curl --fail --silent --show-error --max-time 10 http://127.0.0.1:8010/slice1/)"
slice2_html="$(curl --fail --silent --show-error --max-time 10 http://127.0.0.1:8010/slice2/)"
[[ "${root_html}" == *'<title>OOH 기록전술 아카데미</title>'* ]]
[[ "${slice1_html}" == *'<title>Slice1</title>'* ]]
[[ "${slice2_html}" == *'<title>Slice2</title>'* ]]

trap - ERR INT TERM
echo "Published ${release_dir}"
echo "Caddy backup kept at ${caddy_backup}"
