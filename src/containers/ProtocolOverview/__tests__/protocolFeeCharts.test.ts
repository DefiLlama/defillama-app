import { describe, expect, it } from 'vitest'
import { buildProtocolFeeFamilyCharts, mergeProtocolFeeExtraChartSeries } from '../protocolFeeCharts'

describe('mergeProtocolFeeExtraChartSeries', () => {
	it('adds both enabled fee extras without overwriting the previous extra', () => {
		expect(
			mergeProtocolFeeExtraChartSeries({
				base: [
					[1, 100],
					[2, 200]
				],
				bribeRevenue: { 1: 10, 3: 30 },
				tokenTax: { 1: 3, 2: 20 },
				includeBribes: true,
				includeTokenTax: true
			})
		).toEqual([
			[1, 113],
			[2, 220],
			[3, 30]
		])
	})

	it('respects disabled fee-extra toggles', () => {
		expect(
			mergeProtocolFeeExtraChartSeries({
				base: [[1, 100]],
				bribeRevenue: { 1: 10 },
				tokenTax: { 1: 3 },
				includeBribes: false,
				includeTokenTax: true
			})
		).toEqual([[1, 103]])
	})
})

describe('buildProtocolFeeFamilyCharts', () => {
	it('returns base fee-family charts without enabled extras', () => {
		expect(
			buildProtocolFeeFamilyCharts({
				fees: [[1, 100]],
				revenue: [[1, 20]],
				holdersRevenue: [[1, 5]],
				bribes: null,
				tokenTaxes: null,
				groupBy: 'cumulative',
				denominationPriceHistory: null
			})
		).toEqual({
			fees: [[1000, 100]],
			revenue: [[1000, 20]],
			holdersRevenue: [[1000, 5]]
		})
	})

	it('fans enabled fee extras into every enabled fee-family base chart', () => {
		expect(
			buildProtocolFeeFamilyCharts({
				fees: [[1, 100]],
				revenue: [[1, 20]],
				holdersRevenue: [[1, 5]],
				bribes: [[1, 2]],
				tokenTaxes: [[86_400, 3]],
				groupBy: 'daily',
				denominationPriceHistory: null
			})
		).toEqual({
			fees: [
				[0, 102],
				[86_400_000, 3]
			],
			revenue: [
				[0, 22],
				[86_400_000, 3]
			],
			holdersRevenue: [
				[0, 7],
				[86_400_000, 3]
			]
		})
	})

	it('sums non-cumulative extras into daily and grouped bar buckets', () => {
		expect(
			buildProtocolFeeFamilyCharts({
				fees: [
					[100, 10],
					[200, 20]
				],
				revenue: null,
				holdersRevenue: null,
				bribes: [[300, 5]],
				tokenTaxes: null,
				groupBy: 'daily',
				denominationPriceHistory: null
			}).fees
		).toEqual([[0, 35]])

		expect(
			buildProtocolFeeFamilyCharts({
				fees: [[100, 10]],
				revenue: null,
				holdersRevenue: null,
				bribes: [[864_000, 5]],
				tokenTaxes: null,
				groupBy: 'monthly',
				denominationPriceHistory: null
			}).fees
		).toEqual([[0, 15]])
	})

	it('null-poisons non-cumulative buckets when an included extra lacks denomination price', () => {
		expect(
			buildProtocolFeeFamilyCharts({
				fees: [
					[100, 10],
					[86_500, 20]
				],
				revenue: null,
				holdersRevenue: null,
				bribes: [
					[200, 5],
					[86_600, 5]
				],
				tokenTaxes: null,
				groupBy: 'daily',
				denominationPriceHistory: { 100: 1, 86500: 1, 86600: 1 }
			}).fees
		).toEqual([
			[0, null],
			[86_400_000, 25]
		])
	})

	it('null-poisons denomination-missing buckets for enabled fee-family charts', () => {
		expect(
			buildProtocolFeeFamilyCharts({
				fees: [
					[1, 100],
					[2, 50],
					[3, 50]
				],
				revenue: [[1, 20]],
				holdersRevenue: null,
				bribes: [[2, 10]],
				tokenTaxes: null,
				groupBy: 'cumulative',
				denominationPriceHistory: { 1: 2, 3: 25 }
			})
		).toEqual({
			fees: [
				[1000, 50],
				[2000, null],
				[3000, 52]
			],
			revenue: [
				[1000, 10],
				[2000, null]
			],
			holdersRevenue: []
		})
	})

	it('preserves cumulative running totals for base charts and extras', () => {
		expect(
			buildProtocolFeeFamilyCharts({
				fees: [
					[1, 10],
					[2, 5]
				],
				revenue: null,
				holdersRevenue: null,
				bribes: [
					[1, 1],
					[2, 2]
				],
				tokenTaxes: null,
				groupBy: 'cumulative',
				denominationPriceHistory: null
			})
		).toEqual({
			fees: [
				[1000, 11],
				[2000, 18]
			],
			revenue: [],
			holdersRevenue: []
		})
	})

	it('carries cumulative extras through later unaligned base timestamps', () => {
		expect(
			buildProtocolFeeFamilyCharts({
				fees: [
					[100, 10],
					[300, 20]
				],
				revenue: null,
				holdersRevenue: null,
				bribes: [[200, 5]],
				tokenTaxes: null,
				groupBy: 'cumulative',
				denominationPriceHistory: null
			})
		).toEqual({
			fees: [
				[100_000, 10],
				[200_000, 15],
				[300_000, 35]
			],
			revenue: [],
			holdersRevenue: []
		})
	})

	it('does not create charts for disabled fee-family bases', () => {
		expect(
			buildProtocolFeeFamilyCharts({
				fees: null,
				revenue: [[1, 20]],
				holdersRevenue: null,
				bribes: [[1, 2]],
				tokenTaxes: null,
				groupBy: 'cumulative',
				denominationPriceHistory: null
			})
		).toEqual({
			fees: [],
			revenue: [[1000, 22]],
			holdersRevenue: []
		})
	})
})
