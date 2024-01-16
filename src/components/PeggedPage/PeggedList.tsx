import * as React from 'react'

import { useRouter } from 'next/router'
import styled from 'styled-components'
import dynamic from 'next/dynamic'
import { BreakpointPanel, BreakpointPanels, ChartAndValuesWrapper, DownloadButton, DownloadIcon } from '~/components'
import { RowLinksWithDropdown, RowLinksWrapper } from '~/components/Filters'
import type { IBarChartProps, IChartProps, IPieChartProps } from '~/components/ECharts/types'
import { PeggedSearch } from '~/components/Search'
import { ChartSelector } from '~/components/PeggedPage/.'
import {
	Attribute,
	stablecoinAttributeOptions,
	PegType,
	stablecoinPegTypeOptions,
	BackingType,
	stablecoinBackingOptions,
	McapRange,
	ResetAllStablecoinFilters
} from '~/components/Filters'
import { PeggedAssetsTable } from '~/components/Table'
import {
	useCalcCirculating,
	useCalcGroupExtraPeggedByDay,
	useFormatStablecoinQueryParams
} from '~/hooks/data/stablecoins'
import { useBuildPeggedChartData } from '~/utils/stablecoins'
import { formattedNum, getPercentChange, getPeggedDominance, toNiceCsvDate, download } from '~/utils'

const AreaChart = dynamic(() => import('~/components/ECharts/AreaChart'), {
	ssr: false
}) as React.FC<IChartProps>

const BarChart = dynamic(() => import('~/components/ECharts/BarChart'), {
	ssr: false
}) as React.FC<IBarChartProps>

