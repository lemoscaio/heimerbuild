import heimgerdingerGif from "../../assets/images/heimerdinger.gif"

export function MainPageLogo() {
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
