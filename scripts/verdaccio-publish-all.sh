#!/bin/bash

# Script to publish all @stratix packages to local Verdaccio registry

set -e

REGISTRY="http://localhost:4873/"

echo "Publishing all @stratix packages to Verdaccio..."
echo ""

cd "$(dirname "$0")/.."

# Ensure packages are built
if [ ! -d "packages/core/dist" ]; then
  echo "Building packages..."
  pnpm build
  echo ""
fi

# Get all package directories
PACKAGES=(
  "packages/core"
  "packages/runtime"
  "packages/cli"
  "packages/testing"
  "packages/plugins/ai/anthropic"
  "packages/plugins/ai/openai"
  "packages/plugins/database/mongodb"
  "packages/plugins/database/postgres"
  "packages/plugins/database/redis"
  "packages/plugins/di/awilix"
  "packages/plugins/http/fastify"
  "packages/plugins/messaging/rabbitmq"
  "packages/plugins/observability/opentelemetry"
  "packages/plugins/utilities/auth"
  "packages/plugins/utilities/errors"
  "packages/plugins/utilities/mappers"
  "packages/plugins/utilities/secrets"
  "packages/plugins/utilities/validation-zod"
)

success=0
failed=0

for pkg in "${PACKAGES[@]}"; do
  if [ ! -d "$pkg" ]; then
    echo "Skipping $pkg - directory not found"
    continue
  fi

  # Get package name from package.json
  PKG_NAME=$(node -p "require('./$pkg/package.json').name")

  echo "Publishing $PKG_NAME..."

  if (cd "$pkg" && pnpm publish --registry "$REGISTRY" --no-git-checks 2>&1) > /dev/null; then
    echo "  Success"
    ((success++))
  else
    echo "  Failed"
    ((failed++))
  fi
done

echo ""
echo "Summary:"
echo "  Successfully published: $success"
echo "  Failed: $failed"
echo ""

if [ $failed -eq 0 ]; then
  echo "All packages successfully published to Verdaccio!"
  echo "Install with: npm install @stratix/<package> --registry $REGISTRY"
else
  echo "Some packages failed to publish"
  exit 1
fi
