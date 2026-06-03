export const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const BLOCKED_HOURS_UTC = [0, 1, 2]
const shortOffsetFormatters = new Map<string, Intl.DateTimeFormat>()
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

const getShortOffsetFormatter = (timezone: string): Intl.DateTimeFormat => {
	let formatter = shortOffsetFormatters.get(timezone)
	if (!formatter) {
		formatter = new Intl.DateTimeFormat('en-US', { timeZone: timezone, timeZoneName: 'shortOffset' })
		shortOffsetFormatters.set(timezone, formatter)
	}
	return formatter
}

const parseOffsetMinutes = (value: string): number | null => {
	const normalized = value.replace('UTC', 'GMT')
	if (normalized === 'GMT') return 0
	const match = normalized.match(/GMT([+-])(\d{1,2})(?::?(\d{2}))?/)
	if (!match) return null
	const hours = parseInt(match[2], 10)
	const minutes = match[3] ? parseInt(match[3], 10) : 0
	if (Number.isNaN(hours) || Number.isNaN(minutes) || minutes >= 60) return null
	const total = hours * 60 + minutes
	return match[1] === '-' ? -total : total
}

const getOffsetMinutesFromTimezone = (timezone: string): number | null => {
	try {
		const formatter = getShortOffsetFormatter(timezone)
		const parts = formatter.formatToParts(new Date())
		const tzPart = parts.find((p) => p.type === 'timeZoneName')?.value
		return tzPart ? parseOffsetMinutes(tzPart) : null
	} catch {
		return null
	}
}

const offsetMinutesToEtc = (offsetMinutes: number): string | undefined => {
	if (offsetMinutes % 60 !== 0) return undefined
	const offsetHours = offsetMinutes / 60
	if (offsetHours === 0) return 'UTC'
	// IANA `Etc/GMT` signs are inverted: UTC+8 is represented as `Etc/GMT-8`.
	const sign = offsetHours > 0 ? '-' : '+'
	const etcValue = `Etc/GMT${sign}${Math.abs(offsetHours)}`
	return GMT_OFFSETS.some((g) => g.value === etcValue) ? etcValue : undefined
}

const offsetMinutesToTimezoneToken = (offsetMinutes: number): string => {
	const etcValue = offsetMinutesToEtc(offsetMinutes)
	if (etcValue) return etcValue
	const sign = offsetMinutes >= 0 ? '+' : '-'
	const absMinutes = Math.abs(offsetMinutes)
	const hours = Math.floor(absMinutes / 60)
	const minutes = absMinutes % 60
	return `UTC${sign}${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

const parseTimezoneFromExpression = (expression: string): string | undefined => {
	const etcMatch = expression.match(/\bEtc\/GMT[+-]\d{1,2}\b/)
	if (etcMatch && GMT_OFFSETS.some((g) => g.value === etcMatch[0])) return etcMatch[0]

	const offsetMatch = expression.match(/\b(?:GMT|UTC)[+-]\d{1,2}(?::?\d{2})?\b/)
	if (offsetMatch) {
		const offsetMinutes = parseOffsetMinutes(offsetMatch[0])
		if (offsetMinutes !== null) return offsetMinutesToTimezoneToken(offsetMinutes)
	}

	if (/\bUTC\b/.test(expression)) return 'UTC'

	const ianaMatch = expression.match(/\b[A-Za-z_]+(?:\/[A-Za-z0-9_+-]+)+\b/)
	if (ianaMatch) {
		const offsetMinutes = getOffsetMinutesFromTimezone(ianaMatch[0])
		if (offsetMinutes !== null) return offsetMinutesToEtc(offsetMinutes) ?? ianaMatch[0]
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
	// Backend formatAlertExpression emits 12-hour AM/PM strings for saved alerts.
	const hourMatch = expression.match(/\bat\s+([01]?\d|2[0-3])(?::[0-5]\d)?(?:\s*(AM|PM))?\b/i)
	const dayMatch = expression.match(/on (\w+)/)
	let hour = hourMatch ? parseInt(hourMatch[1], 10) : undefined
	const period = hourMatch?.[2]?.toUpperCase()
	if (hour !== undefined && period) {
		if (period === 'AM' && hour === 12) hour = 0
		if (period === 'PM' && hour < 12) hour += 12
	}
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
		if (tz) return tz
		const offset = new Date().getTimezoneOffset()
		return offsetMinutesToTimezoneToken(-offset)
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
	const fixedOffsetMinutes = parseOffsetMinutes(timezone)
	if (fixedOffsetMinutes !== null) {
		let utcMinutes = localHour * 60 - fixedOffsetMinutes
		while (utcMinutes < 0) utcMinutes += 24 * 60
		while (utcMinutes >= 24 * 60) utcMinutes -= 24 * 60
		return Math.floor(utcMinutes / 60)
	}
	const offsetMinutes = getOffsetMinutesFromTimezone(timezone)
	if (offsetMinutes !== null) {
		let utcMinutes = localHour * 60 - offsetMinutes
		while (utcMinutes < 0) utcMinutes += 24 * 60
		while (utcMinutes >= 24 * 60) utcMinutes -= 24 * 60
		return Math.floor(utcMinutes / 60)
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
		const formatter = getShortOffsetFormatter(timezone)
		const parts = formatter.formatToParts(now)
		const tzPart = parts.find((p) => p.type === 'timeZoneName')
		if (tzPart?.value) {
			return tzPart.value.replace('GMT', 'UTC')
		}
	} catch {}
	return timezone
}

export const formatScheduleExpression = (expression: string): string => {
	return expression.replace(
		/\b(?:Etc\/GMT[+-]\d{1,2}|(?:GMT|UTC)[+-]\d{1,2}(?::?\d{2})?|[A-Za-z_]+(?:\/[A-Za-z0-9_+-]+)+)\b/g,
		(match) => {
			return getTimezoneLabel(match)
		}
	)
}
