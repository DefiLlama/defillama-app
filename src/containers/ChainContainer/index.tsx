import * as React from 'react'
import styled from 'styled-components'
import Announcement from '~/components/Announcement'
import { ProtocolsChainsSearch } from '~/components/Search'
import { RowLinksWithDropdown, TVLRange } from '~/components/Filters'
import { ProtocolsTable } from '~/components/Table'
import { useRouter } from 'next/router'
import { useDarkModeManager, useDefiManager } from '~/contexts/LocalStorage'
import { useDenominationPriceHistory, useGetProtocolsList } from '~/api/categories/protocols/client'
import { formatProtocolsList } from '~/hooks/data/defi'
import { ListHeader, ListOptions } from '~/components/ChainPage/shared'
import { StatsSection } from '~/layout/Stats/Medium'
import LocalLoader from '~/components/LocalLoader'
import dynamic from 'next/dynamic'
import { chainCoingeckoIds } from '~/constants/chainTokens'
import { getUtcDateObject } from '~/components/ECharts/utils'
import { formattedNum, getPercentChange, getPrevTvlFromChart, getTokenDominance } from '~/utils'
import { useBuildPeggedChartData } from '~/utils/stablecoins'
import { Denomination, Filters, Toggle, FiltersWrapper } from '~/components/ECharts/ProtocolChart/Misc'
import Image from 'next/future/image'
import llamaLogo from '~/assets/peeking-llama.png'
import { DetailsWrapper } from '~/layout/ProtocolAndPool'
import { Stat } from '~/layout/Stats/Large'
import { DownloadIcon } from '~/components'

const ChainChart: any = dynamic(() => import('~/components/ECharts/ChainChart'), {
	ssr: false
})

const Game: any = dynamic(() => import('~/game'))

