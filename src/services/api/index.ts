import axios from "axios"

import { QueryClient } from "@tanstack/react-query"

const queryClient = new QueryClient()

const api = axios.create({ baseURL: import.meta.env.BASE_URL })

export { queryClient, api }
