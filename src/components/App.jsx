import { BrowserRouter } from "react-router-dom"

import { AuthProvider } from "../hooks/useAuth"
import Router from "../routes/Router"

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Router />
      </AuthProvider>
    </BrowserRouter>
  )
}
