import * as React from 'react'
import dynamic from 'next/dynamic'
import Image from 'next/image'
import styled from 'styled-components'
import {
	ProtocolsTable,
	Panel,
	BreakpointPanels,
	BreakpointPanel,
	PanelHiddenMobile,
	ChartAndValuesWrapper
} from '~/components'
import { RowFixed } from '~/components/Row'
import { DexsSearch } from '~/components/Search'
import { RowLinksWithDropdown, TVLRange } from '~/components/Filters'
import { BasicLink } from '~/components/Link'
import SEO from '~/components/SEO'
import { OptionButton } from '~/components/ButtonStyled'
import LocalLoader from '~/components/LocalLoader'
import { columnsToShow } from '~/components/Table'
import llamaLogo from '~/assets/peeking-llama.png'
import { ListHeader, ListOptions } from './shared'

const EasterLlama = styled.button`
	padding: 0;
	width: 41px;
	height: 34px;
	position: absolute;
	bottom: -36px;
	left: 0;

	img {
		width: 41px !important;
		height: 34px !important;
	}
`

const Chart = dynamic(() => import('~/components/GlobalChart'), {
	ssr: false
})

const Game = dynamic(() => import('~/game'))

const columns = columnsToShow(
	'protocolName',
	'category',
	'chains',
	'1dChange',
	'7dChange',
	'1mChange',
	'tvl',
	'mcaptvl'
)

function GlobalPage({ dex }) {
	return (
		<>
			<SEO cardName={dex.name} chain={dex.name} tvl={dex.total1dVolume} volumeChange={volumeChange} dexsPage />

			<DexsSearch
				step={{
					category: 'DEXs',
					name: category === 'All' ? 'All DEXs' : category
				}}
			/>

			<Panel as="p" style={{ textAlign: 'center', margin: '0', display: 'block' }}>
				<span> We've launched a multi-chain stablecoin dashboard. Check it out</span>{' '}
				<BasicLink style={{ textDecoration: 'underline' }} href="https://defillama.com/stablecoins">
					here
				</BasicLink>
				<span>!</span>
			</Panel>

			<ChartAndValuesWrapper>
				<BreakpointPanels>
					<BreakpointPanel>
						<h1>Total Value Locked (USD)</h1>
						<p style={{ '--tile-text-color': '#4f8fea' }}>{tvl}</p>
					</BreakpointPanel>
					<PanelHiddenMobile>
						<h2>Change (24h)</h2>
						<p style={{ '--tile-text-color': '#fd3c99' }}> {percentChange || 0}%</p>
					</PanelHiddenMobile>
					<PanelHiddenMobile>
						<h2>{topToken.name} Dominance</h2>
						<p style={{ '--tile-text-color': '#46acb7' }}> {dominance}%</p>
					</PanelHiddenMobile>
				</BreakpointPanels>
				<BreakpointPanel id="chartWrapper">
					<RowFixed>
						{DENOMINATIONS.map((option) => (
							<OptionButton
								active={denomination === option}
								onClick={() => updateRoute(option)}
								style={{ margin: '0 8px 8px 0' }}
								key={option}
							>
								{option}
							</OptionButton>
						))}
					</RowFixed>
					{easterEgg ? (
						<Game />
					) : isLoading ? (
						<LocalLoader style={{ margin: 'auto' }} />
					) : (
						<Chart
							display="liquidity"
							dailyData={finalChartData}
							unit={denomination}
							totalLiquidity={totalVolume}
							liquidityChange={volumeChangeUSD}
						/>
					)}
				</BreakpointPanel>
				<EasterLlama onClick={activateEasterEgg}>
					<Image src={llamaLogo} width="41px" height="34px" alt="Activate Easter Egg" />
				</EasterLlama>
			</ChartAndValuesWrapper>

			<ListOptions>
				<ListHeader>TVL Rankings</ListHeader>
				<RowLinksWithDropdown links={chainOptions} activeLink={selectedChain} />
				<TVLRange />
			</ListOptions>

			{finalProtocolTotals.length > 0 ? (
				<ProtocolsTable data={finalProtocolTotals} columns={columns} />
			) : (
				<Panel
					as="p"
					style={{ textAlign: 'center', margin: 0 }}
				>{`${selectedChain} chain has no protocols listed`}</Panel>
			)}
		</>
	)
}

export default GlobalPage
