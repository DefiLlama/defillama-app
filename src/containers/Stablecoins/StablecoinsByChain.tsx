import * as React from 'react'

import { useRouter } from 'next/router'
import dynamic from 'next/dynamic'
import { RowLinksWithDropdown } from '~/components/RowLinksWithDropdown'
import type { IBarChartProps, IChartProps, IPieChartProps } from '~/components/ECharts/types'
import { ChartSelector } from '~/containers/Stablecoins/ChartSelector'
import { stablecoinAttributeOptions } from '~/components/Filters/stablecoins/Attribute'
import { stablecoinPegTypeOptions } from '~/components/Filters/stablecoins/PegType'
import { stablecoinBackingOptions } from '~/components/Filters/stablecoins/BackingType'
import { PeggedAssetsTable } from './Table'
import {
	useCalcCirculating,
	useCalcGroupExtraPeggedByDay,
	useFormatStablecoinQueryParams
} from '~/hooks/data/stablecoins'
import { buildStablecoinChartData, getStablecoinDominance } from '~/containers/Stablecoins/utils'
import { formattedNum, getPercentChange, toNiceCsvDate, download } from '~/utils'
import { PeggedFilters } from '~/components/Filters/stablecoins'
import { Icon } from '~/components/Icon'
import { Tooltip } from '~/components/Tooltip'

const AreaChart = dynamic(() => import('~/components/ECharts/AreaChart'), {
	ssr: false
}) as React.FC<IChartProps>

const BarChart = dynamic(() => import('~/components/ECharts/BarChart'), {
	ssr: false
}) as React.FC<IBarChartProps>

const PieChart = dynamic(() => import('~/components/ECharts/PieChart'), {
	ssr: false
}) as React.FC<IPieChartProps>

