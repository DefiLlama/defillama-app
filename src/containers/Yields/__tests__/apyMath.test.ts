import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { calculateApyNet7d, sumApyParts } from '../domain/apyMath'

describe('Yields APY math helpers', () => {
	it('sums APY components while preserving the both-missing null state', () => {
		expect(sumApyParts(null, null)).toBeNull()
		expect(sumApyParts(undefined, undefined)).toBeNull()
		expect(sumApyParts(-3, null)).toBe(-3)
		expect(sumApyParts(null, 1)).toBe(1)
		expect(sumApyParts(-3, 1)).toBe(-2)
	})

	it('calculates 7d net APY only when base and IL inputs are present', () => {
		expect(calculateApyNet7d(4, null)).toBeNull()
		expect(calculateApyNet7d(null, -0.01)).toBeNull()
		expect(calculateApyNet7d(0, -0.01)).toBeNull()
		expect(calculateApyNet7d(4, -0.01)).toBeCloseTo(3.48)
		expect(calculateApyNet7d(1, -3)).toBe(-100)
	})

	it('documents cached yields rows with base APY but missing IL produce no APY net value', () => {
		const fixturePath = path.join(process.cwd(), 'src/containers/Yields/__tests__/fixtures/yieldsRows.json')
		const rows = JSON.parse(readFileSync(fixturePath, 'utf8'))
		const missingIl = rows.find((row) => row.apyBase7d > 0 && row.il7d == null)

		expect(missingIl).toBeTruthy()
		expect(calculateApyNet7d(missingIl.apyBase7d, missingIl.il7d)).toBeNull()
	})
})
