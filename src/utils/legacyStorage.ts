import type { TenantRecord } from '../types'

const LEGACY_LOCAL_STORAGE_KEY = 'tenantRentMvpRecords'
const LEGACY_DATABASE_NAME = 'tenantRentMvpDatabase'
const LEGACY_DATABASE_VERSION = 1
const LEGACY_STORE_NAME = 'records'

function hasBrowserStorage() {
  return typeof window !== 'undefined'
}

function supportsIndexedDb() {
  return hasBrowserStorage() && typeof window.indexedDB !== 'undefined'
}

function requestToPromise<T>(request: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Legacy database request failed.'))
  })
}

function transactionToPromise(transaction: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error ?? new Error('Legacy database transaction failed.'))
    transaction.onabort = () => reject(transaction.error ?? new Error('Legacy database transaction aborted.'))
  })
}

function loadLegacyLocalStorageRecords() {
  if (!hasBrowserStorage()) {
    return []
  }

  try {
    const rawValue = window.localStorage.getItem(LEGACY_LOCAL_STORAGE_KEY)

    if (!rawValue) {
      return []
    }

    const parsed = JSON.parse(rawValue)
    return Array.isArray(parsed) ? (parsed as TenantRecord[]) : []
  } catch {
    return []
  }
}

function clearLegacyLocalStorageRecords() {
  if (!hasBrowserStorage()) {
    return
  }

  window.localStorage.removeItem(LEGACY_LOCAL_STORAGE_KEY)
}

function openLegacyDatabase() {
  return new Promise<IDBDatabase | null>((resolve, reject) => {
    if (!supportsIndexedDb()) {
      resolve(null)
      return
    }

    const request = window.indexedDB.open(LEGACY_DATABASE_NAME, LEGACY_DATABASE_VERSION)

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Failed to open the legacy browser database.'))
  })
}

async function loadLegacyIndexedDbRecords() {
  const database = await openLegacyDatabase()

  if (!database || !database.objectStoreNames.contains(LEGACY_STORE_NAME)) {
    database?.close()
    return []
  }

  try {
    const transaction = database.transaction(LEGACY_STORE_NAME, 'readonly')
    const store = transaction.objectStore(LEGACY_STORE_NAME)
    const records = await requestToPromise(store.getAll())
    await transactionToPromise(transaction)
    return Array.isArray(records) ? (records as TenantRecord[]) : []
  } finally {
    database.close()
  }
}

async function clearLegacyIndexedDbRecords() {
  const database = await openLegacyDatabase()

  if (!database || !database.objectStoreNames.contains(LEGACY_STORE_NAME)) {
    database?.close()
    return
  }

  try {
    const transaction = database.transaction(LEGACY_STORE_NAME, 'readwrite')
    const store = transaction.objectStore(LEGACY_STORE_NAME)
    await requestToPromise(store.clear())
    await transactionToPromise(transaction)
  } finally {
    database.close()
  }
}

export async function loadLegacyRecordsForMigration() {
  const [indexedDbRecords, localStorageRecords] = await Promise.all([
    loadLegacyIndexedDbRecords(),
    Promise.resolve(loadLegacyLocalStorageRecords()),
  ])

  const combinedRecords = [...indexedDbRecords, ...localStorageRecords]
  const deduplicatedRecords = new Map<string, TenantRecord>()

  for (const record of combinedRecords) {
    deduplicatedRecords.set(record.id, record)
  }

  return [...deduplicatedRecords.values()]
}

export async function clearLegacyRecordsAfterMigration() {
  await clearLegacyIndexedDbRecords()
  clearLegacyLocalStorageRecords()
}
