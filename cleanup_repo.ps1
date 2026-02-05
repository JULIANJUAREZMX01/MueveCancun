# Sync Main
Write-Host '🔄 Syncing main branch...'
git checkout main
git pull origin main

# List of branches
$branches = @(
    'phoenix-merge-complete-14142717970917237028',
    'feat/phase3-hybrid-routing-776847708840416987',
    'feat/search-to-map-transition-10440308439838379707',
    'feature/wasm-embedding-14584932071331846109',
    'ui-refactor-responsive-7925218553642336682',
    'rescue-refactor-ui-6894828769142279507'
)

Write-Host '🛡️  Starting Tag & Destroy process...'

foreach ($branch in $branches) {
    # Replace slashes with dashes for tag name
    $tagName = "archive/" + ($branch -replace "/", "-")
    Write-Host "---------------------------------------------------"
    Write-Host "🎯 Processing: $branch"

    # Check remote existence
    $remoteCheck = git ls-remote --heads origin $branch
    if ($remoteCheck) {
        Write-Host "📦 Archiving: Creating tag $tagName..."
        # Try to tag, suppress error if tag exists? Original script didn't check.
        # We'll just run it.
        git tag "$tagName" "origin/$branch"
        git push origin "$tagName"

        Write-Host "🔥 Destroying Remote: $branch..."
        git push origin --delete "$branch"

        # Check local existence
        # git branch --list returns the branch name if it exists
        $localCheck = git branch --list "$branch"
        if ($localCheck) {
            Write-Host "🔥 Destroying Local: $branch..."
            git branch -D "$branch"
        } else {
            Write-Host "ℹ️  Local branch not found (skipping local delete)."
        }
    } else {
        Write-Host "⚠️  Branch origin/$branch not found on remote. Skipping."
    }
}

Write-Host "---------------------------------------------------"
Write-Host "✅ Cleanup Complete. The Golden Master (main) is clean."
