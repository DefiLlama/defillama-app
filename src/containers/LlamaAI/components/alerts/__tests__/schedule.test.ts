import { afterEach, describe, expect, it, vi } from 'vitest'
import {
	getBlockedLocalHours,
	getUserTimezone,
	parseScheduleExpression
} from '~/containers/LlamaAI/components/alerts/schedule'

describe('alert schedule helpers', () => {
	afterEach(() => {
		vi.restoreAllMocks()
	})

	it('keeps fractional-offset user timezones instead of rounding to a neighboring Etc/GMT zone', () => {
		vi.spyOn(Date.prototype, 'getTimezoneOffset').mockReturnValue(-330)
		vi.spyOn(Intl, 'DateTimeFormat').mockImplementation(
			() =>
				({
					resolvedOptions: () => ({ timeZone: 'Asia/Kolkata' })
				}) as Intl.DateTimeFormat
		)

		expect(getUserTimezone()).toBe('Asia/Kolkata')
	})

	it('ignores out-of-range schedule hours', () => {
		expect(parseScheduleExpression('Daily at 9:00 UTC')).toMatchObject({ hour: 9, timezone: 'UTC' })
		expect(parseScheduleExpression('Daily at 25:00 UTC')).toMatchObject({ hour: undefined, timezone: 'UTC' })
	})

	it('parses backend 12-hour AM/PM schedule strings', () => {
		expect(parseScheduleExpression('Daily at 12:00 AM UTC')).toMatchObject({ hour: 0, timezone: 'UTC' })
		expect(parseScheduleExpression('Daily at 12:00 PM UTC')).toMatchObject({ hour: 12, timezone: 'UTC' })
		expect(parseScheduleExpression('Daily at 9:00 PM UTC')).toMatchObject({ hour: 21, timezone: 'UTC' })
	})

	it('parses multi-segment IANA zones and whole-hour fixed offsets', () => {
		expect(parseScheduleExpression('Daily at 9:00 America/Argentina/Buenos_Aires')).toMatchObject({
			hour: 9,
			timezone: 'Etc/GMT+3'
		})
		expect(parseScheduleExpression('Daily at 9:00 UTC+5')).toMatchObject({ hour: 9, timezone: 'Etc/GMT-5' })
	})

	it('converts IANA fractional-offset zones when computing blocked local hours', () => {
		expect(getBlockedLocalHours('Asia/Kolkata')).toEqual(expect.arrayContaining([6, 7, 8]))
	})
})
