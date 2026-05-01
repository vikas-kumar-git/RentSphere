import type { TenantRecord } from '../types'

const configuredApiBaseUrl = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')
const API_BASE_URL = import.meta.env.DEV ? '' : configuredApiBaseUrl

interface ApiErrorResponse {
  error?: string
}

function buildUrl(path: string) {
  const normalizedPath =
    API_BASE_URL.endsWith('/api') && path.startsWith('/api/') ? path.slice('/api'.length) : path

  return `${API_BASE_URL}${normalizedPath}`
}

async function parseError(response: Response) {
  try {
    const payload = (await response.json()) as ApiErrorResponse
    return payload.error || `Request failed with status ${response.status}.`
  } catch {
    return `Request failed with status ${response.status}.`
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(buildUrl(path), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  })

  if (!response.ok) {
    throw new Error(await parseError(response))
  }

  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}

export async function loadRecords(): Promise<TenantRecord[]> {
  return request<TenantRecord[]>('/api/records')
}

export async function saveRecord(record: TenantRecord): Promise<TenantRecord> {
  return request<TenantRecord>('/api/records', {
    method: 'POST',
    body: JSON.stringify(record),
  })
}

export async function deleteRecord(id: string) {
  await request<void>('/api/records/delete', {
    method: 'POST',
    body: JSON.stringify({ id }),
  })
}

export async function clearStoredRecords() {
  await request<void>('/api/records', {
    method: 'DELETE',
  })
}
