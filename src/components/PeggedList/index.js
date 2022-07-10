import { useMemo, useState } from 'react'
import styled from 'styled-components'
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
import { useCalcCirculating, useCalcGroupExtraPeggedByDay } from '~/hooks/data'
import { useXl, useMed } from '~/hooks/useBreakpoints'
import {
	getRandomColor,
	capitalizeFirstLetter,
	formattedNum,
	formattedPeggedPrice,
	getPrevPeggedTotalFromChart,
	getPercentChange,
	getPeggedDominance,
	toNiceMonthlyDate,
	toNiceCsvDate,
	download
} from '~/utils'

function Chart({ peggedAreaChartData, peggedAreaMcapData, totalMcapLabel, peggedAssetNames, aspect }) {
	const finalChartData = peggedAreaChartData ? peggedAreaChartData : peggedAreaMcapData
	const labels = peggedAssetNames ? peggedAssetNames : totalMcapLabel
	return (
		<AreaChart
			aspect={aspect}
			finalChartData={finalChartData}
			tokensUnique={labels}
			color={'blue'}
			moneySymbol="$"
			formatDate={toNiceMonthlyDate}
			hallmarks={[]}
		/>
	)
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
			width: 120px;
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

	// PRICE
	tr > *:nth-child(3) {
		display: none;
	}

	// 1D CHANGE
	tr > *:nth-child(4) {
		display: none;
	}

	// 7D CHANGE
	tr > *:nth-child(5) {
		display: none;
	}

	// 1M CHANGE
	tr > *:nth-child(6) {
		display: none;
	}

	// MCAP
	tr > *:nth-child(7) {
		padding-right: 20px;
		& > * {
			text-align: right;
			margin-left: auto;
			white-space: nowrap;
			overflow: hidden;
		}
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
		tr > *:nth-child(5) {
			display: revert;
		}
	}

	@media screen and (min-width: 640px) {
		// PEGGED NAME
		tr > *:nth-child(1) {
			& > * {
				width: 280px;
				// SHOW LOGO
				& > *:nth-child(2) {
					display: flex;
				}
			}
		}
	}

	@media screen and (min-width: 720px) {
		// 1M CHANGE
		tr > *:nth-child(6) {
			display: revert;
		}
	}

	@media screen and (min-width: ${({ theme }) => theme.bpMed}) {
		// PEGGED NAME
		tr > *:nth-child(1) {
			& > * {
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
		tr > *:nth-child(7) {
			padding-right: 0px;
		}
	}

	@media screen and (min-width: ${({ theme }) => theme.bpLg}) {
		// 1D CHANGE
		tr > *:nth-child(4) {
			display: none !important;
		}

		// MCAP
		tr > *:nth-child(7) {
			padding-right: 20px;
		}
	}

	@media screen and (min-width: 1200px) {
		// 1M CHANGE
		tr > *:nth-child(6) {
			display: revert !important;
		}
	}

	@media screen and (min-width: 1300px) {
		// PRICE
		tr > *:nth-child(3) {
			display: revert !important;
		}

		// 1D CHANGE
		tr > *:nth-child(4) {
			display: revert !important;
		}

		// MCAP
		tr > *:nth-child(7) {
			display: revert !important;
		}
	}

	@media screen and (min-width: 1536px) {
		// PEGGED NAME
		tr > *:nth-child(1) {
			& > * {
				width: 300px;
			}
		}

		// CHAINS
		tr > *:nth-child(2) {
			display: revert;
		}
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
		header: 'Price',
		accessor: 'price',
		Cell: ({ value, rowValues }) => {
			return (
				<AutoRow sx={{ width: '100%', justifyContent: 'flex-end', gap: '4px' }}>
					{rowValues.depeggedTwoPercent ? (
						<QuestionHelper text="This pegged asset is currently de-pegged by 2% or more." />
					) : null}
					{rowValues.floatingPeg ? (
						<QuestionHelper text="This pegged asset has a variable, floating, or crawling peg." />
					) : null}
					<span
						style={{
							color: rowValues.depeggedTwoPercent ? 'tomato' : 'inherit'
						}}
					>
						{value ? formattedPeggedPrice(value, true) : '-'}
					</span>
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
	title,
	selectedChain = 'All',
	chains = [],
	filteredPeggedAssets,
	peggedAssetNames,
	chartData,
	peggedAreaChartData,
	peggedAreaMcapData,
	stackedDataset,
	peggedChartType,
	showChainList = true,
	defaultSortingColumn
}) {
	const [chartType, setChartType] = useState(peggedChartType)

	const belowMed = useMed()
	const belowXl = useXl()
	const aspect = belowXl ? (belowMed ? 1 : 60 / 42) : 60 / 22

	const handleRouting = (chain) => {
		if (chain === 'All') return `/stablecoins`
		return `/stablecoins/${chain}`
	}
	const chainOptions = ['All', ...chains].map((label) => ({ label, to: handleRouting(label) }))

	const peggedTotals = useCalcCirculating(filteredPeggedAssets, defaultSortingColumn)

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
		() => Object.fromEntries([...peggedTotals, 'Others'].map((peggedAsset) => [peggedAsset.symbol, getRandomColor()])),
		[peggedTotals]
	)

	const { data: stackedData, daySum } = useCalcGroupExtraPeggedByDay(stackedDataset)

	const downloadCsv = () => {
		const rows = [['Timestamp', 'Date', ...peggedAssetNames]]
		stackedData
			.sort((a, b) => a.date - b.date)
			.forEach((day) => {
				rows.push([day.date, toNiceCsvDate(day.date), ...peggedAssetNames.map((peggedAsset) => day[peggedAsset] ?? '')])
			})
		download('peggedAssets.csv', rows.map((r) => r.join(',')).join('\n'))
	}

	if (!title) {
		title = `Stablecoins Market Cap`
		if (selectedChain !== 'All') {
			title = `${capitalizeFirstLetter(selectedChain)} Stablecoins Market Cap`
		}
	}

	const { percentChange, totalMcapCurrent } = useMemo(() => {
		const totalMcapCurrent = getPrevPeggedTotalFromChart(chartData, 0, 'totalCirculatingUSD')
		const totalMcapPrevDay = getPrevPeggedTotalFromChart(chartData, 7, 'totalCirculatingUSD')
		const percentChange = getPercentChange(totalMcapCurrent, totalMcapPrevDay)?.toFixed(2)
		return { percentChange, totalMcapCurrent }
	}, [chartData])

	const mcapToDisplay = formattedNum(totalMcapCurrent, true)

	let topToken = { symbol: 'USDT', mcap: 0 }
	if (peggedTotals.length > 0) {
		const topTokenData = peggedTotals[0]
		topToken.symbol = topTokenData.symbol
		topToken.mcap = topTokenData.mcap
	}

	const dominance = getPeggedDominance(topToken, totalMcapCurrent)

	const totalMcapLabel = ['Total Stablecoins Market Cap']

	return (
		<>
			<PeggedSearch step={{ category: 'Home', name: 'Stablecoins' }} />

			<ChartAndValuesWrapper>
				<BreakpointPanels>
					<BreakpointPanel>
						<h1>Total {title}</h1>
						<p style={{ '--tile-text-color': '#4f8fea' }}>{mcapToDisplay}</p>
						<DownloadButton as="button" onClick={downloadCsv}>
							<DownloadIcon />
							<span>&nbsp;&nbsp;.csv</span>
						</DownloadButton>
					</BreakpointPanel>
					<BreakpointPanel>
						<h2>Change (7d)</h2>
						<p style={{ '--tile-text-color': '#fd3c99' }}> {percentChange || 0}%</p>
					</BreakpointPanel>
					<BreakpointPanel>
						<h2>{topToken.symbol} Dominance</h2>
						<p style={{ '--tile-text-color': '#46acb7' }}> {dominance}%</p>
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
					{chartType === 'Mcap' && <Chart {...{ peggedAreaMcapData, totalMcapLabel, aspect }} />}
					{chartType === 'Area' && <Chart {...{ peggedAreaChartData, peggedAssetNames, aspect }} />}
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

			{showChainList && (
				<LinksWrapper>
					<RowLinks links={chainOptions} activeLink={selectedChain} />
				</LinksWrapper>
			)}

			<PeggedTable data={peggedTotals} columns={columns} />
		</>
	)
}

export default PeggedAssetsOverview
