export const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const BLOCKED_HOURS_UTC = [0, 1, 2]
export const GMT_OFFSETS = [
	{ label: 'UTC-12', value: 'Etc/GMT+12' },
	{ label: 'UTC-11', value: 'Etc/GMT+11' },
	{ label: 'UTC-10', value: 'Etc/GMT+10' },
	{ label: 'UTC-9', value: 'Etc/GMT+9' },
	{ label: 'UTC-8', value: 'Etc/GMT+8' },
	{ label: 'UTC-7', value: 'Etc/GMT+7' },
	{ label: 'UTC-6', value: 'Etc/GMT+6' },
	{ label: 'UTC-5', value: 'Etc/GMT+5' },
	{ label: 'UTC-4', value: 'Etc/GMT+4' },
	{ label: 'UTC-3', value: 'Etc/GMT+3' },
	{ label: 'UTC-2', value: 'Etc/GMT+2' },
	{ label: 'UTC-1', value: 'Etc/GMT+1' },
	{ label: 'UTC', value: 'UTC' },
	{ label: 'UTC+1', value: 'Etc/GMT-1' },
	{ label: 'UTC+2', value: 'Etc/GMT-2' },
	{ label: 'UTC+3', value: 'Etc/GMT-3' },
	{ label: 'UTC+4', value: 'Etc/GMT-4' },
	{ label: 'UTC+5', value: 'Etc/GMT-5' },
	{ label: 'UTC+6', value: 'Etc/GMT-6' },
	{ label: 'UTC+7', value: 'Etc/GMT-7' },
	{ label: 'UTC+8', value: 'Etc/GMT-8' },
	{ label: 'UTC+9', value: 'Etc/GMT-9' },
	{ label: 'UTC+10', value: 'Etc/GMT-10' },
	{ label: 'UTC+11', value: 'Etc/GMT-11' },
	{ label: 'UTC+12', value: 'Etc/GMT-12' },
	{ label: 'UTC+13', value: 'Etc/GMT-13' },
	{ label: 'UTC+14', value: 'Etc/GMT-14' }
]

const parseOffsetHours = (value: string): number | null => {
	const normalized = value.replace('UTC', 'GMT')
	if (normalized === 'GMT') return 0
	const match = normalized.match(/GMT([+-]\d{1,2})/)
	if (!match) return null
	const hours = parseInt(match[1], 10)
	return Number.isNaN(hours) ? null : hours
}

const getOffsetHoursFromTimezone = (timezone: string): number | null => {
	try {
		const formatter = new Intl.DateTimeFormat('en-US', { timeZone: timezone, timeZoneName: 'shortOffset' })
		const parts = formatter.formatToParts(new Date())
		const tzPart = parts.find((p) => p.type === 'timeZoneName')?.value
		return tzPart ? parseOffsetHours(tzPart) : null
	} catch {
		return null
	}
}

const offsetHoursToEtc = (offsetHours: number): string | undefined => {
	if (offsetHours === 0) return 'UTC'
	// IANA `Etc/GMT` signs are inverted: UTC+8 is represented as `Etc/GMT-8`.
	const sign = offsetHours > 0 ? '-' : '+'
	const etcValue = `Etc/GMT${sign}${Math.abs(offsetHours)}`
	return GMT_OFFSETS.some((g) => g.value === etcValue) ? etcValue : undefined
}

const parseTimezoneFromExpression = (expression: string): string | undefined => {
	const etcMatch = expression.match(/\bEtc\/GMT[+-]\d{1,2}\b/)
	if (etcMatch && GMT_OFFSETS.some((g) => g.value === etcMatch[0])) return etcMatch[0]

	const offsetMatch = expression.match(/\b(?:GMT|UTC)[+-]\d{1,2}\b/)
	if (offsetMatch) {
		const offsetHours = parseOffsetHours(offsetMatch[0])
		if (offsetHours !== null) return offsetHoursToEtc(offsetHours)
	}

	if (/\bUTC\b/.test(expression)) return 'UTC'

	const ianaMatch = expression.match(/\b[A-Za-z]+\/[A-Za-z_]+\b/)
	if (ianaMatch) {
		const offsetHours = getOffsetHoursFromTimezone(ianaMatch[0])
		if (offsetHours !== null) return offsetHoursToEtc(offsetHours)
	}

	return undefined
}

