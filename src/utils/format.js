export function formatWon(amount) {
  if (amount === null || amount === undefined) return '-'
  return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(amount)
}

export function formatWonShort(amount) {
  if (!amount) return '0'
  if (Math.abs(amount) >= 100000000) return `${(amount / 100000000).toFixed(1)}억`
  if (Math.abs(amount) >= 10000) return `${(amount / 10000).toFixed(0)}만`
  return amount.toLocaleString('ko-KR')
}

export function monthName(month) {
  return `${month}월`
}

export const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
