import React, { useMemo, useState } from 'react'
import { useRouter } from 'next/router'
import styled from 'styled-components'
import dynamic from 'next/dynamic'
import { BreakpointPanel, BreakpointPanels, ChartAndValuesWrapper, DownloadButton, DownloadIcon } from '~/components'
import { RowBetween, AutoRow } from '~/components/Row'
import Table, { columnsToShow } from '~/components/Table'
import { PeggedChainResponsivePie, PeggedChainResponsiveDominance, AreaChart } from '~/components/Charts'
import { RowLinksWithDropdown, RowLinksWrapper } from '~/components/Filters'
import type { IBarChartProps, IChartProps } from '~/components/ECharts/types'
import IconsRow from '~/components/IconsRow'
import { PeggedSearch } from '~/components/Search'
import QuestionHelper from '~/components/QuestionHelper'
import { ChartSelector } from '~/components/PeggedPage/.'
import { Text } from 'rebass'
import { useCalcCirculating, useCalcGroupExtraPeggedByDay } from '~/hooks/data'
import { buildPeggedChartData } from '~/utils/stablecoins'
import { useXl, useMed } from '~/hooks/useBreakpoints'
import {
	getRandomColor,
	capitalizeFirstLetter,
	formattedNum,
	formattedPeggedPrice,
	getPercentChange,
	getPeggedDominance,
	toNiceMonthlyDate,
	toNiceCsvDate,
	download
} from '~/utils'
import { STABLECOINS_SETTINGS, useStablecoinsManager } from '~/contexts/LocalStorage'

import { Attribute, PegType, BackingType, McapRange, ResetAllStablecoinFilters } from '~/components/Filters'

const PeggedAreaChart = dynamic(() => import('~/components/ECharts/AreaChart'), {
	ssr: false
}) as React.FC<IChartProps>

const BarChart = dynamic(() => import('~/components/ECharts/BarChart'), {
	ssr: false
}) as React.FC<IBarChartProps>

function formattedPeggedPercent(percent, noSign = false) {
	if (percent === null) {
		return null
	}

	let up = 'green'
	let down = 'red'

	if (noSign) {
		up = down = ''
	}

	percent = parseFloat(percent)
	if (!percent || percent === 0) {
		return <Text fontWeight={500}>0%</Text>
	}

	if (percent < 0.0001 && percent > 0) {
		return (
			<Text fontWeight={500} color={up}>
				{'< 0.0001%'}
			</Text>
		)
	}

	if (percent < 0 && percent > -0.0001) {
		return (
			<Text fontWeight={500} color={down}>
				{'< 0.0001%'}
			</Text>
		)
	}

	let fixedPercent = percent.toFixed(2)
	if (fixedPercent === '0.00') {
		return '0%'
	}
	const prefix = noSign ? '' : '+'
	if (fixedPercent > 0) {
		if (fixedPercent > 100) {
			return <Text fontWeight={500} color={up}>{`${prefix}${percent?.toFixed(0).toLocaleString()}%`}</Text>
		} else {
			if (fixedPercent > 2) {
				return <Text fontWeight={700} color={up}>{`${prefix}${fixedPercent}%`}</Text>
			} else {
				return <Text fontWeight={500} color={up}>{`${prefix}${fixedPercent}%`}</Text>
			}
		}
	} else {
		if (fixedPercent < -2) {
			return <Text fontWeight={700} color={down}>{`${fixedPercent}%`}</Text>
		} else {
			return <Text fontWeight={500} color={down}>{`${fixedPercent}%`}</Text>
		}
	}
}

const formatPriceSource = {
	chainlink: 'Chainlink',
	uniswap: 'a Uniswap v3 pool oracle',
	dexscreener: 'DEX Screener',
	curve: 'a Curve pool oracle',
	coingecko: 'CoinGecko',
	birdeye: 'Birdeye',
	kucoin: 'KuCoin Exchange',
	defillama: 'DefiLlama'
}

function pegDeviationText(pegDeviationInfo) {
	const { timestamp, price, priceSource } = pegDeviationInfo
	const date = new Date(timestamp * 1000).toISOString().slice(0, 10)
	return `On ${date}, ${formatPriceSource[priceSource]} reported a price of $${formattedPeggedPrice(price)}.`
}

