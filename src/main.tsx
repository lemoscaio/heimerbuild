import React from "react"
import ReactDOM from "react-dom/client"

import { App } from "@/app/app"
import { reloadOnChunkError } from "@/app/chunk-reload"
import { initPostHog } from "@/app/posthog"
import { router } from "@/app/router"
import { initSentry } from "@/app/sentry"
import "./styles/app.css"

initSentry()
reloadOnChunkError({ isNavigating: () => router.state.isLoading })

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
	<React.StrictMode>
		<App />
	</React.StrictMode>,
)

initPostHog()
