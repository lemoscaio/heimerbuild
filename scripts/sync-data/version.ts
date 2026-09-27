import { fetchWithRetry } from "./http";

export const VERSIONS_URL = "https://ddragon.leagueoflegends.com/api/versions.json";

const VERSION_PATTERN = /^\d+\.\d+\.\d+$/;

export function assertValidVersion(version: string): void {
	if (!VERSION_PATTERN.test(version)) {
		throw new Error(`Invalid Data Dragon version "${version}", expected "<major>.<minor>.<patch>"`);
	}
}

export async function resolveLatestVersion(fetchFn: typeof fetch = fetch): Promise<string> {
	const response = await fetchWithRetry(VERSIONS_URL, { fetchFn });
	const versions: unknown = await response.json();

	if (!Array.isArray(versions) || versions.length === 0) {
		throw new Error(`Unexpected versions.json payload: expected a non-empty array`);
	}

	const [latest] = versions;
	if (typeof latest !== "string") {
		throw new Error(`Unexpected versions.json payload: first entry is not a string`);
	}
	assertValidVersion(latest);
	return latest;
}

/** Data Dragon "16.19.1" -> CommunityDragon folder "16.19". */
export function toCommunityDragonPatch(version: string): string {
	assertValidVersion(version);
	const [major, minor] = version.split(".");
	return `${major}.${minor}`;
}

export function compareVersions(a: string, b: string): number {
	const left = a.split(".").map(Number);
	const right = b.split(".").map(Number);
	for (let i = 0; i < Math.max(left.length, right.length); i++) {
		const diff = (left[i] ?? 0) - (right[i] ?? 0);
		if (diff !== 0) return diff;
	}
	return 0;
}
