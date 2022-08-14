import React, { useMemo, useState } from 'react'
import styled from 'styled-components'
import dynamic from 'next/dynamic'
import { BreakpointPanel, BreakpointPanels, ChartAndValuesWrapper, DownloadButton, DownloadIcon } from '~/components'
import { OptionButton } from '~/components/ButtonStyled'
import { RowBetween, AutoRow } from '~/components/Row'
import Table, { columnsToShow } from '~/components/Table'
import { PeggedChainResponsivePie, PeggedChainResponsiveDominance } from '~/components/Charts'
import { AreaChart } from '~/components/Charts'
import { PeggedAssetGroupOptions } from '~/components/Select'
import { PeggedSearch } from '~/components/Search'
import {
	useCalcCirculating,
	useCreatePeggedCharts,
	useCalcGroupExtraPeggedByDay,
	useGroupChainsPegged
} from '~/hooks/data'
import { useXl, useMed } from '~/hooks/useBreakpoints'
import {
	getRandomColor,
	formattedNum,
	formattedPercent,
	getPercentChange,
	getPeggedDominance,
	getPrevPeggedTotalFromChart,
	toNiceMonthlyDate,
	toNiceCsvDate,
	download
} from '~/utils'
import { IProtocolMcapTVLChartProps } from '~/components/TokenChart/types'

const PeggedAreaChart = dynamic(() => import('~/components/TokenChart/PeggedAreaChart'), {
	ssr: false
}) as React.FC<IProtocolMcapTVLChartProps>

const AssetFilters = styled.div`
	margin: 12px 0 16px;

	& > h2 {
		margin: 0 2px 8px;
		font-weight: 600;
		font-size: 0.825rem;
		color: ${({ theme }) => theme.text1};
	}
`

const PeggedTable = styled(Table)`
	tr > :first-child {
		padding-left: 40px;
	}

	// PEGGED NAME
	tr > *:nth-child(1) {
		& > * {
			width: 120px;
			overflow: hidden;
			white-space: nowrap;
		}
	}

	// 7D CHANGE
	tr > *:nth-child(2) {
		display: none;
	}

	// MCAP
	tr > *:nth-child(3) {
		padding-right: 20px;
	}

	// DOMINANCE
	tr > *:nth-child(4) {
		display: none;
	}

	// MINTED
	tr > *:nth-child(5) {
		display: none;
	}

	// BRIDGEDTO
	tr > *:nth-child(6) {
		display: none;
	}

	// MCAPTVL
	tr > *:nth-child(7) {
		display: none;
	}

	@media screen and (min-width: 360px) {
		// PEGGED NAME
		tr > *:nth-child(1) {
			& > * {
				width: 160px;
			}
		}
	}

	@media screen and (min-width: ${({ theme }) => theme.bpSm}) {
		// 7D CHANGE
		tr > *:nth-child(2) {
			display: revert;
		}
	}

	@media screen and (min-width: 640px) {
		// PEGGED NAME
		tr > *:nth-child(1) {
			& > * {
				width: 280px;
			}
		}
	}

	@media screen and (min-width: 720px) {
		// MCAP
		tr > *:nth-child(3) {
			padding-right: 0px;
		}

		// DOMINANCE
		tr > *:nth-child(4) {
			display: revert;
			padding-right: 20px;

			& > * {
				width: 140px;
			}
		}
	}

	@media screen and (min-width: 900px) {
		// DOMINANCE
		tr > *:nth-child(4) {
			display: revert;
		}

		// BRIDGEDTO
		tr > *:nth-child(6) {
			padding-right: 0px;
		}
	}

	@media screen and (min-width: ${({ theme }) => theme.bpLg}) {
		// MINTED
		tr > *:nth-child(5) {
			display: none !important;
		}

		// BRIDGEDTO
		tr > *:nth-child(6) {
			padding-right: 20px;
		}

		// MCAPTVL
		tr > *:nth-child(7) {
			display: none !important;
		}
	}

	@media screen and (min-width: 1200px) {
		// 7D CHANGE
		tr > *:nth-child(2) {
			display: revert !important;
		}
	}

	@media screen and (min-width: 1300px) {
		// DOMINANCE
		tr > *:nth-child(4) {
			padding-right: 0px;
		}

		// MINTED
		tr > *:nth-child(5) {
			display: revert !important;
		}

		// BRIDGEDTO
		tr > *:nth-child(6) {
			padding-right: 0px;
		}

		// MCAPTVL
		tr > *:nth-child(7) {
			display: revert !important;
		}
	}

	@media screen and (min-width: 1536px) {
		// BRIDGEDTO
		tr > *:nth-child(6) {
			display: revert;
		}
	}
`

// const ChartFilters = styled.div`
// 	display: flex;
// 	flex-wrap: wrap;
// 	align-items: center;
// 	justify-content: start;
// 	gap: 20px;
// 	margin: 0 0 -18px;
// `