const PeggedTable = styled(Table)`
	tr > *:not(:first-child) {
		& > * {
			width: 100px;
			white-space: nowrap;
			overflow: hidden;
			font-weight: 400;
			margin-left: auto;
		}
	}

	// PEGGED NAME
	tr > *:nth-child(1) {
		& > * {
			width: 200px;
			overflow: hidden;
			white-space: nowrap;

			// HIDE LOGO
			& > *:nth-child(2) {
				display: none;
			}

			& > *:nth-child(3) {
				overflow: hidden;
				text-overflow: ellipsis;
			}
		}
	}

	// CHAINS
	tr > *:nth-child(2) {
		display: none;
		& > * {
			width: 200px;
			overflow: hidden;
			white-space: nowrap;
		}
	}

	// % OFF PEG
	tr > *:nth-child(3) {
		display: none;
		& > * {
			width: 100px;
			overflow: hidden;
			white-space: nowrap;
		}
	}

	// % OFF PEG (1M)
	tr > *:nth-child(4) {
		display: none;
		& > * {
			width: 120px;
			overflow: hidden;
			white-space: nowrap;
		}
	}

	// PRICE
	tr > *:nth-child(5) {
		display: none;
	}

	// 1D CHANGE
	tr > *:nth-child(6) {
		display: none;
	}

	// 7D CHANGE
	tr > *:nth-child(7) {
		display: none;
	}

	// 1M CHANGE
	tr > *:nth-child(8) {
		display: none;
	}

	// MCAP
	tr > *:nth-child(9) {
		padding-right: 20px;
		& > * {
			text-align: right;
			margin-left: auto;
			white-space: nowrap;
			overflow: hidden;
		}
	}

	@media screen and (min-width: ${({ theme }) => theme.bpSm}) {
		// 7D CHANGE
		tr > *:nth-child(7) {
			display: revert;
		}
	}

	@media screen and (min-width: 640px) {
		// PEGGED NAME
		tr > *:nth-child(1) {
			& > * {
				// SHOW LOGO
				& > *:nth-child(2) {
					display: flex;
				}
			}
		}
	}

	@media screen and (min-width: 720px) {
		// 1M CHANGE
		tr > *:nth-child(8) {
			display: revert;
		}
	}

	@media screen and (min-width: ${({ theme }) => theme.bpMed}) {
		// PEGGED NAME
		tr > *:nth-child(1) {
			& > * {
				width: 220px;

				& > *:nth-child(4) {
					& > *:nth-child(2) {
						display: revert;
					}
				}
			}
		}
	}

	@media screen and (min-width: 900px) {
		// MCAP
		tr > *:nth-child(9) {
			padding-right: 0px;
		}
	}

	@media screen and (min-width: ${({ theme }) => theme.bpLg}) {
		// 1D CHANGE
		tr > *:nth-child(6) {
			display: none !important;
		}

		// MCAP
		tr > *:nth-child(9) {
			padding-right: 20px;
		}
	}

	@media screen and (min-width: 1200px) {
		// 1M CHANGE
		tr > *:nth-child(8) {
			display: revert !important;
		}
	}

	@media screen and (min-width: 1300px) {
		// % OFF PEG
		tr > *:nth-child(3) {
			display: revert !important;
		}

		// PRICE
		tr > *:nth-child(5) {
			display: revert !important;
		}

		// 1D CHANGE
		tr > *:nth-child(6) {
			display: revert !important;
		}

		// MCAP
		tr > *:nth-child(9) {
			display: revert !important;
		}
	}

	@media screen and (min-width: 1536px) {
		// CHAINS
		tr > *:nth-child(2) {
			display: revert;
		}

		// % OFF PEG (1M)
		tr > *:nth-child(4) {
			display: revert;
		}
	}
`

const ChartFilters = styled.div`
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	justify-content: flex-end;
	gap: 20px;
	margin: 0 0 -18px;
`

const Dropdowns = styled.span`
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 20px;

	button {
		font-weight: 400;
	}
`

const backfilledChains = [
	'All',
	'Ethereum',
	'BSC',
	'Avalanche',
	'Arbitrum',
	'Optimism',
	'Fantom',
	'Polygon',
	'Gnosis',
	'Celo',
	'Harmony',
	'Moonriver',
	'Aztec',
	'Loopring',
	'Starknet',
	'zkSync',
	'Boba',
	'Metis',
	'Moonbeam',
	'Syscoin',
	'OKExChain',
	'IoTeX',
	'Heco'
]

