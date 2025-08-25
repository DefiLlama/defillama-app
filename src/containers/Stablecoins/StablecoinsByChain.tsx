import * as React from 'react'
import { useRouter } from 'next/router'
import type { IBarChartProps, IChartProps, IPieChartProps } from '~/components/ECharts/types'
import { Icon } from '~/components/Icon'
import { RowLinksWithDropdown } from '~/components/RowLinksWithDropdown'
import { Tooltip } from '~/components/Tooltip'
import { oldBlue } from '~/constants/colors'
import { ChartSelector } from '~/containers/Stablecoins/ChartSelector'
import { PeggedFilters } from '~/containers/Stablecoins/Filters'
import { stablecoinAttributeOptions } from '~/containers/Stablecoins/Filters/Attribute'
import { stablecoinBackingOptions } from '~/containers/Stablecoins/Filters/BackingType'
import { stablecoinPegTypeOptions } from '~/containers/Stablecoins/Filters/PegType'
import { buildStablecoinChartData, getStablecoinDominance } from '~/containers/Stablecoins/utils'
import {
	useCalcCirculating,
	useCalcGroupExtraPeggedByDay,
	useFormatStablecoinQueryParams
} from '~/hooks/data/stablecoins'
import { download, formattedNum, getPercentChange, preparePieChartData, slug, toNiceCsvDate } from '~/utils'
import { PeggedAssetsTable } from './Table'

const AreaChart = React.lazy(() => import('~/components/ECharts/AreaChart')) as React.FC<IChartProps>

const BarChart = React.lazy(() => import('~/components/ECharts/BarChart')) as React.FC<IBarChartProps>

const PieChart = React.lazy(() => import('~/components/ECharts/PieChart')) as React.FC<IPieChartProps>

