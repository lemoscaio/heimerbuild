import { usePost } from "../../../lib/reactQuery/usePost"

export function usePostSaveBuild() {
	return usePost({ url: "/builds/create" })
}
