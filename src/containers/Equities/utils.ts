import dayjs from 'dayjs'
import { abbreviateNumber, formattedNum } from '~/utils'

export function formatCurrency(value: number | null): string {
	return value == null ? '-' : (abbreviateNumber(value, 2, '$') ?? '-')
}

export function formatNumber(value: number | null): string {
	return value == null ? '-' : (formattedNum(value, false) ?? '-')
}

export function formatText(value?: string | null): string {
	return value && value.trim().length > 0 ? value : '-'
}

export function formatPercent(value: number | null): string {
	return value == null ? '-' : `${formattedNum(value, false) ?? '0'}%`
}

export function formatEquitiesDate(value?: string | null): string {
	if (!value) return '-'
	const parsed = dayjs(value)
	return parsed.isValid() ? parsed.format('MMM D, YYYY') : value
}

export function formatEquitiesDateTime(value?: string | null): string {
	if (!value) return '-'
	const parsed = dayjs(value)
	return parsed.isValid() ? parsed.format('MMM D, YYYY, h:mm A') : value
}
