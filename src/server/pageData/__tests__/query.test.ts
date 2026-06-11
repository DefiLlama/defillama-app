import { describe, expect, it } from 'vitest'
import { getCommaSeparatedQueryParam, getFirstQueryParam } from '../query'

describe('page data query helpers', () => {
	it('returns the first query param value', () => {
		expect(getFirstQueryParam(['first', 'second'])).toBe('first')
		expect(getFirstQueryParam('only')).toBe('only')
		expect(getFirstQueryParam(undefined)).toBeUndefined()
	})

	it('returns an empty list for missing comma-separated query params', () => {
		expect(getCommaSeparatedQueryParam(undefined)).toEqual([])
	})

	it('parses comma-separated query params', () => {
		expect(getCommaSeparatedQueryParam('staking, borrowed,,pool2')).toEqual(['staking', 'borrowed', 'pool2'])
	})

	it('flattens repeated comma-separated query params', () => {
		expect(getCommaSeparatedQueryParam(['staking, borrowed', ',pool2'])).toEqual(['staking', 'borrowed', 'pool2'])
	})
})
