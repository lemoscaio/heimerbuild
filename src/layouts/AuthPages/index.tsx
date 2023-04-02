import { Outlet } from "react-router-dom"

export function AuthPages() {
  // TODO redirect back to last path on context

  return (
    <div className="height-container">
      <Outlet />
    </div>
  )
}
