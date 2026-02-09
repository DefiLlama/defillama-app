import {
	ColumnDef,
	ColumnFiltersState,
	getCoreRowModel,
	getFilteredRowModel,
	getSortedRowModel,
	SortingState,
	useReactTable
} from '@tanstack/react-table'
import { useRouter } from 'next/router'
import * as React from 'react'
import { ChartExportButtons } from '~/components/ButtonStyled/ChartExportButtons'
import { CSVDownloadButton } from '~/components/ButtonStyled/CsvButton'
import { preparePieChartData } from '~/components/ECharts/formatters'
import type { IMultiSeriesChart2Props, IPieChartProps } from '~/components/ECharts/types'
import { Icon } from '~/components/Icon'
import { IconsRow } from '~/components/IconsRow'
import { VirtualTable } from '~/components/Table/Table'
import { useTableSearch } from '~/components/Table/utils'
import { TagGroup } from '~/components/TagGroup'
import { Tooltip } from '~/components/Tooltip'
import { CHART_COLORS } from '~/constants/colors'
import { useGetChartInstance } from '~/hooks/useGetChartInstance'
import Layout from '~/layout'
import {
	capitalizeFirstLetter,
	firstDayOfMonth,
	formattedNum,
	toNiceDayMonthAndYear,
	toNumberOrNullFromQueryParam
} from '~/utils'
import { HacksFilters } from './Filterss'
import { IHacksPageData } from './queries'

const PieChart = React.lazy(() => import('~/components/ECharts/PieChart')) as React.FC<IPieChartProps>
const MultiSeriesChart2 = React.lazy(
	() => import('~/components/ECharts/MultiSeriesChart2')
) as React.FC<IMultiSeriesChart2Props>

const columnResizeMode = 'onChange'

function HacksTable({ data }: { data: IHacksPageData['data'] }) {
	const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
	const [sorting, setSorting] = React.useState<SortingState>([{ desc: true, id: 'date' }])

	const instance = useReactTable({
		data: data,
		columns: hacksColumns,
		columnResizeMode,
		state: {
			columnFilters,
			sorting
		},
		defaultColumn: {
			sortUndefined: 'last'
		},
		onSortingChange: setSorting,
		onColumnFiltersChange: setColumnFilters,
		getFilteredRowModel: getFilteredRowModel(),
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel()
	})

	const [projectName, setProjectName] = useTableSearch({ instance, columnToSearch: 'name' })

	const prepareCsv = () => {
		try {
			let rows: Array<Array<string | number | boolean>> = [
				['Name', 'Date', 'Amount', 'Chains', 'Classification', 'Target', 'Technique', 'Bridge', 'Language', 'Link']
			]
			for (const { name, date, amount, chains, classification, target, technique, bridge, language, link } of data) {
				rows.push([name, date, amount, chains?.join(','), classification, target, technique, bridge, language, link])
			}
			return { filename: 'hacks.csv', rows }
		} catch (error) {
			console.log('Error generating CSV:', error)
		}
	}

	return (
		<div className="rounded-md border border-(--cards-border) bg-(--cards-bg)">
			<div className="flex items-center justify-end gap-2 p-3">
				<label className="relative mr-auto w-full sm:max-w-[280px]">
					<span className="sr-only">Search projects...</span>
					<Icon
						name="search"
						height={16}
						width={16}
						className="absolute top-0 bottom-0 left-2 my-auto text-(--text-tertiary)"
					/>
					<input
						name="search"
						value={projectName}
						onChange={(e) => {
							setProjectName(e.target.value)
						}}
						placeholder="Search projects..."
						className="w-full rounded-md border border-(--form-control-border) bg-white p-1 pl-7 text-black dark:bg-black dark:text-white"
					/>
				</label>

				<CSVDownloadButton prepareCsv={prepareCsv} />
			</div>
			<VirtualTable instance={instance} columnResizeMode={columnResizeMode} />
		</div>
	)
}

const chartTypeList = ['Monthly Sum', 'Total Hacked by Technique']

const pageName = ['Hacks: Overview']

const getTimeSinceSeconds = (timeQuery: string | undefined): number | null => {
	if (typeof timeQuery !== 'string') return null

	const nowSec = Math.floor(Date.now() / 1000)
	switch (timeQuery) {
		case '7d':
			return nowSec - 7 * 24 * 60 * 60
		case '30d':
			return nowSec - 30 * 24 * 60 * 60
		case '90d':
			return nowSec - 90 * 24 * 60 * 60
		case '1y':
			return nowSec - 365 * 24 * 60 * 60
		default:
			return null
	}
}

