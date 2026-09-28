import { fileURLToPath, URL } from "node:url"
import babel from "@rolldown/plugin-babel"
import react, { reactCompilerPreset } from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
	plugins: [react(), babel({ presets: [reactCompilerPreset()] })],
	resolve: {
		alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
	},
})
