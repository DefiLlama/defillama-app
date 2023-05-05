import * as React from 'react'
import dynamic from 'next/dynamic'
import Image from 'next/future/image'
import Link from 'next/link'
import { useRouter } from 'next/router'
import styled from 'styled-components'
import {
	Panel,
	BreakpointPanels,
	BreakpointPanel,
	PanelHiddenMobile,
	ChartAndValuesWrapper,
	DownloadButton,
	DownloadIcon
} from '~/components'
import Announcement from '~/components/Announcement'
import { Denomination, Filters, Toggle, FiltersWrapper } from '~/components/ECharts/ProtocolChart/Misc'
import { ProtocolsTable } from '~/components/Table'
import { ProtocolsChainsSearch } from '~/components/Search'
import { RowLinksWithDropdown, TVLRange } from '~/components/Filters'
import SEO from '~/components/SEO'
import LocalLoader from '~/components/LocalLoader'
import { useDarkModeManager, useDefiManager } from '~/contexts/LocalStorage'
import { formattedNum, getPercentChange, getPrevTvlFromChart, getTokenDominance } from '~/utils'
import { chainCoingeckoIds } from '~/constants/chainTokens'
import { useDenominationPriceHistory, useGetProtocolsList } from '~/api/categories/protocols/client'
import llamaLogo from '~/assets/peeking-llama.png'
import { ListHeader, ListOptions } from './shared'
import { ArrowUpRight } from 'react-feather'
import { formatProtocolsList } from '~/hooks/data/defi'
import { getUtcDateObject } from '../ECharts/utils'

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

const DataWrapper = styled.div`
	display: flex;
	flex-direction: column;
	gap: 10px;
	position: relative;
	min-height: 500px;

	#chartWrapper {
		flex: 1;
	}

	@media screen and (min-width: 105rem) {
		flex-direction: row;
	}
`

const PanelWrapper = styled.div`
	display: flex;
	gap: 10px;
	flex: 1;

	@media screen and (min-width: 105rem) {
		flex-direction: column;
		max-width: 14%;
		min-width: 250px;
	}
`

const ToggleWrapper = styled.span`
	display: flex;
	align-items: center;
	gap: 8px;
	flex-wrap: wrap;
	margin-left: auto;
`

const ChainChart = dynamic(() => import('~/components/ECharts/ChainChart'), {
	ssr: false
})

const Game = dynamic(() => import('~/game'))

const BASIC_DENOMINATIONS = ['USD']

const setSelectedChain = (newSelectedChain) => (newSelectedChain === 'All' ? '/' : `/chain/${newSelectedChain}`)

