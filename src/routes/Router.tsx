import { Navigate, Route, Routes } from "react-router-dom"

import { PageWithHeader } from "../layouts/PageWithHeader"
import { AuthPages } from "../layouts/AuthPages"
import { ProtectedPages } from "../layouts/ProtectedPages"

import { ChampionDetails } from "../pages/ChampionDetails"
import { ChampionChoose } from "../pages/ChampionChoose/"
import { SignUp } from "../pages/SignUp/"
import { SavedBuilds } from "../pages/SavedBuilds"
import { ItemsProvider } from "../contexts/Items"
import { ChampionsProvider } from "../contexts/Champions"
import { LoadingProvider } from "../contexts/Loading"
import { SignIn } from "../pages/SignIn"

export function Router() {
  return (
    <LoadingProvider>
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
    </LoadingProvider>
  )
}