const applyFilters = (
	data: IHacksPageData['data'],
	filters: {
		techKeys?: Set<string>
		classKeys?: Set<string>
		chainKeys?: Set<string>
		techIncludeNone?: boolean
		classIncludeNone?: boolean
		chainIncludeNone?: boolean
		since?: number | null
		minLost?: number | null
		maxLost?: number | null
	}
) => {
	const toFilterKey = (value: string | null | undefined) => (value ?? '').trim()

	return data.filter((row) => {
		if (filters.chainKeys && (filters.chainKeys.size > 0 || filters.chainIncludeNone)) {
			const chains = row.chains || []
			const matchesNone = Boolean(filters.chainIncludeNone) && chains.length === 0
			let matchesAny = false
			if (filters.chainKeys.size > 0) {
				for (const c of chains) {
					if (filters.chainKeys.has(toFilterKey(c))) {
						matchesAny = true
						break
					}
				}
			}
			if (!matchesNone && !matchesAny) return false
		}

		if (filters.techKeys && (filters.techKeys.size > 0 || filters.techIncludeNone)) {
			const techKey = toFilterKey(row.technique)
			const matchesNone = Boolean(filters.techIncludeNone) && techKey === ''
			const matchesAny = filters.techKeys.size > 0 && filters.techKeys.has(techKey)
			if (!matchesNone && !matchesAny) return false
		}

		if (filters.classKeys && (filters.classKeys.size > 0 || filters.classIncludeNone)) {
			const classKey = toFilterKey(row.classification)
			const matchesNone = Boolean(filters.classIncludeNone) && classKey === ''
			const matchesAny = filters.classKeys.size > 0 && filters.classKeys.has(classKey)
			if (!matchesNone && !matchesAny) return false
		}

		if (filters.since != null && row.date < filters.since) return false
		if (filters.minLost != null && row.amount < filters.minLost) return false
		if (filters.maxLost != null && row.amount > filters.maxLost) return false
		return true
	})
}

const toArrayParam = (p: string | string[] | undefined): string[] => {
	if (!p) return []
	return Array.isArray(p) ? p.filter(Boolean) : [p].filter(Boolean)
}

const isParamNone = (param: string | string[] | undefined) =>
	param === 'None' || (Array.isArray(param) && param.includes('None'))

const parseArrayParam = (param: string | string[] | undefined, allValues: string[]): string[] => {
	if (!param) return allValues
	const values = toArrayParam(param).filter((v) => v !== 'None')
	const valid = new Set(allValues)
	return values.filter((value) => valid.has(value))
}

// Helper to parse exclude query param to Set
const parseExcludeParam = (param: string | string[] | undefined): Set<string> => {
	if (!param) return new Set()
	if (typeof param === 'string') return new Set([param])
	return new Set(param)
}

