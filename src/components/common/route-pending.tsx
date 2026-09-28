import DotLoader from "react-spinners/esm/DotLoader"

export function RoutePending() {
	return (
		<div className="page-container route-status load-error-container">
			<DotLoader color="white" />
		</div>
	)
}
