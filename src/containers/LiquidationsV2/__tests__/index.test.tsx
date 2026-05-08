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
	vi.doMock('../LiquidationsDistributionChart', () => ({
		LiquidationsDistributionChart: (props: unknown) => {
			chartSpy(props)
			return <div>distribution chart</div>
		}
	}))
	vi.doMock('../Table', () => ({
		LiquidationsProtocolsTable: () => <div>protocols table</div>,
		LiquidationsOverviewChainsTable: () => <div>chains table</div>
	}))

	return { chartSpy, ...(await import('../index')) }
}

describe('LiquidationsOverview', () => {
	it('renders overview counts', async () => {
		const { LiquidationsOverview, chartSpy } = await loadModule()
		const html = renderToStaticMarkup(
			<LiquidationsOverview
				protocolLinks={[{ label: 'Overview', to: '/liquidations' }]}
				timestamp={100}
				protocolCount={2}
				chainCount={3}
				positionCount={4}
				totalCollateralUsd={5000000}
				distributionChart={{ tokens: [] }}
				protocolRows={[]}
				chainRows={[]}
			/>
		)

		expect(html).toContain('Overview')
		expect(html).toContain('Protocols')
		expect(html).toContain('Chains')
		expect(html).toContain('Positions')
		expect(html).toContain('Collateral USD')
		expect(html).toContain('distribution chart')
		expect(html).toContain('protocols table')
		expect(html).not.toContain('chains table')
		expect(chartSpy).toHaveBeenCalledWith(
			expect.objectContaining({
				defaultBreakdownMode: 'protocol'
			})
		)
	})
})
