#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PROJECT_NAME="$(basename "$ROOT_DIR")"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
RELEASE_DIR="$ROOT_DIR/release"
OUT_FILE="$RELEASE_DIR/${PROJECT_NAME}_release_${TIMESTAMP}.tar.gz"

mkdir -p "$RELEASE_DIR"

cd "$ROOT_DIR"

tar -czf "$OUT_FILE" \
  --exclude-vcs \
  --exclude='./release' \
  --exclude='./scripts' \
  --exclude='./frontend/node_modules' \
  --exclude='./backend/node_modules' \
  --exclude='./frontend/dist' \
  --exclude='./backend/dist' \
  --exclude='./**/build' \
  --exclude='./**/coverage' \
  --exclude='./**/target' \
  --exclude='./**/.venv' \
  --exclude='./**/venv' \
  --exclude='./**/__pycache__' \
  --exclude='./**/.pytest_cache' \
  --exclude='./**/tests' \
  --exclude='./**/test' \
  --exclude='./**/__tests__' \
  --exclude='./**/*.py' \
  --exclude='./**/*.pyc' \
  --exclude='./**/*.pyo' \
  --exclude='./**/*.spec.*' \
  --exclude='./**/*test*' \
  --exclude='./**/*.log' \
  --exclude='./**/*.tmp' \
  --exclude='./**/*.swp' \
  --exclude='./**/*.tsbuildinfo' \
  --exclude='./Prompt.md' \
  --exclude='./user_rule.md' \
  --exclude='./mb1.docx' \
  --exclude='./软著材料说明书*.docx' \
  .

echo "打包完成: $OUT_FILE"
ls -lh "$OUT_FILE"
