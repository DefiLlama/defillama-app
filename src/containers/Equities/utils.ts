import { abbreviateNumber, formattedNum } from '~/utils'

const equitiesDateFormatter = new Intl.DateTimeFormat(undefined, {
	month: 'short',
	day: 'numeric',
	year: 'numeric',
	timeZone: 'UTC'
})

const equitiesDateTimeFormatter = new Intl.DateTimeFormat(undefined, {
	month: 'short',
	day: 'numeric',
	year: 'numeric',
	hour: 'numeric',
	minute: '2-digit',
	timeZoneName: 'short'
})

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
	const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)
	if (!match) return value
	const [, year, month, day] = match
	return equitiesDateFormatter.format(Date.UTC(Number(year), Number(month) - 1, Number(day)))
}

export function formatEquitiesDateTime(value?: string | null): string {
	if (!value) return '-'
	const parsed = Date.parse(value)
	return Number.isNaN(parsed) ? value : equitiesDateTimeFormatter.format(parsed)
}
