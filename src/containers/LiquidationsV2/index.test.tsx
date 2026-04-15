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
		LiquidationsProtocolsTable: () => <div>protocols table</div>,
		LiquidationsOverviewChainsTable: () => <div>chains table</div>
	}))

	return import('./index')
}

describe('LiquidationsOverview', () => {
	it('renders overview counts', async () => {
		const { LiquidationsOverview } = await loadModule()
		const html = renderToStaticMarkup(
			<LiquidationsOverview
				protocolLinks={[{ label: 'Overview', to: '/liquidations' }]}
				timestamp={100}
				protocolCount={2}
				chainCount={3}
				positionCount={4}
				protocolRows={[]}
				chainRows={[]}
			/>
		)

		expect(html).toContain('Liquidations')
		expect(html).toContain('Protocols')
		expect(html).toContain('Chains')
		expect(html).toContain('Positions')
		expect(html).toContain('protocols table')
		expect(html).not.toContain('chains table')
	})
})
