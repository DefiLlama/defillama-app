import * as React from 'react'
import styled from 'styled-components'
import { ProtocolsChainsSearch } from '~/components/Search'
import { useRouter } from 'next/router'
import { useDarkModeManager, useDefiManager } from '~/contexts/LocalStorage'
import { useGetProtocolsList } from '~/api/categories/protocols/client'
import { formatProtocolsList } from '~/hooks/data/defi'

import dynamic from 'next/dynamic'
import { chainCoingeckoIds, chainCoingeckoIdsForGasNotMcap } from '~/constants/chainTokens'
import { chainIconUrl, formattedNum, getTokenDominance } from '~/utils'
import { DetailsWrapper, DownloadButton, Name } from '~/layout/ProtocolAndPool'
import { AccordionStat, StatInARow } from '~/layout/Stats/Large'
import Link from 'next/link'

import { ChevronRight, DownloadCloud } from 'react-feather'
import { useGetProtocolsFeesAndRevenueByChain, useGetProtocolsVolumeByChain } from '~/api/categories/chains/client'
import { RowWithSubRows, StatsTable2 } from '../Defi/Protocol'
import SEO from '~/components/SEO'
import { ProtocolsByChainTable } from '~/components/Table/Defi/Protocols/ProProtocols'
import TokenLogo from '~/components/TokenLogo'
import { useFetchChainChartData } from './useProFetchChainChartData'
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, arrayMove, rectSortingStrategy, sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { useState } from 'react'
import { SortableItem } from '../Defi/Protocol/PorotcolPro'
import ReactSelect from '~/components/MultiSelect/ReactSelect'
import { capitalize } from 'lodash'

const ChartsBody = styled.div<{ itemsCount }>`
	width: 100%;
	display: grid;
	grid-template-columns: ${({ itemsCount }) => `repeat(${itemsCount >= 2 ? 2 : itemsCount}, 1fr)`};
	grid-gap: 10px;
	margin-top: 16px;
	& > div {
		height: 100%;
	}
	& > div > div {
		height: 100%;
	}
`

export const Filters = styled.div`
	display: flex;
	vertical-align: center;
	border-radius: 12px;
	background-color: ${({ theme }) => (theme.mode === 'dark' ? '#090a0b' : 'white')};
	box-shadow: ${({ theme }) => theme.shadowSm};
	width: fit-content;
	padding: 16px;
`

const ChainChart: any = dynamic(() => import('~/components/ECharts/ChainChart/ProChart'), {
	ssr: false
})

const Game: any = dynamic(() => import('~/game'))

export const StatsSection = styled.div`
	border-radius: 12px;
	background: ${({ theme }) => theme.bg6};
	box-shadow: ${({ theme }) => theme.shadowSm};
	position: relative;
	isolation: isolate;
	height: 100%;
`

export const ChartBody = styled.div`
	border-radius: 12px;
	background: ${({ theme }) => theme.bg6};
	box-shadow: ${({ theme }) => theme.shadowSm};
	padding-top: 8px;
`

export const FilterHeader = styled.div`
	font-size: 18px;
	line-height: 2;
	margin-right: 16px;
	margin-left: 16px;
	margin-top: 4px;
`

