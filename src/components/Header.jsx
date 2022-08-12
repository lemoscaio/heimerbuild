import { Link, useNavigate, useLocation } from "react-router-dom"

import heimerLogo from "./../assets/images/heimerdinger.png"

export default function Header() {
  const navigate = useNavigate()
  const location = useLocation()

  function handleGoToLoginClick() {
    navigate("/sign-in", { state: { previousPath: location.pathname } })
  }

  return (
    <header className="header">
      <div className="header__link">
        <Link to={"/"}>Back</Link>
      </div>
      <div className="header__logo-container">
        <Link to={"/"}>
          <img className="header__logo" src={heimerLogo} alt="" />
        </Link>
      </div>
      <div>
        {" "}
        <p
          className="header__link champions-page__header-link"
          onClick={handleGoToLoginClick}
        >
          Login
        </p>
      </div>
    </header>
  )
}
