import { LoadError } from "@/components/common/load-error"

/** Fallback for errors no route caught; reloading is the only reset that is sure to work. */
export function AppError() {
	return (
		<LoadError
			className="min-h-screen px-5 py-10"
			onRetry={() => window.location.reload()}
		>
			Something went wrong.
		</LoadError>
	)
}
