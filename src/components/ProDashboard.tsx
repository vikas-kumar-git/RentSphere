import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import RecordsTable from './RecordsTable'
import RentForm from './RentForm'
import SummaryCards from './SummaryCards'
import type { RentFormValues, Room, SummaryMetric, TenantRecord } from '../types'
import { formatCurrency } from '../utils/formatters'

interface RoomFormValues {
  roomNo: string
  tenantName: string
}

interface ProDashboardProps {
  disabled?: boolean
  isLoading?: boolean
  rooms: Room[]
  records: TenantRecord[]
  selectedRoomId: string | null
  editingRecord: TenantRecord | null
  recordFormValues: RentFormValues
  onSelectRoom: (room: Room) => void
  onSaveRoom: (room: Room) => Promise<boolean>
  onDeleteRoom: (room: Room) => Promise<void>
  onSaveRecord: (values: RentFormValues) => Promise<void>
  onEditRecord: (record: TenantRecord) => void
  onDeleteRecord: (id: string) => Promise<void> | void
  onResetRecord: () => void
}

function normalizeRoomNo(value: string) {
  return value.trim().toLowerCase()
}

function buildMetrics(records: TenantRecord[]): SummaryMetric[] {
  const totalDue = records.reduce((sum, record) => sum + Math.max(record.due, 0), 0)
  const totalAdvance = records.reduce((sum, record) => sum + Math.max(-record.due, 0), 0)

  return [
    {
      label: 'Room Records',
      value: String(records.length),
      tone: 'neutral',
    },
    {
      label: 'Total Rent',
      value: formatCurrency(records.reduce((sum, record) => sum + record.rent, 0)),
      tone: 'neutral',
    },
    {
      label: 'Electricity',
      value: formatCurrency(records.reduce((sum, record) => sum + record.bill, 0)),
      tone: 'neutral',
    },
    {
      label: 'Total Due',
      value: formatCurrency(totalDue),
      tone: 'danger',
    },
    {
      label: 'Advance Paid',
      value: formatCurrency(totalAdvance),
      tone: 'success',
    },
  ]
}

