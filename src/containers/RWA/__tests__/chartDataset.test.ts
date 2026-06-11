import { describe, expect, it } from 'vitest'
import { limitRwaHorizontalBarData } from '../chartDataset'

describe('limitRwaHorizontalBarData', () => {
	it('clamps invalid maxBars to one bucket before limiting bars', () => {
		expect(
			limitRwaHorizontalBarData(
				[
					{ name: 'A', value: 3 },
					{ name: 'B', value: 2 },
					{ name: 'Others', value: 1 }
				],
				{ maxBars: 0 }
			)
		).toEqual([{ name: 'Others', value: 6 }])
	})
})
