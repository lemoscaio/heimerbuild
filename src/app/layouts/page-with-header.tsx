import { Outlet } from "react-router-dom"
import { Header } from "@/components/common/header"

export function PageWithHeader() {
	return (
		<div className="height-container">
			<Header />
			<Outlet />
		</div>
	)
}
