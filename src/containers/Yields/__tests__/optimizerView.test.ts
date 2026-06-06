import { describe, expect, it } from 'vitest'
import { parseAmountQuery } from '../views/OptimizerView'

describe('parseAmountQuery', () => {
	it('keeps finite URL amount values', () => {
		expect(parseAmountQuery('12.5')).toBe(12.5)
		expect(parseAmountQuery(['4'])).toBe(4)
	})

	it('falls back to zero for absent or nonnumeric URL amount values', () => {
		expect(parseAmountQuery(undefined)).toBe(0)
		expect(parseAmountQuery('abc')).toBe(0)
		expect(parseAmountQuery(['abc'])).toBe(0)
	})
})
