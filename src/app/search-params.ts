import { stringifySearchWith } from "@tanstack/react-router"

function stringifyValue(value: unknown) {
	return Array.isArray(value) ? value.join(",") : JSON.stringify(value)
}

/** Writes arrays as comma lists (`items=3089,3020`) instead of the router's default JSON. */
export const stringifySearch = stringifySearchWith(stringifyValue, JSON.parse)
