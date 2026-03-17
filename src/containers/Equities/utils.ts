import dayjs from 'dayjs'

export function formatEquitiesDate(value?: string | null): string {
	if (!value) return '-'
	const parsed = dayjs(value)
	return parsed.isValid() ? parsed.format('MMM D, YYYY') : value
}

export function formatEquitiesDateTime(value?: string | null): string {
	if (!value) return '-'
	const parsed = dayjs(value)
	return parsed.isValid() ? parsed.format('MMM D, YYYY h:mm A') : value
}
