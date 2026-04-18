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

vi.mock('./LiquidationsDistributionChart', () => ({
	LiquidationsDistributionChart: (props: unknown) => {
		chartSpy(props)
		return <div>distribution chart</div>
	}
}))

vi.mock('./Table', () => ({
	LiquidationsProtocolChainsTable: () => <div>chains table</div>,
	LiquidationsPositionsTable: () => <div>positions table</div>
}))

import { LiquidationsProtocolPage } from './ProtocolPage'

afterEach(() => {
	chartSpy.mockReset()
	rowLinksSpy.mockReset()
})

describe('LiquidationsProtocolPage', () => {
	it('renders protocol summary', () => {
		const html = renderToStaticMarkup(
			<LiquidationsProtocolPage
				protocolLinks={[{ label: 'Overview', to: '/liquidations' }]}
				chainLinks={[
					{ label: 'All Chains', to: '/liquidations/sky' },
					{ label: 'Arbitrum One', to: '/liquidations/sky/arbitrum-one' },
					{ label: 'Ethereum', to: '/liquidations/sky/ethereum' }
				]}
				protocolId="maker"
				protocolName="Sky"
				protocolSlug="sky"
				timestamp={100}
				chainCount={2}
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
		expect(html).toContain('All Chains')
		expect(rowLinksSpy).toHaveBeenCalledTimes(2)
		expect(html).toContain('Tokens')
		expect(html).toContain('Collateral USD')
		expect(html).toContain('distribution chart')
		expect(html).toContain('chains table')
		expect(html).not.toContain('positions table')
		expect(html.indexOf('Collateral USD')).toBeLessThan(html.indexOf('Positions'))
		expect(chartSpy).toHaveBeenCalledWith(
			expect.objectContaining({
				allowedBreakdownModes: ['total', 'chain'],
				defaultBreakdownMode: 'chain'
			})
		)
	})

	it('hides the chain nav row when there is only all chains plus one chain', () => {
		renderToStaticMarkup(
			<LiquidationsProtocolPage
				protocolLinks={[{ label: 'Overview', to: '/liquidations' }]}
				chainLinks={[
					{ label: 'All Chains', to: '/liquidations/sky' },
					{ label: 'Tron', to: '/liquidations/sky/tron' }
				]}
				protocolId="maker"
				protocolName="Sky"
				protocolSlug="sky"
				timestamp={100}
				chainCount={1}
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
