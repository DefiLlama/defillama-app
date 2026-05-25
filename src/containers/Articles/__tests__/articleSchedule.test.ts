import { describe, expect, it, vi } from 'vitest'
import { isScheduled } from '../articleSchedule'

describe('isScheduled', () => {
	it('returns true for draft with future goLiveAt', () => {
		vi.useFakeTimers()
		vi.setSystemTime(new Date('2026-01-01T12:00:00.000Z'))
		expect(
			isScheduled({
				status: 'draft',
				goLiveAt: '2026-06-01T09:00:00.000Z'
			})
		).toBe(true)
		vi.useRealTimers()
	})

	it('returns false for published articles', () => {
		expect(
			isScheduled({
				status: 'published',
				goLiveAt: '2026-06-01T09:00:00.000Z'
			})
		).toBe(false)
	})

	it('returns false when goLiveAt is in the past', () => {
		vi.useFakeTimers()
		vi.setSystemTime(new Date('2026-07-01T12:00:00.000Z'))
		expect(
			isScheduled({
				status: 'draft',
				goLiveAt: '2026-06-01T09:00:00.000Z'
			})
		).toBe(false)
		vi.useRealTimers()
	})

	it('returns false when goLiveAt is null', () => {
		expect(isScheduled({ status: 'draft', goLiveAt: null })).toBe(false)
	})
})
