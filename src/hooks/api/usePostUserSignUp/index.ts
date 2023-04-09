import { usePost } from "../../../lib/reactQuery/usePost"

type SignUpData = {
	email: string
	password: string
}

// TODO retirar envio do password do back-end
type SignUpResponse = { id: number; email: string; password: string }

export function usePostUserSignUp() {
	return usePost<SignUpData, any, SignUpResponse>({ url: "/sign-up" })
}
