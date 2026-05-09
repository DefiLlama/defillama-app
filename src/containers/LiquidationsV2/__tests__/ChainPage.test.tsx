import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

var chartSpy = vi.fn<(props: unknown) => void>()
var rowLinksSpy = vi.fn<(props: { activeLink: string }) => void>()

vi.mock('~/components/RowLinksWithDropdown', () => ({
	RowLinksWithDropdown: (props: { activeLink: string }) => {
		rowLinksSpy(props)
		return <div>{props.activeLink}</div>
	}
}))

vi.mock('../LiquidationsDistributionChart', () => ({
	LiquidationsDistributionChart: (props: unknown) => {
		chartSpy(props)
		return <div>distribution chart</div>
	}
}))

vi.mock('../Table', () => ({
	LiquidationsProtocolChainsTable: () => <div>chains table</div>,
	LiquidationsPositionsTable: () => <div>positions table</div>
}))

import { LiquidationsChainPage } from '../ChainPage'

afterEach(() => {
	chartSpy.mockReset()
	rowLinksSpy.mockReset()
})

describe('LiquidationsChainPage', () => {
	it('renders chain summary', () => {
		const html = renderToStaticMarkup(
			<LiquidationsChainPage
				protocolLinks={[{ label: 'Overview', to: '/liquidations' }]}
				chainLinks={[
					{ label: 'All Chains', to: '/liquidations/sky' },
					{ label: 'Arbitrum One', to: '/liquidations/sky/arbitrum-one' },
					{ label: 'Ethereum', to: '/liquidations/sky/ethereum' }
				]}
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
		expect(rowLinksSpy).toHaveBeenCalledTimes(2)
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

	it('hides the chain nav row when there is only all chains plus the active chain', () => {
		renderToStaticMarkup(
			<LiquidationsChainPage
				protocolLinks={[{ label: 'Overview', to: '/liquidations' }]}
				chainLinks={[
					{ label: 'All Chains', to: '/liquidations/sky' },
					{ label: 'Tron', to: '/liquidations/sky/tron' }
				]}
				protocolId="maker"
				protocolName="Sky"
				protocolSlug="sky"
				chainId="tron"
				chainName="Tron"
				chainSlug="tron"
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

		expect(rowLinksSpy).toHaveBeenCalledTimes(1)
		expect(rowLinksSpy).toHaveBeenCalledWith(expect.objectContaining({ activeLink: 'Sky' }))
	})
})
