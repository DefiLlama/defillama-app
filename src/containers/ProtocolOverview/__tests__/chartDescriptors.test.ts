import { describe, expect, it } from 'vitest'
import { ADAPTER_CHART_DESCRIPTORS } from '../chartDescriptors'

const expectedDescriptors = {
	Fees: {
		request: { adapterType: 'fees' },
		methodologyKey: 'Fees',
		clientQueryKey: 'fees',
		metricKeys: ['fees'],
		renderKind: 'feeFamily'
	},
	Revenue: {
		request: { adapterType: 'fees', dataType: 'dailyRevenue' },
		methodologyKey: 'Revenue',
		clientQueryKey: 'revenue',
		metricKeys: ['revenue'],
		renderKind: 'feeFamily'
	},
	'Holders Revenue': {
		request: { adapterType: 'fees', dataType: 'dailyHoldersRevenue' },
		methodologyKey: 'HoldersRevenue',
		clientQueryKey: 'holders-revenue',
		metricKeys: ['fees', 'revenue'],
		renderKind: 'feeFamily'
	},
	'DEX Volume': {
		request: { adapterType: 'dexs' },
		methodologyKey: 'dexs',
		clientQueryKey: 'dex-volume',
		metricKeys: ['dexs'],
		renderKind: 'bar'
	},
	'DEX Notional Volume': {
		request: { adapterType: 'dexs', dataType: 'dailyNotionalVolume' },
		methodologyKey: 'dexsNotionalVolume',
		clientQueryKey: 'dex-notional-volume',
		metricKeys: ['dexsNotionalVolume'],
		renderKind: 'bar'
	},
	'Perp Volume': {
		request: { adapterType: 'derivatives' },
		methodologyKey: 'perps',
		clientQueryKey: 'perp-volume',
		metricKeys: ['perps'],
		renderKind: 'bar'
	},
	'Open Interest': {
		request: { adapterType: 'open-interest', dataType: 'openInterestAtEnd' },
		methodologyKey: 'openInterest',
		clientQueryKey: 'open-interest',
		metricKeys: ['openInterest'],
		renderKind: 'line'
	},
	'Options Premium Volume': {
		request: { adapterType: 'options', dataType: 'dailyPremiumVolume' },
		methodologyKey: 'optionsPremiumVolume',
		clientQueryKey: 'options-premium-volume',
		metricKeys: ['optionsPremiumVolume'],
		renderKind: 'bar'
	},
	'Options Notional Volume': {
		request: { adapterType: 'options', dataType: 'dailyNotionalVolume' },
		methodologyKey: 'optionsNotionalVolume',
		clientQueryKey: 'options-notional-volume',
		metricKeys: ['optionsNotionalVolume'],
		renderKind: 'bar'
	},
	'DEX Aggregator Volume': {
		request: { adapterType: 'aggregators' },
		methodologyKey: 'dexAggregators',
		clientQueryKey: 'dex-aggregator-volume',
		metricKeys: ['dexAggregators'],
		renderKind: 'bar'
	},
	'Perp Aggregator Volume': {
		request: { adapterType: 'aggregator-derivatives' },
		methodologyKey: 'perpsAggregators',
		clientQueryKey: 'perp-aggregator-volume',
		metricKeys: ['perpsAggregators'],
		renderKind: 'bar'
	},
	'Bridge Aggregator Volume': {
		request: { adapterType: 'bridge-aggregators' },
		methodologyKey: 'bridgeAggregators',
		clientQueryKey: 'bridge-aggregator-volume',
		metricKeys: ['bridgeAggregators'],
		renderKind: 'bar'
	}
} as const

const descriptorsByLabel = Object.fromEntries(
	ADAPTER_CHART_DESCRIPTORS.map((descriptor) => [descriptor.label, descriptor])
)

describe('ProtocolOverview adapter chart descriptors', () => {
	it('maps each protocol chart label to the expected adapter request and methodology key', () => {
		expect(
			Object.fromEntries(
				ADAPTER_CHART_DESCRIPTORS.map(
					({ label, chartRequest, metricsRequest, methodologyKey, clientQueryKey, metricKeys, renderKind }) => [
						label,
						{ chartRequest, metricsRequest, methodologyKey, clientQueryKey, metricKeys, renderKind }
					]
				)
			)
		).toEqual(
			Object.fromEntries(
				Object.entries(expectedDescriptors).map(
					([label, { request, methodologyKey, clientQueryKey, metricKeys, renderKind }]) => [
						label,
						{ chartRequest: request, metricsRequest: request, methodologyKey, clientQueryKey, metricKeys, renderKind }
					]
				)
			)
		)
	})

	it('keeps the label lookup aligned with the descriptor list', () => {
		for (const descriptor of ADAPTER_CHART_DESCRIPTORS) {
			expect(descriptorsByLabel[descriptor.label]).toBe(descriptor)
		}
	})

	it('keeps same-data-type notional volume descriptors on separate adapters', () => {
		expect(descriptorsByLabel['DEX Notional Volume']?.chartRequest).toEqual({
			adapterType: 'dexs',
			dataType: 'dailyNotionalVolume'
		})
		expect(descriptorsByLabel['Options Notional Volume']?.chartRequest).toEqual({
			adapterType: 'options',
			dataType: 'dailyNotionalVolume'
		})
	})

	it('keeps fee-family descriptors on separate data types', () => {
		expect(descriptorsByLabel.Fees?.chartRequest).toEqual({ adapterType: 'fees' })
		expect(descriptorsByLabel.Revenue?.chartRequest).toEqual({
			adapterType: 'fees',
			dataType: 'dailyRevenue'
		})
		expect(descriptorsByLabel['Holders Revenue']?.chartRequest).toEqual({
			adapterType: 'fees',
			dataType: 'dailyHoldersRevenue'
		})
	})

	it('keeps perp volume and perp aggregator volume on separate adapter paths', () => {
		expect(descriptorsByLabel['Perp Volume']?.chartRequest).toEqual({
			adapterType: 'derivatives'
		})
		expect(descriptorsByLabel['Perp Aggregator Volume']?.chartRequest).toEqual({
			adapterType: 'aggregator-derivatives'
		})
	})
})
