import * as React from 'react'
import dynamic from 'next/dynamic'
import Image from 'next/image'
import { useRouter } from 'next/router'
import styled from 'styled-components'
import {
	ProtocolsTable,
	Panel,
	BreakpointPanels,
	BreakpointPanel,
	PanelHiddenMobile,
	ChartAndValuesWrapper,
	DownloadButton,
	DownloadIcon,
	PanelThicc,
	PanelSmol,
	StyledAnchor
} from '~/components'
import { RowFixed } from '~/components/Row'
import { ProtocolsChainsSearch } from '~/components/Search'
import { RowLinksWithDropdown, TVLRange } from '~/components/Filters'
import { BasicLink } from '~/components/Link'
import SEO from '~/components/SEO'
import { OptionButton } from '~/components/ButtonStyled'
import LocalLoader from '~/components/LocalLoader'
import { columnsToShow } from '~/components/Table'
import { useCalcProtocolsTvls } from '~/hooks/data'
import { useDarkModeManager, useDefiManager } from '~/contexts/LocalStorage'
import { formattedNum, getPercentChange, getPrevTvlFromChart, getTokenDominance } from '~/utils'
import { chainCoingeckoIds } from '~/constants/chainTokens'
import { useDenominationPriceHistory } from '~/api/categories/protocols/client'
import llamaLogo from '~/assets/peeking-llama.png'
import { ListHeader, ListOptions } from './shared'
import Link from 'next/link'
import { BarChart } from 'react-feather'

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

const BASIC_DENOMINATIONS = ['USD']

const setSelectedChain = (newSelectedChain) => (newSelectedChain === 'All' ? '/' : `/chain/${newSelectedChain}`)

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

