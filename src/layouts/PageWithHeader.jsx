import { Outlet } from "react-router-dom"

import Header from "../components/Header"

export default function PageWithHeader() {
  return (
    <div className="height-container">
      <Header />
      <Outlet />
    </div>
  )
}
