#!/bin/bash

# Script to permanently delete old deprecated packages from npm
# These packages have been consolidated or renamed in version 0.3.0
#
# IMPORTANT NOTES:
# - npm unpublish has a 72-hour window restriction for packages
# - After 72 hours, you can only unpublish specific versions
# - This is a destructive operation and cannot be undone
# - Requires npm owner/maintainer permissions
#
# USAGE:
#   ./delete-old-packages.sh           - Dry run (shows what would be deleted)
#   ./delete-old-packages.sh --execute - Actually deletes packages

set -e

# Check if we're in dry-run mode
DRY_RUN=true
if [ "$1" = "--execute" ]; then
  DRY_RUN=false
fi

if [ "$DRY_RUN" = true ]; then
  echo "╔════════════════════════════════════════════════════════════════════╗"
  echo "║                NPM PACKAGE DELETION SCRIPT (DRY RUN)               ║"
  echo "║                                                                    ║"
  echo "║  DRY RUN MODE: No packages will be deleted                        ║"
  echo "║  This will show what WOULD be deleted                             ║"
  echo "║                                                                    ║"
  echo "║  To actually delete packages, run:                                ║"
  echo "║  ./delete-old-packages.sh --execute                               ║"
  echo "╚════════════════════════════════════════════════════════════════════╝"
else
  echo "╔════════════════════════════════════════════════════════════════════╗"
  echo "║                    NPM PACKAGE DELETION SCRIPT                     ║"
  echo "║                                                                    ║"
  echo "║  WARNING: This will PERMANENTLY DELETE packages from npm          ║"
  echo "║  This action CANNOT BE UNDONE                                     ║"
  echo "╚════════════════════════════════════════════════════════════════════╝"
fi
echo ""

# Check if user is logged in to npm
if ! npm whoami &>/dev/null; then
  echo "Error: You must be logged in to npm"
  echo "Run: npm login"
  exit 1
fi

NPM_USER=$(npm whoami)
echo "Logged in as: $NPM_USER"
echo ""

# Old packages that were consolidated into @stratix/core
OLD_CORE_PACKAGES=(
  "@stratix/primitives"
  "@stratix/abstractions"
)

# Old packages that were renamed
OLD_RENAMED_PACKAGES=(
  "@stratix/impl-ai-agents"
  "@stratix/ext-ai-agents-openai"
  "@stratix/ext-ai-agents-anthropic"
  "@stratix/impl-di-awilix"
  "@stratix/ext-postgres"
  "@stratix/ext-mongodb"
  "@stratix/ext-redis"
  "@stratix/ext-rabbitmq"
  "@stratix/ext-opentelemetry"
  "@stratix/ext-http-fastify"
  "@stratix/ext-validation-zod"
  "@stratix/ext-mappers"
  "@stratix/ext-errors"
  "@stratix/ext-auth"
  "@stratix/ext-secrets"
  "@stratix/ext-migrations"
)

if [ "$DRY_RUN" = true ]; then
  echo "The following packages would be checked and potentially deleted:"
else
  echo "The following packages will be PERMANENTLY DELETED from npm:"
fi

echo ""
echo "Consolidated packages (merged into @stratix/core):"
for pkg in "${OLD_CORE_PACKAGES[@]}"; do
  echo "  - $pkg"
done

echo ""
echo "Renamed packages (new names available):"
for pkg in "${OLD_RENAMED_PACKAGES[@]}"; do
  echo "  - $pkg"
done

echo ""
if [ "$DRY_RUN" = false ]; then
  echo "IMPORTANT RESTRICTIONS:"
  echo "  - Packages published within 72 hours can be fully unpublished"
  echo "  - Older packages can only have specific versions unpublished"
  echo "  - Package names cannot be reused after deletion for 24 hours"
  echo ""

  read -p "Type 'DELETE PACKAGES' to confirm permanent deletion: " confirm

  if [ "$confirm" != "DELETE PACKAGES" ]; then
    echo "Aborting..."
    exit 0
  fi

  echo ""
  read -p "Are you ABSOLUTELY sure? This CANNOT be undone (yes/no): " confirm2

  if [ "$confirm2" != "yes" ]; then
    echo "Aborting..."
    exit 0
  fi
else
  echo "Running in DRY RUN mode - no actual deletions will occur"
  echo ""
fi

