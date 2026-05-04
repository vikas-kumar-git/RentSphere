import './index.css'
import { useMemo, useState } from 'react'
import EmptyState from './components/EmptyState'
import Header from './components/Header'
import RecordsTable from './components/RecordsTable'
import RentForm from './components/RentForm'
import SummaryCards from './components/SummaryCards'
import { RATE_PER_UNIT, useRecords } from './hooks/useRecords'
import type { RentFormValues, SummaryMetric, TenantRecord } from './types'
import { formatCurrency } from './utils/formatters'

const emptyForm: RentFormValues = {
  tenantName: '',
  roomNo: '',
  month: '',
  fromDate: '',
  toDate: '',
  meterFrom: '',
  meterTo: '',
  rent: '0',
  paid: '0',
}

function App() {
  const { records, summary, isLoading, isBusy, storageError, saveRecord, deleteRecord, clearAllRecords } =
    useRecords()
  const [searchQuery, setSearchQuery] = useState('')
  const [editingRecord, setEditingRecord] = useState<TenantRecord | null>(null)

  const metrics: SummaryMetric[] = [
    {
      label: 'Total Records',
      value: String(summary.totalRecords),
      tone: 'neutral',
    },
    {
      label: 'Total Amount',
      value: formatCurrency(summary.totalAmount),
      tone: 'neutral',
    },
    {
      label: 'Total Paid',
      value: formatCurrency(summary.totalPaid),
      tone: 'success',
    },
    {
      label: 'Total Due',
      value: formatCurrency(summary.totalDue),
      tone: 'danger',
    },
    {
      label: 'Advance Paid',
      value: formatCurrency(summary.totalAdvance),
      tone: 'success',
    },
  ]

  const filteredRecords = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()

    if (!query) {
      return records
    }

    return records.filter((record) => {
      return (
        record.tenantName.toLowerCase().includes(query) ||
        record.roomNo.toLowerCase().includes(query) ||
        record.month.toLowerCase().includes(query) ||
        record.status.toLowerCase().includes(query)
      )
    })
  }, [records, searchQuery])

  const formValues = editingRecord
    ? {
        tenantName: editingRecord.tenantName,
        roomNo: editingRecord.roomNo,
        month: editingRecord.month,
        fromDate: editingRecord.fromDate,
        toDate: editingRecord.toDate,
        meterFrom: String(editingRecord.meterFrom),
        meterTo: String(editingRecord.meterTo),
        rent: String(editingRecord.rent),
        paid: String(editingRecord.paid),
      }
    : emptyForm

  async function handleSubmit(values: RentFormValues) {
    const result = await saveRecord(values, editingRecord?.id)

    if (!result.ok) {
      window.alert(result.error)
      return
    }

    setEditingRecord(null)
  }

  function handleEdit(record: TenantRecord) {
    setEditingRecord(record)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handleDelete(id: string) {
    const shouldDelete = window.confirm('Delete this record?')

    if (!shouldDelete) {
      return
    }

    await deleteRecord(id)

    if (editingRecord?.id === id) {
      setEditingRecord(null)
    }
  }

  function handleReset() {
    setEditingRecord(null)
  }

  async function handleClearAll() {
    const shouldClear = window.confirm('This will delete all records. Continue?')

    if (!shouldClear) {
      return
    }

    await clearAllRecords()
    setEditingRecord(null)
  }

  return (
    <main className="container">
      <Header />
      {storageError ? (
        <section className="panel notice notice--danger">
          <strong>Database error:</strong> {storageError}
        </section>
      ) : null}
      <SummaryCards metrics={metrics} />
      <RentForm
        editingId={editingRecord?.id}
        initialValues={formValues}
        disabled={isBusy}
        onSubmit={handleSubmit}
        onReset={handleReset}
        onClearAll={handleClearAll}
      />
      <section className="panel">
        <RecordsTable
          records={filteredRecords}
          disabled={isBusy}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
        {isLoading ? <div className="empty">Loading records from the cloud database...</div> : null}
        {!isLoading && filteredRecords.length === 0 ? <EmptyState /> : null}
      </section>
    </main>
  )
}

export default App
