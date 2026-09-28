import { Navigate, Route, Routes } from "react-router-dom"

import { PageWithHeader } from "../layouts/PageWithHeader"

import { ChampionChoose } from "../pages/ChampionChoose/"
import { ChampionDetails } from "../pages/ChampionDetails"

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
