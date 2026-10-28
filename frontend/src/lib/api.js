import { useEffect, useState } from 'react'

export class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.status = status
  }
}

async function request(path, options = {}) {
  const res = await fetch(`/api${path}`, options)
  let body = null
  try {
    body = await res.json()
  } catch {
    // non-JSON body (e.g. proxy error page)
  }
  if (!res.ok) {
    throw new ApiError(body?.detail || `Request failed (${res.status})`, res.status)
  }
  return body
}

export const apiGet = (path, { signal } = {}) => request(path, { signal })
export const apiPost = (path) => request(path, { method: 'POST' })

/** Build a query string, dropping null/undefined/'' values; arrays repeat the key. */
export function qs(params) {
  const sp = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v === null || v === undefined || v === '') continue
    if (Array.isArray(v)) v.forEach((item) => sp.append(k, item))
    else sp.append(k, v)
  }
  const s = sp.toString()
  return s ? `?${s}` : ''
}

/**
 * Fetch `path` whenever it changes. Pass null to skip. Aborts stale requests so a slow
 * earlier response can never overwrite newer data. `select` unwraps {success, data} bodies.
 */
export function useApi(path, { select } = {}) {
  const [state, setState] = useState({ data: null, error: null, loading: Boolean(path) })

  useEffect(() => {
    if (!path) {
      setState({ data: null, error: null, loading: false })
      return
    }
    const ctrl = new AbortController()
    setState((s) => ({ ...s, loading: true, error: null }))
    apiGet(path, { signal: ctrl.signal })
      .then((body) => setState({ data: select ? select(body) : body, error: null, loading: false }))
      .catch((error) => {
        if (error.name !== 'AbortError') setState({ data: null, error, loading: false })
      })
    return () => ctrl.abort()
    // `select` is expected to be a stable, pure unwrapper
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path])

  return state
}

export const unwrap = (body) => body?.data
