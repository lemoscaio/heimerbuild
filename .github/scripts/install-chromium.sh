#!/usr/bin/env bash
# Installs Playwright's Chromium (or only its apt dependencies when CACHE_HIT=true), with a
# per-attempt timeout and one retry.
# Env: optional CACHE_HIT ("true" when the browsers came from the cache).
set -euo pipefail

if [ "${CACHE_HIT:-}" = "true" ]; then
	install=(bunx playwright install-deps chromium)
else
	install=(bunx playwright install --with-deps chromium)
fi

# Let apt wait for a briefly held dpkg lock instead of failing on the spot.
echo 'DPkg::Lock::Timeout "60";' | sudo tee /etc/apt/apt.conf.d/99-lock-timeout >/dev/null

# `timeout` kills sudo but not the root apt-get under it, which keeps the dpkg lock and
# fails the retry (PR 179's first e2e run). Kill it, wait for the locks, repair dpkg.
release_apt() {
	echo "Releasing apt/dpkg locks before the retry"
	sudo pkill -e -KILL -x apt-get || true
	sudo pkill -e -KILL -x dpkg || true
	for _ in $(seq 30); do
		sudo fuser /var/lib/dpkg/lock-frontend /var/lib/dpkg/lock \
			/var/lib/apt/lists/lock /var/cache/apt/archives/lock >/dev/null 2>&1 || break
		sleep 2
	done
	sudo dpkg --configure -a
}

for attempt in 1 2; do
	timeout --kill-after=15s 4m "${install[@]}" && exit 0
	echo "::warning::Chromium install attempt $attempt failed (exit $?)"
	if [ "$attempt" = 1 ]; then release_apt; fi
done
exit 1
