import React from "react"

import heimgerdingerGif from "../assets/images/heimerdinger.gif"

export default function MainPageLogo() {
  return (
    <div className="logo-container">
      <img
        src={heimgerdingerGif}
        alt="Heimerdinger"
        className="logo-container__logo"
      />
    </div>
  )
}