const defaultBlocks = ['stats', 'tvl']

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
	userData,
	devMetricsData
}) {
	const {
		fullProtocolsList,
		parentProtocols,
		isLoading: fetchingProtocolsList
	} = useGetProtocolsList({ chain: selectedChain })

	const [items, setItems] = useState(defaultBlocks)

	const sensors = useSensors(
		useSensor(PointerSensor),
		useSensor(KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates
		})
	)

	const [extraTvlsEnabled] = useDefiManager()

	const router = useRouter()

	const denomination = router.query?.currency ?? 'USD'

	const { minTvl, maxTvl } = router.query

	const [easterEgg, setEasterEgg] = React.useState(false)
	const [darkMode, toggleDarkMode] = useDarkModeManager()

	let CHAIN_SYMBOL = null
	let chainGeckoId = null

	if (selectedChain !== 'All') {
		let chainDenomination = chainCoingeckoIds[selectedChain] ?? chainCoingeckoIdsForGasNotMcap[selectedChain] ?? null

		chainGeckoId = chainDenomination?.geckoId ?? null

		if (chainGeckoId && chainDenomination.symbol) {
			CHAIN_SYMBOL = chainDenomination.symbol
		}
	}

	const { data: chainProtocolsVolumes, loading: fetchingProtocolsVolumeByChain } =
		useGetProtocolsVolumeByChain(selectedChain)

	const { data: chainProtocolsFees, loading: fetchingProtocolsFeesAndRevenueByChain } =
		useGetProtocolsFeesAndRevenueByChain(selectedChain)

	const DENOMINATIONS = CHAIN_SYMBOL ? ['USD', CHAIN_SYMBOL] : ['USD']

	const { totalValueUSD, valueChangeUSD, chartDatasets, isFetchingChartData } = useFetchChainChartData({
		denomination,
		selectedChain,
		chainGeckoId,
		volumeData,
		feesAndRevenueData,
		stablecoinsData,
		inflowsData,
		userData,
		raisesChart,
		chart,
		extraTvlCharts,
		extraTvlsEnabled,
		devMetricsData,
		selectedCharts: items.reduce((acc, item) => ({ ...acc, [item]: 'true' }), {})
	})

	const chartOptions = [
		{
			id: 'stats',
			name: 'Overview',
			isVisible: true
		},
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
			isVisible: DENOMINATIONS.length > 1 && chartDatasets[0]?.priceData
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
			isVisible: selectedChain === 'All' && chartDatasets[0]?.raisesData
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
		},
		{
			id: 'developers',
			name: 'Core Developers',
			isVisible: devMetricsData ? true : false
		},
		{
			id: 'devsCommits',
			name: 'Commits',
			isVisible: devMetricsData ? true : false
		}
	]

	console.log(chartDatasets)

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

	const onChainChange = ({ to }) => {
		setItems(defaultBlocks)
		router.push(
			{
				pathname: to
			},
			undefined,
			{ shallow: true }
		)
	}

	const onChartChange = (value) => {
		console.log(value)
		setItems(value.map((v) => v.value))
	}

	const Items = {
		stats: (
			<SortableItem id={'stats'} key={'stats'}>
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
										rowHeader={'Active Addresses (24h)'}
										rowValue={formattedNum(userData.activeUsers, false)}
										helperText={null}
										protocolName={null}
										dataType={null}
										subRows={
											<>
												{userData.newUsers ? (
													<tr>
														<th>New Addresses (24h)</th>
														<td>{formattedNum(userData.newUsers, false)}</td>
													</tr>
												) : null}
												{userData.transactions ? (
													<tr>
														<th>Transactions (24h)</th>
														<td>{formattedNum(userData.transactions, false)}</td>
													</tr>
												) : null}
											</>
										}
									/>
								) : null}
							</tbody>
						</StatsTable2>
					</OverallMetricsWrapper>
				</StatsSection>
			</SortableItem>
		)
	}

	return (
		<>
			<SEO cardName={selectedChain} chain={selectedChain} tvl={tvl as string} volumeChange={percentChange} />

			<ProtocolsChainsSearch
				step={{
					category: 'Home',
					name: selectedChain === 'All' ? 'All Protocols' : selectedChain
				}}
			/>
			<Filters>
				<div style={{ width: 'fit-content', display: 'flex' }}>
					<FilterHeader>Select chain</FilterHeader>
					<ReactSelect options={chainOptions} placeholder="Select chain" onChange={onChainChange} />
				</div>

				<div style={{ width: 'fit-content', display: 'flex' }}>
					<FilterHeader>and pick charts</FilterHeader>
					<ReactSelect
						isMulti
						value={items.map((val) => ({ value: val, label: capitalize(val) }))}
						name="colors"
						options={chartOptions
							.filter(({ isVisible }) => isVisible)
							.map(({ id, name }) => ({ value: id, label: capitalize(name) }))}
						className="basic-multi-select"
						classNamePrefix="select"
						onChange={onChartChange}
					/>
				</div>
			</Filters>
			<LayoutWrapper>
				<ChartsBody itemsCount={items.length}>
					<DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
						<SortableContext items={items} strategy={rectSortingStrategy}>
							{items.map((id, i) =>
								Items[id] ? (
									Items[id]
								) : (
									<SortableItem id={id} key={id + items.length}>
										<ChartBody>
											<FilterHeader>{chartOptions.find((opt) => opt.id === id).name}</FilterHeader>
											<ChainChart
												datasets={chartDatasets}
												title=""
												denomination={denomination}
												isThemeDark={darkMode}
												chartType={id}
												isFirstChart={i === 0 || i === 1}
											/>
										</ChartBody>
									</SortableItem>
								)
							)}
						</SortableContext>
					</DndContext>
				</ChartsBody>
				{finalProtocolsList.length > 0 ? (
					<ProtocolsByChainTable data={finalProtocolsList} />
				) : (
					<p style={{ textAlign: 'center', margin: '256px 0' }}>{`${selectedChain} chain has no protocols listed`}</p>
				)}
			</LayoutWrapper>
		</>
	)

	function handleDragEnd(event) {
		const { active, over } = event

		if (active.id !== over.id) {
			setItems((items) => {
				const oldIndex = items.indexOf(active.id)
				const newIndex = items.indexOf(over.id)

				return arrayMove(items, oldIndex, newIndex)
			})
		}
	}
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
`