const columns = [
	...columnsToShow('peggedAsset'),
	{
		header: 'Chains',
		accessor: 'chains',
		disableSortBy: true,
		helperText: "Chains are ordered by pegged asset's issuance on each chain",
		Cell: ({ value }) => <IconsRow links={value} url="/stablecoins" iconType="chain" />
	},
	{
		header: '% Off Peg',
		accessor: 'pegDeviation',
		Cell: ({ value, rowValues }) => {
			return (
				<AutoRow sx={{ width: '100%', justifyContent: 'flex-end', gap: '4px' }}>
					{rowValues.depeggedTwoPercent ? <QuestionHelper text="Currently de-pegged by 2% or more." /> : null}
					{value ? formattedPeggedPercent(value) : value === 0 ? formattedPeggedPercent(0) : '-'}
				</AutoRow>
			)
		}
	},
	{
		header: '1m % Off Peg',
		accessor: 'pegDeviation_1m',
		helperText: 'Shows greatest % price deviation from peg over the past month',
		Cell: ({ value, rowValues }) => {
			return (
				<AutoRow sx={{ width: '100%', justifyContent: 'flex-end', gap: '4px' }}>
					{rowValues.pegDeviationInfo ? <QuestionHelper text={pegDeviationText(rowValues.pegDeviationInfo)} /> : null}
					<span>{value ? formattedPeggedPercent(value) : '-'}</span>
				</AutoRow>
			)
		}
	},
	{
		header: 'Price',
		accessor: 'price',
		Cell: ({ value, rowValues }) => {
			return (
				<AutoRow sx={{ width: '100%', justifyContent: 'flex-end', gap: '4px' }}>
					{rowValues.floatingPeg ? <QuestionHelper text="Has a variable, floating, or crawling peg." /> : null}
					<span>{value ? formattedPeggedPrice(value, true) : '-'}</span>
				</AutoRow>
			)
		}
	},
	...columnsToShow('1dChange', '7dChange', '1mChange'),
	{
		header: 'Market Cap',
		accessor: 'mcap',
		Cell: ({ value }) => <>{value ? formattedNum(value, true) : '-'}</>
	}
]

