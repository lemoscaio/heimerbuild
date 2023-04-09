import { UseMutationOptions, useMutation } from "@tanstack/react-query"
import { AxiosError, AxiosResponse } from "axios"
import { queryClient } from "../../services/api"
import { QueryKeyT } from "./types"

export interface UseGenericMutationParams<
	NewDataT = void,
	OldDataT = unknown,
	ApiResultT = NewDataT
> {
	url: string
	mutationFn: (data: NewDataT) => Promise<AxiosResponse<ApiResultT>>
	relatedQueryKey?: QueryKeyT
	mutationParams?: object
	mutationConfig?: Omit<
		UseMutationOptions<
			AxiosResponse<ApiResultT>,
			AxiosError<string>,
			NewDataT,
			OldDataT
		>,
		"mutationKey" | "mutationFn"
	>
	updater?: (oldData: OldDataT, newData: NewDataT) => OldDataT
}

export function useGenericMutation<NewDataT, OldDataT, ApiResultT = NewDataT>({
	url,
	mutationFn,
	mutationParams,
	mutationConfig,
	updater,
	relatedQueryKey = ["", {}],
}: UseGenericMutationParams<NewDataT, OldDataT, ApiResultT>) {
	if (relatedQueryKey[0] === "" && updater) {
		throw new Error(
			"An updater function was provided without a relaterQueryKey. If you are using an updater, you must provide a relatedQueryKey"
		)
	}
	const mutationKey = [url, mutationParams] satisfies QueryKeyT

	return useMutation<
		AxiosResponse<ApiResultT>,
		AxiosError<string>,
		NewDataT,
		OldDataT
	>({
		mutationKey,
		mutationFn,
		onMutate(newData: NewDataT) {
			queryClient.cancelQueries(mutationKey)
			queryClient.cancelQueries(relatedQueryKey)

			const previousData = queryClient.getQueryData<OldDataT>(relatedQueryKey)

			queryClient.setQueryData<OldDataT>(relatedQueryKey, (oldData) => {
				return updater && oldData ? updater(oldData, newData) : oldData
			})

			return previousData
		},
		onError(_err, _, context) {
			queryClient.setQueryData(relatedQueryKey, context)
		},
		onSettled() {
			queryClient.invalidateQueries(mutationKey)
			queryClient.invalidateQueries(relatedQueryKey)
		},

		...mutationConfig,
	})
}
