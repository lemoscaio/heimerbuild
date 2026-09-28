#!/usr/bin/env bash
# Waits for Cloudflare Workers Builds on the PR head commit and writes its preview URL to
# $GITHUB_OUTPUT as `url`. Writes an empty `url` (local build fallback) when the build fails,
# never shows up in time, or no preview URL can be found.
# Env: GH_TOKEN, REPO, SHA, PR; optional PREVIEW_TIMEOUT (seconds, default 600).
set -uo pipefail

deadline=$((SECONDS + ${PREVIEW_TIMEOUT:-600}))
short=${SHA:0:7}
url=""

workers_build() {
	gh api "repos/$REPO/commits/$SHA/check-runs?per_page=100" \
		--jq '[.check_runs[] | select(.name | startswith("Workers Builds"))] | first // empty'
}

# The Cloudflare PR comment has one table row per deployed commit (URL cell, then commit
# cell) and a header with the branch alias URL, used only when it names this commit.
comment_preview_url() {
	local body
	body=$(gh api "repos/$REPO/issues/$PR/comments?per_page=100" \
		--jq '[.[] | select(.user.login | startswith("cloudflare"))] | last | .body // ""' | tr -d '\n')
	{
		grep -oE "https://[a-z0-9-]+\.[a-z0-9-]+\.workers\.dev</a></td>[[:space:]]*<td>$short</td>" <<<"$body"
		grep -oE "https://[a-z0-9-]+\.[a-z0-9-]+\.workers\.dev \(commit $short\)" <<<"$body"
	} | grep -oE 'https://[a-z0-9-]+\.[a-z0-9-]+\.workers\.dev' | head -n 1
}

while ((SECONDS < deadline)); do
	run=$(workers_build 2>/dev/null || true)
	if [[ -n "$run" && $(jq -r .status <<<"$run") == "completed" ]]; then
		conclusion=$(jq -r .conclusion <<<"$run")
		[[ "$conclusion" != "success" ]] && echo "Workers Builds finished: $conclusion" && break
		# The comment can be updated a moment after the check run completes.
		url=$(comment_preview_url 2>/dev/null || true)
		[[ -n "$url" ]] && break
	fi
	sleep 15
done

if [[ -n "$url" ]] && ! curl -fsS -o /dev/null --retry 3 --retry-all-errors "$url/data/manifest.json"; then
	echo "Preview $url does not answer"
	url=""
fi

if [[ -n "$url" ]]; then
	echo "Running against the Cloudflare preview of $short: $url"
else
	echo "No Cloudflare preview for $short; running against a local build"
fi
echo "url=$url" >>"$GITHUB_OUTPUT"
