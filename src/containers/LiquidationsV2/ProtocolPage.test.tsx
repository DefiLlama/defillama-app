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

	return import('./ProtocolPage')
}

describe('LiquidationsProtocolPage', () => {
	it('renders protocol summary', async () => {
		const { LiquidationsProtocolPage } = await loadModule()
		const html = renderToStaticMarkup(
			<LiquidationsProtocolPage
				protocolLinks={[{ label: 'Overview', to: '/liquidations' }]}
				chainLinks={[{ label: 'All Chains', to: '/liquidations/aave-v3' }]}
				protocol="aave-v3"
				timestamp={100}
				chainCount={2}
				positionCount={3}
				collateralCount={4}
				chainRows={[]}
				positions={[]}
			/>
		)

		expect(html).toContain('aave-v3')
		expect(html).toContain('All Chains')
		expect(html).toContain('Collateral IDs')
		expect(html).toContain('chains table')
		expect(html).not.toContain('positions table')
	})
})
