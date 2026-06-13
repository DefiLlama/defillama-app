import { describe, expect, it } from 'vitest'
import { isSegment, recordBySegment, resolveSegment, segmentHasOi, SEGMENT_IDS } from '../segments'

describe('market segments', () => {
	it('derives segment ids from the segment definitions', () => {
		expect(SEGMENT_IDS).toEqual(['spot', 'linear_perp', 'inverse_perp'])
	})

	it('parses only known segment ids', () => {
		expect(isSegment('spot')).toBe(true)
		expect(isSegment('linear_perp')).toBe(true)
		expect(isSegment('inverse_perp')).toBe(true)
		expect(isSegment('linear')).toBe(false)
		expect(isSegment(null)).toBe(false)
	})

	it('derives OI support from the segment definitions', () => {
		expect(segmentHasOi('spot')).toBe(false)
		expect(segmentHasOi('linear_perp')).toBe(true)
		expect(segmentHasOi('inverse_perp')).toBe(true)
	})

	it('builds complete records for every segment', () => {
		expect(recordBySegment((segment) => `${segment}:value`)).toEqual({
			spot: 'spot:value',
			linear_perp: 'linear_perp:value',
			inverse_perp: 'inverse_perp:value'
		})
	})

	it('keeps an available requested segment', () => {
		expect(resolveSegment('linear_perp', ['spot', 'linear_perp'])).toBe('linear_perp')
	})

	it('falls back to the first available segment and preserves requested when none are available', () => {
		expect(resolveSegment('inverse_perp', ['spot', 'linear_perp'])).toBe('spot')
		expect(resolveSegment('inverse_perp', [])).toBe('inverse_perp')
	})
})
