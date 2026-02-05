import { ColumnDef } from '@tanstack/react-table'
import * as React from 'react'
import { maxAgeForNext } from '~/api'
import { ChartCsvExportButton } from '~/components/ButtonStyled/ChartCsvExportButton'
import { ChartExportButton } from '~/components/ButtonStyled/ChartExportButton'
import { tvlOptions } from '~/components/Filters/options'
import { Icon } from '~/components/Icon'
import { BasicLink } from '~/components/Link'
import { SelectWithCombobox } from '~/components/SelectWithCombobox'
import { TableWithSearch } from '~/components/Table/TableWithSearch'
import { CATEGORY_API, PROTOCOLS_API } from '~/constants'
import { getAdapterChainOverview } from '~/containers/DimensionAdapters/queries'
import { protocolCategories } from '~/containers/ProtocolsByCategoryOrTag/constants'
import { TVL_SETTINGS_KEYS, useLocalStorageSettingsManager } from '~/contexts/LocalStorage'
import { useChartCsvExport } from '~/hooks/useChartCsvExport'
import { useChartImageExport } from '~/hooks/useChartImageExport'
import Layout from '~/layout'
import { formattedNum, formattedPercent, getNDistinctColors, getPercentChange, slug } from '~/utils'
import { fetchJson } from '~/utils/async'
import { withPerformanceLogging } from '~/utils/perf'

const EXCLUDED_EXTRAS = new Set(['doublecounted', 'liquidstaking'])
const DEFAULT_SORTING_STATE = [{ id: 'tvl', desc: true }]

const MultiSeriesChart2 = React.lazy(() => import('~/components/ECharts/MultiSeriesChart2'))

