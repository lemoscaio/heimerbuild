import { useRouter } from "@tanstack/react-router"

export function RouteError() {
	const router = useRouter()

	return (
		<div className="page-container route-status load-error-container">
			<p>Something went wrong!</p>
			<button
				type="button"
				className="load-button"
				onClick={() => router.invalidate()}
			>
				Click here to try again
			</button>
		</div>
	)
}
