import { api } from "../../services/api"
import { ResourceIdT } from "./types"
import {
	UseGenericMutationParams,
	useGenericMutation,
} from "./useGenericMutation"

interface UseDeleteParams<OldDataT>
	extends Pick<
		UseGenericMutationParams<ResourceIdT, OldDataT>,
		"url" | "mutationParams" | "mutationConfig"
	> {
	updater?: (oldData: OldDataT, id: ResourceIdT) => OldDataT
}

export function useDelete<OldDataT>({
	url,
	mutationParams,
	mutationConfig,
	updater,
}: UseDeleteParams<OldDataT>) {
	return useGenericMutation<ResourceIdT, OldDataT>({
		mutationFn: (id) => api.delete(`${url}/${id}`),
		url,
		mutationParams,
		mutationConfig,
		updater,
	})
}
