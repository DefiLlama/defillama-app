import { describe, expect, it } from 'vitest'
import { ADAPTER_CHART_DESCRIPTORS, ADAPTER_CHART_DESCRIPTORS_BY_LABEL } from '../chartDescriptors'

const expectedDescriptors = {
	Fees: {
		request: { adapterType: 'fees' },
		methodologyKey: 'Fees'
	},
	Revenue: {
		request: { adapterType: 'fees', dataType: 'dailyRevenue' },
		methodologyKey: 'Revenue'
	},
	'Holders Revenue': {
		request: { adapterType: 'fees', dataType: 'dailyHoldersRevenue' },
		methodologyKey: 'HoldersRevenue'
	},
	'DEX Volume': {
		request: { adapterType: 'dexs' },
		methodologyKey: 'dexs'
	},
	'DEX Notional Volume': {
		request: { adapterType: 'dexs', dataType: 'dailyNotionalVolume' },
		methodologyKey: 'dexsNotionalVolume'
	},
	'Perp Volume': {
		request: { adapterType: 'derivatives' },
		methodologyKey: 'perps'
	},
	'Open Interest': {
		request: { adapterType: 'open-interest', dataType: 'openInterestAtEnd' },
		methodologyKey: 'openInterest'
	},
	'Options Premium Volume': {
		request: { adapterType: 'options', dataType: 'dailyPremiumVolume' },
		methodologyKey: 'optionsPremiumVolume'
	},
	'Options Notional Volume': {
		request: { adapterType: 'options', dataType: 'dailyNotionalVolume' },
		methodologyKey: 'optionsNotionalVolume'
	},
	'DEX Aggregator Volume': {
		request: { adapterType: 'aggregators' },
		methodologyKey: 'dexAggregators'
	},
	'Perp Aggregator Volume': {
		request: { adapterType: 'aggregator-derivatives' },
		methodologyKey: 'perpsAggregators'
	},
	'Bridge Aggregator Volume': {
		request: { adapterType: 'bridge-aggregators' },
		methodologyKey: 'bridgeAggregators'
	}
} as const

describe('ProtocolOverview adapter chart descriptors', () => {
	it('maps each protocol chart label to the expected adapter request and methodology key', () => {
		expect(
			Object.fromEntries(
				ADAPTER_CHART_DESCRIPTORS.map(({ label, chartRequest, metricsRequest, methodologyKey }) => [
					label,
					{ chartRequest, metricsRequest, methodologyKey }
				])
			)
		).toEqual(
			Object.fromEntries(
				Object.entries(expectedDescriptors).map(([label, { request, methodologyKey }]) => [
					label,
					{ chartRequest: request, metricsRequest: request, methodologyKey }
				])
			)
		)
	})

	it('keeps the label lookup aligned with the descriptor list', () => {
		for (const descriptor of ADAPTER_CHART_DESCRIPTORS) {
			expect(ADAPTER_CHART_DESCRIPTORS_BY_LABEL[descriptor.label]).toBe(descriptor)
		}
	})

	it('keeps same-data-type notional volume descriptors on separate adapters', () => {
		expect(ADAPTER_CHART_DESCRIPTORS_BY_LABEL['DEX Notional Volume']?.chartRequest).toEqual({
			adapterType: 'dexs',
			dataType: 'dailyNotionalVolume'
		})
		expect(ADAPTER_CHART_DESCRIPTORS_BY_LABEL['Options Notional Volume']?.chartRequest).toEqual({
			adapterType: 'options',
			dataType: 'dailyNotionalVolume'
		})
	})

	it('keeps fee-family descriptors on separate data types', () => {
		expect(ADAPTER_CHART_DESCRIPTORS_BY_LABEL.Fees?.chartRequest).toEqual({ adapterType: 'fees' })
		expect(ADAPTER_CHART_DESCRIPTORS_BY_LABEL.Revenue?.chartRequest).toEqual({
			adapterType: 'fees',
			dataType: 'dailyRevenue'
		})
		expect(ADAPTER_CHART_DESCRIPTORS_BY_LABEL['Holders Revenue']?.chartRequest).toEqual({
			adapterType: 'fees',
			dataType: 'dailyHoldersRevenue'
		})
	})

	it('keeps perp volume and perp aggregator volume on separate adapter paths', () => {
		expect(ADAPTER_CHART_DESCRIPTORS_BY_LABEL['Perp Volume']?.chartRequest).toEqual({
			adapterType: 'derivatives'
		})
		expect(ADAPTER_CHART_DESCRIPTORS_BY_LABEL['Perp Aggregator Volume']?.chartRequest).toEqual({
			adapterType: 'aggregator-derivatives'
		})
	})
})
