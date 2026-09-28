import { Navigate, Route, Routes } from "react-router-dom"
import { ChampionChoosePage } from "@/routes/champion-choose-page"
import { ChampionDetailsPage } from "@/routes/champion-details-page"
import { PageWithHeader } from "./layouts/page-with-header"

export function Router() {
	return (
		<Routes>
			<Route path="/champions" element={<ChampionChoosePage />} />
			<Route element={<PageWithHeader />}>
				<Route
					path="/champions/:championKey"
					element={<ChampionDetailsPage />}
				/>
			</Route>
			<Route path="*" element={<Navigate to="/champions" replace />} />
		</Routes>
	)
}
