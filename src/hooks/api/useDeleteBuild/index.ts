import { UseDeleteParams, useDelete } from "../../../lib/reactQuery/useDelete"
import { queryClient } from "../../../services/api"
import { Build } from "../../../types/builds"

type UseDeleteBuildParams = Pick<
	UseDeleteParams<Build[]>,
	"updater" | "relatedQueryKey"
>
export function useDeleteBuild(params: UseDeleteBuildParams) {
	return useDelete<Build[]>({
		url: "/builds/delete",
		relatedQueryKey: ["/builds", undefined],
		...params,
	})
}
