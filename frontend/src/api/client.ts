// En dev, .env.development pointe vers l'API locale (port 4000).
// En production (build), pas de variable définie : on utilise un chemin
// relatif "/api" car le build est servi par le même serveur Express que l'API.
const BASE_URL = import.meta.env.VITE_API_URL || "/api"

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  })

  if (res.status === 204) return null as T

  const isJson = res.headers.get("content-type")?.includes("application/json")
  const data = isJson ? await res.json() : null

  if (!res.ok) {
    const message = data?.errors?.join(" ") || data?.error || `Erreur HTTP ${res.status}`
    throw new Error(message)
  }

  return data as T
}

export const apiClient = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) => request<T>(path, { method: "POST", body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) => request<T>(path, { method: "PUT", body: JSON.stringify(body) }),
  delete: <T = void>(path: string) => request<T>(path, { method: "DELETE" }),
}
