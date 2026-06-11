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
