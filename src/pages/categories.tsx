import * as React from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { maxAgeForNext } from '~/api'
import type { ILineAndBarChartProps } from '~/components/ECharts/types'
import { tvlOptions } from '~/components/Filters/options'
import { Icon } from '~/components/Icon'
import { BasicLink } from '~/components/Link'
import { SelectWithCombobox } from '~/components/SelectWithCombobox'
import { TableWithSearch } from '~/components/Table/TableWithSearch'
import { CATEGORY_API, PROTOCOLS_API } from '~/constants'
import { getAdapterChainOverview } from '~/containers/DimensionAdapters/queries'
import { protocolCategories } from '~/containers/ProtocolsByCategoryOrTag/constants'
import { DEFI_SETTINGS_KEYS, useLocalStorageSettingsManager } from '~/contexts/LocalStorage'
import Layout from '~/layout'
import { formattedNum, formattedPercent, getNDistinctColors, getPercentChange, slug } from '~/utils'
import { fetchJson } from '~/utils/async'
import { withPerformanceLogging } from '~/utils/perf'

const LineAndBarChart = React.lazy(
	() => import('~/components/ECharts/LineAndBarChart')
) as React.FC<ILineAndBarChartProps>

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
	revenueData.protocols.forEach((p) => {
		revenueByProtocol[p.defillamaId] = p.total24h || 0
	})

	protocols.forEach((p) => {
		const cat = p.category

		const tvl = p.tvl ?? 0
		const tvlPrevDay = p.tvlPrevDay ?? 0
		const tvlPrevWeek = p.tvlPrevWeek ?? 0
		const tvlPrevMonth = p.tvlPrevMonth ?? 0

		const extraTvls = {}

		for (const extra of DEFI_SETTINGS_KEYS) {
			if (!['doublecounted', 'liquidstaking'].includes(extra) && p.chainTvls[extra]) {
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
					DEFI_SETTINGS_KEYS.map((key) => [key, { tvl: 0, tvlPrevDay: 0, tvlPrevWeek: 0, tvlPrevMonth: 0 }])
				)
			}
		}

		if (p.tags) {
			if (!tagsByCategory[cat]) {
				tagsByCategory[cat] = []
			}

			p.tags.forEach((t) => {
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
							DEFI_SETTINGS_KEYS.map((key) => [key, { tvl: 0, tvlPrevDay: 0, tvlPrevWeek: 0, tvlPrevMonth: 0 }])
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
			})
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
	})

	for (const cat in protocolsByCategory) {
		if (!categories[cat]) {
			categories[cat] = { name: cat, protocols: 0, tvl: 0, tvlPrevDay: 0, tvlPrevWeek: 0, tvlPrevMonth: 0, revenue: 0 }
		}
	}

	const finalCategories = []

	for (const cat in protocolsByCategory) {
		const subRows = []
		for (const tag in tagsByCategory[cat]) {
			subRows.push({
				...tagsByCategory[cat][tag],
				change_1d: getPercentChange(tagsByCategory[cat][tag].tvl, tagsByCategory[cat][tag].tvlPrevDay),
				change_7d: getPercentChange(tagsByCategory[cat][tag].tvl, tagsByCategory[cat][tag].tvlPrevWeek),
				change_1m: getPercentChange(tagsByCategory[cat][tag].tvl, tagsByCategory[cat][tag].tvlPrevMonth),
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

	const chartData = {}
	const extraTvlCharts = {}
	const totalCategories = Object.keys(protocolsByCategory).length
	const allColors = getNDistinctColors(totalCategories)
	const categoryColors = Object.fromEntries(Object.keys(protocolsByCategory).map((_, i) => [_, allColors[i]]))

	for (const date in chart) {
		for (const cat in protocolsByCategory) {
			if (!chartData[cat]) {
				chartData[cat] = {
					name: cat,
					data: [],
					type: 'line',
					stack: cat,
					color: categoryColors[cat]
				}
			}
			chartData[cat].data.push([+date * 1e3, chart[date]?.[cat]?.tvl ?? null])
			for (const extra of DEFI_SETTINGS_KEYS) {
				if (['doublecounted', 'liquidstaking'].includes(extra)) {
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
	}

	return {
		props: {
			categories: Object.keys(protocolsByCategory),
			tableData: finalCategories.sort((a, b) => b.tvl - a.tvl),
			chartData,
			extraTvlCharts
		},
		revalidate: maxAgeForNext([22])
	}
})

const finalTvlOptions = tvlOptions.filter((e) => !['liquidstaking', 'doublecounted'].includes(e.key))

const pageName = ['Protocol Categories']

export default function Protocols({ categories, tableData, chartData, extraTvlCharts }) {
	const [selectedCategories, setSelectedCategories] = React.useState<Array<string>>(categories)
	const clearAll = () => {
		setSelectedCategories([])
	}
	const toggleAll = () => {
		setSelectedCategories(categories)
	}
	const selectOnlyOne = (category: string) => {
		setSelectedCategories([category])
	}
	const [extaTvlsEnabled] = useLocalStorageSettingsManager('tvl')

	const charts = React.useMemo(() => {
		if (!Object.values(extaTvlsEnabled).some((e) => e === true)) {
			if (selectedCategories.length === categories.length) {
				return chartData
			}

			const charts = {}
			for (const cat in chartData) {
				if (selectedCategories.includes(cat)) {
					charts[cat] = chartData[cat]
				}
			}

			return charts
		}

		const enabledTvls = Object.entries(extaTvlsEnabled)
			.filter((e) => e[1] === true)
			.map((e) => e[0])

		const charts = {}

		for (const cat in chartData) {
			if (selectedCategories.includes(cat)) {
				const data = chartData[cat].data.map(([date, val], index) => {
					const extraTvls = enabledTvls.map((e) => extraTvlCharts?.[cat]?.[e]?.[date] ?? 0)
					return [date, val + extraTvls.reduce((a, b) => a + b, 0)]
				})

				charts[cat] = {
					...chartData[cat],
					data
				}
			}
		}

		return charts
	}, [chartData, selectedCategories, categories, extraTvlCharts, extaTvlsEnabled])

	const finalCategoriesList = React.useMemo(() => {
		const enabledTvls = Object.entries(extaTvlsEnabled)
			.filter((e) => e[1] === true)
			.map((e) => e[0])

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
	}, [tableData, extaTvlsEnabled])

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
						clearAll={clearAll}
						toggleAll={toggleAll}
						selectOnlyOne={selectOnlyOne}
						labelType="smol"
					/>
				</div>

				<React.Suspense fallback={<div className="m-auto flex min-h-[360px] items-center justify-center" />}>
					<LineAndBarChart charts={charts} valueSymbol="$" solidChartAreaStyle />
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
					sortingState={[{ id: 'tvl', desc: true }]}
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
		id: 'rank',
		header: 'Rank',
		accessorKey: 'rank',
		size: 60,
		enableSorting: false,
		cell: ({ row }) => {
			const index = row.index
			return <span className="font-bold">{index + 1}</span>
		},
		meta: {
			align: 'center' as const
		}
	},
	{
		header: 'Category',
		accessorKey: 'name',
		enableSorting: false,
		cell: ({ getValue, row, table }) => {
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
		sortUndefined: 'last',
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
		sortUndefined: 'last',
		size: 200
	},
	{
		header: 'Description',
		accessorKey: 'description',
		enableSorting: false,
		size: 1600
	}
]
