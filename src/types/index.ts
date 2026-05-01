export type PaymentStatus = 'Paid' | 'Partial' | 'Unpaid'

export interface TenantRecord {
  id: string
  tenantName: string
  roomNo: string
  month: string
  fromDate: string
  toDate: string
  meterFrom: number
  meterTo: number
  units: number
  bill: number
  rent: number
  total: number
  paid: number
  due: number
  status: PaymentStatus
}

export interface RentFormValues {
  tenantName: string
  roomNo: string
  month: string
  fromDate: string
  toDate: string
  meterFrom: string
  meterTo: string
  rent: string
  paid: string
}

export interface SummaryMetric {
  label: string
  value: string
  tone?: 'neutral' | 'success' | 'warn' | 'danger'
}
