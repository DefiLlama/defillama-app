import { describe, expect, it } from 'vitest'
import { parseAdapterBreakdownRequest } from './protocolCharts'

describe('parseAdapterBreakdownRequest', () => {
	it('accepts valid chain breakdown requests', () => {
		expect(
			parseAdapterBreakdownRequest({
				adapterType: 'dexs',
				protocol: 'spectra',
				type: 'chain'
			})
		).toEqual({
			ok: true,
			value: {
				adapterType: 'dexs',
				protocol: 'spectra',
				type: 'chain'
			}
		})
	})

	it('accepts valid version breakdown requests with dataType', () => {
		expect(
			parseAdapterBreakdownRequest({
				adapterType: 'fees',
				protocol: 'spectra',
				type: 'version',
				dataType: 'dailyRevenue'
			})
		).toEqual({
			ok: true,
			value: {
				adapterType: 'fees',
				protocol: 'spectra',
				type: 'version',
				dataType: 'dailyRevenue'
			}
		})
	})

	it('rejects invalid breakdown types', () => {
		expect(
			parseAdapterBreakdownRequest({
				adapterType: 'dexs',
				protocol: 'spectra',
				type: 'token'
			})
		).toEqual({
			ok: false,
			error: 'Invalid type: token'
		})
	})

	it('rejects invalid adapter types', () => {
		expect(
			parseAdapterBreakdownRequest({
				adapterType: 'invalid-adapter',
				protocol: 'spectra',
				type: 'chain'
			})
		).toEqual({
			ok: false,
			error: 'Invalid adapterType: invalid-adapter'
		})
	})

	it('rejects invalid adapter data types', () => {
		expect(
			parseAdapterBreakdownRequest({
				adapterType: 'dexs',
				protocol: 'spectra',
				type: 'chain',
				dataType: 'dailyInvalidMetric'
			})
		).toEqual({
			ok: false,
			error: 'Invalid dataType: dailyInvalidMetric'
		})
	})
})
