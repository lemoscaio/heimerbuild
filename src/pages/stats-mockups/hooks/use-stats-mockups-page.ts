import { getRouteApi } from "@tanstack/react-router"
import { MOCKUP_BUILDS, type MockupBuildId } from "../lib/mockup-builds"
import { mockupRows } from "../lib/mockup-rows"
import type { MockupOption, MockupSearch } from "../lib/mockup-search"
import { useMockupStats } from "./use-mockup-stats"

const routeApi = getRouteApi("/page-with-header/prototypes/stats-panel")

/** The prototype page: the build, form and preview from the URL, its real stats as panel rows, and the option shown on phones. */
export function useStatsMockupsPage() {
	const search = routeApi.useSearch()
	const navigate = routeApi.useNavigate()
	const build = MOCKUP_BUILDS[search.build ?? "jinx"]
	const preview = search.preview ?? false
	const { status, champion, stats, previewItemName } = useMockupStats({
		build,
		form: search.form,
		preview,
	})

	function update(change: Partial<MockupSearch>) {
		navigate({
			search: (previous) => ({ ...previous, ...change }),
			replace: true,
			resetScroll: false,
		})
	}

	return {
		status,
		buildId: build.id,
		champion,
		form: search.form ?? champion?.forms?.[0]?.id,
		preview,
		previewItemName,
		option: search.option ?? "expand",
		stats,
		groups: stats && champion && mockupRows(stats, champion.resource),
		/** Switching the build drops the form, which belongs to one champion. */
		setBuild: (id: MockupBuildId) => update({ build: id, form: undefined }),
		setForm: (form: string) => update({ form }),
		setPreview: (on: boolean) => update({ preview: on || undefined }),
		setOption: (option: MockupOption) => update({ option }),
	}
}