export function StablecoinsByChain({
	selectedChain = 'All',
	chains = [],
	filteredPeggedAssets,
	peggedAssetNames,
	peggedNameToChartDataIndex,
	chartDataByPeggedAsset,
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
		return preparePieChartData({ data: peggedTotals, sliceIdentifier: 'symbol', sliceValue: 'mcap', limit: 10 })
	}, [peggedTotals])

	const { data: stackedData, dataWithExtraPeggedAndDominanceByDay } = useCalcGroupExtraPeggedByDay(stackedDataset)

	const prepareCsv = () => {
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
			<RowLinksWithDropdown links={chainOptions} activeLink={selectedChain} />

			<PeggedFilters pathname={path} downloadCsv={prepareCsv} />

			<div className="relative isolate grid grid-cols-2 gap-2 xl:grid-cols-3">
				<div className="col-span-2 flex w-full flex-col gap-6 overflow-x-auto rounded-md border border-(--cards-border) bg-(--cards-bg) p-5 xl:col-span-1">
					<p className="flex flex-col">
						<span className="text-(--text-label)">Total {title}</span>
						<span className="font-jetbrains text-2xl font-semibold">{mcapToDisplay}</span>
					</p>
					<details className="group text-base">
						<summary className="flex items-center">
							<Icon
								name="chevron-right"
								height={20}
								width={20}
								className="-mb-5 -ml-5 transition-transform duration-100 group-open:rotate-90"
							/>
							<span className="flex w-full flex-col">
								<span className="text-(--text-label)">Change (7d)</span>

								<span className="flex flex-nowrap items-end justify-between gap-1">
									<span className="font-jetbrains text-2xl font-semibold">{change7d_nol}</span>
									<span
										className={`${
											change7d.startsWith('-') ? 'text-(--error)' : 'text-(--success)'
										} font-jetbrains overflow-hidden text-ellipsis whitespace-nowrap`}
									>{`${change7d}%`}</span>
								</span>
							</span>
						</summary>

						<p className="mt-3 flex flex-wrap items-center justify-between gap-2">
							<span className="text-(--text-label)">Change (1d)</span>
							<Tooltip
								content={change1d_nol}
								className={`font-jetbrains overflow-hidden text-ellipsis whitespace-nowrap underline decoration-dotted ${
									change1d.startsWith('-') ? 'text-(--error)' : 'text-(--success)'
								}`}
							>
								{`${change1d}%`}
							</Tooltip>
						</p>
						<p className="mt-3 flex flex-wrap items-center justify-between gap-2">
							<span className="text-(--text-label)">Change (30d)</span>
							<Tooltip
								content={change30d_nol}
								className={`font-jetbrains overflow-hidden text-ellipsis whitespace-nowrap underline decoration-dotted ${
									change30d.startsWith('-') ? 'text-(--error)' : 'text-(--success)'
								}`}
							>
								{`${change30d}%`}
							</Tooltip>
						</p>
					</details>
					<p className="flex flex-col">
						<span className="text-(--text-label)">{topToken.symbol} Dominance</span>
						<span className="font-jetbrains text-2xl font-semibold">{dominance}%</span>
					</p>
				</div>
				<div
					className={`relative col-span-2 flex min-h-[424px] flex-col gap-4 rounded-md border border-(--cards-border) bg-(--cards-bg) ${
						chartType === 'Token Inflows' && tokenInflows ? '*:first:-mb-6' : ''
					}`}
				>
					<ChartSelector options={chartTypeList} selectedChart={chartType} onClick={setChartType} />

					{chartType === 'Total Market Cap' && (
						<React.Suspense fallback={<></>}>
							<AreaChart
								title=""
								chartData={peggedAreaTotalData}
								stacks={totalMcapLabel}
								valueSymbol="$"
								hideDefaultLegend={true}
								hallmarks={[]}
								color={oldBlue}
							/>
						</React.Suspense>
					)}
					{chartType === 'Token Market Caps' && (
						<React.Suspense fallback={<></>}>
							<AreaChart
								title=""
								chartData={peggedAreaChartData}
								stacks={peggedAssetNames}
								valueSymbol="$"
								hideDefaultLegend={true}
								hideGradient={true}
								stackColors={tokenColors}
							/>
						</React.Suspense>
					)}
					{chartType === 'Dominance' && (
						<React.Suspense fallback={<></>}>
							<AreaChart
								title=""
								valueSymbol="%"
								chartData={dataWithExtraPeggedAndDominanceByDay}
								stacks={peggedAssetNames}
								hideDefaultLegend={true}
								hideGradient={true}
								expandTo100Percent={true}
								stackColors={tokenColors}
							/>
						</React.Suspense>
					)}
					{chartType === 'Pie' && (
						<React.Suspense fallback={<></>}>
							<PieChart chartData={chainsCirculatingValues} stackColors={tokenColors} />
						</React.Suspense>
					)}
					{chartType === 'Token Inflows' && tokenInflows && (
						<React.Suspense fallback={<></>}>
							<BarChart
								chartData={tokenInflows}
								title=""
								hideDefaultLegend={true}
								customLegendName="Token"
								customLegendOptions={tokenInflowNames}
								key={tokenInflowNames} // escape hatch to rerender state in legend options
								chartOptions={inflowsChartOptions}
								stackColors={tokenColors}
							/>
						</React.Suspense>
					)}
					{chartType === 'USD Inflows' && usdInflows && (
						<React.Suspense fallback={<></>}>
							<BarChart chartData={usdInflows} color={oldBlue} title="" />
						</React.Suspense>
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
	return `/stablecoins/${slug(selectedChain)}${params}`
}

const inflowsChartOptions = {
	overrides: {
		inflow: true
	}
}

const tokenColors = {
	USDT: '#009393',
	USDC: '#0B53BF',
	DAI: '#F4B731',
	USDe: '#3A3A3A',
	BUIDL: '#111111',
	USD1: '#D2B48C',
	USDS: '#E67E22',
	PYUSD: '#4A90E2',
	USDTB: '#C0C0C0',
	FDUSD: '#00FF00',
	Others: '#FF1493'
}
