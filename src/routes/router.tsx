import { Navigate, Route, Routes } from "react-router-dom"

import { PageWithHeader } from "../layouts/page-with-header"

import { ChampionChoose } from "../pages/champion-choose"
import { ChampionDetails } from "../pages/champion-details"

export function Router() {
	return (
		<Routes>
			<Route path="/champions" element={<ChampionChoose />} />
			<Route element={<PageWithHeader />}>
				<Route path="/champions/:championKey" element={<ChampionDetails />} />
			</Route>
			<Route path="*" element={<Navigate to="/champions" replace />} />
		</Routes>
	)
}