function GlobalPage({
	selectedChain = 'All',
	chainsSet,
	filteredProtocols,
	chart,
	extraVolumesCharts = {},
	parentProtocols
}) {
	const [extraTvlsEnabled] = useDefiManager()

	const router = useRouter()

	const denomination = router.query?.currency ?? 'USD'

	const { minTvl, maxTvl } = router.query

	const [easterEgg, setEasterEgg] = React.useState(false)
	const [darkMode, toggleDarkMode] = useDarkModeManager()
	const activateEasterEgg = () => {
		if (easterEgg) {
			if (!darkMode) {
				toggleDarkMode()
			}
			window.location.reload()
		} else {
			if (darkMode) {
				toggleDarkMode()
			}
			setEasterEgg(true)
		}
	}

	// const initialTvl = chart[chart.length - 1][1]
	// const doublecounted = extraVolumesCharts['doublecounted'][extraVolumesCharts['doublecounted'].length - 1][1]
	// const liquidstaking = extraVolumesCharts['liquidstaking'][extraVolumesCharts['liquidstaking'].length - 1][1]
	// const overlap = extraVolumesCharts['dcAndLsOverlap'][extraVolumesCharts['dcAndLsOverlap'].length - 1][1]
	// console.log(['doublecounted', 'liquidstaking', 'total'])
	// console.log(['on', 'on', initialTvl])
	// console.log(['on', 'off', initialTvl - liquidstaking + overlap])
	// console.log(['off', 'on', initialTvl - doublecounted + overlap])
	// console.log(['off', 'off', initialTvl - doublecounted - liquidstaking + overlap])

	const { totalVolumeUSD, volumeChangeUSD, globalChart } = React.useMemo(() => {
		const globalChart = chart.map((data) => {
			let sum = data[1]
			Object.entries(extraVolumesCharts).forEach(([prop, propCharts]) => {
				const stakedData = propCharts.find((x) => x[0] === data[0])

				// find current date and only add values on that date in "data" above
				if (stakedData) {
					if (prop === 'doublecounted' && !extraTvlsEnabled['doublecounted']) {
						sum -= stakedData[1]
					}

					if (prop === 'liquidstaking' && !extraTvlsEnabled['liquidstaking']) {
						sum -= stakedData[1]
					}

					if (prop === 'dcAndLsOverlap') {
						if (!extraTvlsEnabled['doublecounted'] || !extraTvlsEnabled['liquidstaking']) {
							sum += stakedData[1]
						}
					}

					if (extraTvlsEnabled[prop.toLowerCase()] && prop !== 'doublecounted' && prop !== 'liquidstaking') {
						sum += stakedData[1]
					}
				}
			})
			return [data[0], sum]
		})

		const tvl = getPrevTvlFromChart(globalChart, 0)
		const tvlPrevDay = getPrevTvlFromChart(globalChart, 1)
		const volumeChangeUSD = getPercentChange(tvl, tvlPrevDay)

		return { totalVolumeUSD: tvl, volumeChangeUSD, globalChart }
	}, [chart, extraTvlsEnabled, extraVolumesCharts])

	let chainOptions = ['All'].concat(chainsSet).map((label) => ({ label, to: setSelectedChain(label) }))

	const protocolTotals = useCalcProtocolsTvls({ protocols: filteredProtocols, parentProtocols })

	const topToken = { name: 'Uniswap', tvl: 0 }
	if (protocolTotals.length > 0) {
		topToken.name = protocolTotals[0]?.name
		topToken.tvl = protocolTotals[0]?.tvl
		if (topToken.name === 'AnySwap') {
			topToken.name = protocolTotals[1]?.name
			topToken.tvl = protocolTotals[1]?.tvl
		}
	}

	const tvl = formattedNum(totalVolumeUSD, true)

	const percentChange = volumeChangeUSD?.toFixed(2)

	const volumeChange = (percentChange > 0 ? '+' : '') + percentChange + '%'

	const [DENOMINATIONS, chainGeckoId] = React.useMemo(() => {
		let DENOMINATIONS = []
		let chainGeckoId = null
		if (selectedChain !== 'All') {
			let chainDenomination = chainCoingeckoIds[selectedChain] ?? null

			chainGeckoId = chainDenomination?.geckoId ?? null

			if (chainGeckoId && chainDenomination.symbol) {
				DENOMINATIONS = [...BASIC_DENOMINATIONS, chainDenomination.symbol]
			}
		}
		return [DENOMINATIONS, chainGeckoId]
	}, [selectedChain])

	const { data: denominationPriceHistory, loading } = useDenominationPriceHistory(chainGeckoId)

	const [finalChartData, chainPriceInUSD] = React.useMemo(() => {
		if (denomination !== 'USD' && denominationPriceHistory && chainGeckoId) {
			let priceIndex = 0
			let prevPriceDate = 0
			const denominationPrices = denominationPriceHistory.prices
			const newChartData = []
			let priceInUSD = 1
			for (let i = 0; i < globalChart.length; i++) {
				const date = globalChart[i][0] * 1000
				while (
					priceIndex < denominationPrices.length &&
					Math.abs(date - prevPriceDate) > Math.abs(date - denominationPrices[priceIndex][0])
				) {
					prevPriceDate = denominationPrices[priceIndex][0]
					priceIndex++
				}
				priceInUSD = denominationPrices[priceIndex - 1][1]
				newChartData.push([globalChart[i][0], globalChart[i][1] / priceInUSD])
			}
			return [newChartData, priceInUSD]
		} else return [globalChart, 1]
	}, [chainGeckoId, globalChart, denominationPriceHistory, denomination])

	const updateRoute = (unit) => {
		router.push({
			query: {
				...router.query,
				currency: unit
			}
		})
	}

	const totalVolume = totalVolumeUSD / chainPriceInUSD

	const dominance = getTokenDominance(topToken, totalVolumeUSD)

	const isLoading = denomination !== 'USD' && loading

	const finalProtocolTotals = React.useMemo(() => {
		const isValidTvlRange =
			(minTvl !== undefined && !Number.isNaN(Number(minTvl))) || (maxTvl !== undefined && !Number.isNaN(Number(maxTvl)))

		return isValidTvlRange
			? protocolTotals.filter((p) => (minTvl ? p.tvl > minTvl : true) && (maxTvl ? p.tvl < maxTvl : true))
			: protocolTotals
	}, [minTvl, maxTvl, protocolTotals])

	return (
		<>
			<SEO cardName={selectedChain} chain={selectedChain} tvl={tvl} volumeChange={volumeChange} />

			<ProtocolsChainsSearch
				step={{
					category: 'Home',
					name: selectedChain === 'All' ? 'All Protocols' : selectedChain
				}}
			/>

			<>
				<PanelThicc as="p">
					We just launched our new
					<Link href={`/dexs`} passHref>
						<StyledAnchor>
							<BarChart size={18} />
							<b>DEX volume dashboard</b>
						</StyledAnchor>
					</Link>
					! Check it out now!
				</PanelThicc>
				<PanelSmol as="p">
					Check out our new
					<Link href={`/dexs`} passHref>
						<StyledAnchor>
							<BarChart size={18} />
							<b>DEX dashboard</b>
						</StyledAnchor>
					</Link>
					!
				</PanelSmol>
			</>

			<ChartAndValuesWrapper>
				<BreakpointPanels>
					<BreakpointPanel>
						<h1>Total Value Locked (USD)</h1>
						<p style={{ '--tile-text-color': '#4f8fea' }}>{tvl}</p>
						<DownloadButton
							href={`https://api.llama.fi/simpleChainDataset/${selectedChain}?${Object.entries(extraTvlsEnabled)
								.filter((t) => t[1] === true)
								.map((t) => `${t[0]}=true`)
								.join('&')}`}
						>
							<DownloadIcon />
							<span>&nbsp;&nbsp;.csv</span>
						</DownloadButton>
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
