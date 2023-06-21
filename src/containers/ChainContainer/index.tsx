import * as React from 'react'
import styled from 'styled-components'
import Announcement from '~/components/Announcement'
import { ProtocolsChainsSearch } from '~/components/Search'
import { RowLinksWithDropdown } from '~/components/Filters'
import { useRouter } from 'next/router'
import { useDarkModeManager, useDefiManager } from '~/contexts/LocalStorage'
import {
	useDenominationPriceHistory,
	useFetchProtocolTransactions,
	useFetchProtocolUsers,
	useGetProtocolsList
} from '~/api/categories/protocols/client'
import { formatProtocolsList } from '~/hooks/data/defi'
import { StatsSection } from '~/layout/Stats/Medium'
import LocalLoader from '~/components/LocalLoader'
import dynamic from 'next/dynamic'
import { chainCoingeckoIds } from '~/constants/chainTokens'
import { getUtcDateObject } from '~/components/ECharts/utils'
import { chainIconUrl, formattedNum, getPercentChange, getPrevTvlFromChart, getTokenDominance } from '~/utils'
import { Denomination, Filters, Toggle, FiltersWrapper } from '~/components/ECharts/ProtocolChart/Misc'
import Image from 'next/future/image'
import llamaLogo from '~/assets/peeking-llama.png'
import { DetailsWrapper, DownloadButton, Name } from '~/layout/ProtocolAndPool'
import { AccordionStat, StatInARow } from '~/layout/Stats/Large'
import Link from 'next/link'
import { ChevronRight, DownloadCloud } from 'react-feather'
import {
	useGetFeesAndRevenueChartDataByChain,
	useGetProtocolsFeesAndRevenueByChain,
	useGetProtocolsVolumeByChain,
	useGetVolumeChartDataByChain
} from '~/api/categories/chains/client'
import { RowWithSubRows, StatsTable2 } from '../Defi/Protocol'
import SEO from '~/components/SEO'
import { useGetStabelcoinsChartDataByChain } from '~/api/categories/stablecoins/client'
import { useGetBridgeChartDataByChain } from '~/api/categories/bridges/client'
import { ProtocolsByChainTable } from '~/components/Table/Defi/Protocols'
import TokenLogo from '~/components/TokenLogo'

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
	raisesChart,
	totalFundingAmount,
	volumeData,
	feesAndRevenueData,
	stablecoinsData,
	inflowsData,
	userData
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

	const { data: denominationPriceHistory, loading: fetchingDenominationPriceHistory } = useDenominationPriceHistory(
		denomination !== 'USD' || router.query.price === 'true' ? chainGeckoId : null
	)

	const { data: chainProtocolsVolumes, loading: fetchingProtocolsVolumeByChain } =
		useGetProtocolsVolumeByChain(selectedChain)

	const { data: chainProtocolsFees, loading: fetchingProtocolsFeesAndRevenueByChain } =
		useGetProtocolsFeesAndRevenueByChain(selectedChain)

	const { data: volumeChart, loading: fetchingVolumeChartDataByChain } = useGetVolumeChartDataByChain(
		volumeData?.totalVolume24h && router.query.volume === 'true' ? selectedChain : null
	)

	const { data: feesAndRevenueChart, loading: fetchingFeesAndRevenueChartDataByChain } =
		useGetFeesAndRevenueChartDataByChain(
			feesAndRevenueData?.totalFees24h && (router.query.fees === 'true' || router.query.revenue === 'true')
				? selectedChain
				: null
		)

	const { data: stablecoinsChartData, loading: fetchingStablecoinsChartDataByChain } =
		useGetStabelcoinsChartDataByChain(
			stablecoinsData?.totalMcapCurrent && router.query.stables === 'true' ? selectedChain : null
		)

	const { data: inflowsChartData, loading: fetchingInflowsChartData } = useGetBridgeChartDataByChain(
		inflowsData?.netInflows && router.query.inflows === 'true' ? selectedChain : null
	)

	const { data: usersData, loading: fetchingUsersChartData } = useFetchProtocolUsers(
		userData.activeUsers && router.query.users === 'true' ? 'chain$' + selectedChain : null
	)

	const { data: txsData, loading: fetchingTransactionsChartData } = useFetchProtocolTransactions(
		userData.transactions && router.query.txs === 'true' ? 'chain$' + selectedChain : null
	)

	const isFetchingChartData =
		(denomination !== 'USD' && fetchingDenominationPriceHistory) ||
		fetchingVolumeChartDataByChain ||
		fetchingFeesAndRevenueChartDataByChain ||
		fetchingStablecoinsChartDataByChain ||
		fetchingInflowsChartData ||
		fetchingUsersChartData ||
		fetchingTransactionsChartData

	const { totalValueUSD, valueChangeUSD, globalChart } = React.useMemo(() => {
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

		return { totalValueUSD: tvl, valueChangeUSD, globalChart }
	}, [chart, extraTvlsEnabled, extraTvlCharts])

	const { DENOMINATIONS, chartOptions, chartDatasets } = React.useMemo(() => {
		const priceData =
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

		const finalFeesAndRevenueChart = isNonUSDDenomination
			? feesAndRevenueChart?.map(([date, fees, revenue]) => [
					date,
					fees / normalizedDenomination[getUtcDateObject(date)],
					revenue / normalizedDenomination[getUtcDateObject(date)]
			  ])
			: feesAndRevenueChart

		const chartDatasets = [
			{
				feesChart: finalFeesAndRevenueChart,
				volumeChart: finalVolumeChart,
				globalChart: finalTvlChart,
				raisesData: raisesChart,
				totalStablesData: stablecoinsChartData,
				bridgeData: inflowsChartData,
				usersData,
				txsData,
				priceData
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
				isVisible: volumeData?.totalVolume24h ? true : false
			},
			{
				id: 'fees',
				name: 'Fees',
				isVisible: feesAndRevenueData?.totalFees24h ? true : false
			},
			{
				id: 'revenue',
				name: 'Revenue',
				isVisible: feesAndRevenueData?.totalRevenue24h ? true : false
			},
			{
				id: 'price',
				name: 'Price',
				isVisible: DENOMINATIONS.length > 1
			},
			{
				id: 'users',
				name: 'Users',
				isVisible: userData.activeUsers ? true : false
			},
			{
				id: 'txs',
				name: 'Transactions',
				isVisible: userData.transactions ? true : false
			},
			{
				id: 'raises',
				name: 'Raises',
				isVisible: selectedChain === 'All'
			},
			{
				id: 'stables',
				name: 'Stablecoins',
				isVisible: stablecoinsData?.totalMcapCurrent ? true : false
			},
			{
				id: 'inflows',
				name: 'Inflows',
				isVisible: inflowsData?.netInflows ? true : false
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
		feesAndRevenueChart,
		CHAIN_SYMBOL,
		selectedChain,
		stablecoinsChartData,
		raisesChart,
		txsData,
		usersData,
		volumeData,
		feesAndRevenueData,
		stablecoinsData,
		inflowsChartData,
		inflowsData,
		userData
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

	const tvl = formattedNum(totalValueUSD, true)
	const percentChange = valueChangeUSD?.toFixed(2)
	const dominance = getTokenDominance(topToken, totalValueUSD)

	return (
		<>
			<SEO cardName={selectedChain} chain={selectedChain} tvl={tvl as string} volumeChange={percentChange} />

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

			<LayoutWrapper>
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
						{selectedChain !== 'All' && (
							<Name data-chainname>
								<TokenLogo logo={chainIconUrl(selectedChain)} size={24} />
								<span>{selectedChain}</span>
							</Name>
						)}
						<AccordionStat data-tvl>
							<summary>
								<span data-arrowicon>
									<ChevronRight size={20} />
								</span>

								<span data-summaryheader>
									<span>Total Value Locked</span>
									<span>{tvl}</span>
								</span>

								<Link
									href={`https://api.llama.fi/simpleChainDataset/${selectedChain}?${Object.entries(extraTvlsEnabled)
										.filter((t) => t[1] === true)
										.map((t) => `${t[0]}=true`)
										.join('&')}`}
									passHref
								>
									<DownloadButton
										as="a"
										style={{ height: 'fit-content', margin: 'auto 0 0 auto' }}
										target="_blank"
										rel="noreferrer"
									>
										<DownloadCloud size={14} />
										<span>&nbsp;&nbsp;.csv</span>
									</DownloadButton>
								</Link>
							</summary>

							<span style={{ gap: '8px' }}>
								<StatInARow>
									<span>Change (24h)</span>
									<span>{percentChange || 0}%</span>
								</StatInARow>

								<StatInARow>
									<span>{topToken.name} Dominance</span>
									<span>{dominance}%</span>
								</StatInARow>
							</span>
						</AccordionStat>

						<StatsTable2>
							<tbody>
								{stablecoinsData?.totalMcapCurrent ? (
									<RowWithSubRows
										rowHeader={'Stablecoins Mcap'}
										rowValue={formattedNum(stablecoinsData.totalMcapCurrent, true)}
										helperText={null}
										protocolName={null}
										dataType={null}
										subRows={
											<>
												{stablecoinsData.change7d ? (
													<tr>
														<th>Change (7d)</th>
														<td>{stablecoinsData.change7d}%</td>
													</tr>
												) : null}
												{stablecoinsData.dominance ? (
													<tr>
														<th>{stablecoinsData.topToken.symbol} Dominance</th>
														<td>{stablecoinsData.dominance}%</td>
													</tr>
												) : null}
											</>
										}
									/>
								) : null}

								{feesAndRevenueData?.totalFees24h ? (
									<tr>
										<th>Fees (24h)</th>
										<td>{formattedNum(feesAndRevenueData?.totalFees24h, true)}</td>
									</tr>
								) : null}

								{feesAndRevenueData?.totalRevenue24h ? (
									<tr>
										<th>Revenue (24h)</th>
										<td>{formattedNum(feesAndRevenueData?.totalRevenue24h, true)}</td>
									</tr>
								) : null}

								{volumeData?.totalVolume24h ? (
									<RowWithSubRows
										rowHeader={'Volume (24h)'}
										rowValue={formattedNum(volumeData.totalVolume24h, true)}
										helperText={null}
										protocolName={null}
										dataType={null}
										subRows={
											<>
												{volumeData.totalVolume7d ? (
													<tr>
														<th>Volume (7d)</th>
														<td>{formattedNum(volumeData.totalVolume7d, true)}</td>
													</tr>
												) : null}
												<tr>
													<th>Weekly Change</th>
													<td>{volumeData.weeklyChange}%</td>
												</tr>
												<tr>
													<th>DEX vs CEX dominance</th>
													<td>{volumeData.dexsDominance}%</td>
												</tr>
											</>
										}
									/>
								) : null}

								{totalFundingAmount ? (
									<tr>
										<th>Total Funding Amount</th>
										<td>{formattedNum(totalFundingAmount, true)}</td>
									</tr>
								) : null}

								{inflowsData?.netInflows ? (
									<tr>
										<th>Inflows (24h)</th>
										<td>{formattedNum(inflowsData.netInflows, true)}</td>
									</tr>
								) : null}

								{userData.activeUsers ? (
									<RowWithSubRows
										rowHeader={'Active Users (24h)'}
										rowValue={formattedNum(userData.activeUsers, false)}
										helperText={null}
										protocolName={null}
										dataType={null}
										subRows={
											<>
												{userData.newUsers ? (
													<tr>
														<th>New Users (24h)</th>
														<td>{formattedNum(userData.newUsers, false)}</td>
													</tr>
												) : null}
												{userData.transactions ? (
													<tr>
														<th>Transactions (24h)</th>
														<td>{formattedNum(userData.transactions, false)}</td>
													</tr>
												) : null}
												{userData.gasUsed ? (
													<tr>
														<th>Gas Used (24h)</th>
														<td>{formattedNum(userData.gasUsed, false)}</td>
													</tr>
												) : null}
											</>
										}
									/>
								) : null}
							</tbody>
						</StatsTable2>
					</OverallMetricsWrapper>

					<ChartWrapper>
						{easterEgg ? (
							<Game />
						) : (
							<>
								<FiltersWrapper>
									<ToggleWrapper>
										{chartOptions.map(
											({ id, name, isVisible }) =>
												isVisible && (
													<Toggle>
														<input
															key={id + 'chart-option'}
															type="checkbox"
															onClick={() => {
																updateRoute(
																	id,
																	id === 'tvl'
																		? router.query[id] !== 'false'
																			? 'false'
																			: 'true'
																		: router.query[id] === 'true'
																		? 'false'
																		: 'true',
																	router
																)
															}}
															checked={id === 'tvl' ? router.query[id] !== 'false' : router.query[id] === 'true'}
														/>
														<span data-wrapper="true">
															<span>{name}</span>
														</span>
													</Toggle>
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

								{isFetchingChartData ? (
									<LocalLoader style={{ margin: 'auto', height: '360px' }} />
								) : (
									router.isReady && (
										<ChainChart datasets={chartDatasets} title="" denomination={denomination} hideTooltip />
									)
								)}
							</>
						)}
					</ChartWrapper>
					<EasterLlama onClick={activateEasterEgg}>
						<Image src={llamaLogo} width="41px" height="34px" alt="Activate Easter Egg" />
					</EasterLlama>
				</StatsSection>

				{finalProtocolsList.length > 0 ? (
					<ProtocolsByChainTable data={finalProtocolsList} />
				) : (
					<p style={{ textAlign: 'center', margin: '256px 0' }}>{`${selectedChain} chain has no protocols listed`}</p>
				)}
			</LayoutWrapper>
		</>
	)
}

export const LayoutWrapper = styled.div`
	display: flex;
	flex-direction: column;
	padding: 12px;
	gap: 20px;
	background-color: ${({ theme }) => (theme.mode === 'dark' ? '#090a0b' : 'white')};
	border: ${({ theme }) => '1px solid ' + theme.divider};
	border-radius: 12px;
	box-shadow: ${({ theme }) => theme.shadowSm};

	& > *:last-child {
		background: none;

		th,
		td {
			background: ${({ theme }) => (theme.mode === 'dark' ? '#090a0b' : 'white')};
		}

		th:not(:last-child),
		td:not(:last-child) {
			border-right: 1px solid ${({ theme }) => theme.divider};
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

export const ChainsSelect = styled.nav`
	display: flex;
`

export const ChartWrapper = styled.div`
	display: flex;
	flex-direction: column;
	gap: 16px;
	padding: 16px 0;
	grid-column: span 1;
	min-height: 442px;
`

export const ToggleWrapper = styled.span`
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

export const OverallMetricsWrapper = styled(DetailsWrapper)`
	background: none;
	gap: 8px;

	& > *[data-chainname] {
		margin-bottom: 16px;
	}

	& > *[data-tvl] {
		margin-bottom: 8px;
	}

	@media screen and (min-width: 80rem) {
		max-width: 300px;
		border-right: ${({ theme }) => '1px solid ' + theme.divider};
	}
`