function ProDashboard({
  disabled = false,
  isLoading = false,
  rooms,
  records,
  selectedRoomId,
  editingRecord,
  recordFormValues,
  onSelectRoom,
  onSaveRoom,
  onDeleteRoom,
  onSaveRecord,
  onEditRecord,
  onDeleteRecord,
  onResetRecord,
}: ProDashboardProps) {
  const [roomFormValues, setRoomFormValues] = useState<RoomFormValues>({ roomNo: '', tenantName: '' })
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null)
  const [roomSearchQuery, setRoomSearchQuery] = useState('')
  const selectedRoom = rooms.find((room) => room.id === selectedRoomId) || rooms[0]

  const selectedRoomRecords = useMemo(() => {
    if (!selectedRoom) {
      return []
    }

    const selectedRoomNo = normalizeRoomNo(selectedRoom.roomNo)

    return records.filter((record) => {
      return record.roomId === selectedRoom.id || normalizeRoomNo(record.roomNo) === selectedRoomNo
    })
  }, [records, selectedRoom])

  const visibleRooms = useMemo(() => {
    const query = roomSearchQuery.trim().toLowerCase()

    if (!query) {
      return rooms
    }

    return rooms.filter((room) => {
      return room.roomNo.toLowerCase().includes(query) || room.tenantName.toLowerCase().includes(query)
    })
  }, [rooms, roomSearchQuery])

  const roomMetrics = useMemo(() => buildMetrics(selectedRoomRecords), [selectedRoomRecords])

  function handleEditRoom(room: Room) {
    setEditingRoomId(room.id)
    setRoomFormValues({
      roomNo: room.roomNo,
      tenantName: room.tenantName,
    })
  }

  async function handleRoomSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const roomNo = roomFormValues.roomNo.trim()
    const tenantName = roomFormValues.tenantName.trim()

    if (!roomNo || !tenantName) {
      return
    }

    const room: Room = {
      id: editingRoomId || crypto.randomUUID(),
      roomNo,
      tenantName,
    }
    const saved = await onSaveRoom(room)

    if (!saved) {
      return
    }

    setEditingRoomId(null)
    setRoomFormValues({ roomNo: '', tenantName: '' })
  }

  return (
    <section className="pro-layout">
      <aside className="panel rooms-panel">
        <div className="toolbar">
          <h2 className="section-title">Rooms</h2>
          <div className="search-box">
            <input
              disabled={disabled}
              value={roomSearchQuery}
              onChange={(event) => setRoomSearchQuery(event.target.value)}
              placeholder="Search rooms..."
              type="text"
            />
          </div>
        </div>

        <form className="room-form" onSubmit={handleRoomSubmit}>
          <div className="field">
            <label htmlFor="proRoomNo">Room No.</label>
            <input
              id="proRoomNo"
              required
              disabled={disabled}
              value={roomFormValues.roomNo}
              onChange={(event) => setRoomFormValues((values) => ({ ...values, roomNo: event.target.value }))}
              placeholder="Flat 3C"
            />
          </div>
          <div className="field">
            <label htmlFor="proTenantName">Tenant Name</label>
            <input
              id="proTenantName"
              required
              disabled={disabled}
              value={roomFormValues.tenantName}
              onChange={(event) => setRoomFormValues((values) => ({ ...values, tenantName: event.target.value }))}
              placeholder="Priya Kapoor"
            />
          </div>
          <div className="room-form-actions">
            <button className="btn-primary" disabled={disabled} type="submit">
              {editingRoomId ? 'Update Room' : 'Add Room'}
            </button>
            {editingRoomId ? (
              <button
                className="btn-secondary"
                disabled={disabled}
                type="button"
                onClick={() => {
                  setEditingRoomId(null)
                  setRoomFormValues({ roomNo: '', tenantName: '' })
                }}
              >
                Cancel
              </button>
            ) : null}
          </div>
        </form>

        <div className="room-list">
          {visibleRooms.map((room) => {
            const roomRecords = records.filter((record) => {
              return record.roomId === room.id || normalizeRoomNo(record.roomNo) === normalizeRoomNo(room.roomNo)
            })
            const due = roomRecords.reduce((sum, record) => sum + record.due, 0)
            const isSelected = selectedRoom?.id === room.id

            return (
              <article className={isSelected ? 'room-card room-card--active' : 'room-card'} key={room.id}>
                <button type="button" disabled={disabled} onClick={() => onSelectRoom(room)}>
                  <strong>{room.roomNo}</strong>
                  <span>{room.tenantName}</span>
                  <small>
                    {roomRecords.length === 1 ? '1 record' : `${roomRecords.length} records`} - {formatCurrency(due)}
                  </small>
                </button>
                <div className="room-card-actions">
                  <button className="btn-secondary" disabled={disabled} type="button" onClick={() => handleEditRoom(room)}>
                    Edit
                  </button>
                  <button className="btn-danger" disabled={disabled} type="button" onClick={() => void onDeleteRoom(room)}>
                    Delete
                  </button>
                </div>
              </article>
            )
          })}
        </div>

        {isLoading ? <div className="empty">Loading rooms...</div> : null}
        {!isLoading && visibleRooms.length === 0 ? <div className="empty">No rooms yet.</div> : null}
      </aside>

      <div className="pro-workspace">
        {selectedRoom ? (
          <>
            <section className="panel room-heading">
              <div>
                <h2>{selectedRoom.roomNo}</h2>
                <p>{selectedRoom.tenantName}</p>
              </div>
            </section>
            <SummaryCards metrics={roomMetrics} />
            <RentForm
              editingId={editingRecord?.id}
              initialValues={recordFormValues}
              disabled={disabled}
              lockRoomDetails
              showClearAll={false}
              onSubmit={onSaveRecord}
              onReset={onResetRecord}
              onClearAll={() => onDeleteRoom(selectedRoom)}
            />
            <section className="panel">
              <RecordsTable
                records={selectedRoomRecords}
                disabled={disabled}
                showSearch={false}
                searchQuery=""
                onSearchChange={() => undefined}
                onEdit={onEditRecord}
                onDelete={onDeleteRecord}
              />
              {selectedRoomRecords.length === 0 ? <div className="empty">No records for this room yet.</div> : null}
            </section>
          </>
        ) : (
          <section className="panel">
            <div className="empty">Add a room to start using Pro mode.</div>
          </section>
        )}
      </div>
    </section>
  )
}

export default ProDashboard
