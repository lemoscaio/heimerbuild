import { useRouter } from "@tanstack/react-router"
import { LoadError } from "./load-error"

export function RouteError() {
	const router = useRouter()

	return (
		<LoadError
			className="min-h-screen px-5 pt-[calc(var(--spacing-header)+--spacing(10))] pb-10"
			onRetry={() => router.invalidate()}
		>
			Could not load the game data. Check your connection.
		</LoadError>
	)
}
