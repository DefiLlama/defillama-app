import {
	ColumnDef,
	ColumnFiltersState,
	getCoreRowModel,
	getFilteredRowModel,
	getSortedRowModel,
	SortingState,
	useReactTable
} from '@tanstack/react-table'
import Router, { useRouter } from 'next/router'
import * as React from 'react'
import { CSVDownloadButton } from '~/components/ButtonStyled/CsvButton'
import type { ILineAndBarChartProps, IPieChartProps } from '~/components/ECharts/types'
import { prepareChartCsv } from '~/components/ECharts/utils'
import { Icon } from '~/components/Icon'
import { IconsRow } from '~/components/IconsRow'
import { VirtualTable } from '~/components/Table/Table'
import { useTableSearch } from '~/components/Table/utils'
import { TagGroup } from '~/components/TagGroup'
import { Tooltip } from '~/components/Tooltip'
import Layout from '~/layout'
import { capitalizeFirstLetter, formattedNum, slug, toNiceDayMonthAndYear, toNumberOrNullFromQueryParam } from '~/utils'
import { HacksFilters } from './filters'
import { IHacksPageData } from './queries'

const PieChart = React.lazy(() => import('~/components/ECharts/PieChart')) as React.FC<IPieChartProps>
const LineAndBarChart = React.lazy(
	() => import('~/components/ECharts/LineAndBarChart')
) as React.FC<ILineAndBarChartProps>

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

	const prepareCsv = React.useCallback(() => {
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
	}, [data])

	return (
		<div className="rounded-md border border-(--cards-border) bg-(--cards-bg)">
			<div className="flex items-center justify-end gap-2 p-3">
				<label className="relative w-full sm:max-w-[280px]">
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
		since?: number | null
		minLost?: number | null
		maxLost?: number | null
	}
) => {
	return data.filter((row) => {
		if (filters.chainKeys && filters.chainKeys.size > 0) {
			const rowChainKeys = new Set((row.chains || []).map((c) => slug(c)))
			let hasAny = false
			for (const k of filters.chainKeys) {
				if (rowChainKeys.has(k)) {
					hasAny = true
					break
				}
			}
			if (!hasAny) return false
		}
		if (filters.techKeys && filters.techKeys.size > 0 && !filters.techKeys.has(slug(row.technique))) return false
		if (filters.classKeys && filters.classKeys.size > 0 && !filters.classKeys.has(slug(row.classification)))
			return false
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

const parseArrayParam = (param: string | string[] | undefined, allKeys: string[]): string[] => {
	if (isParamNone(param)) return []
	if (!param) return allKeys
	const values = toArrayParam(param)
	const validKeys = new Set(allKeys)
	return values.filter((value) => validKeys.has(value))
}

const updateArrayQuery = (key: string, values: string[] | 'None') => {
	const nextQuery: Record<string, any> = { ...Router.query }
	if (values === 'None') {
		nextQuery[key] = 'None'
	} else if (values.length > 0) {
		nextQuery[key] = values
	} else {
		delete nextQuery[key]
	}
	Router.push({ pathname: Router.pathname, query: nextQuery }, undefined, { shallow: true })
}

const timeOptions = ['All', '7D', '30D', '90D', '1Y'] as const
const labelToKey = {
	All: 'all',
	'7D': '7d',
	'30D': '30d',
	'90D': '90d',
	'1Y': '1y'
} as const
const keyToLabel: Record<string, (typeof timeOptions)[number]> = {
	all: 'All',
	'7d': '7D',
	'30d': '30D',
	'90d': '90D',
	'1y': '1Y'
}

export const HacksContainer = ({
	data,
	monthlyHacksChartData,
	totalHacked,
	totalHackedDefi,
	totalRugs,
	pieChartData,
	techniqueOptions,
	classificationOptions
}: IHacksPageData) => {
	const [chartType, setChartType] = React.useState('Monthly Sum')
	const router = useRouter()
	const {
		chain: chainQ,
		tech: techQ,
		class: classQ,
		time: timeQ,
		minLost: minLostQuery,
		maxLost: maxLostQuery
	} = router.query

	const techniqueOptionKeys = React.useMemo(() => techniqueOptions.map((option) => option.key), [techniqueOptions])
	const classificationOptionKeys = React.useMemo(
		() => classificationOptions.map((option) => option.key),
		[classificationOptions]
	)

	const chainOptions = React.useMemo(() => {
		const selectedTechniquesLocal = parseArrayParam(techQ, techniqueOptionKeys)
		const selectedClassificationsLocal = parseArrayParam(classQ, classificationOptionKeys)
		const timeQLocal = typeof timeQ === 'string' ? timeQ : undefined

		const since = getTimeSinceSeconds(timeQLocal)
		const minLostValLocal = toNumberOrNullFromQueryParam(minLostQuery)
		const maxLostValLocal = toNumberOrNullFromQueryParam(maxLostQuery)

		const techFilterEnabled = typeof techQ !== 'undefined' && !isParamNone(techQ)
		const classFilterEnabled = typeof classQ !== 'undefined' && !isParamNone(classQ)

		const techKeys = techFilterEnabled ? new Set(selectedTechniquesLocal) : undefined
		const classKeys = classFilterEnabled ? new Set(selectedClassificationsLocal) : undefined

		const eligible = applyFilters(data || [], {
			techKeys,
			classKeys,
			since,
			minLost: minLostValLocal,
			maxLost: maxLostValLocal
		})

		return Array.from(new Set(eligible.flatMap((d) => d.chains || [])))
			.filter(Boolean)
			.sort((a, b) => a.localeCompare(b))
			.map((name) => ({ key: slug(name), name }))
	}, [data, techQ, classQ, timeQ, minLostQuery, maxLostQuery, techniqueOptionKeys, classificationOptionKeys])

	const chainOptionKeys = React.useMemo(() => chainOptions.map((option) => option.key), [chainOptions])

	const selectedChains = React.useMemo(() => {
		return parseArrayParam(chainQ, chainOptionKeys)
	}, [chainQ, chainOptionKeys])

	const selectedTechniques = React.useMemo(() => {
		return parseArrayParam(techQ, techniqueOptionKeys)
	}, [techQ, techniqueOptionKeys])

	const selectedClassifications = React.useMemo(() => {
		return parseArrayParam(classQ, classificationOptionKeys)
	}, [classQ, classificationOptionKeys])

	const setSelectedChains = React.useCallback((values: string[]) => updateArrayQuery('chain', values), [])
	const setSelectedTechniques = React.useCallback((values: string[]) => updateArrayQuery('tech', values), [])
	const setSelectedClassifications = React.useCallback((values: string[]) => updateArrayQuery('class', values), [])

	const clearAllChains = React.useCallback(() => updateArrayQuery('chain', 'None'), [])
	const toggleAllChains = React.useCallback(() => updateArrayQuery('chain', []), [])
	const selectOnlyOneChain = React.useCallback((value: string) => updateArrayQuery('chain', [value]), [])

	const clearAllTechniques = React.useCallback(() => updateArrayQuery('tech', 'None'), [])
	const toggleAllTechniques = React.useCallback(() => updateArrayQuery('tech', []), [])
	const selectOnlyOneTechnique = React.useCallback((value: string) => updateArrayQuery('tech', [value]), [])

	const clearAllClassifications = React.useCallback(() => updateArrayQuery('class', 'None'), [])
	const toggleAllClassifications = React.useCallback(() => updateArrayQuery('class', []), [])
	const selectOnlyOneClassification = React.useCallback((value: string) => updateArrayQuery('class', [value]), [])

	const selectedTimeLabel = (typeof timeQ === 'string' && keyToLabel[timeQ]) || 'All'

	const setSelectedTime = React.useCallback((label: (typeof timeOptions)[number]) => {
		const key = labelToKey[label]
		const nextQuery: Record<string, any> = { ...Router.query }
		if (key && key !== 'all') nextQuery.time = key
		else delete nextQuery.time
		Router.push({ pathname: Router.pathname, query: nextQuery }, undefined, { shallow: true })
	}, [])

	const { minLost, maxLost } = router.query

	const handleAmountSubmit = React.useCallback((e) => {
		e.preventDefault()
		const form = e.target
		const min = form.min?.value
		const max = form.max?.value
		Router.push({ pathname: Router.pathname, query: { ...Router.query, minLost: min, maxLost: max } }, undefined, {
			shallow: true
		})
	}, [])

	const handleAmountClear = React.useCallback(() => {
		const nextQuery: Record<string, any> = { ...Router.query }
		delete nextQuery.minLost
		delete nextQuery.maxLost
		Router.push({ pathname: Router.pathname, query: nextQuery }, undefined, { shallow: true })
	}, [])

	const minLostVal = toNumberOrNullFromQueryParam(minLost)
	const maxLostVal = toNumberOrNullFromQueryParam(maxLost)

	const hasActiveFilters = React.useMemo(() => {
		return (
			typeof chainQ !== 'undefined' ||
			typeof techQ !== 'undefined' ||
			typeof classQ !== 'undefined' ||
			typeof timeQ !== 'undefined' ||
			minLostVal != null ||
			maxLostVal != null
		)
	}, [chainQ, techQ, classQ, timeQ, minLostVal, maxLostVal])

	const clearAllFilters = React.useCallback(() => {
		const nextQuery: Record<string, any> = { ...Router.query }
		delete nextQuery.chain
		delete nextQuery.tech
		delete nextQuery.class
		delete nextQuery.start
		delete nextQuery.end
		delete nextQuery.minLost
		delete nextQuery.maxLost
		delete nextQuery.time
		Router.push({ pathname: Router.pathname, query: nextQuery }, undefined, { shallow: true })
	}, [])

	const filteredData = React.useMemo(() => {
		const chainNone = isParamNone(chainQ)
		const techNone = isParamNone(techQ)
		const classNone = isParamNone(classQ)
		if (chainNone || techNone || classNone) return []

		const chainFilterEnabled = typeof chainQ !== 'undefined'
		const techFilterEnabled = typeof techQ !== 'undefined'
		const classFilterEnabled = typeof classQ !== 'undefined'

		const chainKeys = chainFilterEnabled ? new Set(selectedChains) : undefined
		const techKeys = techFilterEnabled ? new Set(selectedTechniques) : undefined
		const classKeys = classFilterEnabled ? new Set(selectedClassifications) : undefined
		const since = getTimeSinceSeconds(typeof timeQ === 'string' ? timeQ : undefined)

		return applyFilters(data || [], {
			chainKeys,
			techKeys,
			classKeys,
			since,
			minLost: minLostVal,
			maxLost: maxLostVal
		})
	}, [
		data,
		chainQ,
		techQ,
		classQ,
		selectedChains,
		selectedTechniques,
		selectedClassifications,
		timeQ,
		minLostVal,
		maxLostVal
	])

	const prepareCsv = React.useCallback(() => {
		if (chartType === 'Monthly Sum') {
			return prepareChartCsv(
				{ 'Total Value Hacked': monthlyHacksChartData['Total Value Hacked'].data },
				`total-value-hacked.csv`
			)
		} else {
			let rows: Array<Array<string | number>> = [['Technique', 'Value']]
			for (const { name, value } of pieChartData) {
				rows.push([name, value])
			}
			return { filename: 'total-hacked-by-technique.csv', rows }
		}
	}, [monthlyHacksChartData, pieChartData, chartType])

	return (
		<Layout
			title={`Hacks - DefiLlama`}
			description={`Track hacks on all chains and DeFi protocols. View total value lost, breakdown by technique, and DeFi hacks on DefiLlama.`}
			keywords={`total value hacked, total value lost in hacks, blockchain hacks, hacks on DeFi protocols, DeFi hacks`}
			canonicalUrl={`/hacks`}
			pageName={pageName}
		>
			<div className="relative isolate grid grid-cols-2 gap-2 xl:grid-cols-3">
				<div className="col-span-2 flex w-full flex-col gap-6 overflow-x-auto rounded-md border border-(--cards-border) bg-(--cards-bg) p-5 xl:col-span-1">
					<p className="flex flex-col">
						<span className="text-(--text-label)">Total Value Hacked (USD)</span>
						<span className="font-jetbrains text-2xl font-semibold">{totalHacked}</span>
					</p>
					<p className="flex flex-col">
						<span className="text-(--text-label)">Total Value Hacked in DeFi (USD)</span>
						<span className="font-jetbrains text-2xl font-semibold">{totalHackedDefi}</span>
					</p>
					<p className="flex flex-col">
						<span className="text-(--text-label)">Total Value Hacked in Bridges (USD)</span>
						<span className="font-jetbrains text-2xl font-semibold">{totalRugs}</span>
					</p>
				</div>
				<div className="col-span-2 flex min-h-[412px] flex-col rounded-md border border-(--cards-border) bg-(--cards-bg)">
					<div className="m-2 flex flex-wrap items-center justify-between gap-2">
						<TagGroup setValue={setChartType} selectedValue={chartType} values={chartTypeList} />
						<CSVDownloadButton prepareCsv={prepareCsv} smol />
					</div>
					{chartType === 'Monthly Sum' ? (
						<React.Suspense fallback={<></>}>
							<LineAndBarChart charts={monthlyHacksChartData} groupBy="monthly" />
						</React.Suspense>
					) : (
						<React.Suspense fallback={<></>}>
							<PieChart chartData={pieChartData} />
						</React.Suspense>
					)}
				</div>
			</div>
			<HacksFilters
				chainOptions={chainOptions}
				techniqueOptions={techniqueOptions}
				classificationOptions={classificationOptions}
				selectedChains={selectedChains}
				selectedTechniques={selectedTechniques}
				selectedClassifications={selectedClassifications}
				setSelectedChains={setSelectedChains}
				setSelectedTechniques={setSelectedTechniques}
				setSelectedClassifications={setSelectedClassifications}
				clearAllChains={clearAllChains}
				toggleAllChains={toggleAllChains}
				selectOnlyOneChain={selectOnlyOneChain}
				clearAllTechniques={clearAllTechniques}
				toggleAllTechniques={toggleAllTechniques}
				selectOnlyOneTechnique={selectOnlyOneTechnique}
				clearAllClassifications={clearAllClassifications}
				toggleAllClassifications={toggleAllClassifications}
				selectOnlyOneClassification={selectOnlyOneClassification}
				timeOptions={timeOptions as unknown as string[]}
				selectedTimeLabel={selectedTimeLabel}
				setSelectedTime={setSelectedTime as any}
				minLostVal={minLostVal}
				maxLostVal={maxLostVal}
				handleAmountSubmit={handleAmountSubmit}
				handleAmountClear={handleAmountClear}
				hasActiveFilters={hasActiveFilters}
				onClearAll={clearAllFilters}
			/>
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
		cell: ({ getValue }) => <>{toNiceDayMonthAndYear(getValue())}</>,
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
