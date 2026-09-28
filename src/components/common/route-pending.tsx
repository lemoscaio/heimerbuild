import { DotLoader } from "react-spinners"

export function RoutePending() {
	return (
		<div className="page-container route-status load-error-container">
			<DotLoader color="white" />
		</div>
	)
}
