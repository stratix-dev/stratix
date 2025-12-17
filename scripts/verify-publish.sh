#!/bin/bash

# Script to verify that published packages don't contain workspace:* protocol
# This should be run BEFORE publishing to npm

set -e

echo "🔍 Verifying packages before publish..."
echo ""

PACKAGES=(
  "packages/core"
  "packages/runtime"
  "packages/cli"
  "packages/testing"
  "packages/ai/providers/anthropic"
  "packages/ai/providers/openai"
  "packages/providers/di"
  "packages/providers/validation"
  "packages/providers/configuration"
)

errors=0

for pkg in "${PACKAGES[@]}"; do
  if [ ! -d "$pkg" ]; then
    echo "⚠️  Skipping $pkg - directory not found"
    continue
  fi

  PKG_NAME=$(node -p "require('./$pkg/package.json').name")
  
  # Pack the package to see what will be published
  echo "📦 Packing $PKG_NAME..."
  cd "$pkg"
  
  # Create tarball
  pnpm pack --pack-destination /tmp 2>&1 > /dev/null
  
  # Get the tarball name
  TARBALL=$(ls /tmp/*.tgz | grep "$(basename $pkg)" | head -1)
  
  if [ -z "$TARBALL" ]; then
    echo "❌ Failed to create tarball for $PKG_NAME"
    ((errors++))
    cd - > /dev/null
    continue
  fi
  
  # Extract and check for workspace:* in package.json
  tar -xzf "$TARBALL" -C /tmp
  
  if grep -q "workspace:\*" /tmp/package/package.json 2>/dev/null; then
    echo "❌ ERROR: $PKG_NAME still contains 'workspace:*' in dependencies!"
    grep "workspace:\*" /tmp/package/package.json
    ((errors++))
  elif grep -q "workspace:" /tmp/package/package.json 2>/dev/null; then
    # Check if it's workspace:^ (which is correct)
    if grep -q "workspace:\^" /tmp/package/package.json; then
      echo "⚠️  WARNING: $PKG_NAME contains 'workspace:^' - this should be converted during publish"
    else
      echo "❌ ERROR: $PKG_NAME contains unexpected workspace protocol!"
      grep "workspace:" /tmp/package/package.json
      ((errors++))
    fi
  else
    echo "✅ $PKG_NAME looks good"
  fi
  
  # Cleanup
  rm -f "$TARBALL"
  rm -rf /tmp/package
  
  cd - > /dev/null
done

echo ""
if [ $errors -eq 0 ]; then
  echo "✅ All packages verified successfully!"
  echo "Safe to publish to npm"
  exit 0
else
  echo "❌ Found $errors error(s)"
  echo "DO NOT publish until these are fixed!"
  exit 1
fi
