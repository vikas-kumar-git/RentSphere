import type { TenantRecord } from '../types'
import { formatCurrency, formatDate, formatMonth, getStatusClass, getStatusLabel } from '../utils/formatters'

interface RecordsTableProps {
  disabled?: boolean
  records: TenantRecord[]
  searchQuery: string
  onSearchChange: (value: string) => void
  onEdit: (record: TenantRecord) => void
  onDelete: (id: string) => Promise<void> | void
}

function RecordsTable({
  disabled = false,
  records,
  searchQuery,
  onSearchChange,
  onEdit,
  onDelete,
}: RecordsTableProps) {
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
              <th>Bill</th>
              <th>Rent</th>
              <th>Total</th>
              <th>Paid</th>
              <th>Due</th>
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
                  <td>{formatCurrency(record.due)}</td>
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
        </table>
      </div>
    </>
  )
}

export default RecordsTable
