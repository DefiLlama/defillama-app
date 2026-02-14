import type { ColumnDef } from '@tanstack/react-table'
import * as React from 'react'
import { ChartExportButtons } from '~/components/ButtonStyled/ChartExportButtons'
import { CSVDownloadButton } from '~/components/ButtonStyled/CsvButton'
import { tvlOptions } from '~/components/Filters/options'
import { Icon } from '~/components/Icon'
import { BasicLink } from '~/components/Link'
import { SelectWithCombobox } from '~/components/Select/SelectWithCombobox'
import { TableWithSearch } from '~/components/Table/TableWithSearch'
import { TVL_SETTINGS_KEYS, useLocalStorageSettingsManager } from '~/contexts/LocalStorage'
import { useGetChartInstance } from '~/hooks/useGetChartInstance'
import Layout from '~/layout'
import { formattedNum, getPercentChange, renderPercentChange, slug } from '~/utils'
import { categoriesPageExcludedExtraTvls } from './constants'
import type { IProtocolsCategoriesPageData, IProtocolsCategoriesTableRow } from './types'

const DEFAULT_SORTING_STATE = [{ id: 'tvl', desc: true }]
const pageName = ['Protocol Categories']
const finalTvlOptions = tvlOptions.filter((option) => !categoriesPageExcludedExtraTvls.has(option.key))

const MultiSeriesChart2 = React.lazy(() => import('~/components/ECharts/MultiSeriesChart2'))

function getCsvHeaderLabel(columnId: string, header: unknown): string {
	if (typeof header === 'string') return header
	if (typeof header === 'number' || typeof header === 'boolean') return String(header)
	return columnId
}

function getCsvCellValue(value: unknown): string | number | boolean {
	if (value == null) return ''
	if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value
	if (Array.isArray(value)) return value.join(', ')
	return JSON.stringify(value)
}

const categoriesColumns: ColumnDef<IProtocolsCategoriesTableRow>[] = [
	{
		header: 'Category',
		accessorKey: 'name',
		enableSorting: false,
		size: 240,
		cell: ({ getValue, row }) => {
			const categoryName = getValue<string>()

			return (
				<span className={`relative flex items-center gap-2 ${row.depth > 0 ? 'pl-8' : 'pl-4'}`}>
					{row.subRows?.length != null && row.subRows.length > 0 ? (
						<button
							className="absolute -left-1"
							{...{
								onClick: row.getToggleExpandedHandler()
							}}
						>
							{row.getIsExpanded() ? (
								<>
									<Icon name="chevron-down" height={16} width={16} />
									<span className="sr-only">Hide tags</span>
								</>
							) : (
								<>
									<Icon name="chevron-right" height={16} width={16} />
									<span className="sr-only">View tags</span>
								</>
							)}
						</button>
					) : null}
					<span className="vf-row-index shrink-0" aria-hidden="true" />
					<BasicLink
						href={`/protocols/${slug(categoryName)}`}
						className="overflow-hidden text-sm font-medium text-ellipsis whitespace-nowrap text-(--link-text) hover:underline"
					>
						{categoryName}
					</BasicLink>
				</span>
			)
		}
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
		id: 'tvl',
		accessorFn: (row) => row.tvl,
		size: 135,
		meta: {
			align: 'end'
		},
		cell: ({ getValue }) => {
			const value = getValue<number>()
			return formattedNum(value, true)
		}
	},
	{
		header: '1d TVL Change',
		id: 'change_1d',
		accessorFn: (row) => row.change_1d,
		size: 140,
		meta: {
			align: 'end'
		},
		cell: ({ getValue }) => <>{renderPercentChange(getValue<number | null>())}</>
	},
	{
		header: '7d TVL Change',
		id: 'change_7d',
		accessorFn: (row) => row.change_7d,
		size: 140,
		meta: {
			align: 'end'
		},
		cell: ({ getValue }) => <>{renderPercentChange(getValue<number | null>())}</>
	},
	{
		header: '1m TVL Change',
		id: 'change_1m',
		accessorFn: (row) => row.change_1m,
		size: 140,
		meta: {
			align: 'end'
		},
		cell: ({ getValue }) => <>{renderPercentChange(getValue<number | null>())}</>
	},
	{
		header: 'Combined 24h Revenue',
		id: 'revenue',
		accessorFn: (row) => row.revenue,
		size: 200,
		meta: {
			align: 'end'
		},
		cell: ({ getValue }) => {
			const value = getValue<number>()
			return formattedNum(value, true)
		}
	},
	{
		header: 'Description',
		accessorKey: 'description',
		enableSorting: false,
		size: 1600
	}
]