# Function to delete a package
delete_package() {
  local package=$1

  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "Processing: $package"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  # Check if package exists
  if ! npm view "$package" version &>/dev/null; then
    if [ "$DRY_RUN" = true ]; then
      echo "  Package does not exist or is already deleted (would skip)"
    else
      echo "✓ Package does not exist or is already deleted"
    fi
    return 0
  fi

  # Get package info
  echo "Fetching package information..."
  local versions=$(npm view "$package" versions --json 2>/dev/null || echo "[]")
  local version_count=$(echo "$versions" | jq '. | length' 2>/dev/null || echo "0")
  local latest_version=$(npm view "$package" version 2>/dev/null || echo "unknown")

  echo "  Current version: $latest_version"
  echo "  Total versions: $version_count"

  if [ "$DRY_RUN" = true ]; then
    echo ""
    echo "DRY RUN: Would attempt to unpublish entire package"
    echo "  Command: npm unpublish \"$package\" --force"
    echo ""
    echo "If that fails (package > 72 hours old), would unpublish individual versions:"

    if [ "$version_count" -gt 0 ] && [ "$versions" != "[]" ]; then
      echo "$versions" | jq -r '.[]' 2>/dev/null | while read -r version; do
        echo "  Would unpublish: $package@$version"
      done
    fi

    echo ""
    echo "  (No actual changes made - dry run mode)"
    return 0
  fi

  # EXECUTE MODE: Actually delete packages
  # Try to unpublish entire package first (works if published < 72 hours ago)
  echo ""
  echo "Attempting to unpublish entire package..."
  if npm unpublish "$package" --force 2>/dev/null; then
    echo "✓ Successfully deleted entire package: $package"
    return 0
  fi

  # If full unpublish failed, try unpublishing individual versions
  echo "Full unpublish failed (package likely older than 72 hours)"
  echo "Attempting to unpublish individual versions..."

  if [ "$version_count" -gt 0 ] && [ "$versions" != "[]" ]; then
    local deleted_count=0
    local failed_count=0

    # Parse versions and unpublish each
    echo "$versions" | jq -r '.[]' 2>/dev/null | while read -r version; do
      echo -n "  Unpublishing $package@$version... "
      if npm unpublish "$package@$version" --force 2>/dev/null; then
        echo "✓"
        deleted_count=$((deleted_count + 1))
      else
        echo "✗ (may require special permissions)"
        failed_count=$((failed_count + 1))
      fi
    done

    echo ""
    echo "Version unpublish complete"

    # Check if package still exists
    if npm view "$package" version &>/dev/null; then
      echo "⚠ Package still exists on npm (some versions may remain)"
      echo "  You may need to:"
      echo "  1. Wait for npm's cache to update"
      echo "  2. Contact npm support for complete removal"
      echo "  3. Ensure you have owner permissions"
    else
      echo "✓ Package successfully removed from npm"
    fi
  else
    echo "⚠ Could not retrieve version information"
    echo "  Manual intervention may be required"
  fi
}

# Delete consolidated packages
echo ""
echo "╔════════════════════════════════════════════════════════════════════╗"
echo "║          Deleting Consolidated Packages (merged into core)        ║"
echo "╚════════════════════════════════════════════════════════════════════╝"
for pkg in "${OLD_CORE_PACKAGES[@]}"; do
  delete_package "$pkg"
done

# Delete renamed packages
echo ""
echo "╔════════════════════════════════════════════════════════════════════╗"
echo "║              Deleting Renamed Packages (new names exist)          ║"
echo "╚════════════════════════════════════════════════════════════════════╝"
for pkg in "${OLD_RENAMED_PACKAGES[@]}"; do
  delete_package "$pkg"
done

echo ""
if [ "$DRY_RUN" = true ]; then
  echo "╔════════════════════════════════════════════════════════════════════╗"
  echo "║                      DRY RUN COMPLETE                              ║"
  echo "╚════════════════════════════════════════════════════════════════════╝"
  echo ""
  echo "Summary:"
  echo "  - Checked ${#OLD_CORE_PACKAGES[@]} consolidated packages"
  echo "  - Checked ${#OLD_RENAMED_PACKAGES[@]} renamed packages"
  echo ""
  echo "No packages were deleted (dry run mode)"
  echo ""
  echo "To actually delete packages, run:"
  echo "  ./delete-old-packages.sh --execute"
else
  echo "╔════════════════════════════════════════════════════════════════════╗"
  echo "║                      DELETION COMPLETE                             ║"
  echo "╚════════════════════════════════════════════════════════════════════╝"
  echo ""
  echo "Summary:"
  echo "  - Attempted to delete ${#OLD_CORE_PACKAGES[@]} consolidated packages"
  echo "  - Attempted to delete ${#OLD_RENAMED_PACKAGES[@]} renamed packages"
  echo ""
  echo "Next steps:"
  echo "  1. Verify deletions on npmjs.com"
  echo "  2. Wait 24 hours before reusing package names (npm policy)"
  echo "  3. Update documentation to remove references to old packages"
  echo "  4. Communicate changes to users via release notes"
  echo ""
  echo "Note: Some packages may require npm support intervention if:"
  echo "  - Package was published more than 72 hours ago"
  echo "  - You don't have sufficient permissions"
  echo "  - Package has significant downloads/dependents"
fi
echo ""