export const getStaticProps = withPerformanceLogging('categories', async () => {
	const [{ protocols }, revenueData, { chart, categories: protocolsByCategory }] = await Promise.all([
		fetchJson(PROTOCOLS_API),
		getAdapterChainOverview({
			adapterType: 'fees',
			chain: 'All',
			dataType: 'dailyRevenue',
			excludeTotalDataChart: true
		}),
		fetchJson(CATEGORY_API)
	])

	const categories = {}
	const tagsByCategory = {}
	const revenueByProtocol = {}
	for (const p of revenueData.protocols) {
		revenueByProtocol[p.defillamaId] = p.total24h || 0
	}

	for (const p of protocols) {
		const cat = p.category

		const tvl = p.tvl ?? 0
		const tvlPrevDay = p.tvlPrevDay ?? 0
		const tvlPrevWeek = p.tvlPrevWeek ?? 0
		const tvlPrevMonth = p.tvlPrevMonth ?? 0

		const extraTvls = {}

		for (const extra of TVL_SETTINGS_KEYS) {
			if (!EXCLUDED_EXTRAS.has(extra) && p.chainTvls[extra]) {
				extraTvls[extra] = p.chainTvls[extra]
			}
		}

		if (!categories[cat]) {
			categories[cat] = {
				name: cat,
				protocols: 0,
				tvl: 0,
				tvlPrevDay: 0,
				tvlPrevWeek: 0,
				tvlPrevMonth: 0,
				revenue: 0,
				extraTvls: Object.fromEntries(
					TVL_SETTINGS_KEYS.map((key) => [key, { tvl: 0, tvlPrevDay: 0, tvlPrevWeek: 0, tvlPrevMonth: 0 }])
				)
			}
		}

		if (p.tags) {
			if (!tagsByCategory[cat]) {
				tagsByCategory[cat] = []
			}

			for (const t of p.tags) {
				if (!tagsByCategory[cat][t]) {
					tagsByCategory[cat][t] = {
						name: t,
						protocols: 0,
						tvl: 0,
						tvlPrevDay: 0,
						tvlPrevWeek: 0,
						tvlPrevMonth: 0,
						revenue: 0,
						extraTvls: Object.fromEntries(
							TVL_SETTINGS_KEYS.map((key) => [key, { tvl: 0, tvlPrevDay: 0, tvlPrevWeek: 0, tvlPrevMonth: 0 }])
						)
					}
				}
				tagsByCategory[cat][t].protocols++
				tagsByCategory[cat][t].tvl += tvl
				tagsByCategory[cat][t].tvlPrevDay += tvlPrevDay
				tagsByCategory[cat][t].tvlPrevWeek += tvlPrevWeek
				tagsByCategory[cat][t].tvlPrevMonth += tvlPrevMonth
				tagsByCategory[cat][t].revenue += revenueByProtocol[p.defillamaId] ?? 0

				for (const extra in extraTvls) {
					tagsByCategory[cat][t].extraTvls[extra].tvl += extraTvls[extra].tvl
					tagsByCategory[cat][t].extraTvls[extra].tvlPrevDay += extraTvls[extra].tvlPrevDay
					tagsByCategory[cat][t].extraTvls[extra].tvlPrevWeek += extraTvls[extra].tvlPrevWeek
					tagsByCategory[cat][t].extraTvls[extra].tvlPrevMonth += extraTvls[extra].tvlPrevMonth
				}
			}
		}

		categories[cat].protocols++
		categories[cat].tvl += tvl
		categories[cat].tvlPrevDay += tvlPrevDay
		categories[cat].tvlPrevWeek += tvlPrevWeek
		categories[cat].tvlPrevMonth += tvlPrevMonth
		categories[cat].revenue += revenueByProtocol[p.defillamaId] ?? 0

		for (const extra in extraTvls) {
			categories[cat].extraTvls[extra].tvl += extraTvls[extra].tvl
			categories[cat].extraTvls[extra].tvlPrevDay += extraTvls[extra].tvlPrevDay
			categories[cat].extraTvls[extra].tvlPrevWeek += extraTvls[extra].tvlPrevWeek
			categories[cat].extraTvls[extra].tvlPrevMonth += extraTvls[extra].tvlPrevMonth
		}
	}

	// Build categoryKeys array once and use for all subsequent iterations
	const categoryKeys: string[] = []
	for (const cat in protocolsByCategory) {
		categoryKeys.push(cat)
	}

	const allColors = getNDistinctColors(categoryKeys.length)
	const categoryColors: Record<string, string> = {}
	for (let i = 0; i < categoryKeys.length; i++) {
		categoryColors[categoryKeys[i]] = allColors[i]
	}

	const finalCategories = []

	// Combined loop: ensure category exists AND build finalCategories
	for (const cat of categoryKeys) {
		if (!categories[cat]) {
			categories[cat] = {
				name: cat,
				protocols: 0,
				tvl: 0,
				tvlPrevDay: 0,
				tvlPrevWeek: 0,
				tvlPrevMonth: 0,
				revenue: 0,
				extraTvls: Object.fromEntries(
					TVL_SETTINGS_KEYS.map((key) => [key, { tvl: 0, tvlPrevDay: 0, tvlPrevWeek: 0, tvlPrevMonth: 0 }])
				)
			}
		}

		const subRows = []
		const tags = tagsByCategory[cat] ?? {}
		for (const tag in tags) {
			subRows.push({
				...tags[tag],
				change_1d: getPercentChange(tags[tag].tvl, tags[tag].tvlPrevDay),
				change_7d: getPercentChange(tags[tag].tvl, tags[tag].tvlPrevWeek),
				change_1m: getPercentChange(tags[tag].tvl, tags[tag].tvlPrevMonth),
				description: protocolCategories[tag]?.description ?? ''
			})
		}
		finalCategories.push({
			...categories[cat],
			change_1d: getPercentChange(categories[cat].tvl, categories[cat].tvlPrevDay),
			change_7d: getPercentChange(categories[cat].tvl, categories[cat].tvlPrevWeek),
			change_1m: getPercentChange(categories[cat].tvl, categories[cat].tvlPrevMonth),
			description: protocolCategories[cat]?.description ?? '',
			...(subRows.length > 0 ? { subRows } : {})
		})
	}

	const chartSource: Array<Record<string, number | null>> = []
	const extraTvlCharts = {}

	for (const date in chart) {
		const row: Record<string, number | null> = { timestamp: +date * 1e3 }
		for (const cat of categoryKeys) {
			row[cat] = chart[date]?.[cat]?.tvl ?? null
			for (const extra of TVL_SETTINGS_KEYS) {
				if (EXCLUDED_EXTRAS.has(extra)) {
					continue
				}

				if (!extraTvlCharts[cat]) {
					extraTvlCharts[cat] = {}
				}
				if (!extraTvlCharts[cat][extra]) {
					extraTvlCharts[cat][extra] = {}
				}
				if (!extraTvlCharts[cat][extra][+date * 1e3]) {
					extraTvlCharts[cat][extra][+date * 1e3] = 0
				}
				extraTvlCharts[cat][extra][+date * 1e3] += chart[date]?.[cat]?.[extra] ?? 0
			}
		}
		chartSource.push(row)
	}

	return {
		props: {
			categories: categoryKeys,
			tableData: finalCategories.toSorted((a, b) => b.tvl - a.tvl),
			chartSource,
			categoryColors,
			extraTvlCharts
		},
		revalidate: maxAgeForNext([22])
	}
})

const finalTvlOptions = tvlOptions.filter((e) => !EXCLUDED_EXTRAS.has(e.key))

const pageName = ['Protocol Categories']

