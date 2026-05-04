import { useEffect, useMemo, useState } from 'react'
import type { PaymentStatus, RentFormValues, TenantRecord } from '../types'
import { clearLegacyRecordsAfterMigration, loadLegacyRecordsForMigration } from '../utils/legacyStorage'
import {
  clearStoredRecords,
  deleteRecord as deleteStoredRecord,
  loadRecords as loadStoredRecords,
  saveRecord as saveStoredRecord,
} from '../utils/storage'

export const RATE_PER_UNIT = 8

function calculateStatus(total: number, paidAmount: number): PaymentStatus {
  const due = total - paidAmount

  if (due < 0) {
    return 'Advance'
  }

  if (due === 0) {
    return 'Paid'
  }

  if (paidAmount > 0) {
    return 'Partial'
  }

  return 'Unpaid'
}

function normalizeAmount(value: string) {
  const numericValue = Number(value)
  return Number.isFinite(numericValue) ? numericValue : 0
}

function getErrorMessage(error: unknown, fallbackMessage: string) {
  return error instanceof Error ? error.message : fallbackMessage
}

function normalizeRecordBalance(record: TenantRecord): TenantRecord {
  const due = record.total - record.paid

  return {
    ...record,
    due,
    status: calculateStatus(record.total, record.paid),
  }
}

interface SaveRecordOptions {
  roomId?: string
}

export function useRecords() {
  const [records, setRecords] = useState<TenantRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [storageError, setStorageError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    async function hydrateRecords() {
      try {
        setStorageError(null)
        const storedRecords = await loadStoredRecords()
        const legacyRecords = await loadLegacyRecordsForMigration()
        const storedRecordIds = new Set(storedRecords.map((record) => record.id))
        const recordsToMigrate = legacyRecords.filter((record) => !storedRecordIds.has(record.id))

        if (recordsToMigrate.length > 0) {
          await Promise.all(recordsToMigrate.map((record) => saveStoredRecord(record)))
          await clearLegacyRecordsAfterMigration()
        } else if (legacyRecords.length > 0) {
          await clearLegacyRecordsAfterMigration()
        }

        if (!isMounted) {
          return
        }

        setRecords([...recordsToMigrate, ...storedRecords].map(normalizeRecordBalance))
      } catch (error) {
        if (!isMounted) {
          return
        }

        setStorageError(getErrorMessage(error, 'Unable to load records from the cloud database.'))
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void hydrateRecords()

    return () => {
      isMounted = false
    }
  }, [])

  const sortedRecords = useMemo(() => {
    return [...records].sort((left, right) => {
      return new Date(right.month).getTime() - new Date(left.month).getTime()
    })
  }, [records])

  const summary = useMemo(() => {
    return {
      totalRecords: records.length,
      totalAmount: records.reduce((sum, record) => sum + record.total, 0),
      totalPaid: records.reduce((sum, record) => sum + record.paid, 0),
      totalDue: records.reduce((sum, record) => sum + Math.max(record.due, 0), 0),
      totalAdvance: records.reduce((sum, record) => sum + Math.max(-record.due, 0), 0),
    }
  }, [records])

  async function saveRecord(values: RentFormValues, editId?: string, options?: SaveRecordOptions) {
    const meterFrom = normalizeAmount(values.meterFrom)
    const meterTo = normalizeAmount(values.meterTo)

    if (meterTo < meterFrom) {
      return {
        ok: false as const,
        error: 'Meter To must be greater than or equal to Meter From.',
      }
    }

    const rentAmount = normalizeAmount(values.rent)
    const paidAmount = normalizeAmount(values.paid)
    const units = meterTo - meterFrom
    const bill = units * RATE_PER_UNIT
    const total = bill + rentAmount
    const due = total - paidAmount

    const existingRecord = editId ? records.find((record) => record.id === editId) : undefined
    const nextRecord: TenantRecord = {
      id: editId || crypto.randomUUID(),
      roomId: options?.roomId || existingRecord?.roomId,
      tenantName: values.tenantName.trim(),
      roomNo: values.roomNo.trim(),
      month: values.month,
      fromDate: values.fromDate,
      toDate: values.toDate,
      meterFrom,
      meterTo,
      units,
      bill,
      rent: rentAmount,
      total,
      paid: paidAmount,
      due,
      status: calculateStatus(total, paidAmount),
    }

    try {
      setIsSaving(true)
      setStorageError(null)
      await saveStoredRecord(nextRecord)
      setRecords((currentRecords) => {
        const existingIndex = currentRecords.findIndex((record) => record.id === nextRecord.id)

        if (existingIndex > -1) {
          const updated = [...currentRecords]
          updated[existingIndex] = nextRecord
          return updated
        }

        return [nextRecord, ...currentRecords]
      })
    } catch (error) {
      const message = getErrorMessage(error, 'Unable to save the record to the cloud database.')
      setStorageError(message)
      return {
        ok: false as const,
        error: message,
      }
    } finally {
      setIsSaving(false)
    }

    return { ok: true as const }
  }

  async function deleteRecord(id: string) {
    try {
      setIsSaving(true)
      setStorageError(null)
      await deleteStoredRecord(id)
      setRecords((currentRecords) => currentRecords.filter((record) => record.id !== id))
    } catch (error) {
      setStorageError(getErrorMessage(error, 'Unable to delete the record from the cloud database.'))
    } finally {
      setIsSaving(false)
    }
  }

  async function clearAllRecords() {
    try {
      setIsSaving(true)
      setStorageError(null)
      await clearStoredRecords()
      setRecords([])
    } catch (error) {
      setStorageError(getErrorMessage(error, 'Unable to clear records from the cloud database.'))
    } finally {
      setIsSaving(false)
    }
  }

  return {
    records: sortedRecords,
    summary,
    isLoading,
    isBusy: isLoading || isSaving,
    storageError,
    saveRecord,
    deleteRecord,
    clearAllRecords,
  }
}
