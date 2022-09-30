import { useEffect } from 'react'
import dynamic from 'next/dynamic'
import { transparentize } from 'polished'
import Layout from '~/layout'
import { BreakpointPanel, BreakpointPanels, ChartAndValuesWrapper, Panel } from '~/components'
import { RowLinksWithDropdown } from '~/components/Filters'
import { NFTsSearch } from '~/components/Search'
import NFTCollectionList from '~/components/NFTCollectionList'
import SEO from '~/components/SEO'
import { ListHeader, ListOptions } from '~/components/ChainPage/shared'
import { formattedNum } from '~/utils'
import { NFT_SETTINGS, useNftsManager } from '~/contexts/LocalStorage'
import { chainCoingeckoIds, chainMarketplaceMappings } from '~/constants/chainTokens'

const defaultTab = {
	label: 'All',
	to: '/nfts'
}

const GlobalNFTChart = dynamic(() => import('~/components/GlobalNFTChart'), {
	ssr: false
})

const NFTDashboard = ({ title, statistics, collections, chart, chainData, marketplaceData, displayName = 'All' }) => {
	useEffect(() => window.scrollTo(0, 0), [])

	const { totalVolume, totalVolumeUSD, dailyVolume, dailyVolumeUSD, dailyChange } = statistics
	const [nftsSettings] = useNftsManager()
	const { DISPLAY_USD, HIDE_LAST_DAY } = NFT_SETTINGS

	const isChain = chainData ? true : false
	const selectedTab = displayName
	const setSelectedTab = (newSelectedTab) =>
		isChain ? `/nfts/chain/${newSelectedTab}` : `/nfts/marketplace/${newSelectedTab}`

	let tabOptions = [
		defaultTab,
		...(chainData || marketplaceData)
			?.sort((a, b) => parseInt(b.totalVolumeUSD) - parseInt(a.totalVolumeUSD))
			?.map((option) => ({
				label: option.displayName,
				to: isChain ? setSelectedTab(option.chain) : setSelectedTab(option.marketplace)
			}))
	]

	let shownTotalVolume, shownDailyVolume, shownDailyChange, symbol, unit
	let displayUsd = nftsSettings[DISPLAY_USD]

	const isHomePage = selectedTab === 'All'
	if (isHomePage || displayUsd) {
		;[shownTotalVolume, shownDailyVolume, shownDailyChange, symbol, unit] = [
			totalVolumeUSD,
			dailyVolumeUSD,
			dailyChange,
			'USD',
			'$'
		]
		displayUsd = true
	} else {
		;[shownTotalVolume, shownDailyVolume, shownDailyChange, symbol, unit] = [
			totalVolume,
			dailyVolume,
			dailyChange,
			isChain
				? chainCoingeckoIds[selectedTab]?.symbol
				: chainCoingeckoIds[chainMarketplaceMappings[selectedTab]]?.symbol,
			''
		]
	}

	if (nftsSettings[HIDE_LAST_DAY]) {
		if (chart.length >= 3 && displayUsd) {
			;[shownTotalVolume, shownDailyVolume, shownDailyChange] = [
				totalVolumeUSD - chart[chart.length - 1].volumeUSD,
				chart[chart.length - 2].volumeUSD,
				((chart[chart.length - 2].volumeUSD - chart[chart.length - 3].volumeUSD) / chart[chart.length - 3].volumeUSD) *
					100
			]
			chart = chart.slice(0, -1)
		} else if (chart.length >= 3) {
			;[shownTotalVolume, shownDailyVolume, shownDailyChange] = [
				totalVolume - chart[chart.length - 1].volume,
				chart[chart.length - 2].volume,
				((chart[chart.length - 2].volume - chart[chart.length - 3].volume) / chart[chart.length - 3].volume) * 100
			]
			chart = chart.slice(0, -1)
		}
	}

	const tvl = formattedNum(totalVolumeUSD, true)

	return (
		<Layout title={title} backgroundColor={transparentize(0.8, '#445ed0')}>
			<SEO cardName={displayName} chain={displayName} tvl={tvl} nftPage />

			<NFTsSearch preLoadedSearch={collections} step={{ category: 'NFTs', name: 'All collections' }} />

			<Panel as="p" style={{ textAlign: 'center', margin: '0', display: 'block' }}>
				Data is currently incorrect and we are fixing it, please don't use it
			</Panel>

			<ChartAndValuesWrapper>
				<BreakpointPanels>
					<BreakpointPanel>
						<h1>Total Volume</h1>
						<p style={{ '--tile-text-color': '#4f8fea' }}>{formattedNum(shownTotalVolume, displayUsd)}</p>
					</BreakpointPanel>
					<BreakpointPanel>
						<h2>Daily Volume</h2>
						<p style={{ '--tile-text-color': '#fd3c99' }}>{formattedNum(shownDailyVolume, displayUsd)}</p>
					</BreakpointPanel>
					<BreakpointPanel>
						<h2>Change (24h)</h2>
						<p style={{ '--tile-text-color': '#46acb7' }}>{shownDailyChange?.toFixed(2)}%</p>
					</BreakpointPanel>
				</BreakpointPanels>
				<BreakpointPanel id="chartWrapper">
					<GlobalNFTChart
						chartData={chart}
						dailyVolume={shownDailyVolume}
						dailyVolumeChange={shownDailyChange}
						symbol={symbol}
						unit={unit}
						displayUsd={displayUsd}
					/>
				</BreakpointPanel>
			</ChartAndValuesWrapper>

			<ListOptions>
				<ListHeader>NFT Rankings</ListHeader>
				<RowLinksWithDropdown links={tabOptions} activeLink={selectedTab} />
			</ListOptions>

			<NFTCollectionList collections={collections} displayUsd={displayUsd} />
		</Layout>
	)
}

export default NFTDashboard
