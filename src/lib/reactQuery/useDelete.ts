import { api } from "../../services/api"
import { ResourceIdT } from "./types"
import {
	UseGenericMutationParams,
	useGenericMutation,
} from "./useGenericMutation"

export interface UseDeleteParams<OldDataT>
	extends Pick<
		UseGenericMutationParams<ResourceIdT, OldDataT>,
		"url" | "mutationParams" | "mutationConfig" | "relatedQueryKey" | "updater"
	> {}

export function useDelete<OldDataT>(params: UseDeleteParams<OldDataT>) {
	return useGenericMutation<ResourceIdT, OldDataT>({
		mutationFn: (id) => api.delete(`${params.url}/${id}`),
		...params,
	})
}
