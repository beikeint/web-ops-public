#!/usr/bin/env bash
# verification-runner 调用入口 — demo-b.com v2.7 升级 7 天 GSC 复盘
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec python3 "$SCRIPT_DIR/verify-demo-b-v27-gsc.py"
