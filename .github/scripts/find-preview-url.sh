#!/usr/bin/env bash
# Waits for Cloudflare Workers Builds on the PR head commit and writes its preview URL to
# $GITHUB_OUTPUT as `url`. Writes an empty `url` (local build fallback) when the build fails,
# never shows up in time, or no preview URL can be found.
# Env: GH_TOKEN, REPO, SHA, PR; optional PREVIEW_TIMEOUT (seconds, default 600).
set -uo pipefail

deadline=$((SECONDS + ${PREVIEW_TIMEOUT:-600}))
url=""

workers_build() {
	gh api "repos/$REPO/commits/$SHA/check-runs?per_page=100" \
		--jq '[.check_runs[] | select(.name | startswith("Workers Builds"))] | first // empty'
}

first_preview_url() {
	grep -oE 'https://[a-z0-9-]+\.[a-z0-9-]+\.workers\.dev' | head -n 1
}

while ((SECONDS < deadline)); do
	run=$(workers_build 2>/dev/null || true)
	if [[ -n "$run" && $(jq -r .status <<<"$run") == "completed" ]]; then
		conclusion=$(jq -r .conclusion <<<"$run")
		echo "Workers Builds finished: $conclusion"
		if [[ "$conclusion" == "success" ]]; then
			url=$(jq -r '[.output.summary, .output.text] | map(. // "") | join("\n")' <<<"$run" | first_preview_url)
			if [[ -z "$url" ]]; then
				# The Cloudflare comment lists the preview of the latest commit it deployed.
				url=$(gh api "repos/$REPO/issues/$PR/comments?per_page=100" \
					--jq "[.[] | select(.body | contains(\"${SHA:0:7}\"))] | last | .body // \"\"" |
					first_preview_url)
			fi
		fi
		break
	fi
	sleep 15
done

if [[ -n "$url" ]] && ! curl -fsS -o /dev/null --retry 3 --retry-all-errors "$url/data/manifest.json"; then
	echo "Preview $url does not answer"
	url=""
fi

if [[ -n "$url" ]]; then
	echo "Running against the Cloudflare preview: $url"
else
	echo "No Cloudflare preview; running against a local build"
fi
echo "url=$url" >>"$GITHUB_OUTPUT"