const PieChart = dynamic(() => import('~/components/ECharts/PieChart'), {
	ssr: false
}) as React.FC<IPieChartProps>

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
// TODO: chart colors by stablecoins logo
function PeggedAssetsOverview({
	selectedChain = 'All',
	chains = [],
	filteredPeggedAssets,
	peggedAssetNames,
	peggedNameToChartDataIndex,
	chartDataByPeggedAsset,
	backgroundColor
}) {
	const [chartType, setChartType] = React.useState(selectedChain === 'All' ? 'Token Market Caps' : 'USD Inflows')

	const chartTypeList =
		selectedChain !== 'All'
			? ['USD Inflows', 'Total Market Cap', 'Token Market Caps', 'Token Inflows', 'Pie', 'Dominance']
			: ['Total Market Cap', 'Token Market Caps', 'Pie', 'Dominance', 'USD Inflows', 'Token Inflows']

	const [filteredIndexes, setFilteredIndexes] = React.useState([])

	const { query } = useRouter()
	const { minMcap, maxMcap } = query

	const { selectedAttributes, selectedPegTypes, selectedBackings } = useFormatStablecoinQueryParams({
		stablecoinAttributeOptions,
		stablecoinPegTypeOptions,
		stablecoinBackingOptions
	})

	const peggedAssets = React.useMemo(() => {
		let chartDataIndexes = []
		const peggedAssets = filteredPeggedAssets.reduce((acc, curr) => {
			let toFilter = false

			// These together filter depegged. Need to refactor once any other attributes are added.
			toFilter = Math.abs(curr.pegDeviation) < 10 || !(typeof curr.pegDeviation === 'number')
			selectedAttributes.forEach((attribute) => {
				const attributeOption = stablecoinAttributeOptions.find((o) => o.key === attribute)

				if (attributeOption) {
					toFilter = attributeOption.filterFn(curr)
				}
			})

			toFilter =
				toFilter &&
				selectedPegTypes
					.map((pegtype) => {
						const pegTypeOption = stablecoinPegTypeOptions.find((o) => o.key === pegtype)
						return pegTypeOption ? pegTypeOption.filterFn(curr) : false
					})
					.some((bool) => bool)

			toFilter =
				toFilter &&
				selectedBackings
					.map((backing) => {
						const backingOption = stablecoinBackingOptions.find((o) => o.key === backing)
						return backingOption ? backingOption.filterFn(curr) : false
					})
					.some((bool) => bool)

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
	}, [
		filteredPeggedAssets,
		peggedNameToChartDataIndex,
		minMcap,
		maxMcap,
		selectedAttributes,
		selectedPegTypes,
		selectedBackings
	])

	const { peggedAreaChartData, peggedAreaTotalData, stackedDataset, tokenInflows, tokenInflowNames, usdInflows } =
		useBuildPeggedChartData(chartDataByPeggedAsset, peggedAssetNames, filteredIndexes, 'mcap', selectedChain)

	const chainOptions = ['All', ...chains].map((label) => ({ label, to: handleRouting(label, query) }))

	const peggedTotals = useCalcCirculating(peggedAssets)

	const chainsCirculatingValues = React.useMemo(() => {
		const data = peggedTotals.map((chain) => ({ name: chain.symbol, value: chain.mcap }))

		const otherCirculating = data.slice(10).reduce((total, entry) => {
			return (total += entry.value)
		}, 0)

		return data
			.slice(0, 10)
			.sort((a, b) => b.value - a.value)
			.concat({ name: 'Others', value: otherCirculating })
	}, [peggedTotals])

	const { data: stackedData, dataWithExtraPeggedAndDominanceByDay } = useCalcGroupExtraPeggedByDay(stackedDataset)

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
		title = `${selectedChain} Stablecoins Market Cap`
	}

	const { percentChange, totalMcapCurrent } = React.useMemo(() => {
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

	const path = selectedChain === 'All' ? '/stablecoins' : `/stablecoins/${selectedChain}`

	return (
		<>
			<PeggedSearch step={{ category: 'Stablecoins', name: title }} />
			<ChartFilters>
				<Dropdowns>
					<Attribute pathname={path} />
					<BackingType pathname={path} />
					<PegType pathname={path} />
					<McapRange />
					<ResetAllStablecoinFilters pathname={path} />
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
						<AreaChart
							title=""
							chartData={peggedAreaTotalData}
							stacks={totalMcapLabel}
							color={'lightcoral'}
							valueSymbol="$"
							hideDefaultLegend={true}
							hallmarks={[]}
							hideGradient={true}
						/>
					)}
					{chartType === 'Token Market Caps' && (
						<AreaChart
							title=""
							chartData={peggedAreaChartData}
							stacks={peggedAssetNames}
							valueSymbol="$"
							hideDefaultLegend={true}
							hideGradient={true}
						/>
					)}
					{chartType === 'Dominance' && (
						<AreaChart
							title=""
							valueSymbol="%"
							chartData={dataWithExtraPeggedAndDominanceByDay}
							stacks={peggedAssetNames}
							hideDefaultLegend={true}
							hideGradient={true}
							expandTo100Percent={true}
						/>
					)}
					{chartType === 'Pie' && <PieChart chartData={chainsCirculatingValues} />}
					{chartType === 'Token Inflows' && tokenInflows && (
						<BarChart
							chartData={tokenInflows}
							title=""
							hideDefaultLegend={true}
							customLegendName="Token"
							customLegendOptions={tokenInflowNames}
							key={tokenInflowNames} // escape hatch to rerender state in legend options
							chartOptions={inflowsChartOptions}
						/>
					)}
					{chartType === 'USD Inflows' && usdInflows && (
						<BarChart chartData={usdInflows} color={backgroundColor} title="" />
					)}
				</BreakpointPanel>
			</ChartAndValuesWrapper>

			<RowLinksWrapper>
				<RowLinksWithDropdown links={chainOptions} activeLink={selectedChain} />
			</RowLinksWrapper>

			<PeggedAssetsTable data={peggedTotals} />
		</>
	)
}

function handleRouting(selectedChain, queryParams) {
	const { chain, ...filters } = queryParams

	let params = ''

	Object.keys(filters).forEach((filter, index) => {
		// append '?' before all query params and '&' bertween diff params
		if (index === 0) {
			params += '?'
		} else params += '&'

		// query params of same query like pegType will return in array form - pegType=['USD','EUR'], expected output is pegType=USD&pegType=EUR
		if (Array.isArray(filters[filter])) {
			filters[filter].forEach((f, i) => {
				if (i > 0) {
					params += '&'
				}

				params += `${filter}=${f}`
			})
		} else {
			params += `${filter}=${filters[filter]}`
		}
	})

	if (selectedChain === 'All') return `/stablecoins${params}`
	return `/stablecoins/${selectedChain}${params}`
}

const inflowsChartOptions = {
	overrides: {
		inflow: true
	}
}

export default PeggedAssetsOverview