const columns = [
	...columnsToShow('peggedAssetChain', '7dChange'),
	{
		header: 'Stables Mcap',
		accessor: 'mcap',
		Cell: ({ value }) => <>{value && formattedNum(value, true)}</>
	},
	{
		header: 'Dominant Stablecoin',
		accessor: 'dominance',
		disableSortBy: true,
		Cell: ({ value }) => {
			return (
				<>
					{value && (
						<AutoRow sx={{ width: '100%', justifyContent: 'flex-end', gap: '4px' }}>
							<span>{`${value.name}: `}</span>
							<span>{formattedPercent(value.value, true)}</span>
						</AutoRow>
					)}
				</>
			)
		}
	},
	{
		header: 'Total Mcap Issued On',
		accessor: 'minted',
		Cell: ({ value }) => <>{value && formattedNum(value, true)}</>
	},
	{
		header: 'Total Mcap Bridged To',
		accessor: 'bridgedTo',
		Cell: ({ value }) => <>{value && formattedNum(value, true)}</>
	},
	{
		header: 'Stables Mcap/TVL',
		accessor: 'mcaptvl',
		Cell: ({ value }) => <>{value && formattedNum(value, false)}</>
	}
]

function PeggedChainsOverview({
	chainCirculatings,
	chartData,
	peggedChartDataByChain,
	chainList,
	chainsGroupbyParent,
	chainTVLData
}) {
	const [chartType, setChartType] = useState('Area')

	const belowMed = useMed()
	const belowXl = useXl()
	const aspect = belowXl ? (belowMed ? 1 : 60 / 42) : 60 / 22

	const [peggedAreaChartData, peggedAreaTotalData, stackedDataset] = useCreatePeggedCharts(
		peggedChartDataByChain,
		chainList,
		[...Array(chainList.length).keys()],
		'mcap',
		chainTVLData
	)

	const filteredPeggedAssets = chainCirculatings
	const chainTotals = useCalcCirculating(filteredPeggedAssets)

	const { data: stackedData, daySum } = useCalcGroupExtraPeggedByDay(stackedDataset)

	const downloadCsv = () => {
		const rows = [['Timestamp', 'Date', ...chainList]]
		stackedData
			.sort((a, b) => a.date - b.date)
			.forEach((day) => {
				rows.push([day.date, toNiceCsvDate(day.date), ...chainList.map((chain) => day[chain] ?? '')])
			})
		download('peggedAssetsChainTotals.csv', rows.map((r) => r.join(',')).join('\n'))
	}

	const title = `Stablecoins Market Cap`

	const { percentChange, totalMcapCurrent } = useMemo(() => {
		const totalMcapCurrent = getPrevPeggedTotalFromChart(chartData, 0, 'totalCirculatingUSD')
		const totalMcapPrevDay = getPrevPeggedTotalFromChart(chartData, 7, 'totalCirculatingUSD')
		const percentChange = getPercentChange(totalMcapCurrent, totalMcapPrevDay)?.toFixed(2)
		return { percentChange, totalMcapCurrent }
	}, [chartData])

	const mcapToDisplay = formattedNum(totalMcapCurrent, true)

	let topChain = { name: 'Ethereum', mcap: 0 }
	if (chainTotals.length > 0) {
		const topChainData = chainTotals[0]
		topChain.name = topChainData.name
		topChain.mcap = topChainData.mcap
	}

	const dominance = getPeggedDominance(topChain, totalMcapCurrent)

	const totalMcapLabel = ['Mcap', 'TVL']

	const groupedChains = useGroupChainsPegged(chainTotals, chainsGroupbyParent)

	const chainsCirculatingValues = useMemo(() => {
		const data = groupedChains.map((chain) => ({ name: chain.name, value: chain.mcap }))

		const otherCirculating = data.slice(10).reduce((total, entry) => {
			return (total += entry.value)
		}, 0)

		return data
			.slice(0, 10)
			.sort((a, b) => b.value - a.value)
			.concat({ name: 'Others', value: otherCirculating })
	}, [groupedChains])

	const chainColor = useMemo(
		() =>
			Object.fromEntries(
				[...chainTotals, 'Others'].map((chain) => {
					return typeof chain === 'string' ? ['-', getRandomColor()] : [chain.name, getRandomColor()]
				})
			),
		[chainTotals]
	)

	const groupedChainColor = useMemo(
		() =>
			Object.fromEntries(
				[...groupedChains, 'Others'].map((chain) => {
					return typeof chain === 'string' ? ['-', getRandomColor()] : [chain.name, getRandomColor()]
				})
			),
		[groupedChains]
	)

	return (
		<>
			<PeggedSearch step={{ category: 'Stablecoins', name: 'Chains' }} />
			{/* 
			<ChartFilters>
				<PeggedViewSwitch />
			</ChartFilters> */}

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
						<h2>{topChain.name} Dominance</h2>
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
							tokensUnique={chainList}
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
							chainsUnique={chainList}
							chainColor={chainColor}
							daySum={daySum}
							aspect={aspect}
						/>
					)}
					{chartType === 'Pie' && (
						<PeggedChainResponsivePie data={chainsCirculatingValues} chainColor={groupedChainColor} aspect={aspect} />
					)}
				</BreakpointPanel>
			</ChartAndValuesWrapper>

			<AssetFilters>
				<h2>Filters</h2>
				<PeggedAssetGroupOptions label="Filters" />
			</AssetFilters>

			<PeggedTable data={groupedChains} columns={columns} />
		</>
	)
}

export default PeggedChainsOverview