function GlobalPage({
	selectedChain = 'All',
	chainsSet,
	protocolsList,
	chart,
	extraTvlCharts = {},
	volumeData,
	feesData,
	usersData
}) {
	const {
		fullProtocolsList,
		parentProtocols,
		isLoading: fetchingProtocolsList
	} = useGetProtocolsList({ chain: selectedChain })

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
	// const doublecounted = extraTvlCharts['doublecounted'][extraTvlCharts['doublecounted'].length - 1][1]
	// const liquidstaking = extraTvlCharts['liquidstaking'][extraTvlCharts['liquidstaking'].length - 1][1]
	// const overlap = extraTvlCharts['dcAndLsOverlap'][extraTvlCharts['dcAndLsOverlap'].length - 1][1]
	// console.log(['doublecounted', 'liquidstaking', 'total'])
	// console.log(['on', 'on', initialTvl])
	// console.log(['on', 'off', initialTvl - liquidstaking + overlap])
	// console.log(['off', 'on', initialTvl - doublecounted + overlap])
	// console.log(['off', 'off', initialTvl - doublecounted - liquidstaking + overlap])

	const { totalVolumeUSD, volumeChangeUSD, globalChart } = React.useMemo(() => {
		const globalChart = chart.map((data) => {
			let sum = data[1]
			Object.entries(extraTvlCharts).forEach(([prop, propCharts]) => {
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
	}, [chart, extraTvlsEnabled, extraTvlCharts])

	let chainOptions = ['All'].concat(chainsSet).map((label) => ({ label, to: setSelectedChain(label) }))

	const protocolTotals = React.useMemo(() => {
		if (!fetchingProtocolsList && fullProtocolsList) {
			const list = formatProtocolsList({ extraTvlsEnabled, protocols: fullProtocolsList, parentProtocols })

			return list
		}

		return protocolsList
	}, [extraTvlsEnabled, fetchingProtocolsList, fullProtocolsList, parentProtocols, protocolsList])

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

	const volumeChart = React.useMemo(
		() =>
			volumeData?.totalDataChart[0]?.[0][selectedChain]
				? volumeData?.totalDataChart?.[0].map((val) => [val.date, val[selectedChain]])
				: null,
		[volumeData, selectedChain]
	)

	const feesChart = React.useMemo(
		() =>
			feesData?.totalDataChart?.[0].length
				? feesData?.totalDataChart?.[0]?.map((val) => [val.date, val.Fees, val.Revenue])
				: null,
		[feesData?.totalDataChart]
	)

	const [finalTvlChart, finalVolumeChart, finalFeesChart] = React.useMemo(() => {
		if (denomination !== 'USD' && denominationPriceHistory && chainGeckoId) {
			const normalizedDenomination = Object.fromEntries(
				denominationPriceHistory.prices.map(([timestamp, price]) => [getUtcDateObject(timestamp / 1000), price])
			)

			const denominatedTvls = globalChart.map(([date, tvl]) => [
				date,
				tvl / normalizedDenomination[getUtcDateObject(date)]
			])

			const denominatedVolumes = volumeChart?.map(([date, volume]) => [
				date,
				volume / normalizedDenomination[getUtcDateObject(date)]
			])

			const denominatedFess = feesChart?.map(([date, fees, revenue]) => [
				date,
				fees / normalizedDenomination[getUtcDateObject(date)],
				revenue / normalizedDenomination[getUtcDateObject(date)]
			])

			return [denominatedTvls, denominatedVolumes, denominatedFess]
		} else return [globalChart, volumeChart, feesChart]
	}, [chainGeckoId, globalChart, denominationPriceHistory, denomination, volumeChart, feesChart])

	const priceHistory = React.useMemo(() => {
		return denominationPriceHistory?.prices.map(([timestamp, price]) => [timestamp / 1000, price])
	}, [denominationPriceHistory?.prices])

	const updateRoute = (key, val) => {
		router.push(
			{
				query: {
					...router.query,
					[key]: val
				}
			},
			undefined,
			{ shallow: true }
		)
	}

	React.useEffect(() => {
		if (selectedChain !== 'All' && !router.query.tvl) {
			updateRoute('tvl', 'true')
		}
	}, [])

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

			<Announcement>
				<Image
					src="https://icons.llamao.fi/icons/memes/gib.png?w=36&h=36"
					alt="Cute"
					width={18}
					height={18}
					unoptimized
					style={{ marginRight: '0.25rem', display: 'inline' }}
				/>
				{'  '}We've released our{' '}
				<Link href={`/nfts`}>
					<a>
						NFT dashboard <ArrowUpRight size={14} style={{ display: 'inline' }} />{' '}
					</a>
				</Link>
				{' !'}
			</Announcement>
			{selectedChain === 'zkSync Era' && (
				<Announcement warning={true}>
					DefiLlama doesn't whitelist/audit/endorse any protocols listed, we list everything. Exercise caution.
				</Announcement>
			)}

			<ProtocolsChainsSearch
				step={{
					category: 'Home',
					name: selectedChain === 'All' ? 'All Protocols' : selectedChain
				}}
			/>

			<DataWrapper>
				<PanelWrapper>
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
						{percentChange > 0 ? (
							<p style={{ '--tile-text-color': '#3cfd99' }}> {percentChange || 0}%</p>
						) : (
							<p style={{ '--tile-text-color': '#fd3c99' }}> {percentChange || 0}%</p>
						)}
					</PanelHiddenMobile>
					<PanelHiddenMobile>
						<h2>{topToken.name} Dominance</h2>
						<p style={{ '--tile-text-color': '#46acb7' }}> {dominance}%</p>
					</PanelHiddenMobile>
				</PanelWrapper>
				<BreakpointPanel id="chartWrapper" style={{ minHeight: '430px' }}>
					{!isLoading ? (
						<FiltersWrapper style={{ margin: 0, marginBottom: 'auto' }}>
							{DENOMINATIONS.length > 0 && (
								<Filters>
									{DENOMINATIONS.map((D) => (
										<Denomination active={denomination === D} key={D} onClick={() => updateRoute('currency', D)}>
											{D}
										</Denomination>
									))}
								</Filters>
							)}

							<ToggleWrapper>
								{[
									{
										id: 'tvl',
										name: 'TVL',
										isVisible: selectedChain !== 'All'
									},
									{
										id: 'volume',
										name: 'Volume',
										isVisible: !!finalVolumeChart
									},
									{
										id: 'fees',
										name: 'Fees',
										isVisible: !!finalFeesChart
									},
									{
										id: 'revenue',
										name: 'Revenue',
										isVisible: !!finalFeesChart
									},
									{
										id: 'price',
										name: 'Price',
										isVisible: Boolean(
											priceHistory &&
												denomination === 'USD' &&
												priceHistory?.[priceHistory?.length - 1][0] > globalChart?.[0][0]
										)
									},
									{
										id: 'users',
										name: 'Active Users',
										isVisible: usersData?.length > 0
									}
								].map(({ id, name, isVisible }) =>
									isVisible ? (
										<Toggle>
											<input
												key={id}
												type="checkbox"
												onClick={() => {
													updateRoute(id, router.query[id] === 'true' ? 'false' : 'true')
												}}
												checked={router.query[id] === 'true'}
											/>
											<span data-wrapper="true">
												<span>{name}</span>
											</span>
										</Toggle>
									) : (
										false
									)
								)}
							</ToggleWrapper>
						</FiltersWrapper>
					) : null}
					{easterEgg ? (
						<Game />
					) : isLoading ? (
						<LocalLoader style={{ margin: 'auto', minHeight: '360px' }} />
					) : (
						<ChainChart
							height="360px"
							chartData={finalTvlChart}
							volumeData={finalVolumeChart}
							feesData={finalFeesChart}
							priceData={priceHistory}
							usersData={usersData}
							customLegendName="Chain"
							hideDefaultLegend
							valueSymbol="$"
							title=""
							DENOMINATIONS={DENOMINATIONS}
							denomination={denomination}
							updateRoute={updateRoute}
							route={router.query}
						/>
					)}
				</BreakpointPanel>
				<EasterLlama onClick={activateEasterEgg}>
					<Image src={llamaLogo} width="41px" height="34px" alt="Activate Easter Egg" />
				</EasterLlama>
			</DataWrapper>

			<ListOptions>
				<ListHeader>TVL Rankings</ListHeader>
				<RowLinksWithDropdown links={chainOptions} activeLink={selectedChain} alternativeOthersText="Chains" />
				<TVLRange />
			</ListOptions>

			{finalProtocolTotals.length > 0 ? (
				<ProtocolsTable data={finalProtocolTotals} />
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