export default function Protocols({ categories, tableData, chartSource, categoryColors, extraTvlCharts }) {
	const [selectedCategories, setSelectedCategories] = React.useState<Array<string>>(categories)
	const { chartInstance: exportChartInstance, handleChartReady } = useChartImageExport()
	const { chartInstance: exportChartCsvInstance, handleChartReady: handleChartCsvReady } = useChartCsvExport()
	const [extaTvlsEnabled] = useLocalStorageSettingsManager('tvl')
	const enabledTvls = TVL_SETTINGS_KEYS.filter((key) => extaTvlsEnabled[key])

	const finalCharts = React.useMemo(() => {
		const selectedCategoriesSet = new Set(selectedCategories)
		const filteredCategories = categories.filter((cat) => selectedCategoriesSet.has(cat))

		const source = chartSource.map((row) => {
			if (enabledTvls.length === 0) return row
			const newRow = { timestamp: row.timestamp }
			for (const cat of filteredCategories) {
				const extraSum = enabledTvls.reduce((sum, e) => sum + (extraTvlCharts?.[cat]?.[e]?.[row.timestamp] ?? 0), 0)
				newRow[cat] = (row[cat] ?? 0) + extraSum
			}
			return newRow
		})

		const dimensions = ['timestamp', ...filteredCategories]
		const charts = filteredCategories.map((cat) => ({
			type: 'line' as const,
			name: cat,
			encode: { x: 'timestamp', y: cat },
			stack: cat,
			color: categoryColors[cat]
		}))

		return { dataset: { source, dimensions }, charts }
	}, [chartSource, selectedCategories, categories, extraTvlCharts, enabledTvls, categoryColors])

	const finalCategoriesList = React.useMemo(() => {
		if (enabledTvls.length === 0) {
			return tableData
		}

		const finalList = []

		for (const cat of tableData) {
			const subRows = []
			for (const subRow of cat.subRows ?? []) {
				let tvl = subRow.tvl
				let tvlPrevDay = subRow.tvlPrevDay
				let tvlPrevWeek = subRow.tvlPrevWeek
				let tvlPrevMonth = subRow.tvlPrevMonth

				for (const extra of enabledTvls) {
					if (subRow.extraTvls[extra]) {
						tvl += subRow.extraTvls[extra].tvl
						tvlPrevDay += subRow.extraTvls[extra].tvlPrevDay
						tvlPrevWeek += subRow.extraTvls[extra].tvlPrevWeek
						tvlPrevMonth += subRow.extraTvls[extra].tvlPrevMonth
					}
				}

				subRows.push({
					...subRow,
					tvl,
					tvlPrevDay,
					tvlPrevWeek,
					tvlPrevMonth,
					change_1d: getPercentChange(tvl, tvlPrevDay),
					change_7d: getPercentChange(tvl, tvlPrevWeek),
					change_1m: getPercentChange(tvl, tvlPrevMonth)
				})
			}

			let tvl = cat.tvl
			let tvlPrevDay = cat.tvlPrevDay
			let tvlPrevWeek = cat.tvlPrevWeek
			let tvlPrevMonth = cat.tvlPrevMonth

			for (const extra of enabledTvls) {
				if (cat.extraTvls[extra]) {
					tvl += cat.extraTvls[extra].tvl
					tvlPrevDay += cat.extraTvls[extra].tvlPrevDay
					tvlPrevWeek += cat.extraTvls[extra].tvlPrevWeek
					tvlPrevMonth += cat.extraTvls[extra].tvlPrevMonth
				}
			}

			finalList.push({
				...cat,
				tvl,
				tvlPrevDay,
				tvlPrevWeek,
				tvlPrevMonth,
				change_1d: getPercentChange(tvl, tvlPrevDay),
				change_7d: getPercentChange(tvl, tvlPrevWeek),
				change_1m: getPercentChange(tvl, tvlPrevMonth),
				...(subRows.length > 0 ? { subRows } : {})
			})
		}

		return finalList
	}, [tableData, enabledTvls])

	return (
		<Layout
			title={`Categories - DefiLlama`}
			description={`Combined TVL, Revenue and other metrics by category of all protocols that are tracked by DefiLlama. DefiLlama is committed to providing accurate data without ads or sponsored content, as well as transparency.`}
			keywords={`protocols categories, defi categories`}
			canonicalUrl={`/categories`}
			metricFilters={finalTvlOptions}
			pageName={pageName}
		>
			<div className="rounded-md border border-(--cards-border) bg-(--cards-bg)">
				<div className="flex flex-row flex-wrap items-center justify-end gap-2 p-3">
					<h1 className="mr-auto text-xl font-semibold">TVL by Category</h1>
					<SelectWithCombobox
						allValues={categories}
						selectedValues={selectedCategories}
						setSelectedValues={setSelectedCategories}
						label="Categories"
						labelType="smol"
						triggerProps={{
							className:
								'flex items-center justify-between gap-2 px-2 py-1.5 text-xs rounded-md cursor-pointer flex-nowrap relative border border-(--form-control-border) text-(--text-form) hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) font-medium'
						}}
					/>
					<ChartCsvExportButton chartInstance={exportChartCsvInstance} filename="categories-tvl" />
					<ChartExportButton chartInstance={exportChartInstance} filename="categories-tvl" title="TVL by Category" />
				</div>
				<React.Suspense fallback={<></>}>
					<MultiSeriesChart2
						dataset={finalCharts.dataset}
						charts={finalCharts.charts}
						valueSymbol="$"
						solidChartAreaStyle
						onReady={(instance) => {
							handleChartReady(instance)
							handleChartCsvReady(instance)
						}}
					/>
				</React.Suspense>
			</div>

			<React.Suspense
				fallback={
					<div
						style={{ minHeight: `${categories.length * 50 + 200}px` }}
						className="rounded-md border border-(--cards-border) bg-(--cards-bg)"
					/>
				}
			>
				<TableWithSearch
					data={finalCategoriesList}
					columns={categoriesColumn}
					columnToSearch={'name'}
					placeholder={'Search category...'}
					sortingState={DEFAULT_SORTING_STATE}
				/>
			</React.Suspense>
		</Layout>
	)
}

