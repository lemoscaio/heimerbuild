import { api } from "../../services/api"
import {
	UseGenericMutationParams,
	useGenericMutation,
} from "./useGenericMutation"

interface UsePostParams<NewDataT, OldDataT, ApiResultT>
	extends Pick<
		UseGenericMutationParams<NewDataT, OldDataT, ApiResultT>,
		"url" | "mutationParams" | "mutationConfig" | "updater"
	> {}

export function usePost<NewDataT, OldDataT, ApiResultT = NewDataT>({
	url,
	mutationParams,
	mutationConfig,
	updater,
}: UsePostParams<NewDataT, OldDataT, ApiResultT>) {
	return useGenericMutation({
		url,
		mutationFn: (data) => api.post<ApiResultT>(url, data),
		mutationParams,
		mutationConfig,
		updater,
	})
}