export const parseScheduleExpression = (
	expression: string
): {
	hour?: number
	dayOfWeek?: number
	timezone?: string
} => {
	const hourMatch = expression.match(/at (\d+)/)
	const dayMatch = expression.match(/on (\w+)/)
	const hour = hourMatch ? parseInt(hourMatch[1], 10) : undefined
	let dayOfWeek: number | undefined
	if (dayMatch) {
		const idx = DAYS_OF_WEEK.findIndex((d) => d.toLowerCase() === dayMatch[1].toLowerCase())
		if (idx >= 0) dayOfWeek = idx
	}
	const timezone = parseTimezoneFromExpression(expression)
	return { hour, dayOfWeek, timezone }
}

export const getUserTimezone = (): string => {
	try {
		const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
		const offset = new Date().getTimezoneOffset()
		const hours = Math.floor(Math.abs(offset) / 60)
		const sign = offset <= 0 ? '-' : '+'
		const etcTz = `Etc/GMT${sign}${hours}`
		if (GMT_OFFSETS.some((g) => g.value === etcTz)) return etcTz
		if (GMT_OFFSETS.some((g) => g.value === tz)) return tz
		return 'UTC'
	} catch {
		return 'UTC'
	}
}

const convertHourToUTC = (localHour: number, timezone: string): number => {
	if (timezone === 'UTC') return localHour
	const match = timezone.match(/Etc\/GMT([+-])(\d+)/)
	if (match) {
		const sign = match[1] === '+' ? -1 : 1
		const offset = parseInt(match[2], 10)
		let utcHour = localHour - sign * offset
		if (utcHour < 0) utcHour += 24
		if (utcHour >= 24) utcHour -= 24
		return utcHour
	}
	return localHour
}

export const getBlockedLocalHours = (timezone: string): number[] => {
	// The backend blocks UTC maintenance hours; convert each selectable local
	// hour into UTC so the modal can disable only the affected local options.
	const blocked: number[] = []
	for (let h = 0; h < 24; h++) {
		const utcHour = convertHourToUTC(h, timezone)
		if (BLOCKED_HOURS_UTC.includes(utcHour)) {
			blocked.push(h)
		}
	}
	return blocked
}

const getFirstAvailableHour = (blockedHours: number[]): number | undefined => {
	for (let h = 0; h < 24; h++) {
		if (!blockedHours.includes(h)) return h
	}
	return undefined
}

export const getValidHourForTimezone = (hour: number, timezone: string): number => {
	const blockedHours = getBlockedLocalHours(timezone)
	if (!blockedHours.includes(hour)) return hour
	const firstAvailable = getFirstAvailableHour(blockedHours)
	return firstAvailable ?? hour
}

export const getTimezoneLabel = (timezone: string): string => {
	if (timezone === 'UTC') return 'UTC'
	const found = GMT_OFFSETS.find((g) => g.value === timezone)
	if (found) return found.label
	try {
		const now = new Date()
		const formatter = new Intl.DateTimeFormat('en-US', { timeZone: timezone, timeZoneName: 'shortOffset' })
		const parts = formatter.formatToParts(now)
		const tzPart = parts.find((p) => p.type === 'timeZoneName')
		if (tzPart?.value) {
			return tzPart.value.replace('GMT', 'UTC')
		}
	} catch {}
	return timezone
}

export const formatScheduleExpression = (expression: string): string => {
	return expression.replace(/([A-Za-z]+\/[A-Za-z_]+)/g, (match) => {
		return getTimezoneLabel(match)
	})
}