export function ProtocolsCategoriesPage(props: IProtocolsCategoriesPageData) {
	const { categories, tableData, chartSource, categoryColors, extraTvlCharts } = props
	const [selectedCategories, setSelectedCategories] = React.useState<Array<string>>(categories)
	const { chartInstance, handleChartReady } = useGetChartInstance()
	const [extraTvlsEnabled] = useLocalStorageSettingsManager('tvl')

	const enabledTvls = TVL_SETTINGS_KEYS.filter(
		(key) => extraTvlsEnabled[key] && !categoriesPageExcludedExtraTvls.has(key)
	)

	const finalCharts = React.useMemo(() => {
		const selectedCategoriesSet = new Set(selectedCategories)
		const filteredCategories = categories.filter((categoryName) => selectedCategoriesSet.has(categoryName))

		const source: IProtocolsCategoriesPageData['chartSource'] = chartSource.map((row) => {
			if (enabledTvls.length === 0) return row

			const adjustedRow: IProtocolsCategoriesPageData['chartSource'][number] = {
				timestamp: row.timestamp
			}

			for (const categoryName of filteredCategories) {
				const baseValue = row[categoryName]
				const safeBaseValue = typeof baseValue === 'number' ? baseValue : 0
				const extraTvlValue = enabledTvls.reduce((sum, key) => {
					return sum + (extraTvlCharts[categoryName]?.[key]?.[row.timestamp] ?? 0)
				}, 0)

				adjustedRow[categoryName] = safeBaseValue + extraTvlValue
			}

			return adjustedRow
		})

		const dimensions = ['timestamp', ...filteredCategories]
		const charts = filteredCategories.map((categoryName) => ({
			type: 'line' as const,
			name: categoryName,
			encode: { x: 'timestamp', y: categoryName },
			stack: 'stackA',
			color: categoryColors[categoryName]
		}))

		return { dataset: { source, dimensions }, charts }
	}, [categories, categoryColors, chartSource, enabledTvls, extraTvlCharts, selectedCategories])

	const finalCategoriesList = React.useMemo(() => {
		if (enabledTvls.length === 0) return tableData

		const applyEnabledExtraTvls = (row: IProtocolsCategoriesTableRow): IProtocolsCategoriesTableRow => {
			let tvl = row.tvl
			let tvlPrevDay = row.tvlPrevDay
			let tvlPrevWeek = row.tvlPrevWeek
			let tvlPrevMonth = row.tvlPrevMonth

			for (const extraTvlKey of enabledTvls) {
				const extraTvl = row.extraTvls[extraTvlKey]
				if (extraTvl == null) continue
				tvl += extraTvl.tvl
				tvlPrevDay += extraTvl.tvlPrevDay
				tvlPrevWeek += extraTvl.tvlPrevWeek
				tvlPrevMonth += extraTvl.tvlPrevMonth
			}

			const updatedRow: IProtocolsCategoriesTableRow = {
				...row,
				tvl,
				tvlPrevDay,
				tvlPrevWeek,
				tvlPrevMonth,
				change_1d: getPercentChange(tvl, tvlPrevDay),
				change_7d: getPercentChange(tvl, tvlPrevWeek),
				change_1m: getPercentChange(tvl, tvlPrevMonth)
			}

			if (row.subRows != null && row.subRows.length > 0) {
				updatedRow.subRows = row.subRows.map(applyEnabledExtraTvls)
			}

			return updatedRow
		}

		return tableData.map(applyEnabledExtraTvls)
	}, [enabledTvls, tableData])

	return (
		<Layout
			title="Categories - DefiLlama"
			description="Combined TVL, Revenue and other metrics by category of all protocols that are tracked by DefiLlama. DefiLlama is committed to providing accurate data without ads or sponsored content, as well as transparency."
			keywords="protocols categories, defi categories"
			canonicalUrl="/categories"
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
						variant="filter"
					/>
					<ChartExportButtons chartInstance={chartInstance} filename="categories-tvl" title="TVL by Category" />
				</div>
				<React.Suspense fallback={<div className="min-h-[360px]" />}>
					<MultiSeriesChart2
						dataset={finalCharts.dataset}
						charts={finalCharts.charts}
						valueSymbol="$"
						solidChartAreaStyle
						onReady={handleChartReady}
						showTotalInTooltip
						tooltipTotalPosition="top"
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
					columns={categoriesColumns}
					columnToSearch="name"
					placeholder="Search category..."
					customFilters={({ instance }) => (
						<CSVDownloadButton
							prepareCsv={() => {
								const visibleColumns = instance.getAllLeafColumns().filter((column) => column.getIsVisible())
								const headers = visibleColumns.map((column) => getCsvHeaderLabel(column.id, column.columnDef.header))
								const rows = instance
									.getRowModel()
									.rows.map((row) => visibleColumns.map((column) => getCsvCellValue(row.getValue(column.id))))

								return {
									filename: 'protocol-categories.csv',
									rows: [headers, ...rows]
								}
							}}
							smol
						/>
					)}
					sortingState={DEFAULT_SORTING_STATE}
				/>
			</React.Suspense>
		</Layout>
	)
}
