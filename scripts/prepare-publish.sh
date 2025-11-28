#!/bin/bash

# Script to replace workspace:^ with actual version numbers before publishing
# This is needed because PNPM's automatic conversion is not working

set -e

VERSION="0.6.3"

echo "🔄 Replacing workspace:^ with ^$VERSION..."
echo ""

# Find all package.json files and replace workspace:^ with the actual version
find packages -name "package.json" -type f | while read -r file; do
  if grep -q "workspace:\^" "$file"; then
    echo "📝 Updating $file"
    
    # Replace @stratix/core
    sed -i '' 's/"@stratix\/core": "workspace:\^"/"@stratix\/core": "^'"$VERSION"'"/g' "$file"
    
    # Replace @stratix/runtime
    sed -i '' 's/"@stratix\/runtime": "workspace:\^"/"@stratix\/runtime": "^'"$VERSION"'"/g' "$file"
    
    # Replace @stratix/di-awilix
    sed -i '' 's/"@stratix\/di-awilix": "workspace:\^"/"@stratix\/di-awilix": "^'"$VERSION"'"/g' "$file"
  fi
done

echo ""
echo "✅ All workspace:^ references replaced with ^$VERSION"
echo ""
echo "⚠️  IMPORTANT: These changes are for publishing only!"
echo "After publishing, you should revert these changes and keep workspace:^ for development"
