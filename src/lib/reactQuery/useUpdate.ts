import { api } from "../../services/api"

import {
	UseGenericMutationParams,
	useGenericMutation,
} from "./useGenericMutation"

interface UseUpdateParams<NewDataT, OldDataT, ApiResultT = NewDataT>
	extends Pick<
		UseGenericMutationParams<NewDataT, OldDataT, ApiResultT>,
		"url" | "mutationParams" | "mutationConfig" | "updater"
	> {}

export function useUpdate<NewDataT, OldDataT, ApiResultT = NewDataT>({
	url,
	mutationParams,
	mutationConfig,
	updater,
}: UseUpdateParams<NewDataT, OldDataT, ApiResultT>) {
	return useGenericMutation<NewDataT, OldDataT, ApiResultT>({
		mutationFn: (data) => api.patch<ApiResultT>(url, data),
		url,
		mutationParams,
		mutationConfig,
		updater,
	})
}
