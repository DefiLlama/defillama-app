import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import type { IRWAAssetData } from '../api.types'
import { RWAAssetPage } from '../Asset'

vi.mock('~/containers/Yields/queries/client', () => ({
	useYieldChartData: () => ({ data: null, isLoading: false })
}))

const baseAsset: IRWAAssetData = {
	id: 'intcon',
	slug: 'INTCon',
	ticker: 'INTCon',
	assetName: 'INTCon',
	trueRWA: true,
	onChainMcap: null,
	activeMcap: null,
	defiActiveTvl: null,
	rwaClassificationDescription: null,
	accessModelDescription: null,
	assetClassDescriptions: {},
	contractUrls: null,
	chartDataset: null,
	yieldPools: null,
	yieldPoolsTotal: null,
	nativeYieldPoolId: null,
	nativeYieldCurrent: null
}

describe('RWAAssetPage', () => {
	it('links category names to RWA category pages', () => {
		const html = renderToStaticMarkup(<RWAAssetPage asset={{ ...baseAsset, category: ['Private Credit'] }} />)

		expect(html).toContain('href="/rwa/category/private-credit"')
		expect(html).toContain('Private Credit')
	})

	it('links parent platform names to RWA platform pages', () => {
		const html = renderToStaticMarkup(
			<RWAAssetPage asset={{ ...baseAsset, parentPlatform: [' Plume Network ', 'Plume Network'] }} />
		)

		expect(html).toContain('Parent Platform')
		expect(html).toContain('href="/rwa/platform/plume-network"')
		expect(html).toContain('Plume Network')
		expect(html.match(/href="\/rwa\/platform\/plume-network"/g)).toHaveLength(1)
	})

	it('keeps hiding parent platform when no platform name exists', () => {
		const html = renderToStaticMarkup(<RWAAssetPage asset={{ ...baseAsset, parentPlatform: [' ', ''] }} />)

		expect(html).not.toContain('Parent Platform')
		expect(html).not.toContain('/rwa/platform/')
	})
})
