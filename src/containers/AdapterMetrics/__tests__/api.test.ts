import { beforeEach, describe, expect, it, vi } from 'vitest'

const { fetchJsonMock } = vi.hoisted(() => ({
	fetchJsonMock: vi.fn()
}))

vi.mock('~/utils/async', () => ({
	fetchJson: fetchJsonMock
}))

import { fetchAdapterChainChartData, fetchAdapterChainMetrics } from '../api'
import { ADAPTER_DATA_TYPES, ADAPTER_TYPES } from '../constants'

describe('dimension adapter api telemetry', () => {
	beforeEach(() => {
		fetchJsonMock.mockReset()
	})

	it('adds dimension context to chain metric fetch telemetry', async () => {
		fetchJsonMock.mockResolvedValue({ protocols: [] })

		await fetchAdapterChainMetrics({
			adapterType: ADAPTER_TYPES.DEXS,
			chain: 'Litecoin',
			dataType: ADAPTER_DATA_TYPES.DAILY_VOLUME,
			category: 'Dexes'
		})

		expect(fetchJsonMock).toHaveBeenCalledWith(expect.stringContaining('/metrics/dexs/category/dexes/chain/litecoin'), {
			timeout: 30_000,
			telemetry: {
				attributes: {
					adapter_type: 'dexs',
					category: 'Dexes',
					chain: 'Litecoin',
					data_type: 'dailyVolume'
				}
			}
		})
	})

	it('adds dimension context to chain chart fetch telemetry', async () => {
		fetchJsonMock.mockResolvedValue([])

		await fetchAdapterChainChartData({
			adapterType: ADAPTER_TYPES.PERPS,
			chain: 'XDC',
			dataType: ADAPTER_DATA_TYPES.DAILY_VOLUME
		})

		expect(fetchJsonMock).toHaveBeenCalledWith(expect.stringContaining('/chart/derivatives/chain/xdc'), {
			timeout: 30_000,
			telemetry: {
				attributes: {
					adapter_type: 'derivatives',
					chain: 'XDC',
					data_type: 'dailyVolume'
				}
			}
		})
	})
})
