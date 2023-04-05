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
	mutationParams?: object
	mutationConfig?: Omit<
		UseMutationOptions<
			AxiosResponse<ApiResultT>,
			AxiosError,
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
}: UseGenericMutationParams<NewDataT, OldDataT, ApiResultT>) {
	const mutationKey = [url, mutationParams] satisfies QueryKeyT

	return useMutation<AxiosResponse<ApiResultT>, AxiosError, NewDataT, OldDataT>(
		{
			mutationKey,
			mutationFn,
			onMutate(newData: NewDataT) {
				queryClient.cancelQueries(mutationKey)

				/* Investigar: não acho que isso vai funcionar, porque a mutationKey não necessariamente é a mesma que a queryKey, 
				então não vai ter data para uma key que ainda não existe. Para funcionar corretamente, talvez teria que saber a queryKey correspondente */
				const previousData = queryClient.getQueryData<OldDataT>(mutationKey)

				queryClient.setQueryData<OldDataT>(mutationKey, (oldData) => {
					return updater ? updater(oldData!, newData) : oldData
				})

				return previousData
			},
			onError(_err, _, context) {
				queryClient.setQueryData(mutationKey, context)
			},
			onSettled() {
				queryClient.invalidateQueries(mutationKey)
			},

			...mutationConfig,
		}
	)
}
