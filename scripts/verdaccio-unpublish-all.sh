#!/bin/bash

# Script to unpublish all @stratix packages from local Verdaccio registry

REGISTRY="http://localhost:4873/"

echo "Fetching all @stratix packages from Verdaccio..."
PACKAGES=$(npm search @stratix --registry "$REGISTRY" --json 2>/dev/null | node -e "const data = JSON.parse(require('fs').readFileSync(0, 'utf-8')); console.log(data.map(p => p.name).join('\n'))")

if [ -z "$PACKAGES" ]; then
  echo "No @stratix packages found in Verdaccio"
  exit 0
fi

echo "Found packages to unpublish:"
echo "$PACKAGES"
echo ""

success=0
failed=0

while IFS= read -r package; do
  if [ -z "$package" ]; then
    continue
  fi

  echo "Unpublishing: $package"

  if npm unpublish "$package" --force --registry "$REGISTRY" &> /dev/null; then
    sleep 1

    if npm view "$package" version --registry "$REGISTRY" &> /dev/null; then
      echo "  Failed - package still exists"
      ((failed++))
    else
      echo "  Success - verified removed"
      ((success++))
    fi
  else
    echo "  Failed - unpublish command error"
    ((failed++))
  fi
done <<< "$PACKAGES"

echo ""
echo "Summary:"
echo "  Successfully unpublished: $success"
echo "  Failed: $failed"

if [ $failed -eq 0 ]; then
  echo ""
  echo "All packages successfully removed from Verdaccio"
  exit 0
else
  echo ""
  echo "Some packages failed to unpublish"
  exit 1
fi