interface ICategoryRow {
	name: string
	protocols: number
	tvl: number
	description: string
	change_1d: number
	change_7d: number
	change_1m: number
	revenue: number
}

const categoriesColumn: ColumnDef<ICategoryRow>[] = [
	{
		header: 'Category',
		accessorKey: 'name',
		enableSorting: false,
		cell: ({ getValue, row }) => {
			return (
				<span className={`relative flex items-center gap-2 ${row.depth > 0 ? 'pl-8' : 'pl-4'}`}>
					{row.subRows?.length > 0 ? (
						<button
							className="absolute -left-1"
							{...{
								onClick: row.getToggleExpandedHandler()
							}}
						>
							{row.getIsExpanded() ? (
								<>
									<Icon name="chevron-down" height={16} width={16} />
									<span className="sr-only">View child protocols</span>
								</>
							) : (
								<>
									<Icon name="chevron-right" height={16} width={16} />
									<span className="sr-only">Hide child protocols</span>
								</>
							)}
						</button>
					) : null}
					<span className="vf-row-index shrink-0" aria-hidden="true" />
					{row.depth > 0 ? (
						<BasicLink
							href={`/protocols/${slug(getValue() as string)}`}
							className="overflow-hidden text-sm font-medium text-ellipsis whitespace-nowrap text-(--link-text) hover:underline"
						>
							{getValue() as string}
						</BasicLink>
					) : (
						<BasicLink
							href={`/protocols/${slug(getValue() as string)}`}
							className="overflow-hidden text-sm font-medium text-ellipsis whitespace-nowrap text-(--link-text) hover:underline"
						>
							{getValue() as string}
						</BasicLink>
					)}
				</span>
			)
		},
		size: 240
	},
	{
		header: 'Protocols',
		accessorKey: 'protocols',
		size: 100,
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Combined TVL',
		accessorKey: 'tvl',
		accessorFn: (row) => row.tvl ?? undefined,
		cell: ({ getValue }) => {
			const value = getValue() as number | null
			return value != null ? formattedNum(value, true) : null
		},
		meta: {
			align: 'end'
		},
		size: 135
	},
	{
		header: '1d TVL Change',
		accessorKey: 'change_1d',
		cell: (info) => <>{formattedPercent(info.getValue())}</>,
		size: 140,
		meta: {
			align: 'end'
		}
	},
	{
		header: '7d TVL Change',
		accessorKey: 'change_7d',
		cell: (info) => <>{formattedPercent(info.getValue())}</>,
		size: 140,
		meta: {
			align: 'end'
		}
	},
	{
		header: '1m TVL Change',
		accessorKey: 'change_1m',
		cell: (info) => <>{formattedPercent(info.getValue())}</>,
		size: 140,
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Combined 24h Revenue',
		accessorKey: 'revenue',
		accessorFn: (row) => row.revenue ?? undefined,
		cell: ({ getValue }) => {
			const value = getValue() as number | null
			return value != null ? formattedNum(value, true) : null
		},
		meta: {
			align: 'end'
		},
		size: 200
	},
	{
		header: 'Description',
		accessorKey: 'description',
		enableSorting: false,
		size: 1600
	}
]