export const HacksContainer = ({
	data,
	monthlyHacksChartData,
	totalHacked,
	totalHackedDefi,
	totalRugs,
	pieChartData,
	chainOptions,
	techniqueOptions,
	classificationOptions
}: IHacksPageData) => {
	const [chartType, setChartType] = React.useState('Monthly Sum')
	const { chartInstance: exportChartInstance, handleChartReady } = useGetChartInstance()
	const router = useRouter()
	const {
		chain: chainQ,
		excludeChain,
		tech: techQ,
		excludeTech,
		class: classQ,
		excludeClass,
		time: timeQ,
		minLost,
		maxLost
	} = router.query

	const selectedChains = React.useMemo(() => {
		const excludeSet = parseExcludeParam(excludeChain)
		const selected = parseArrayParam(chainQ, chainOptions)
		return excludeSet.size > 0 ? selected.filter((c) => !excludeSet.has(c)) : selected
	}, [chainQ, excludeChain, chainOptions])

	const selectedTechniques = React.useMemo(() => {
		const excludeSet = parseExcludeParam(excludeTech)
		const selected = parseArrayParam(techQ, techniqueOptions)
		return excludeSet.size > 0 ? selected.filter((t) => !excludeSet.has(t)) : selected
	}, [techQ, excludeTech, techniqueOptions])

	const selectedClassifications = React.useMemo(() => {
		const excludeSet = parseExcludeParam(excludeClass)
		const selected = parseArrayParam(classQ, classificationOptions)
		return excludeSet.size > 0 ? selected.filter((c) => !excludeSet.has(c)) : selected
	}, [classQ, excludeClass, classificationOptions])

	const minLostVal = toNumberOrNullFromQueryParam(minLost)
	const maxLostVal = toNumberOrNullFromQueryParam(maxLost)

	const hasActiveFilters =
		typeof chainQ !== 'undefined' ||
		typeof excludeChain !== 'undefined' ||
		typeof techQ !== 'undefined' ||
		typeof excludeTech !== 'undefined' ||
		typeof classQ !== 'undefined' ||
		typeof excludeClass !== 'undefined' ||
		typeof timeQ !== 'undefined' ||
		minLostVal != null ||
		maxLostVal != null

	const filteredData = React.useMemo(() => {
		const chainIncludeNone = isParamNone(chainQ)
		const techIncludeNone = isParamNone(techQ)
		const classIncludeNone = isParamNone(classQ)

		const chainFilterEnabled = typeof chainQ !== 'undefined' || typeof excludeChain !== 'undefined'
		const techFilterEnabled = typeof techQ !== 'undefined' || typeof excludeTech !== 'undefined'
		const classFilterEnabled = typeof classQ !== 'undefined' || typeof excludeClass !== 'undefined'

		const chainKeys = chainFilterEnabled ? new Set(selectedChains) : undefined
		const techKeys = techFilterEnabled ? new Set(selectedTechniques) : undefined
		const classKeys = classFilterEnabled ? new Set(selectedClassifications) : undefined
		const since = getTimeSinceSeconds(typeof timeQ === 'string' ? timeQ : undefined)

		return applyFilters(data || [], {
			chainKeys,
			techKeys,
			classKeys,
			chainIncludeNone,
			techIncludeNone,
			classIncludeNone,
			since,
			minLost: minLostVal,
			maxLost: maxLostVal
		})
	}, [
		data,
		chainQ,
		excludeChain,
		techQ,
		excludeTech,
		classQ,
		excludeClass,
		selectedChains,
		selectedTechniques,
		selectedClassifications,
		timeQ,
		minLostVal,
		maxLostVal
	])

	const derivedStats = React.useMemo(() => {
		if (!hasActiveFilters) return null

		const monthlyHacks = new Map<number, number>()
		const techniqueTotals = new Map<string, number>()
		let totalHackedRaw = 0
		let totalHackedDefiRaw = 0
		let totalRugsRaw = 0

		for (const row of filteredData) {
			const monthTsMs = firstDayOfMonth(row.date * 1000) * 1e3
			monthlyHacks.set(monthTsMs, (monthlyHacks.get(monthTsMs) ?? 0) + row.amount)

			totalHackedRaw += row.amount
			if (row.target === 'DeFi Protocol') totalHackedDefiRaw += row.amount
			if (row.bridge === true) totalRugsRaw += row.amount

			if (row.technique) {
				techniqueTotals.set(row.technique, (techniqueTotals.get(row.technique) ?? 0) + row.amount)
			}
		}

		const monthlySeries = Array.from(monthlyHacks.entries())
			.sort((a, b) => a[0] - b[0])
			.map(([date, value]) => [date, value] as [number, number])

		return {
			totalHacked: formattedNum(totalHackedRaw, true),
			totalHackedDefi: formattedNum(totalHackedDefiRaw, true),
			totalRugs: formattedNum(totalRugsRaw, true),
			monthlyHacksChartData: {
				dataset: {
					source: monthlySeries.map(([timestamp, value]) => ({ timestamp, 'Total Value Hacked': value })),
					dimensions: ['timestamp', 'Total Value Hacked']
				},
				charts: [
					{
						type: 'bar' as const,
						name: 'Total Value Hacked',
						encode: { x: 'timestamp', y: 'Total Value Hacked' },
						color: CHART_COLORS[0],
						stack: 'Total Value Hacked'
					}
				]
			},
			pieChartData: preparePieChartData({
				data: Array.from(techniqueTotals.entries()).map(([name, value]) => ({ name, value })),
				limit: 15
			})
		}
	}, [filteredData, hasActiveFilters])

	const displayTotalHacked = derivedStats?.totalHacked ?? totalHacked
	const displayTotalHackedDefi = derivedStats?.totalHackedDefi ?? totalHackedDefi
	const displayTotalRugs = derivedStats?.totalRugs ?? totalRugs
	const displayMonthlyHacksChartData = derivedStats?.monthlyHacksChartData ?? monthlyHacksChartData
	const displayPieChartData = derivedStats?.pieChartData ?? pieChartData

	return (
		<Layout
			title={`Hacks - DefiLlama`}
			description={`Track hacks on all chains and DeFi protocols. View total value lost, breakdown by technique, and DeFi hacks on DefiLlama.`}
			keywords={`total value hacked, total value lost in hacks, blockchain hacks, hacks on DeFi protocols, DeFi hacks`}
			canonicalUrl={`/hacks`}
			pageName={pageName}
		>
			<HacksFilters
				chainOptions={chainOptions}
				techniqueOptions={techniqueOptions}
				classificationOptions={classificationOptions}
				selectedChains={selectedChains}
				selectedTechniques={selectedTechniques}
				selectedClassifications={selectedClassifications}
			/>
			<div className="relative isolate grid grid-cols-2 gap-2 xl:grid-cols-3">
				<div className="col-span-2 flex w-full flex-col gap-6 overflow-x-auto rounded-md border border-(--cards-border) bg-(--cards-bg) p-5 xl:col-span-1">
					<p className="flex flex-col">
						<span className="text-(--text-label)">Total Value Hacked (USD)</span>
						<span className="font-jetbrains text-2xl font-semibold">{displayTotalHacked}</span>
					</p>
					<p className="flex flex-col">
						<span className="text-(--text-label)">Total Value Hacked in DeFi (USD)</span>
						<span className="font-jetbrains text-2xl font-semibold">{displayTotalHackedDefi}</span>
					</p>
					<p className="flex flex-col">
						<span className="text-(--text-label)">Total Value Hacked in Bridges (USD)</span>
						<span className="font-jetbrains text-2xl font-semibold">{displayTotalRugs}</span>
					</p>
				</div>
				<div className="col-span-2 flex flex-col rounded-md border border-(--cards-border) bg-(--cards-bg)">
					<div className="flex flex-wrap items-center justify-end gap-2 p-2 pb-0 *:first:mr-auto">
						<TagGroup setValue={setChartType} selectedValue={chartType} values={chartTypeList} />
						<ChartExportButtons
							chartInstance={exportChartInstance}
							filename="total-value-hacked"
							title="Total Value Hacked"
						/>
					</div>
					{chartType === 'Monthly Sum' ? (
						<React.Suspense fallback={<div className="min-h-[360px]" />}>
							<MultiSeriesChart2
								dataset={displayMonthlyHacksChartData.dataset}
								charts={displayMonthlyHacksChartData.charts}
								groupBy="monthly"
								onReady={handleChartReady}
							/>
						</React.Suspense>
					) : (
						<React.Suspense fallback={<div className="min-h-[360px]" />}>
							<PieChart chartData={displayPieChartData} onReady={handleChartReady} />
						</React.Suspense>
					)}
				</div>
			</div>
			<HacksTable data={filteredData} />
		</Layout>
	)
}

