import { useRouter } from "@tanstack/react-router"

export function RouteError() {
	const router = useRouter()

	return (
		<div
			className="page-container route-status load-error-container"
			role="alert"
		>
			<p>Could not load the game data. Check your connection.</p>
			<button
				type="button"
				className="load-button"
				onClick={() => router.invalidate()}
			>
				Try again
			</button>
		</div>
	)
}
