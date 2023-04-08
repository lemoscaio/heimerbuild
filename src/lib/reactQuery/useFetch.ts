import {
	QueryFunctionContext,
	UseQueryOptions,
	useQuery,
} from "@tanstack/react-query"
import { api } from "../../services/api"
import { QueryKeyT } from "./types"

export async function fetcher<T>({
	queryKey,
	pageParam,
}: QueryFunctionContext<QueryKeyT>): Promise<T> {
	const [url, queryParams] = queryKey

	return api
		.get<T>(url, { params: { ...queryParams, pageParam } })
		.then((res) => res.data)
}

export function useFetch<T>(
	url: string | null,
	queryParams?: object,
	queryConfig?: UseQueryOptions<T, Error, T, QueryKeyT>
) {
	const queryKey = [url!, queryParams] satisfies QueryKeyT

	const context = useQuery<T, Error, T, QueryKeyT>({
		queryKey,
		queryFn: fetcher,
		enabled: !!url,
		...queryConfig,
	})

	return context
}
