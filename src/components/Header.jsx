import { Link } from "react-router-dom"

import heimerLogo from "./../assets/images/heimerdinger.png"

export function Header() {
  return (
    <header className="header">
      <div>
        <Link to={-1}>Back</Link>
      </div>
      <div className="header__logo-container">
        <Link to={"/"}>
          <img className="header__logo" src={heimerLogo} alt="" />
        </Link>
      </div>
      <div>Login</div>
    </header>
  )
}
