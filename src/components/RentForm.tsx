import { useEffect, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import type { RentFormValues } from '../types'

interface RentFormProps {
  editingId?: string
  disabled?: boolean
  lockRoomDetails?: boolean
  showClearAll?: boolean
  initialValues: RentFormValues
  onSubmit: (values: RentFormValues) => Promise<void> | void
  onReset: () => void
  onClearAll: () => Promise<void> | void
}

function RentForm({
  editingId,
  disabled = false,
  lockRoomDetails = false,
  showClearAll = true,
  initialValues: externalValues,
  onSubmit,
  onReset,
  onClearAll,
}: RentFormProps) {
  const [values, setValues] = useState<RentFormValues>(externalValues)

  useEffect(() => {
    setValues(externalValues)
  }, [externalValues])

  function handleChange(event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = event.target
    setValues((currentValues) => ({ ...currentValues, [name]: value }))
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void onSubmit(values)
  }

  return (
    <section className="panel">
      <h2 className="section-title">Add / Update Record</h2>
      <form className="rent-form" onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="tenantName">Tenant Name</label>
          <input
            id="tenantName"
            required
            disabled={disabled || lockRoomDetails}
            name="tenantName"
            value={values.tenantName}
            onChange={handleChange}
            placeholder="Priya Kapoor"
          />
        </div>

        <div className="field">
          <label htmlFor="roomNo">Room / Flat No.</label>
          <input
            id="roomNo"
            required
            disabled={disabled || lockRoomDetails}
            name="roomNo"
            value={values.roomNo}
            onChange={handleChange}
            placeholder="Flat 3C"
          />
        </div>

        <div className="field">
          <label htmlFor="month">Month</label>
          <input
            id="month"
            required
            type="month"
            disabled={disabled}
            name="month"
            value={values.month}
            onChange={handleChange}
          />
        </div>

        <div className="field">
          <label htmlFor="fromDate">From</label>
          <input
            id="fromDate"
            required
            type="date"
            disabled={disabled}
            name="fromDate"
            value={values.fromDate}
            onChange={handleChange}
          />
        </div>

        <div className="field">
          <label htmlFor="toDate">To</label>
          <input
            id="toDate"
            required
            type="date"
            disabled={disabled}
            name="toDate"
            value={values.toDate}
            onChange={handleChange}
          />
        </div>

        <div className="field">
          <label htmlFor="meterFrom">Meter From</label>
          <input
            id="meterFrom"
            required
            min="0"
            type="number"
            disabled={disabled}
            name="meterFrom"
            value={values.meterFrom}
            onChange={handleChange}
          />
        </div>

        <div className="field">
          <label htmlFor="meterTo">Meter To</label>
          <input
            id="meterTo"
            required
            min="0"
            type="number"
            disabled={disabled}
            name="meterTo"
            value={values.meterTo}
            onChange={handleChange}
          />
        </div>

        <div className="field">
          <label htmlFor="rent">Rent</label>
          <input
            id="rent"
            required
            min="0"
            type="number"
            disabled={disabled}
            name="rent"
            value={values.rent}
            onChange={handleChange}
          />
        </div>

        <div className="field">
          <label htmlFor="paid">Paid</label>
          <input
            id="paid"
            required
            min="0"
            type="number"
            disabled={disabled}
            name="paid"
            value={values.paid}
            onChange={handleChange}
          />
        </div>

        <div className="actions">
          <button type="submit" className="btn-primary" disabled={disabled}>
            {editingId ? 'Update Record' : 'Save Record'}
          </button>
          <button
            type="button"
            className="btn-secondary"
            disabled={disabled}
            onClick={() => {
              setValues(externalValues)
              onReset()
            }}
          >
            Reset
          </button>
          {showClearAll ? (
            <button type="button" className="btn-danger" disabled={disabled} onClick={() => void onClearAll()}>
              Clear All
            </button>
          ) : null}
        </div>
      </form>

      <p className="note">
        Electricity rate = Rs 8 per unit. Bill is auto-calculated from meter reading and saved to the
        cloud database.
      </p>
    </section>
  )
}

export default RentForm