function PeggedAssetsOverview({
	selectedChain = 'All',
	chains = [],
	filteredPeggedAssets,
	peggedAssetNames,
	peggedNameToChartDataIndex,
	chartDataByPeggedAsset,
	chainTVLData,
	backgroundColor
}) {
	const [chartType, setChartType] = useState(selectedChain === 'All' ? 'Token Market Caps' : 'USD Inflows')

	const chartTypeList =
		selectedChain !== 'All'
			? ['USD Inflows', 'Total Market Cap', 'Token Market Caps', 'Token Inflows', 'Pie', 'Dominance']
			: ['Total Market Cap', 'Token Market Caps', 'Pie', 'Dominance']

	const belowMed = useMed()
	const belowXl = useXl()
	const aspect = belowXl ? (belowMed ? 1 : 60 / 42) : 60 / 22

	const [filteredIndexes, setFilteredIndexes] = useState([])

	// toggles
	const [stablecoinsSettings] = useStablecoinsManager()

	const router = useRouter()
	const { minMcap, maxMcap } = router.query

	const peggedAssets = useMemo(() => {
		const { PEGGEDUSD, PEGGEDEUR, PEGGEDVAR, FIATSTABLES, CRYPTOSTABLES, ALGOSTABLES, DEPEGGED } = STABLECOINS_SETTINGS

		let chartDataIndexes = []
		const peggedAssets = filteredPeggedAssets.reduce((acc, curr) => {
			let toFilter = false

			toFilter =
				stablecoinsSettings[DEPEGGED] || Math.abs(curr.pegDeviation) < 10 || !(typeof curr.pegDeviation === 'number')

			toFilter =
				(toFilter && stablecoinsSettings[PEGGEDUSD] && curr.pegType === 'peggedUSD') ||
				(stablecoinsSettings[PEGGEDEUR] && curr.pegType === 'peggedEUR') ||
				(stablecoinsSettings[PEGGEDVAR] && curr.pegType === 'peggedVAR')

			toFilter =
				toFilter &&
				((stablecoinsSettings[FIATSTABLES] && curr.pegMechanism === 'fiat-backed') ||
					(stablecoinsSettings[CRYPTOSTABLES] && curr.pegMechanism === 'crypto-backed') ||
					(stablecoinsSettings[ALGOSTABLES] && curr.pegMechanism === 'algorithmic'))

			const isValidMcapRange =
				(minMcap !== undefined && !Number.isNaN(Number(minMcap))) ||
				(maxMcap !== undefined && !Number.isNaN(Number(maxMcap)))

			if (isValidMcapRange) {
				toFilter = toFilter && (minMcap ? curr.mcap > minMcap : true) && (maxMcap ? curr.mcap < maxMcap : true)
			}

			if (toFilter) {
				const chartDataIndex = peggedNameToChartDataIndex[curr.name]
				chartDataIndexes.push(chartDataIndex)
				return acc.concat(curr)
			} else return acc
		}, [])

		setFilteredIndexes(chartDataIndexes)

		return peggedAssets
	}, [filteredPeggedAssets, peggedNameToChartDataIndex, stablecoinsSettings, minMcap, maxMcap])

	const { peggedAreaChartData, peggedAreaTotalData, stackedDataset, tokenInflows, tokenInflowNames, usdInflows } =
		buildPeggedChartData(
			chartDataByPeggedAsset,
			peggedAssetNames,
			filteredIndexes,
			'mcap',
			chainTVLData,
			selectedChain,
			backfilledChains
		)

	const handleRouting = (selectedChain) => {
		if (selectedChain === 'All') return `/stablecoins`
		return `/stablecoins/${selectedChain}`
	}
	const chainOptions = ['All', ...chains].map((label) => ({ label, to: handleRouting(label) }))

	const peggedTotals = useCalcCirculating(peggedAssets)

	const chainsCirculatingValues = useMemo(() => {
		const data = peggedTotals.map((chain) => ({ name: chain.symbol, value: chain.mcap }))

		const otherCirculating = data.slice(10).reduce((total, entry) => {
			return (total += entry.value)
		}, 0)

		return data
			.slice(0, 10)
			.sort((a, b) => b.value - a.value)
			.concat({ name: 'Others', value: otherCirculating })
	}, [peggedTotals])

	const chainColor = useMemo(
		() =>
			Object.fromEntries(
				[...peggedTotals, 'Others'].map((peggedAsset) => {
					return typeof peggedAsset === 'string' ? ['-', getRandomColor()] : [peggedAsset.symbol, getRandomColor()]
				})
			),
		[peggedTotals]
	)

	const { data: stackedData, daySum } = useCalcGroupExtraPeggedByDay(stackedDataset)

	const downloadCsv = () => {
		const filteredPeggedNames = peggedAssetNames.filter((name, i) => filteredIndexes.includes(i))
		const rows = [['Timestamp', 'Date', ...filteredPeggedNames, 'Total']]
		stackedData
			.sort((a, b) => a.date - b.date)
			.forEach((day) => {
				rows.push([
					day.date,
					toNiceCsvDate(day.date),
					...filteredPeggedNames.map((peggedAsset) => day[peggedAsset] ?? ''),
					filteredPeggedNames.reduce((acc, curr) => {
						return (acc += day[curr] ?? 0)
					}, 0)
				])
			})
		download('stablecoins.csv', rows.map((r) => r.join(',')).join('\n'))
	}

	let title = `Stablecoins Market Cap`
	if (selectedChain !== 'All') {
		title = `${capitalizeFirstLetter(selectedChain)} Stablecoins Market Cap`
	}

	const { percentChange, totalMcapCurrent } = useMemo(() => {
		let totalMcapCurrent = peggedAreaTotalData?.[peggedAreaTotalData.length - 1]?.Mcap
		let totalMcapPrevWeek = peggedAreaTotalData?.[peggedAreaTotalData.length - 8]?.Mcap
		const percentChange = getPercentChange(totalMcapCurrent, totalMcapPrevWeek)?.toFixed(2)
		return { percentChange, totalMcapCurrent }
	}, [peggedAreaTotalData])

	const mcapToDisplay = formattedNum(totalMcapCurrent, true)

	let topToken = { symbol: 'USDT', mcap: 0 }
	if (peggedTotals.length > 0) {
		const topTokenData = peggedTotals[0]
		topToken.symbol = topTokenData.symbol
		topToken.mcap = topTokenData.mcap
	}

	const dominance = getPeggedDominance(topToken, totalMcapCurrent)

	const totalMcapLabel = ['Mcap', 'TVL']

	return (
		<>
			<PeggedSearch step={{ category: 'Stablecoins', name: title }} />
			<ChartFilters>
				<Dropdowns>
					<Attribute />
					<BackingType />
					<PegType />
					<McapRange />
					<ResetAllStablecoinFilters
						pathname={selectedChain === 'All' ? '/stablecoins' : `/stablecoins/${selectedChain}`}
					/>
				</Dropdowns>
			</ChartFilters>

			<ChartAndValuesWrapper>
				<BreakpointPanels>
					<BreakpointPanel>
						<h1>Total {title}</h1>
						<p style={{ '--tile-text-color': '#4f8fea' } as React.CSSProperties}>{mcapToDisplay}</p>
						<DownloadButton as="button" onClick={downloadCsv}>
							<DownloadIcon />
							<span>&nbsp;&nbsp;.csv</span>
						</DownloadButton>
					</BreakpointPanel>
					<BreakpointPanel>
						<h2>Change (7d)</h2>
						<p style={{ '--tile-text-color': '#fd3c99' } as React.CSSProperties}> {percentChange || 0}%</p>
					</BreakpointPanel>
					<BreakpointPanel>
						<h2>{topToken.symbol} Dominance</h2>
						<p style={{ '--tile-text-color': '#46acb7' } as React.CSSProperties}> {dominance}%</p>
					</BreakpointPanel>
				</BreakpointPanels>
				<BreakpointPanel id="chartWrapper" style={{ gap: '16px', minHeight: '450px', justifyContent: 'space-between' }}>
					<ChartSelector options={chartTypeList} selectedChart={chartType} onClick={setChartType} />

					{chartType === 'Total Market Cap' && (
						<PeggedAreaChart
							title=""
							chartData={peggedAreaTotalData}
							stacks={totalMcapLabel}
							color={'lightcoral'}
							valueSymbol="$"
							hidedefaultlegend={true}
							hallmarks={[]}
						/>
					)}
					{chartType === 'Token Market Caps' && (
						<AreaChart
							aspect={aspect}
							finalChartData={peggedAreaChartData}
							tokensUnique={peggedAssetNames}
							color={backgroundColor}
							moneySymbol="$"
							formatDate={toNiceMonthlyDate}
							hallmarks={[]}
						/>
					)}
					{chartType === 'Dominance' && (
						<PeggedChainResponsiveDominance
							stackOffset="expand"
							formatPercent={true}
							stackedDataset={stackedData}
							chainsUnique={peggedAssetNames}
							chainColor={chainColor}
							daySum={daySum}
							aspect={aspect}
						/>
					)}
					{chartType === 'Pie' && (
						<PeggedChainResponsivePie data={chainsCirculatingValues} chainColor={chainColor} aspect={aspect} />
					)}
					{chartType === 'Token Inflows' && selectedChain !== 'All' && tokenInflows && (
						<BarChart
							chartData={tokenInflows}
							title=""
							hidedefaultlegend={true}
							customLegendName="Token"
							customLegendOptions={tokenInflowNames}
							key={tokenInflowNames} // escape hatch to rerender state in legend options
							chartOptions={inflowsChartOptions}
						/>
					)}
					{chartType === 'USD Inflows' && selectedChain !== 'All' && usdInflows && (
						<BarChart chartData={usdInflows} color={backgroundColor} title="" />
					)}
				</BreakpointPanel>
			</ChartAndValuesWrapper>

			<RowLinksWrapper>
				<RowLinksWithDropdown links={chainOptions} activeLink={selectedChain} />
			</RowLinksWrapper>

			<PeggedTable data={peggedTotals} columns={columns} />
		</>
	)
}

const inflowsChartOptions = {
	overrides: {
		inflow: true
	}
}

export default PeggedAssetsOverview
