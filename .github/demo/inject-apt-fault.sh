#!/usr/bin/env bash
# THROWAWAY (reverted before merge): shadows bunx so the FIRST call runs the real
# Playwright install with apt throttled to 10 KB/s. The 4m timeout then kills it mid-download,
# like the slow mirror in PR 179's run. Later calls run unthrottled.
set -euo pipefail
dir="$RUNNER_TEMP/fault"
mkdir -p "$dir"
sudo apt-get update -qq
cat > "$dir/bunx" <<SHIM
#!/usr/bin/env bash
if [ ! -e "$dir/first-call-done" ]; then
	touch "$dir/first-call-done"
	echo 'Acquire::http::Dl-Limit "10";' | sudo tee /etc/apt/apt.conf.d/99-demo-throttle >/dev/null
	echo "::notice::fault injection: attempt 1 runs with apt throttled to 10 KB/s"
else
	sudo rm -f /etc/apt/apt.conf.d/99-demo-throttle
fi
exec "$(command -v bunx)" "\$@"
SHIM
chmod +x "$dir/bunx"
echo "$dir" >> "$GITHUB_PATH"
cat "$dir/bunx"
