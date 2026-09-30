#!/usr/bin/env bash
# Finds the Cloudflare preview that serves the PR head commit and writes its URL to $GITHUB_OUTPUT
# as `url`. A preview counts only once its /version.json (vite.config.ts) names $SHA. Writes an
# empty `url` (local build fallback) when Workers Builds fails or no preview matches in time.
# Env: GH_TOKEN, REPO, SHA, PR, BRANCH; optional PREVIEW_TIMEOUT (seconds, default 600) and
# PREVIEW_GRACE (seconds to keep polling after Workers Builds succeeded, default 180).
set -uo pipefail

WORKER=heimerbuild
SUBDOMAIN=caio-lemos94.workers.dev

deadline=$((SECONDS + ${PREVIEW_TIMEOUT:-600}))
short=${SHA:0:7}
url=""

# Worker Previews slug, checked against real branches: non-alphanumerics become single dashes,
# lowercased, cut so `<slug>-<worker>` fits the 63-char DNS label. Used when no check run names it.
branch_slug() {
	local slug
	slug=$(sed -E 's/[^a-zA-Z0-9]+/-/g; s/^-+//' <<<"$BRANCH" | tr '[:upper:]' '[:lower:]')
	slug=${slug:0:$((63 - ${#WORKER} - 1))}
	echo "${slug%%-}"
}

workers_build() {
	gh api "repos/$REPO/commits/$SHA/check-runs?per_page=100" \
		--jq '[.check_runs[] | select(.name | startswith("Workers Builds"))] | first // empty'
}

# The check run links to the dashboard at .../previews/<slug>/builds/<id>: Cloudflare's own slug.
check_run_slug() {
	jq -r '.details_url // ""' <<<"$1" | sed -nE 's#.*/previews/([a-z0-9-]+)/builds/.*#\1#p'
}

# The Cloudflare PR comment has one table row per deployed commit (URL cell, then commit cell).
comment_preview_url() {
	gh api "repos/$REPO/issues/$PR/comments?per_page=100" \
		--jq '[.[] | select(.user.login | startswith("cloudflare"))] | last | .body // ""' | tr -d '\n' |
		grep -oE "https://[a-z0-9-]+\.[a-z0-9-]+\.workers\.dev</a></td>[[:space:]]*<td>$short</td>" |
		grep -oE 'https://[a-z0-9-]+\.[a-z0-9-]+\.workers\.dev' | head -n 1
}

serves_head() {
	[[ $(curl -fsS --max-time 10 "$1/version.json" 2>/dev/null | jq -r '.commit // empty' 2>/dev/null) == "$SHA" ]]
}

grace_until=""
while ((SECONDS < deadline)); do
	run=$(workers_build 2>/dev/null || true)
	slug=$(check_run_slug "$run")
	comment_url=$(comment_preview_url 2>/dev/null || true)
	alias_url="https://${slug:-$(branch_slug)}-$WORKER.$SUBDOMAIN"
	if [[ -n "$comment_url" ]] && serves_head "$comment_url"; then
		url=$comment_url && echo "Found in the Cloudflare PR comment" && break
	fi
	if serves_head "$alias_url"; then
		url=$alias_url && echo "Found at the branch alias (Cloudflare comment: ${comment_url:-none for $short})" && break
	fi

	if [[ -n "$run" && $(jq -r .status <<<"$run") == "completed" ]]; then
		conclusion=$(jq -r .conclusion <<<"$run")
		[[ "$conclusion" != "success" ]] && echo "Workers Builds finished: $conclusion" && break
		# The alias can lag the check run for a moment; a preview that never matches is not waited out.
		grace_until=${grace_until:-$((SECONDS + ${PREVIEW_GRACE:-180}))}
		((SECONDS >= grace_until)) && echo "Workers Builds succeeded but no preview serves $short" && break
	fi
	sleep 10
done

if [[ -n "$url" ]]; then
	echo "Running against the Cloudflare preview of $short: $url"
else
	echo "No Cloudflare preview for $short; running against a local build"
fi
echo "url=$url" >>"$GITHUB_OUTPUT"
