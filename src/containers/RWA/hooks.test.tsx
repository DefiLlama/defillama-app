import * as React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { IRWAAssetsOverview } from './api.types'
import type { RWAChartAggregationMode } from './chartAggregation'
import { getRwaTickerChartQueryKey, useRwaChartDataset } from './hooks'

const useQueryMock = vi.fn()

vi.mock('@tanstack/react-query', () => ({
	useQuery: (options: unknown) => useQueryMock(options)
}))

const assets: IRWAAssetsOverview['assets'] = [
	{
		id: '1',
		ticker: 'AAA',
		assetName: 'Alpha',
		category: ['Treasuries'],
		parentPlatform: 'Centrifuge',
		trueRWA: false,
		onChainMcap: null,
		activeMcap: null,
		defiActiveTvl: null
	},
	{
		id: '2',
		ticker: 'BBB',
		assetName: 'Beta',
		category: ['Private Credit'],
		parentPlatform: 'Maple',
		trueRWA: false,
		onChainMcap: null,
		activeMcap: null,
		defiActiveTvl: null
	}
]

function DatasetProbe({ mode }: { mode: RWAChartAggregationMode }) {
	const { chartDataset } = useRwaChartDataset({
		selectedMetric: 'onChainMcap',
		initialDataset: { source: [], dimensions: ['timestamp'] },
		filteredAssets: assets,
		mode,
		target: { kind: 'all' },
		useInitialDataset: false
	})

	return React.createElement('pre', null, chartDataset.dimensions.join('|'))
}

describe('useRwaChartDataset', () => {
	beforeEach(() => {
		useQueryMock.mockReset()
		useQueryMock.mockReturnValue({
			data: [{ timestamp: 1, AAA: 100, BBB: 80 }],
			isLoading: false,
			error: null
		})
	})

	it('regroups cached ticker rows without changing the fetch key', () => {
		const categoryMarkup = renderToStaticMarkup(React.createElement(DatasetProbe, { mode: 'category' }))
		const platformMarkup = renderToStaticMarkup(React.createElement(DatasetProbe, { mode: 'platform' }))

		expect(categoryMarkup).toContain('timestamp|Treasuries|Private Credit')
		expect(platformMarkup).toContain('timestamp|Centrifuge|Maple')
		expect(useQueryMock).toHaveBeenCalledTimes(2)
		expect(useQueryMock.mock.calls[0][0]).toMatchObject({
			queryKey: getRwaTickerChartQueryKey({ kind: 'all' }, 'onChainMcap')
		})
		expect(useQueryMock.mock.calls[1][0]).toMatchObject({
			queryKey: getRwaTickerChartQueryKey({ kind: 'all' }, 'onChainMcap')
		})
	})
})
