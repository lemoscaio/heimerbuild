import { Navigate, Route, Routes } from "react-router-dom"

import { AuthPages } from "../layouts/AuthPages"
import { PageWithHeader } from "../layouts/PageWithHeader"
import { ProtectedPages } from "../layouts/ProtectedPages"

import { ChampionsProvider } from "../contexts/Champions"
import { ItemsProvider } from "../contexts/Items"

import { ChampionChoose } from "../pages/ChampionChoose/"
import { ChampionDetails } from "../pages/ChampionDetails"
import { SavedBuilds } from "../pages/SavedBuilds"
import { SignIn } from "../pages/SignIn"
import { SignUp } from "../pages/SignUp/"

export function Router() {
	return (
		<ChampionsProvider>
			<ItemsProvider>
				<Routes>
					<Route element={<AuthPages />}>
						<Route path="/sign-in" element={<SignIn />} />
						<Route path="/sign-up" element={<SignUp />} />
					</Route>
					<Route element={<ProtectedPages />}>
						<Route element={<PageWithHeader />}>
							<Route path="/user" element={<SavedBuilds />} />
						</Route>
					</Route>
					<Route path="/champions" element={<ChampionChoose />} />
					<Route element={<PageWithHeader />}>
						<Route
							path="/champions/:championKey"
							element={<ChampionDetails />}
						/>
					</Route>
					<Route path="*" element={<Navigate to="/champions" replace />} />
				</Routes>
			</ItemsProvider>
		</ChampionsProvider>
	)
}
