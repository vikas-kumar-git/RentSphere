import './index.css'
import { useEffect, useMemo, useState } from 'react'
import EmptyState from './components/EmptyState'
import Header from './components/Header'
import ProDashboard from './components/ProDashboard'
import RecordsTable from './components/RecordsTable'
import RentForm from './components/RentForm'
import SummaryCards from './components/SummaryCards'
import { RATE_PER_UNIT, useRecords } from './hooks/useRecords'
import { useRooms } from './hooks/useRooms'
import type { RentFormValues, Room, SummaryMetric, TenantRecord } from './types'
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

function normalizeRoomNo(value: string) {
  return value.trim().toLowerCase()
}

function App() {
  const { records, summary, isLoading, isBusy, storageError, saveRecord, deleteRecord, clearAllRecords } =
    useRecords()
  const { rooms, isLoading: isRoomsLoading, isSaving: isRoomsSaving, storageError: roomsError, saveRoom, deleteRoom } =
    useRooms(records)
  const [dashboardMode, setDashboardMode] = useState<'light' | 'pro'>('light')
  const [searchQuery, setSearchQuery] = useState('')
  const [editingRecord, setEditingRecord] = useState<TenantRecord | null>(null)
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null)

  const selectedRoom = rooms.find((room) => room.id === selectedRoomId) || rooms[0] || null
  const isAppBusy = isBusy || isRoomsSaving

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

  useEffect(() => {
    if (!selectedRoomId && rooms.length > 0) {
      setSelectedRoomId(rooms[0].id)
    }
  }, [rooms, selectedRoomId])

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

  const baseFormValues = editingRecord
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
  const formValues =
    dashboardMode === 'pro' && !editingRecord && selectedRoom
      ? {
          ...baseFormValues,
          tenantName: selectedRoom.tenantName,
          roomNo: selectedRoom.roomNo,
        }
      : baseFormValues

  async function handleSubmit(values: RentFormValues) {
    const result = await saveRecord(
      values,
      editingRecord?.id,
      dashboardMode === 'pro' ? { roomId: selectedRoom?.id } : undefined,
    )

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

  async function handleSaveRoom(room: Room) {
    const result = await saveRoom(room)

    if (!result.ok) {
      window.alert(result.error)
      return false
    }

    setSelectedRoomId(result.room.id)
    setEditingRecord(null)
    return true
  }

  async function handleDeleteRoom(room: Room) {
    const roomRecords = records.filter((record) => {
      return record.roomId === room.id || normalizeRoomNo(record.roomNo) === normalizeRoomNo(room.roomNo)
    })
    const shouldDelete = window.confirm(
      `Delete room ${room.roomNo}? This will also delete ${roomRecords.length} record${
        roomRecords.length === 1 ? '' : 's'
      } for this room.`,
    )

    if (!shouldDelete) {
      return
    }

    await Promise.all(roomRecords.map((record) => deleteRecord(record.id)))
    const result = await deleteRoom(room.id)

    if (!result.ok) {
      window.alert(result.error)
      return
    }

    if (selectedRoomId === room.id) {
      const nextRoom = rooms.find((currentRoom) => currentRoom.id !== room.id)
      setSelectedRoomId(nextRoom?.id || null)
    }

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
      <div className="mode-switch panel">
        <div>
          <h2>Dashboard Mode</h2>
          <p>Light shows every room together. Pro opens one room at a time.</p>
        </div>
        <div className="segmented-control" role="group" aria-label="Dashboard mode">
          <button
            className={dashboardMode === 'light' ? 'active' : undefined}
            type="button"
            onClick={() => {
              setDashboardMode('light')
              setEditingRecord(null)
            }}
          >
            Light
          </button>
          <button
            className={dashboardMode === 'pro' ? 'active' : undefined}
            type="button"
            onClick={() => {
              setDashboardMode('pro')
              setEditingRecord(null)
            }}
          >
            Pro
          </button>
        </div>
      </div>
      {storageError || roomsError ? (
        <section className="panel notice notice--danger">
          <strong>Database error:</strong> {storageError || roomsError}
        </section>
      ) : null}
      {dashboardMode === 'light' ? (
        <>
          <SummaryCards metrics={metrics} />
          <RentForm
            editingId={editingRecord?.id}
            initialValues={formValues}
            disabled={isAppBusy}
            onSubmit={handleSubmit}
            onReset={handleReset}
            onClearAll={handleClearAll}
          />
          <section className="panel">
            <RecordsTable
              records={filteredRecords}
              disabled={isAppBusy}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
            {isLoading ? <div className="empty">Loading records from the cloud database...</div> : null}
            {!isLoading && filteredRecords.length === 0 ? <EmptyState /> : null}
          </section>
        </>
      ) : (
        <ProDashboard
          rooms={rooms}
          records={records}
          selectedRoomId={selectedRoom?.id || null}
          editingRecord={editingRecord}
          recordFormValues={formValues}
          disabled={isAppBusy}
          isLoading={isRoomsLoading || isLoading}
          onSelectRoom={(room) => {
            setSelectedRoomId(room.id)
            setEditingRecord(null)
          }}
          onSaveRoom={handleSaveRoom}
          onDeleteRoom={handleDeleteRoom}
          onSaveRecord={handleSubmit}
          onEditRecord={handleEdit}
          onDeleteRecord={handleDelete}
          onResetRecord={handleReset}
        />
      )}
    </main>
  )
}

export default App
