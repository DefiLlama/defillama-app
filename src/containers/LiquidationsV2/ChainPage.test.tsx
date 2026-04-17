import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(() => {
	vi.clearAllMocks()
	vi.resetModules()
})

async function loadModule() {
	const chartSpy = vi.fn<(props: unknown) => void>()
	vi.doMock('~/components/RowLinksWithDropdown', () => ({
		RowLinksWithDropdown: ({ activeLink }: { activeLink: string }) => <div>{activeLink}</div>
	}))
	vi.doMock('./LiquidationsDistributionChart', () => ({
		LiquidationsDistributionChart: (props: unknown) => {
			chartSpy(props)
			return <div>distribution chart</div>
		}
	}))
	vi.doMock('./Table', () => ({
		LiquidationsProtocolChainsTable: () => <div>chains table</div>,
		LiquidationsPositionsTable: () => <div>positions table</div>
	}))

	return { chartSpy, ...(await import('./ChainPage')) }
}

describe('LiquidationsChainPage', () => {
	it('renders chain summary', async () => {
		const { LiquidationsChainPage, chartSpy } = await loadModule()
		const html = renderToStaticMarkup(
			<LiquidationsChainPage
				protocolLinks={[{ label: 'Overview', to: '/liquidations' }]}
				chainLinks={[{ label: 'All Chains', to: '/liquidations/sky' }]}
				protocolId="maker"
				protocolName="Sky"
				protocolSlug="sky"
				chainId="ethereum"
				chainName="Ethereum"
				chainSlug="ethereum"
				timestamp={100}
				positionCount={3}
				collateralCount={4}
				totalCollateralUsd={5000000}
				distributionChart={{ tokens: [] }}
				chainRows={[]}
				ownerBlockExplorers={[]}
				positions={[]}
			/>
		)

		expect(html).toContain('Sky')
		expect(html).toContain('Ethereum')
		expect(html).toContain('Tokens')
		expect(html).toContain('Collateral USD')
		expect(html).toContain('distribution chart')
		expect(html).toContain('positions table')
		expect(html).not.toContain('chains table')
		expect(chartSpy).toHaveBeenCalledWith(
			expect.objectContaining({
				allowedBreakdownModes: ['total']
			})
		)
	})
})
