import { describe, expect, it } from 'vitest'
import {
	FEE_EXTRA_CONFIG_BY_SETTING,
	FEE_EXTRA_QUERY_PARAMS_BY_SETTING,
	addFeeExtrasToRowTotals,
	addOptionalFeeExtraTotal,
	getEnabledFeeExtraConfigs,
	mergeFeeExtraSeries
} from '../feeExtras'

describe('fee extra helpers', () => {
	it('uses enabled extras as the total when the base period is missing', () => {
		expect(addOptionalFeeExtraTotal(null, 10)).toBe(10)
		expect(addOptionalFeeExtraTotal(undefined, 10)).toBe(10)
		expect(addOptionalFeeExtraTotal(null, 0)).toBeNull()
		expect(addOptionalFeeExtraTotal(100, 10)).toBe(110)

		expect(
			addFeeExtrasToRowTotals(
				{
					total24h: null,
					total7d: 700,
					bribes: { total24h: 20, total7d: 70 },
					tokenTax: { total24h: 3, total7d: 7 }
				},
				{ bribes: true, tokentax: true }
			)
		).toMatchObject({
			total24h: 23,
			total7d: 777
		})
	})

	it('derives changes from base and enabled extra period totals', () => {
		const row = addFeeExtrasToRowTotals(
			{
				total24h: 100,
				total48hto24h: 80,
				total7d: 700,
				total14dto7d: 500,
				total30d: 3000,
				total60dto30d: 2000,
				total7DaysAgo: 90,
				total30DaysAgo: 75,
				change_1d: 999,
				change_7d: 999,
				change_1m: 999,
				change_7dover7d: 999,
				change_30dover30d: 999,
				bribes: {
					total24h: 20,
					total48hto24h: 10,
					total7d: 70,
					total14dto7d: 40,
					total30d: 300,
					total60dto30d: 100,
					total7DaysAgo: 10,
					total30DaysAgo: 5
				},
				tokenTax: {
					total24h: 3,
					total48hto24h: 5,
					total7d: 7,
					total14dto7d: 10,
					total30d: 30,
					total60dto30d: 20,
					total7DaysAgo: 3,
					total30DaysAgo: 4
				}
			},
			{ bribes: true, tokentax: true }
		)

		expect(row).toMatchObject({
			total24h: 123,
			total48hto24h: 95,
			total7d: 777,
			total14dto7d: 550,
			total30d: 3330,
			total60dto30d: 2120,
			total7DaysAgo: 103,
			total30DaysAgo: 84
		})
		expect(row.change_1d).toBeCloseTo(((123 - 95) / 95) * 100)
		expect(row.change_7d).toBeCloseTo(((123 - 103) / 103) * 100)
		expect(row.change_1m).toBeCloseTo(((123 - 84) / 84) * 100)
		expect(row.change_7dover7d).toBeCloseTo(((777 - 550) / 550) * 100)
		expect(row.change_30dover30d).toBeCloseTo(((3330 - 2120) / 2120) * 100)
	})

	it('merges extras into base series and keeps extras-only timestamps', () => {
		expect(
			mergeFeeExtraSeries({
				base: [
					[1, 100],
					[2, 200]
				],
				extraCharts: [
					[
						[1, 10],
						[3, 30]
					],
					[[2, 20]]
				]
			})
		).toEqual([
			[1, 110],
			[2, 220],
			[3, 30]
		])
	})

	it('exposes fee extra query param metadata', () => {
		expect(FEE_EXTRA_QUERY_PARAMS_BY_SETTING).toEqual({
			bribes: 'include_bribes_in_fees',
			tokentax: 'include_tokentax_in_fees'
		})
		expect(FEE_EXTRA_CONFIG_BY_SETTING.bribes).toMatchObject({
			protocolMetadataField: 'bribeRevenue',
			protocolMetricField: 'bribes',
			methodologyKey: 'BribesRevenue',
			clientQueryKey: 'bribes'
		})
		expect(FEE_EXTRA_CONFIG_BY_SETTING.tokentax).toMatchObject({
			protocolMetadataField: 'tokenTax',
			protocolMetricField: 'tokenTax',
			methodologyKey: 'TokenTaxes',
			clientQueryKey: 'token-taxes'
		})
	})

	it('iterates enabled fee extras in registry order', () => {
		expect(getEnabledFeeExtraConfigs({ tokentax: true, bribes: true }).map((extra) => extra.dataType)).toEqual([
			'dailyBribesRevenue',
			'dailyTokenTaxes'
		])
		expect(getEnabledFeeExtraConfigs({ bribes: true }).map((extra) => extra.queryParam)).toEqual([
			'include_bribes_in_fees'
		])
		expect(getEnabledFeeExtraConfigs({})).toEqual([])
	})
})
