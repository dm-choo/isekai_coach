#!/usr/bin/env bash
set -Eeuo pipefail

if ((EUID != 0)); then
  echo 'Run once with sudo: sudo ./deploy/install-passwordless-deploy.sh' >&2
  exit 1
fi

readonly invoking_user="${SUDO_USER:-}"
if [[ -z "${invoking_user}" || "${invoking_user}" == 'root' || ! "${invoking_user}" =~ ^[a-z_][a-z0-9_-]*$ ]]; then
  echo 'Run this installer through sudo from the deployment user account.' >&2
  exit 1
fi

readonly script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
readonly install_root='/usr/local/lib/isekai-coach-deploy'
readonly deploy_command='/usr/local/sbin/isekai-coach-deploy'
readonly sudoers_file="/etc/sudoers.d/isekai-coach-deploy-${invoking_user}"
sudoers_temp="$(mktemp)"
trap 'rm -f -- "${sudoers_temp}"' EXIT

install -d -o root -g root -m 0755 "${install_root}"
install -o root -g root -m 0755 "${script_dir}/root/isekai-coach-deploy" "${deploy_command}"
install -o root -g root -m 0644 "${script_dir}/openai-8010.caddy" "${install_root}/openai-8010.caddy"

printf '%s ALL=(root) NOPASSWD: %s slice1, %s slice2\n' \
  "${invoking_user}" "${deploy_command}" "${deploy_command}" >"${sudoers_temp}"
chmod 0440 "${sudoers_temp}"
visudo -cf "${sudoers_temp}" >/dev/null
install -o root -g root -m 0440 "${sudoers_temp}" "${sudoers_file}"
visudo -cf /etc/sudoers >/dev/null

echo "Installed ${deploy_command}"
echo "Installed ${sudoers_file}"
echo 'Future releases: npm run deploy:slice1 or npm run deploy:slice2'
