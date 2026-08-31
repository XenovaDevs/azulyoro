#!/usr/bin/env bash
set -Eeuo pipefail

readonly deploy_service=azulyoro-autodeploy.service

if [[ "${SSH_ORIGINAL_COMMAND:-}" != "deploy" ]]; then
    echo "Only the deploy command is allowed." >&2
    exit 64
fi

exec /usr/bin/sudo -n /usr/bin/systemctl start --wait "$deploy_service"