const updateRoute = (key, val, router) => {
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

export function ChainContainer({
	selectedChain = 'All',
	chainOptions,
	protocolsList,
	chart,
	extraTvlCharts = {},
	usersData,
	txsData,
	stablecoinsData = {},
	chainProtocolsVolumes,
	chainProtocolsFees,
	bridgeChartData,
	volumeChart,
	feesChart,
	raisesChart
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

	let CHAIN_SYMBOL = null
	let chainGeckoId = null

	if (selectedChain !== 'All') {
		let chainDenomination = chainCoingeckoIds[selectedChain] ?? null

		chainGeckoId = chainDenomination?.geckoId ?? null

		if (chainGeckoId && chainDenomination.symbol) {
			CHAIN_SYMBOL = chainDenomination.symbol
		}
	}

	const { data: denominationPriceHistory, loading: fetchingDenominationPriceHistory } =
		useDenominationPriceHistory(chainGeckoId)
	const isLoadingChartData = denomination !== 'USD' && fetchingDenominationPriceHistory

	const { totalVauleUSD, valueChangeUSD, globalChart } = React.useMemo(() => {
		const globalChart = chart.map((data) => {
			let sum = data[1]
			Object.entries(extraTvlCharts).forEach(([prop, propCharts]: [string, Array<[number, number]>]) => {
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
		const valueChangeUSD = getPercentChange(tvl, tvlPrevDay)

		return { totalVauleUSD: tvl, valueChangeUSD, globalChart }
	}, [chart, extraTvlsEnabled, extraTvlCharts])

	const { peggedAreaTotalData } = useBuildPeggedChartData(
		(stablecoinsData as any)?.chartDataByPeggedAsset,
		(stablecoinsData as any)?.peggedAssetNames,
		Object.values((stablecoinsData as any)?.peggedNameToChartDataIndex || {}),
		'mcap',
		(stablecoinsData as any)?.chainTVLData,
		selectedChain
	)

	const { DENOMINATIONS, chartOptions, chartDatasets } = React.useMemo(() => {
		const priceHistory =
			denomination === 'USD' && denominationPriceHistory?.prices
				? denominationPriceHistory?.prices.map(([timestamp, price]) => [timestamp / 1000, price])
				: null

		const DENOMINATIONS = CHAIN_SYMBOL ? ['USD', CHAIN_SYMBOL] : ['USD']

		const isNonUSDDenomination = denomination !== 'USD' && denominationPriceHistory && chainGeckoId

		const normalizedDenomination = isNonUSDDenomination
			? Object.fromEntries(
					denominationPriceHistory.prices.map(([timestamp, price]) => [getUtcDateObject(timestamp / 1000), price])
			  )
			: []

		const finalTvlChart = isNonUSDDenomination
			? globalChart.map(([date, tvl]) => [date, tvl / normalizedDenomination[getUtcDateObject(date)]])
			: globalChart

		const finalVolumeChart = isNonUSDDenomination
			? volumeChart?.map(([date, volume]) => [date, volume / normalizedDenomination[getUtcDateObject(date)]])
			: volumeChart

		const finalFeesChart = isNonUSDDenomination
			? feesChart?.map(([date, fees, revenue]) => [
					date,
					fees / normalizedDenomination[getUtcDateObject(date)],
					revenue / normalizedDenomination[getUtcDateObject(date)]
			  ])
			: feesChart

		const chartDatasets = [
			{
				feesChart: finalFeesChart,
				volumeChart: finalVolumeChart,
				bridgeChartData,
				chainProtocolsFees,
				chainProtocolsVolumes,
				globalChart: finalTvlChart,
				raisesData: raisesChart,
				totalStablesData: peggedAreaTotalData,
				bridgeData: bridgeChartData,
				usersData: usersData,
				txsData: txsData
			}
		]

		const chartOptions = [
			{
				id: 'tvl',
				name: 'TVL',
				isVisible: true
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
					priceHistory && denomination === 'USD' && priceHistory?.[priceHistory?.length - 1][0] > globalChart?.[0][0]
				) /* TODO fix flashing */
			},
			{
				id: 'users',
				name: 'Active Users',
				isVisible: usersData?.length > 0
			},
			{
				id: 'txs',
				name: 'Transactions',
				isVisible: txsData?.length > 0
			},
			{
				id: 'raises',
				name: 'Raises',
				isVisible: selectedChain === 'All'
			},
			{
				id: 'stables',
				name: 'Stablecoins',
				isVisible: peggedAreaTotalData && peggedAreaTotalData?.length > 0
			},
			{
				id: 'inflows',
				name: 'Inflows',
				isVisible: bridgeChartData && bridgeChartData?.length && selectedChain !== 'All'
			}
		]

		return {
			DENOMINATIONS,
			chartOptions,
			chartDatasets
		}
	}, [
		chainGeckoId,
		globalChart,
		denominationPriceHistory,
		denomination,
		volumeChart,
		feesChart,
		CHAIN_SYMBOL,
		bridgeChartData,
		selectedChain,
		peggedAreaTotalData,
		chainProtocolsFees,
		chainProtocolsVolumes,
		raisesChart,
		txsData,
		usersData
	])

	const finalProtocolsList = React.useMemo(() => {
		const list =
			!fetchingProtocolsList && fullProtocolsList
				? formatProtocolsList({
						extraTvlsEnabled,
						protocols: fullProtocolsList,
						parentProtocols,
						volumeData: chainProtocolsVolumes,
						feesData: chainProtocolsFees
				  })
				: protocolsList

		const isValidTvlRange =
			(minTvl !== undefined && !Number.isNaN(Number(minTvl))) || (maxTvl !== undefined && !Number.isNaN(Number(maxTvl)))

		return isValidTvlRange
			? list.filter((p) => (minTvl ? p.tvl > minTvl : true) && (maxTvl ? p.tvl < maxTvl : true))
			: list
	}, [
		extraTvlsEnabled,
		fetchingProtocolsList,
		fullProtocolsList,
		parentProtocols,
		protocolsList,
		chainProtocolsVolumes,
		chainProtocolsFees,
		minTvl,
		maxTvl
	])

	const topToken = { name: 'Uniswap', tvl: 0 }
	if (finalProtocolsList.length > 0) {
		topToken.name = finalProtocolsList[0]?.name
		topToken.tvl = finalProtocolsList[0]?.tvl
		if (topToken.name === 'AnySwap') {
			topToken.name = finalProtocolsList[1]?.name
			topToken.tvl = finalProtocolsList[1]?.tvl
		}
	}

	const tvl = formattedNum(totalVauleUSD, true)
	const percentChange = valueChangeUSD?.toFixed(2)
	const dominance = getTokenDominance(topToken, totalVauleUSD)

	return (
		<>
			{/* <SEO cardName={selectedChain} chain={selectedChain} tvl={tvl as string} volumeChange={volumeChange} /> */}

			{/*<Announcement>
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
			</Announcement>*/}

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

			<Wrapper>
				<ChainsSelect>
					<RowLinksWithDropdown
						links={chainOptions}
						activeLink={selectedChain}
						alternativeOthersText="Chains"
						variant="secondary"
					/>
				</ChainsSelect>

				<StatsSection>
					<OverallMetricsWrapper>
						<StatWithDownloadOption>
							<span>Total Value Locked</span>
							<span>{tvl}</span>
							<a
								href={`https://api.llama.fi/simpleChainDataset/${selectedChain}?${Object.entries(extraTvlsEnabled)
									.filter((t) => t[1] === true)
									.map((t) => `${t[0]}=true`)
									.join('&')}`}
								target="_blank"
								rel="noreferrer"
								data-download
							>
								<DownloadIcon />
								<span>&nbsp;&nbsp;.csv</span>
							</a>
						</StatWithDownloadOption>

						<Stat>
							<span>Change (24h)</span>
							<span>{percentChange || 0}%</span>
						</Stat>

						<Stat>
							<span>{topToken.name} Dominance</span>
							<span>{dominance}%</span>
						</Stat>
					</OverallMetricsWrapper>

					<ChartWrapper>
						{easterEgg ? (
							<Game />
						) : isLoadingChartData ? (
							<LocalLoader style={{ margin: 'auto', minHeight: '360px' }} />
						) : (
							<>
								<FiltersWrapper>
									<ToggleWrapper>
										{chartOptions.map(({ id, name, isVisible }) =>
											isVisible &&
											(isLoadingChartData === false || selectedChain === 'All' || chainGeckoId === null) ? (
												<Toggle>
													<input
														key={id}
														type="checkbox"
														onClick={() => {
															updateRoute(id, router.query[id] === 'true' ? 'false' : 'true', router)
														}}
														checked={id === 'tvl' ? router.query[id] !== 'false' : router.query[id] === 'true'}
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

									{/* {selectedChain !== 'All' ? (
										<Toggle style={{ marginRight: 'auto' }}>
											<input
												type="checkbox"
												onClick={() => {
													window.open(`/compare?chains=${selectedChain}`)
												}}
												checked={true}
											/>
											<span data-wrapper="true">
												<span>Compare chain</span>
											</span>
										</Toggle>
									) : null} */}

									{DENOMINATIONS.length > 1 && (
										<Filters>
											{DENOMINATIONS.map((D) => (
												<Denomination
													active={denomination === D}
													key={D}
													onClick={() => updateRoute('currency', D, router)}
												>
													{D}
												</Denomination>
											))}
										</Filters>
									)}
								</FiltersWrapper>

								{router.isReady && (
									<ChainChart
										height="360px"
										datasets={chartDatasets}
										customLegendName="Chain"
										hideDefaultLegend
										valueSymbol="$"
										title=""
										DENOMINATIONS={DENOMINATIONS}
										denomination={denomination}
										updateRoute={updateRoute}
										hideTooltip={selectedChain === 'All'}
									/>
								)}
							</>
						)}
					</ChartWrapper>
					<EasterLlama onClick={activateEasterEgg}>
						<Image src={llamaLogo} width="41px" height="34px" alt="Activate Easter Egg" />
					</EasterLlama>
				</StatsSection>

				<ListOptions style={{ margin: '0 0 -12px 0', justifyContent: 'space-between', flexWrap: 'wrap' }}>
					<ListHeader>Protocol Rankings</ListHeader>
					<TVLRange />
				</ListOptions>

				{finalProtocolsList.length > 0 ? (
					<ProtocolsTable
						data={finalProtocolsList}
						removeColumns={['fees', 'revenue', 'volume'].map((key) =>
							router.query?.[key] !== 'true' || selectedChain === 'All' ? `${key}_7d` : undefined
						)}
					/>
				) : (
					<p style={{ textAlign: 'center', margin: '256px 0' }}>{`${selectedChain} chain has no protocols listed`}</p>
				)}
			</Wrapper>
		</>
	)
}

const Wrapper = styled.div`
	display: flex;
	flex-direction: column;
	padding: 12px;
	gap: 20px;
	background-color: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(0, 0, 0, 0.6)' : 'white')};
	border: ${({ theme }) => '1px solid ' + theme.divider};
	border-radius: 12px;
	box-shadow: ${({ theme }) => theme.shadowSm};

	& > *:last-child {
		background: none;

		th,
		td {
			background: none;
		}

		border: ${({ theme }) => '1px solid ' + theme.divider};

		@media screen and (min-width: ${({ theme }) => theme.bpLg}) {
			max-width: calc(100vw - 276px - 40px);
		}
	}

	@media (max-width: ${({ theme }) => theme.bpMed}) {
		margin: -12px;
	}
`

const ChainsSelect = styled.div`
	display: flex;
`

const ChartWrapper = styled.div`
	display: flex;
	flex-direction: column;
	gap: 16px;
	padding: 16px 0;
	grid-column: span 1;
	min-height: 442px;
`

const ToggleWrapper = styled.span`
	display: flex;
	align-items: center;
	gap: 8px;
	flex-wrap: wrap;
`

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

const OverallMetricsWrapper = styled(DetailsWrapper)`
	background: none;

	@media screen and (min-width: 80rem) {
		max-width: 300px;
		border-right: ${({ theme }) => '1px solid ' + theme.divider};
	}
`

const StatWithDownloadOption = styled(Stat)`
	position: relative;

	& > *[data-download] {
		padding: 4px 6px;
		border-radius: 6px;
		background: ${({ theme }) => theme.bg3};
		position: absolute;
		bottom: 0;
		right: 0;
		display: flex;
		align-items: center;
		font-size: 1rem;
	}
`
