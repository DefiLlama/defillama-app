import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(() => {
	vi.clearAllMocks()
	vi.resetModules()
})

async function loadModule() {
	vi.doMock('~/components/RowLinksWithDropdown', () => ({
		RowLinksWithDropdown: ({ activeLink }: { activeLink: string }) => <div>{activeLink}</div>
	}))
	vi.doMock('./Table', () => ({
		LiquidationsProtocolChainsTable: () => <div>chains table</div>,
		LiquidationsPositionsTable: () => <div>positions table</div>
	}))

	return import('./ChainPage')
}

describe('LiquidationsChainPage', () => {
	it('renders chain summary', async () => {
		const { LiquidationsChainPage } = await loadModule()
		const html = renderToStaticMarkup(
			<LiquidationsChainPage
				protocolLinks={[{ label: 'Overview', to: '/liquidations' }]}
				chainLinks={[{ label: 'All Chains', to: '/liquidations/aave-v3' }]}
				protocol="aave-v3"
				chain="ethereum"
				timestamp={100}
				positionCount={3}
				collateralCount={4}
				chainRows={[]}
				positions={[]}
			/>
		)

		expect(html).toContain('aave-v3')
		expect(html).toContain('ethereum')
		expect(html).toContain('Collateral IDs')
		expect(html).toContain('positions table')
		expect(html).not.toContain('chains table')
	})
})
