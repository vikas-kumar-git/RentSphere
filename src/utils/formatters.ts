import type { PaymentStatus } from '../types'

const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
})

const dateFormatter = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

export function formatCurrency(value: number) {
  return currencyFormatter.format(value)
}

export function formatDate(value?: string) {
  if (!value) {
    return '-'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return dateFormatter.format(date)
}

export function getStatusLabel(status: PaymentStatus) {
  return status
}

export function getStatusClass(status: PaymentStatus) {
  if (status === 'Paid') {
    return 'paid'
  }

  if (status === 'Partial') {
    return 'partial'
  }

  return 'unpaid'
}

export function formatMonth(value: string) {
  if (!value) {
    return '-'
  }

  const [year, month] = value.split('-')

  if (!year || !month) {
    return value
  }

  const date = new Date(Number(year), Number(month) - 1, 1)
  return date.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
}