// TODO: chart colors by stablecoins logo
function PeggedAssetsOverview({
	selectedChain = 'All',
	chains = [],
	filteredPeggedAssets,
	peggedAssetNames,
	peggedNameToChartDataIndex,
	chartDataByPeggedAsset,
	backgroundColor,
	doublecountedIds
}) {
	const [chartType, setChartType] = React.useState('Total Market Cap')

	const chartTypeList =
		selectedChain !== 'All'
			? ['Total Market Cap', 'USD Inflows', 'Token Market Caps', 'Token Inflows', 'Pie', 'Dominance']
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
		React.useMemo(() => {
			return buildStablecoinChartData({
				chartDataByAssetOrChain: chartDataByPeggedAsset,
				assetsOrChainsList: peggedAssetNames,
				filteredIndexes,
				issuanceType: 'mcap',
				selectedChain,
				doublecountedIds
			})
		}, [chartDataByPeggedAsset, peggedAssetNames, filteredIndexes, selectedChain, doublecountedIds])

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

	const { change1d, change7d, change30d, totalMcapCurrent, change1d_nol, change7d_nol, change30d_nol } =
		React.useMemo(() => {
			let totalMcapCurrent = peggedAreaTotalData?.[peggedAreaTotalData.length - 1]?.Mcap
			let totalMcapPrevDay = peggedAreaTotalData?.[peggedAreaTotalData.length - 2]?.Mcap
			let totalMcapPrevWeek = peggedAreaTotalData?.[peggedAreaTotalData.length - 8]?.Mcap
			let totalMcapPrevMonth = peggedAreaTotalData?.[peggedAreaTotalData.length - 31]?.Mcap
			const change1d = getPercentChange(totalMcapCurrent, totalMcapPrevDay)?.toFixed(2) ?? '0'
			const change7d = getPercentChange(totalMcapCurrent, totalMcapPrevWeek)?.toFixed(2) ?? '0'
			const change30d = getPercentChange(totalMcapCurrent, totalMcapPrevMonth)?.toFixed(2) ?? '0'
			const change1d_nol = formattedNum(
				String(
					totalMcapCurrent && totalMcapPrevDay
						? parseFloat(totalMcapCurrent as string) - parseFloat(totalMcapPrevDay as string)
						: 0
				),
				true
			)
			const change7d_nol = formattedNum(
				String(
					totalMcapCurrent && totalMcapPrevDay
						? parseFloat(totalMcapCurrent as string) - parseFloat(totalMcapPrevWeek as string)
						: 0
				),
				true
			)
			const change30d_nol = formattedNum(
				String(
					totalMcapCurrent && totalMcapPrevDay
						? parseFloat(totalMcapCurrent as string) - parseFloat(totalMcapPrevMonth as string)
						: 0
				),
				true
			)

			return {
				change1d: change1d.startsWith('-') ? change1d : `+${change1d}`,
				change7d: change7d.startsWith('-') ? change7d : `+${change7d}`,
				change30d: change30d.startsWith('-') ? change30d : `+${change30d}`,
				totalMcapCurrent,
				change1d_nol: change1d_nol.startsWith('-') ? change1d_nol : `+${change1d_nol}`,
				change7d_nol: change7d_nol.startsWith('-') ? change7d_nol : `+${change7d_nol}`,
				change30d_nol: change30d_nol.startsWith('-') ? change30d_nol : `+${change30d_nol}`
			}
		}, [peggedAreaTotalData])

	const mcapToDisplay = formattedNum(totalMcapCurrent, true)

	let topToken = { symbol: 'USDT', mcap: 0 }
	if (peggedTotals.length > 0) {
		const topTokenData = peggedTotals[0]
		topToken.symbol = topTokenData.symbol
		topToken.mcap = topTokenData.mcap
	}

	const dominance = getStablecoinDominance(topToken, totalMcapCurrent)

	const totalMcapLabel = ['Mcap']

	const path = selectedChain === 'All' ? '/stablecoins' : `/stablecoins/${selectedChain}`

	return (
		<>
			<PeggedFilters pathname={path} downloadCsv={downloadCsv} />

			<RowLinksWithDropdown links={chainOptions} activeLink={selectedChain} />

			<div className="grid grid-cols-2 relative isolate xl:grid-cols-3 gap-1">
				<div className="bg-[var(--cards-bg)] rounded-md flex flex-col gap-6 p-5 col-span-2 w-full xl:col-span-1 overflow-x-auto">
					<p className="flex flex-col">
						<span className="text-[#545757] dark:text-[#cccccc]">Total {title}</span>
						<span className="font-semibold text-2xl font-jetbrains">{mcapToDisplay}</span>
					</p>
					<details className="group text-base">
						<summary className="flex items-center">
							<Icon
								name="chevron-right"
								height={20}
								width={20}
								className="-ml-5 -mb-5 group-open:rotate-90 transition-transform duration-100"
							/>
							<span className="flex flex-col w-full">
								<span className="text-[#545757] dark:text-[#cccccc]">Change (7d)</span>

								<span className="flex items-end justify-between flex-nowrap gap-1">
									<span className="font-semibold text-2xl font-jetbrains">{change7d_nol}</span>
									<span
										className={`${
											change7d.startsWith('-') ? 'text-[var(--pct-red)]' : 'text-[var(--pct-green)]'
										} font-jetbrains overflow-hidden whitespace-nowrap text-ellipsis`}
									>{`${change7d}%`}</span>
								</span>
							</span>
						</summary>

						<p className="flex items-center flex-wrap justify-between gap-2 mt-3">
							<span className="text-[#545757] dark:text-[#cccccc]">Change (1d)</span>
							<Tooltip
								content={change1d_nol}
								className={`font-jetbrains overflow-hidden whitespace-nowrap text-ellipsis underline decoration-dotted ${
									change1d.startsWith('-') ? 'text-[var(--pct-red)]' : 'text-[var(--pct-green)]'
								}`}
							>
								{`${change1d}%`}
							</Tooltip>
						</p>
						<p className="flex items-center flex-wrap justify-between gap-2 mt-3">
							<span className="text-[#545757] dark:text-[#cccccc]">Change (30d)</span>
							<Tooltip
								content={change30d_nol}
								className={`font-jetbrains overflow-hidden whitespace-nowrap text-ellipsis underline decoration-dotted ${
									change30d.startsWith('-') ? 'text-[var(--pct-red)]' : 'text-[var(--pct-green)]'
								}`}
							>
								{`${change30d}%`}
							</Tooltip>
						</p>
					</details>
					<p className="flex flex-col">
						<span className="text-[#545757] dark:text-[#cccccc]">{topToken.symbol} Dominance</span>
						<span className="font-semibold text-2xl font-jetbrains">{dominance}%</span>
					</p>
				</div>
				<div
					className={`bg-[var(--cards-bg)] rounded-md flex flex-col gap-4 col-span-2 min-h-[424px] relative ${
						chartType === 'Token Inflows' && tokenInflows ? 'first:*:-mb-6' : ''
					}`}
				>
					<ChartSelector options={chartTypeList} selectedChart={chartType} onClick={setChartType} />

					{chartType === 'Total Market Cap' && (
						<AreaChart
							title=""
							chartData={peggedAreaTotalData}
							stacks={totalMcapLabel}
							valueSymbol="$"
							hideDefaultLegend={true}
							hallmarks={[]}
							color="#1F67D2"
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
				</div>
			</div>

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
