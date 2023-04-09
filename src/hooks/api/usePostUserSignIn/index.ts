import { usePost } from "../../../lib/reactQuery/usePost"
import { User } from "../../useAuth"

type SignInData = {
	email: string
	password: string
}

export function usePostUserSignIn() {
	return usePost<SignInData, any, User>({ url: "/sign-in" })
}
