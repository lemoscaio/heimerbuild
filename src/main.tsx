import React from "react"
import ReactDOM from "react-dom/client"

import { App } from "@/app/app"
import "./styles/app.css"

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
	<React.StrictMode>
		<App />
	</React.StrictMode>,
)
