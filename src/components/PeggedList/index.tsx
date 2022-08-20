import React, { useMemo, useState } from 'react'
import styled from 'styled-components'
import dynamic from 'next/dynamic'
import { BreakpointPanel, BreakpointPanels, ChartAndValuesWrapper, DownloadButton, DownloadIcon } from '~/components'
import { OptionButton } from '~/components/ButtonStyled'
import { RowBetween, AutoRow } from '~/components/Row'
import Table, { columnsToShow } from '~/components/Table'
import { PeggedChainResponsivePie, PeggedChainResponsiveDominance } from '~/components/Charts'
import { RowLinks, LinksWrapper } from '~/components/Filters'
import { AreaChart } from '~/components/Charts'
import IconsRow from '~/components/IconsRow'
import { PeggedSearch } from '~/components/Search'
import QuestionHelper from '~/components/QuestionHelper'
import { Text } from 'rebass'
import { useCalcCirculating, useCreatePeggedCharts, useCalcGroupExtraPeggedByDay } from '~/hooks/data'
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
import { Attribute, PegType, BackingType } from '~/components/Filters'
import { IProtocolMcapTVLChartProps } from '~/components/TokenChart/types'

const PeggedAreaChart = dynamic(() => import('~/components/TokenChart/PeggedAreaChart'), {
	ssr: false
}) as React.FC<IProtocolMcapTVLChartProps>

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
	chainTVLData
}) {
	const [chartType, setChartType] = useState('Area')

	const belowMed = useMed()
	const belowXl = useXl()
	const aspect = belowXl ? (belowMed ? 1 : 60 / 42) : 60 / 22

	const [filteredIndexes, setFilteredIndexes] = useState([])

	// toggles
	const [stablecoinsSettings] = useStablecoinsManager()

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

			if (toFilter) {
				const chartDataIndex = peggedNameToChartDataIndex[curr.name]
				chartDataIndexes.push(chartDataIndex)
				return acc.concat(curr)
			} else return acc
		}, [])

		setFilteredIndexes(chartDataIndexes)

		return peggedAssets
	}, [filteredPeggedAssets, peggedNameToChartDataIndex, stablecoinsSettings])

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
	const [peggedAreaChartData, peggedAreaTotalData, stackedDataset] = useCreatePeggedCharts(
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
		const rows = [['Timestamp', 'Date', ...filteredPeggedNames]]
		stackedData
			.sort((a, b) => a.date - b.date)
			.forEach((day) => {
				rows.push([
					day.date,
					toNiceCsvDate(day.date),
					...filteredPeggedNames.map((peggedAsset) => day[peggedAsset] ?? '')
				])
			})
		download('peggedAssets.csv', rows.map((r) => r.join(',')).join('\n'))
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
				{/* <PeggedViewSwitch /> */}
				<Dropdowns>
					<Attribute />
					<BackingType />
					<PegType />
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
				<BreakpointPanel id="chartWrapper">
					<RowBetween mb={useMed ? 40 : 0} align="flex-start">
						<AutoRow style={{ width: 'fit-content' }} justify="flex-end" gap="6px" align="flex-start">
							<OptionButton active={chartType === 'Mcap'} onClick={() => setChartType('Mcap')}>
								Total Mcap
							</OptionButton>
							<OptionButton active={chartType === 'Area'} onClick={() => setChartType('Area')}>
								Area
							</OptionButton>
							<OptionButton active={chartType === 'Dominance'} onClick={() => setChartType('Dominance')}>
								Dominance
							</OptionButton>
							<OptionButton active={chartType === 'Pie'} onClick={() => setChartType('Pie')}>
								Pie
							</OptionButton>
						</AutoRow>
					</RowBetween>
					{chartType === 'Mcap' && (
						<PeggedAreaChart
							title={`Total ${title}`}
							chartData={peggedAreaTotalData}
							tokensUnique={totalMcapLabel}
							color={'lightcoral'}
							moneySymbol="$"
							hideLegend={true}
							hallmarks={[]}
						/>
					)}
					{chartType === 'Area' && (
						<AreaChart
							aspect={aspect}
							finalChartData={peggedAreaChartData}
							tokensUnique={peggedAssetNames}
							color={'blue'}
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
				</BreakpointPanel>
			</ChartAndValuesWrapper>

			<LinksWrapper>
				<RowLinks links={chainOptions} activeLink={selectedChain} />
			</LinksWrapper>

			<PeggedTable data={peggedTotals} columns={columns} />
		</>
	)
}

export default PeggedAssetsOverview
