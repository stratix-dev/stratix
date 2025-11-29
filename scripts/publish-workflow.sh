#!/bin/bash

# Complete publish workflow script - Fixed version
# This script handles the entire publish process with proper version management

set -e

CURRENT_VERSION="0.6.4"
NEW_VERSION="0.6.5"

echo "🚀 Stratix Publish Workflow"
echo "=========================="
echo ""
echo "Current version: $CURRENT_VERSION"
echo "New version: $NEW_VERSION"
echo ""

# Step 1: Update version in all packages (but NOT in dependencies)
echo "📝 Step 1: Updating package versions to $NEW_VERSION..."
find packages -name "package.json" -type f | while read -r file; do
  # Only update the "version" field, not dependency versions
  sed -i '' '0,/"version": "'"$CURRENT_VERSION"'"/s//"version": "'"$NEW_VERSION"'"/' "$file"
done
# Update root package.json
sed -i '' 's/"version": "'"$CURRENT_VERSION"'"/"version": "'"$NEW_VERSION"'"/g' package.json
echo "✅ Package versions updated"
echo ""

# Step 2: Dependencies should already be ^0.6.3 from previous script
# Just verify they're not using workspace protocol
echo "📝 Step 2: Verifying dependencies..."
if grep -r "workspace:" packages/*/package.json 2>/dev/null; then
  echo "❌ ERROR: Found workspace protocol! Run prepare-publish.sh first"
  exit 1
fi
echo "✅ All dependencies use explicit versions"
echo ""

# Step 3: Install dependencies (using current published versions)
echo "📝 Step 3: Installing dependencies..."
pnpm install
echo "✅ Dependencies installed"
echo ""

# Step 4: Build all packages
echo "📝 Step 4: Building all packages..."
pnpm build
echo "✅ Build complete"
echo ""

echo "✅ All pre-publish steps complete!"
echo ""
echo "📦 Ready to publish version $NEW_VERSION"
echo ""
echo "Next steps:"
echo "1. Review the changes with: git diff"
echo "2. Publish with: pnpm -r publish --no-git-checks"
echo "3. After publishing successfully, commit the changes"
echo "4. Then update dependencies to ^$NEW_VERSION and commit again"
echo ""
