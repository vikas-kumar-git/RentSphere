import { useMemo } from 'react'
import type { TenantRecord } from '../types'
import { formatCurrency, formatDate, formatMonth, getStatusClass, getStatusLabel } from '../utils/formatters'

interface RecordGroup {
  id: string
  tenantNames: string
  roomNos: string
  recordCount: number
  bill: number
  rent: number
  total: number
  paid: number
  due: number
}

interface RecordsTableProps {
  disabled?: boolean
  records: TenantRecord[]
  searchQuery: string
  onSearchChange: (value: string) => void
  onEdit: (record: TenantRecord) => void
  onDelete: (id: string) => Promise<void> | void
}

function normalizeGroupValue(value: string) {
  return value.trim().toLowerCase()
}

function addDisplayValue(values: Map<string, string>, value: string) {
  const displayValue = value.trim()

  if (!displayValue) {
    return
  }

  values.set(normalizeGroupValue(displayValue), displayValue)
}

function buildGroupedRecords(records: TenantRecord[]): RecordGroup[] {
  const parent = records.map((_, index) => index)
  const tenantIndexes = new Map<string, number>()
  const roomIndexes = new Map<string, number>()

  function find(index: number): number {
    if (parent[index] !== index) {
      parent[index] = find(parent[index])
    }

    return parent[index]
  }

  function union(left: number, right: number) {
    const leftRoot = find(left)
    const rightRoot = find(right)

    if (leftRoot !== rightRoot) {
      parent[rightRoot] = leftRoot
    }
  }

  records.forEach((record, index) => {
    const tenantKey = normalizeGroupValue(record.tenantName)
    const roomKey = normalizeGroupValue(record.roomNo)

    if (tenantKey) {
      const tenantIndex = tenantIndexes.get(tenantKey)

      if (tenantIndex === undefined) {
        tenantIndexes.set(tenantKey, index)
      } else {
        union(index, tenantIndex)
      }
    }

    if (roomKey) {
      const roomIndex = roomIndexes.get(roomKey)

      if (roomIndex === undefined) {
        roomIndexes.set(roomKey, index)
      } else {
        union(index, roomIndex)
      }
    }
  })

  const groups = new Map<
    number,
    Omit<RecordGroup, 'tenantNames' | 'roomNos'> & {
      tenantValues: Map<string, string>
      roomValues: Map<string, string>
    }
  >()

  records.forEach((record, index) => {
    const root = find(index)
    const group =
      groups.get(root) ||
      ({
        id: record.id,
        recordCount: 0,
        bill: 0,
        rent: 0,
        total: 0,
        paid: 0,
        due: 0,
        tenantValues: new Map<string, string>(),
        roomValues: new Map<string, string>(),
      } satisfies Omit<RecordGroup, 'tenantNames' | 'roomNos'> & {
        tenantValues: Map<string, string>
        roomValues: Map<string, string>
      })

    addDisplayValue(group.tenantValues, record.tenantName)
    addDisplayValue(group.roomValues, record.roomNo)
    group.recordCount += 1
    group.bill += record.bill
    group.rent += record.rent
    group.total += record.total
    group.paid += record.paid
    group.due += record.due
    groups.set(root, group)
  })

  return Array.from(groups.values())
    .map((group) => ({
      id: group.id,
      tenantNames: Array.from(group.tenantValues.values()).join(' / '),
      roomNos: Array.from(group.roomValues.values()).join(' / '),
      recordCount: group.recordCount,
      bill: group.bill,
      rent: group.rent,
      total: group.total,
      paid: group.paid,
      due: group.due,
    }))
    .sort((left, right) => left.tenantNames.localeCompare(right.tenantNames) || left.roomNos.localeCompare(right.roomNos))
}

function RecordsTable({
  disabled = false,
  records,
  searchQuery,
  onSearchChange,
  onEdit,
  onDelete,
}: RecordsTableProps) {
  const groupedRecords = useMemo(() => buildGroupedRecords(records), [records])

  return (
    <>
      <div className="toolbar">
        <h2 className="section-title">Monthly Records</h2>
        <div className="search-box">
          <input
            type="text"
            disabled={disabled}
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search by tenant, room, month, or status..."
          />
        </div>
      </div>

      <div className="table-wrap">
        <table className="records-table">
          <thead>
            <tr>
              <th>Tenant</th>
              <th>Room</th>
              <th>Month</th>
              <th>From</th>
              <th>To</th>
              <th>Meter From</th>
              <th>Meter To</th>
              <th>Electricity</th>
              <th>Rent</th>
              <th>Total</th>
              <th>Paid</th>
              <th>Due / Advance</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {records.map((record) => {
              return (
                <tr key={record.id}>
                  <td>{record.tenantName}</td>
                  <td>{record.roomNo}</td>
                  <td>{formatMonth(record.month)}</td>
                  <td>{formatDate(record.fromDate)}</td>
                  <td>{formatDate(record.toDate)}</td>
                  <td>{record.meterFrom}</td>
                  <td>{record.meterTo}</td>
                  <td>{formatCurrency(record.bill)}</td>
                  <td>{formatCurrency(record.rent)}</td>
                  <td>{formatCurrency(record.total)}</td>
                  <td>{formatCurrency(record.paid)}</td>
                  <td className={record.due < 0 ? 'amount-credit' : undefined}>{formatCurrency(record.due)}</td>
                  <td>
                    <span className={`status ${getStatusClass(record.status)}`}>
                      {getStatusLabel(record.status)}
                    </span>
                  </td>
                  <td>
                    <div className="row-actions">
                      <button
                        type="button"
                        className="btn-secondary"
                        disabled={disabled}
                        onClick={() => onEdit(record)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="btn-danger"
                        disabled={disabled}
                        onClick={() => void onDelete(record.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
          {groupedRecords.length > 0 ? (
            <tfoot>
              <tr className="group-summary-heading">
                <td colSpan={14}>Grouped totals by matching tenant name or room</td>
              </tr>
              {groupedRecords.map((group) => (
                <tr className="group-summary-row" key={group.id}>
                  <td>{group.tenantNames}</td>
                  <td>{group.roomNos}</td>
                  <td>{group.recordCount === 1 ? '1 month' : `${group.recordCount} months`}</td>
                  <td>-</td>
                  <td>-</td>
                  <td>-</td>
                  <td>-</td>
                  <td>{formatCurrency(group.bill)}</td>
                  <td>{formatCurrency(group.rent)}</td>
                  <td>{formatCurrency(group.total)}</td>
                  <td>{formatCurrency(group.paid)}</td>
                  <td className={group.due < 0 ? 'amount-credit' : undefined}>{formatCurrency(group.due)}</td>
                  <td>Summary</td>
                  <td>-</td>
                </tr>
              ))}
            </tfoot>
          ) : null}
        </table>
      </div>
    </>
  )
}

export default RecordsTable
