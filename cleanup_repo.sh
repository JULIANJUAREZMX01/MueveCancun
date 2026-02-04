#!/bin/bash

# REPO SANITIZATION SCRIPT
# Performs 'Tag & Destroy' on stale branches.

set -e

# 1. Sync Main
echo '🔄 Syncing main branch...'
git checkout main
git pull origin main

# List of branches to archive and destroy
BRANCHES=(
    'phoenix-merge-complete-14142717970917237028'
    'feat/phase3-hybrid-routing-776847708840416987'
    'feat/search-to-map-transition-10440308439838379707'
    'feature/wasm-embedding-14584932071331846109'
    'ui-refactor-responsive-7925218553642336682'
    'rescue-refactor-ui-6894828769142279507'
)

# 2. Archive and Destroy Loop
echo '🛡️  Starting Tag & Destroy process...'

for BRANCH in "${BRANCHES[@]}"; do
    TAG_NAME="archive/${BRANCH//\//-}"
    echo "---------------------------------------------------"
    echo "🎯 Processing: $BRANCH"

    if git ls-remote --exit-code --heads origin "$BRANCH" >/dev/null 2>&1; then
        echo "📦 Archiving: Creating tag $TAG_NAME..."
        git tag "$TAG_NAME" "origin/$BRANCH"
        git push origin "$TAG_NAME"

        echo "🔥 Destroying Remote: $BRANCH..."
        git push origin --delete "$BRANCH"

        if git show-ref --verify --quiet "refs/heads/$BRANCH"; then
            echo "🔥 Destroying Local: $BRANCH..."
            git branch -D "$BRANCH"
        else
            echo "ℹ️  Local branch not found (skipping local delete)."
        fi
    else
        echo "⚠️  Branch origin/$BRANCH not found on remote. Skipping."
    fi
done

echo "---------------------------------------------------"
echo "✅ Cleanup Complete. The Golden Master (main) is clean."
