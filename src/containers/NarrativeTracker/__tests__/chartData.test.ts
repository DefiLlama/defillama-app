import { describe, expect, it } from 'vitest'
import { buildNarrativeTreemapTreeData, calculateDenominatedTimeSeries } from '../chartData'
import type { IPctChangeRow } from '../types'

function row(overrides: Partial<IPctChangeRow>): IPctChangeRow {
	return {
		id: overrides.id ?? overrides.name?.toLowerCase() ?? 'row',
		name: overrides.name ?? 'Row',
		mcap: overrides.mcap ?? 0,
		volume1D: overrides.volume1D ?? null,
		change1W: null,
		change1M: null,
		change1Y: null,
		changeYtd: null,
		...overrides
	}
}

describe('buildNarrativeTreemapTreeData', () => {
	it('groups rows by first-seen category while preserving child order', () => {
		expect(
			buildNarrativeTreemapTreeData([
				row({ name: 'Aave', categoryName: 'Lending', mcap: 100, returnField: 12.345 }),
				row({ name: 'Uniswap', categoryName: 'DEX', mcap: 50, returnField: -1.234 }),
				row({ name: 'Compound', categoryName: 'Lending', mcap: 25, returnField: null })
			])
		).toEqual([
			{
				value: [125, null, null],
				name: 'Lending',
				path: 'Lending',
				children: [
					{ value: [100, 12.35, 12.35], name: 'Aave', path: 'Lending/Aave' },
					{ value: [25, 0, 0], name: 'Compound', path: 'Lending/Compound' }
				]
			},
			{
				value: [50, null, null],
				name: 'DEX',
				path: 'DEX',
				children: [{ value: [50, -1.23, -1.23], name: 'Uniswap', path: 'DEX/Uniswap' }]
			}
		])
	})

	it('keeps the previous blank category path for rows without a category name', () => {
		expect(buildNarrativeTreemapTreeData([row({ name: 'Bitcoin', mcap: 500, returnField: Number.NaN })])).toEqual([
			{
				value: [500, null, null],
				name: '',
				path: '',
				children: [{ value: [500, 0, 0], name: 'Bitcoin', path: '/Bitcoin' }]
			}
		])
	})
})

describe('calculateDenominatedTimeSeries', () => {
	it('sorts rows and converts category returns relative to the selected denomination', () => {
		const result = calculateDenominatedTimeSeries(
			[
				{ date: 2, Bitcoin: 10, DeFi: 21, Gaming: -1 },
				{ date: 1, Bitcoin: 0, DeFi: 10, Gaming: 5 }
			],
			'Bitcoin'
		)

		expect(result.map((entry) => entry.date)).toEqual([1, 2])
		expect(result[0].DeFi).toBeCloseTo(10)
		expect(result[0].Gaming).toBeCloseTo(5)
		expect(result[0].Bitcoin).toBeUndefined()
		expect(result[1].DeFi).toBeCloseTo(10)
		expect(result[1].Gaming).toBeCloseTo(-10)
		expect(result[1].Bitcoin).toBeUndefined()
	})

	it('keeps sorted source rows when the first row lacks the selected denomination', () => {
		const rows = [
			{ date: 2, DeFi: 20, Bitcoin: 1 },
			{ date: 1, DeFi: 10 }
		]

		expect(calculateDenominatedTimeSeries(rows, 'Bitcoin')).toEqual([
			{ date: 1, DeFi: 10 },
			{ date: 2, DeFi: 20, Bitcoin: 1 }
		])
	})

	it('returns date-only rows when denomination performance is zero or missing for a day', () => {
		const result = calculateDenominatedTimeSeries(
			[
				{ date: 1, Bitcoin: 0, DeFi: 10 },
				{ date: 2, Bitcoin: -100, DeFi: 20 },
				{ date: 3, DeFi: 30 }
			],
			'Bitcoin'
		)

		expect(result[0].date).toBe(1)
		expect(result[0].DeFi).toBeCloseTo(10)
		expect(result[1]).toEqual({ date: 2 })
		expect(result[2]).toEqual({ date: 3 })
	})
})
