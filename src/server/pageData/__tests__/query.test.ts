import { describe, expect, it } from 'vitest'
import { getCommaSeparatedQueryParam } from '../query'

describe('page data query helpers', () => {
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