export const hacksColumns: ColumnDef<IHacksPageData['data'][0]>[] = [
	{
		header: 'Name',
		accessorKey: 'name',
		enableSorting: false,
		size: 200
	},
	{
		cell: ({ getValue }) => <>{toNiceDayMonthAndYear(getValue() as number)}</>,
		size: 120,
		header: 'Date',
		accessorKey: 'date'
	},
	{
		header: 'Amount lost',
		accessorKey: 'amount',
		cell: ({ getValue }) => <>{getValue() ? formattedNum(getValue(), true) : ''}</>,
		size: 140
	},
	{
		header: 'Chains',
		accessorKey: 'chains',
		enableSorting: false,
		cell: ({ getValue }) => <IconsRow links={getValue() as Array<string>} url="/chain" iconType="chain" />,
		size: 60
	},
	...['classification', 'technique'].map((s) => ({
		header: capitalizeFirstLetter(s),
		accessorKey: s,
		enableSorting: false,
		size: s === 'classification' ? 140 : 200,
		...(s === 'classification' && {
			meta: {
				headerHelperText:
					'Classified based on whether the hack targeted a weakness in Infrastructure, Smart Contract Language, Protocol Logic or the interaction between multiple protocols (Ecosystem)'
			}
		}),
		cell: ({ getValue }) => {
			return (
				<Tooltip content={getValue() as string} className="inline text-ellipsis">
					{getValue() as string}
				</Tooltip>
			)
		}
	})),
	{
		header: 'Language',
		accessorKey: 'language',
		cell: ({ getValue }) => <>{(getValue() ?? null) as string | null}</>,
		size: 140
	},
	{
		header: 'Link',
		accessorKey: 'link',
		size: 40,
		enableSorting: false,
		cell: ({ getValue }) => (
			<a
				className="flex items-center justify-center gap-4 rounded-md bg-(--btn2-bg) p-1.5 hover:bg-(--btn2-hover-bg)"
				href={getValue() as string}
				target="_blank"
				rel="noopener noreferrer"
			>
				<Icon name="arrow-up-right" height={14} width={14} />
				<span className="sr-only">open in new tab</span>
			</a>
		)
	}
]
