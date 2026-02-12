import {
	type ColumnFiltersState,
	type ColumnOrderState,
	type ColumnSizingState,
	getCoreRowModel,
	getExpandedRowModel,
	getFilteredRowModel,
	getSortedRowModel,
	useReactTable,
	type ColumnDef,
	type SortingState
} from '@tanstack/react-table'
import { useRouter } from 'next/router'
import { useMemo, useState } from 'react'

// Helper to parse exclude query param to Set
const parseExcludeParam = (param: string | string[] | undefined): Set<string> => {
	if (!param) return new Set()
	if (typeof param === 'string') return new Set([param])
	return new Set(param)
}
import { getAnnualizedRatio } from '~/api/categories/adaptors'
import { CSVDownloadButton } from '~/components/ButtonStyled/CsvButton'
import { FullOldViewButton } from '~/components/ButtonStyled/FullOldViewButton'
import { EntityQuestionsStrip } from '~/components/EntityQuestionsStrip'
import { Icon } from '~/components/Icon'
import { BasicLink } from '~/components/Link'
import { QuestionHelper } from '~/components/QuestionHelper'
import { RowLinksWithDropdown } from '~/components/RowLinksWithDropdown'
import { SelectWithCombobox } from '~/components/Select/SelectWithCombobox'
import { VirtualTable } from '~/components/Table/Table'
import { useSortColumnSizesAndOrders, useTableSearch } from '~/components/Table/utils'
import type { ColumnOrdersByBreakpoint, ColumnSizesByBreakpoint } from '~/components/Table/utils'
import { TokenLogo } from '~/components/TokenLogo'
import { Tooltip } from '~/components/Tooltip'
import { chainCharts } from '~/containers/ChainOverview/constants'
import { protocolCharts } from '~/containers/ProtocolOverview/constants'
import { useLocalStorageSettingsManager } from '~/contexts/LocalStorage'
import { setStorageItem } from '~/contexts/localStorageStore'
import { definitions } from '~/public/definitions'
import { chainIconUrl, formattedNum, slug } from '~/utils'
import { AdapterByChainChart } from './ChainChart'
import type { IAdapterByChainPageData, IProtocol } from './types'

type TPageType =
	| 'Fees'
	| 'Revenue'
	| 'Holders Revenue'
	| 'DEX Volume'
	| 'Perp Volume'
	| 'Open Interest'
	| 'Normalized Volume'
	| 'Bridge Aggregator Volume'
	| 'Perp Aggregator Volume'
	| 'DEX Aggregator Volume'
	| 'Options Premium Volume'
	| 'Options Notional Volume'
	| 'Earnings'
	| 'P/F'
	| 'P/S'

interface IProps extends IAdapterByChainPageData {
	type: TPageType
}

const SUPPORTED_OLD_VIEWS: TPageType[] = [
	'DEX Volume',
	'Perp Volume',
	'Options Premium Volume',
	'Options Notional Volume',
	'DEX Aggregator Volume',
	'Bridge Aggregator Volume'
]

const defaultSortingByType: Partial<Record<TPageType, SortingState>> & { default: SortingState } = {
	'P/F': [{ desc: true, id: 'pf' }],
	'P/S': [{ desc: true, id: 'ps' }],
	default: [{ desc: true, id: 'total24h' }]
}

const pageSlugByType: Partial<Record<TPageType, string>> = {
	'Perp Volume': 'perps',
	'DEX Volume': 'dexs',
	Fees: 'fees',
	Revenue: 'revenue'
}

const pageTypeByDefinition: Partial<Record<TPageType, Record<string, string>>> = {
	Fees: definitions.fees.chain,
	Revenue: definitions.revenue.chain,
	'Holders Revenue': definitions.holdersRevenue.chain,
	'DEX Volume': definitions.dexs.chain,
	'Perp Volume': definitions.perps.chain,
	'Normalized Volume': definitions.normalizedVolume.chain,
	'Bridge Aggregator Volume': definitions.bridgeAggregators.chain,
	'Perp Aggregator Volume': definitions.perpsAggregators.chain,
	'DEX Aggregator Volume': definitions.dexAggregators.chain,
	'Options Premium Volume': definitions.optionsPremium.chain,
	'Options Notional Volume': definitions.optionsNotional.chain,
	Earnings: definitions.earnings.chain
}
const getProtocolsByCategory = (
	protocols: IAdapterByChainPageData['protocols'],
	categoriesToFilter: Array<string>
): IProtocol[] => {
	const final: IProtocol[] = []

	for (const protocol of protocols) {
		if (protocol.childProtocols) {
			const childProtocols = protocol.childProtocols.filter(
				(childProtocol) => childProtocol.category && categoriesToFilter.includes(childProtocol.category)
			)

			if (childProtocols.length === protocol.childProtocols.length) {
				final.push(protocol)
			} else {
				for (const childProtocol of childProtocols) {
					final.push(childProtocol)
				}
			}

			continue
		}

		if (protocol.category && categoriesToFilter.includes(protocol.category)) {
			final.push(protocol)
			continue
		}
	}

	return final
}

export function AdapterByChain(props: IProps) {
	const router = useRouter()
	const [enabledSettings] = useLocalStorageSettingsManager('fees')
	const categoryParam = router.query.category
	const excludeCategoryParam = router.query.excludeCategory
	const hasCategoryParam = Object.prototype.hasOwnProperty.call(router.query, 'category')

	const { selectedCategories, protocols, columnsOptions } = useMemo(() => {
		const excludeSet = parseExcludeParam(excludeCategoryParam)

		let selectedCategories =
			props.categories.length > 0 && hasCategoryParam && categoryParam === ''
				? []
				: categoryParam
					? typeof categoryParam === 'string'
						? [categoryParam]
						: categoryParam
					: props.categories

		// Filter out excludes
		selectedCategories = excludeSet.size > 0 ? selectedCategories.filter((c) => !excludeSet.has(c)) : selectedCategories

		const categoriesToFilter = selectedCategories.filter((c) => c.toLowerCase() !== 'all' && c.toLowerCase() !== 'none')

		const protocols: IProtocol[] =
			props.categories.length === 0
				? props.protocols
				: selectedCategories.length === 0
					? ([] as IProtocol[])
					: categoriesToFilter.length > 0
						? getProtocolsByCategory(props.protocols, categoriesToFilter)
						: props.protocols

		const finalProtocols =
			props.adapterType === 'fees'
				? protocols.map((p) => {
						// Always calculate pfOrPs for fees pages (P/F, P/S)
						// Use null-safe math: if base is null and no extras, result stays null
						const baseTotal30d = p.total30d
						const extra30d = 
							(enabledSettings.bribes ? (p.bribes?.total30d ?? 0) : 0) +
							(enabledSettings.tokentax ? (p.tokenTax?.total30d ?? 0) : 0)
						const total30d = baseTotal30d != null ? baseTotal30d + extra30d : extra30d || null
						
						const pfOrPs = p.mcap && total30d ? getAnnualizedRatio(p.mcap, total30d) : null

						// Only aggregate child protocols when bribes/tokentax is enabled
						const childProtocols: IProtocol['childProtocols'] =
							p.childProtocols && (enabledSettings.bribes || enabledSettings.tokentax)
								? p.childProtocols.map((cp) => {
										const cpBaseTotal30d = cp.total30d
										const cpExtra30d =
											(enabledSettings.bribes ? (cp.bribes?.total30d ?? 0) : 0) +
											(enabledSettings.tokentax ? (cp.tokenTax?.total30d ?? 0) : 0)
										const cpTotal30d = cpBaseTotal30d != null ? cpBaseTotal30d + cpExtra30d : cpExtra30d || null
										
										const cpPfOrPs = cp.mcap && cpTotal30d ? getAnnualizedRatio(cp.mcap, cpTotal30d) : null

										// Helper to safely add values, preserving null when no extras
										const addValues = (base: number | null, extra: number): number | null => 
											base != null ? base + extra : extra || null

										return {
											...cp,
											total24h: addValues(cp.total24h, 
												(enabledSettings.bribes ? (cp.bribes?.total24h ?? 0) : 0) +
												(enabledSettings.tokentax ? (cp.tokenTax?.total24h ?? 0) : 0)),
											total7d: addValues(cp.total7d,
												(enabledSettings.bribes ? (cp.bribes?.total7d ?? 0) : 0) +
												(enabledSettings.tokentax ? (cp.tokenTax?.total7d ?? 0) : 0)),
											total30d: cpTotal30d,
											total1y: addValues(cp.total1y,
												(enabledSettings.bribes ? (cp.bribes?.total1y ?? 0) : 0) +
												(enabledSettings.tokentax ? (cp.tokenTax?.total1y ?? 0) : 0)),
											totalAllTime: addValues(cp.totalAllTime,
												(enabledSettings.bribes ? (cp.bribes?.totalAllTime ?? 0) : 0) +
												(enabledSettings.tokentax ? (cp.tokenTax?.totalAllTime ?? 0) : 0)),
											...(cpPfOrPs ? { pfOrPs: cpPfOrPs } : {})
										}
								  })
								: p.childProtocols

						// Helper to safely add values, preserving null when no extras
						const addValues = (base: number | null, extra: number): number | null => 
							base != null ? base + extra : extra || null

						return {
							...p,
							total24h: addValues(p.total24h,
								(enabledSettings.bribes ? (p.bribes?.total24h ?? 0) : 0) +
								(enabledSettings.tokentax ? (p.tokenTax?.total24h ?? 0) : 0)),
							total7d: addValues(p.total7d,
								(enabledSettings.bribes ? (p.bribes?.total7d ?? 0) : 0) +
								(enabledSettings.tokentax ? (p.tokenTax?.total7d ?? 0) : 0)),
							total30d,
							total1y: addValues(p.total1y,
								(enabledSettings.bribes ? (p.bribes?.total1y ?? 0) : 0) +
								(enabledSettings.tokentax ? (p.tokenTax?.total1y ?? 0) : 0)),
							totalAllTime: addValues(p.totalAllTime,
								(enabledSettings.bribes ? (p.bribes?.totalAllTime ?? 0) : 0) +
								(enabledSettings.tokentax ? (p.tokenTax?.totalAllTime ?? 0) : 0)),
							...(pfOrPs ? { pfOrPs } : {}),
							...(childProtocols ? { childProtocols } : {})
						}
					})
				: protocols

		return {
			selectedCategories,
			protocols: finalProtocols,
			columnsOptions: getColumnsOptions(props.type)
		}
	}, [
		categoryParam,
		excludeCategoryParam,
		hasCategoryParam,
		props.categories,
		props.protocols,
		props.adapterType,
		props.type,
		enabledSettings.bribes,
		enabledSettings.tokentax
	])

	const [sorting, setSorting] = useState<SortingState>(defaultSortingByType[props.type] ?? defaultSortingByType.default)
	const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
	const [columnSizing, setColumnSizing] = useState<ColumnSizingState>({})
	const [columnOrder, setColumnOrder] = useState<ColumnOrderState>([])

	const instance = useReactTable({
		data: protocols,
		columns: getColumnsByType(props.chain !== 'All')[props.type] as any,
		state: {
			sorting,
			columnFilters,
			columnSizing,
			columnOrder
		},
		defaultColumn: {
			sortUndefined: 'last'
		},
		filterFromLeafRows: true,
		getSubRows: (row: IAdapterByChainPageData['protocols'][0]) => row.childProtocols,
		onSortingChange: setSorting,
		onColumnFiltersChange: setColumnFilters,
		onColumnSizingChange: setColumnSizing,
		onColumnOrderChange: setColumnOrder,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getExpandedRowModel: getExpandedRowModel(),
		getFilteredRowModel: getFilteredRowModel()
	})

	const [projectName, setProjectName] = useTableSearch({ instance, columnToSearch: 'name' })
	useSortColumnSizesAndOrders({
		instance,
		columnSizes,
		columnOrders
	})
	const prepareCsv = (): { filename: string; rows: Array<Array<string | number | boolean>> } => {
		const visibleColumns = instance.getVisibleLeafColumns()
		const headers = visibleColumns.map((col) =>
			typeof col.columnDef.header === 'string' ? col.columnDef.header : col.id
		)

		const rows = [headers]
		instance.getFilteredRowModel().rows.forEach((row) => {
			const cells = visibleColumns.map((col) => {
				const value = row.getValue(col.id)
				return value === null || value === undefined ? '' : String(value)
			})
			rows.push(cells)
		})

		return { filename: `${props.type}-${props.chain}-protocols.csv`, rows }
	}

	const metricName = props.type
	const columnsKey = `columns-${props.type}`

	const setColumnOptions: React.Dispatch<React.SetStateAction<string[]>> = (newOptions) => {
		const options = typeof newOptions === 'function' ? newOptions(selectedColumns) : newOptions
		const ops = Object.fromEntries(instance.getAllLeafColumns().map((col) => [col.id, options.includes(col.id)]))
		setStorageItem(columnsKey, JSON.stringify(ops))
		instance.setColumnVisibility(ops)
	}

	const selectedColumns = instance
		.getAllLeafColumns()
		.filter((col) => col.getIsVisible())
		.map((col) => col.id)

	return (
		<>
			<RowLinksWithDropdown links={props.chains} activeLink={props.chain} />
			{props.entityQuestions && props.entityQuestions.length > 0 && (
				<EntityQuestionsStrip
					questions={props.entityQuestions}
					entitySlug={pageSlugByType[props.type] || slug(props.type)}
					entityType="page"
					entityName={props.type}
				/>
			)}
			{props.adapterType !== 'fees' ? (
				<div className="relative isolate grid grid-cols-2 gap-2 xl:grid-cols-3">
					<div className="col-span-2 flex w-full flex-col gap-6 overflow-x-auto rounded-md border border-(--cards-border) bg-(--cards-bg) p-2 xl:col-span-1">
						{props.chain !== 'All' && (
							<h1 className="flex flex-nowrap items-center gap-2">
								<TokenLogo logo={chainIconUrl(props.chain)} size={24} />
								<span className="text-xl font-semibold">{props.chain}</span>
							</h1>
						)}

						{props.total24h != null ? (
							<p className="flex flex-col">
								<span className="flex flex-col">
									{(() => {
										const definition = pageTypeByDefinition[props.type]?.['24h']
										return definition ? (
											<Tooltip content={definition} className="text-(--text-label) underline decoration-dotted">
												{metricName} (24h)
											</Tooltip>
										) : (
											<span className="text-(--text-label)">{metricName} (24h)</span>
										)
									})()}
									<span className="min-h-8 overflow-hidden font-jetbrains text-2xl font-semibold text-ellipsis whitespace-nowrap">
										{formattedNum(props.total24h, true)}
									</span>
								</span>
							</p>
						) : null}

						<div className="flex flex-col">
							{props.openInterest ? (
								<p className="group flex flex-wrap justify-start gap-4 border-b border-(--cards-border) py-1 last:border-none">
									<Tooltip
										content={definitions.openInterest.chain}
										className="text-(--text-label) underline decoration-dotted"
									>
										Open Interest
									</Tooltip>
									<span className="ml-auto font-jetbrains">{formattedNum(props.openInterest, true)}</span>
								</p>
							) : null}
							{props.activeLiquidity != null ? (
								<p className="group flex flex-wrap justify-start gap-4 border-b border-(--cards-border) py-1 last:border-none">
									<Tooltip
										content={definitions.activeLiquidity.chain}
										className="text-(--text-label) underline decoration-dotted"
									>
										Active Liquidity
									</Tooltip>
									<span className="ml-auto font-jetbrains">{formattedNum(props.activeLiquidity, true)}</span>
								</p>
							) : null}
							{props.total30d != null ? (
								<p className="group flex flex-wrap justify-start gap-4 border-b border-(--cards-border) py-1 last:border-none">
									{(() => {
										const definition = pageTypeByDefinition[props.type]?.['30d']
										return definition ? (
											<Tooltip content={definition} className="text-(--text-label) underline decoration-dotted">
												{metricName} (30d)
											</Tooltip>
										) : (
											<span className="text-(--text-label)">{metricName} (30d)</span>
										)
									})()}
									<span className="ml-auto font-jetbrains">{formattedNum(props.total30d, true)}</span>
								</p>
							) : null}
							{props.change_7dover7d != null ? (
								<p className="group flex flex-wrap justify-start gap-4 border-b border-(--cards-border) py-1 last:border-none">
									<Tooltip
										content="Change of last 7d volume over the previous 7d volume"
										className="text-(--text-label) underline decoration-dotted"
									>
										Weekly Change
									</Tooltip>
									<span
										className={`ml-auto font-jetbrains ${
											props.change_7dover7d >= 0 ? 'text-(--success)' : 'text-(--error)'
										}`}
									>
										{`${props.change_7dover7d >= 0 ? '+' : ''}${props.change_7dover7d}%`}
									</span>
								</p>
							) : null}
						</div>
					</div>
					<AdapterByChainChart
						chartData={props.chartData}
						adapterType={props.adapterType}
						chain={props.chain}
						chartName={props.type}
					/>
				</div>
			) : null}
			<div className="rounded-md border border-(--cards-border) bg-(--cards-bg)">
				<div className="flex flex-wrap items-center justify-end gap-4 p-2">
					<label className="relative mr-auto w-full sm:max-w-[280px]">
						<span className="sr-only">Search protocols</span>
						<Icon
							name="search"
							height={16}
							width={16}
							className="absolute top-0 bottom-0 left-2 my-auto text-(--text-tertiary)"
						/>
						<input
							value={projectName}
							onChange={(e) => {
								setProjectName(e.target.value)
							}}
							placeholder="Search..."
							className="w-full rounded-md border border-(--form-control-border) bg-white p-1 pl-7 text-black dark:bg-black dark:text-white"
						/>
					</label>
					<SelectWithCombobox
						allValues={columnsOptions}
						selectedValues={selectedColumns}
						setSelectedValues={setColumnOptions}
						nestedMenu={false}
						label={'Columns'}
						labelType="smol"
						variant="filter-responsive"
					/>
					{props.categories.length > 0 && (
						<SelectWithCombobox
							allValues={props.categories}
							selectedValues={selectedCategories}
							includeQueryKey="category"
							excludeQueryKey="excludeCategory"
							nestedMenu={false}
							label={'Category'}
							labelType="smol"
							variant="filter-responsive"
						/>
					)}
					{SUPPORTED_OLD_VIEWS.includes(props.type) ? <FullOldViewButton /> : null}
					<CSVDownloadButton prepareCsv={prepareCsv} />
				</div>
				<VirtualTable instance={instance} rowSize={64} compact />
			</div>
		</>
	)
}

const columnSizes: ColumnSizesByBreakpoint = {
	0: { name: 180, definition: 400 },
	640: { name: 240, definition: 400 },
	768: { name: 280, definition: 400 },
	1536: { name: 280, definition: 400 }
}

const columnOrders: ColumnOrdersByBreakpoint = {
	0: [
		'name',
		'normalizedVolume24h',
		'total24h',
		'openInterest',
		'activeLiquidity',
		'total7d',
		'total30d',
		'category',
		'definition'
	],
	640: [
		'name',
		'normalizedVolume24h',
		'category',
		'definition',
		'total24h',
		'openInterest',
		'activeLiquidity',
		'total7d',
		'total30d'
	]
}

const protocolChartsKeys: Partial<Record<IProps['type'], (typeof protocolCharts)[keyof typeof protocolCharts]>> = {
	Fees: 'fees',
	Revenue: 'revenue',
	'Holders Revenue': 'holdersRevenue',
	'Options Premium Volume': 'optionsPremiumVolume',
	'Options Notional Volume': 'optionsNotionalVolume',
	'DEX Volume': 'dexVolume',
	'Perp Volume': 'perpVolume',
	'Open Interest': 'openInterest',
	'Bridge Aggregator Volume': 'bridgeAggregatorVolume',
	'Perp Aggregator Volume': 'perpAggregatorVolume',
	'DEX Aggregator Volume': 'dexAggregatorVolume',
	Earnings: 'incentives'
}

const chainChartsKeys: Partial<Record<IProps['type'], (typeof chainCharts)[keyof typeof chainCharts]>> = {
	Fees: 'chainFees',
	Revenue: 'chainRevenue',
	'DEX Volume': 'dexsVolume',
	'Perp Volume': 'perpsVolume'
}

const getColumnsOptions = (type: IProps['type']) =>
	columnsByType[type].map((c) => {
		let headerName: string
		if (typeof c.header === 'function') {
			switch (c.id) {
				case 'total24h':
					if (type === 'Perp Aggregator Volume') {
						headerName = 'Perp Aggregator Volume 24h'
					} else if (type === 'Bridge Aggregator Volume') {
						headerName = 'Bridge Aggregator Volume 24h'
					} else if (type === 'DEX Aggregator Volume') {
						headerName = 'DEX Aggregator Volume 24h'
					} else {
						headerName = c.id
					}
					break
				case 'total7d':
					if (type === 'Perp Aggregator Volume') {
						headerName = 'Perp Aggregator Volume 7d'
					} else if (type === 'Bridge Aggregator Volume') {
						headerName = 'Bridge Aggregator Volume 7d'
					} else if (type === 'DEX Aggregator Volume') {
						headerName = 'DEX Aggregator Volume 7d'
					} else {
						headerName = c.id
					}
					break
				case 'total30d':
					if (type === 'Perp Aggregator Volume') {
						headerName = 'Perp Aggregator Volume 30d'
					} else if (type === 'Bridge Aggregator Volume') {
						headerName = 'Bridge Aggregator Volume 30d'
					} else if (type === 'DEX Aggregator Volume') {
						headerName = 'DEX Aggregator Volume 30d'
					} else {
						headerName = c.id
					}
					break
				default:
					headerName = c.id ?? ''
			}
		} else {
			headerName = c.header as string
		}

		return { name: headerName, key: c.id ?? ('accessorKey' in c ? (c.accessorKey as string) : '') }
	})

const ProtocolChainsComponent = ({ chains }: { chains: string[] }) => (
	<span className="flex flex-col gap-1">
		{chains.map((chain) => (
			<span key={`chain${chain}-of-protocol`} className="flex items-center gap-1">
				<TokenLogo logo={chainIconUrl(chain)} size={14} />
				<span>{chain}</span>
			</span>
		))}
	</span>
)

const NameColumn = (type: IProps['type']): ColumnDef<IAdapterByChainPageData['protocols'][0]> => {
	return {
		id: 'name',
		header: 'Name',
		accessorFn: (protocol) => protocol.name,
		enableSorting: false,
		cell: ({ getValue, row }) => {
			const value = getValue() as string

			const basePath =
				row.original.category &&
				['Chain', 'Rollup'].includes(row.original.category) &&
				row.original.slug !== 'berachain-incentive-buys'
					? 'chain'
					: 'protocol'
			const chartKey =
				row.original.category &&
				['Chain', 'Rollup'].includes(row.original.category) &&
				row.original.slug !== 'berachain-incentive-buys'
					? (chainChartsKeys[type] ?? protocolChartsKeys[type])
					: protocolChartsKeys[type]

			return (
				<span className={`relative flex items-center gap-2 ${row.depth > 0 ? 'pl-6' : 'pl-0'}`}>
					{row.subRows?.length > 0 ? (
						<button
							className="absolute -left-4.5"
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

					<TokenLogo logo={row.original.logo} data-lgonly />

					<span className="-my-2 flex flex-col">
						<BasicLink
							href={`/${basePath}/${row.original.slug}${chartKey ? `?tvl=false&events=false&${chartKey}=true` : ''}`}
							className="overflow-hidden text-sm font-medium text-ellipsis whitespace-nowrap text-(--link-text) hover:underline"
						>
							{value}
						</BasicLink>

						{row.original.chains && (
							<Tooltip
								content={<ProtocolChainsComponent chains={row.original.chains} />}
								className="text-[0.7rem] text-(--text-disabled)"
							>
								{`${row.original.chains.length} chain${row.original.chains.length > 1 ? 's' : ''}`}
							</Tooltip>
						)}
					</span>
				</span>
			)
		},
		size: 280
	}
}

const getColumnsByType = (
	isChain: boolean = false
): Record<IProps['type'], ColumnDef<IAdapterByChainPageData['protocols'][0]>[]> => {
	return {
		Fees: [
			NameColumn('Fees'),
			{
				id: 'category',
				header: 'Category',
				accessorFn: (protocol) => protocol.category,
				enableSorting: false,
				cell: ({ getValue }) =>
					getValue() ? (
						<BasicLink
							href={`/protocols/${slug(getValue() as string)}`}
							className="text-sm font-medium text-(--link-text)"
						>
							{getValue() as string}
						</BasicLink>
					) : (
						''
					),
				size: 128
			},
			{
				id: 'definition',
				header: 'Definition',
				accessorFn: (protocol) => protocol.methodology ?? null,
				cell: ({ getValue }) => (
					<Tooltip content={getValue() as string} className="flex-1">
						<span className="line-clamp-2 min-w-0 overflow-hidden text-ellipsis whitespace-normal">
							{getValue() as string}
						</span>
					</Tooltip>
				),
				enableSorting: false,
				size: 400
			},
			{
				id: 'total24h',
				header: 'Fees 24h',
				accessorFn: (protocol) => protocol.total24h,
				cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
				meta: {
					align: 'center',
					headerHelperText: definitions.fees.protocol['24h']
				},
				size: 128
			},
			{
				id: 'total7d',
				header: 'Fees 7d',
				accessorFn: (protocol) => protocol.total7d,
				cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
				meta: {
					align: 'center',
					headerHelperText: definitions.fees.protocol['7d']
				},
				size: 128
			},
			{
				id: 'total30d',
				header: 'Fees 30d',
				accessorFn: (protocol) => protocol.total30d,
				cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
				meta: {
					align: 'center',
					headerHelperText: definitions.fees.protocol['30d']
				},
				size: 128
			}
		],
		Revenue: [
			NameColumn('Revenue'),
			{
				id: 'category',
				header: 'Category',
				accessorFn: (protocol) => protocol.category,
				enableSorting: false,
				cell: ({ getValue }) =>
					getValue() ? (
						<BasicLink
							href={`/protocols/${slug(getValue() as string)}`}
							className="text-sm font-medium text-(--link-text)"
						>
							{getValue() as string}
						</BasicLink>
					) : (
						''
					),
				size: 128
			},
			{
				id: 'definition',
				header: 'Definition',
				accessorFn: (protocol) => protocol.methodology ?? null,
				cell: ({ getValue }) => (
					<Tooltip content={getValue() as string} className="flex-1">
						<span className="line-clamp-2 min-w-0 overflow-hidden text-ellipsis whitespace-normal">
							{getValue() as string}
						</span>
					</Tooltip>
				),
				enableSorting: false,
				size: 400
			},
			{
				id: 'total24h',
				header: 'Revenue 24h',
				accessorFn: (protocol) => protocol.total24h,
				cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
				meta: {
					align: 'center',
					headerHelperText: definitions.revenue.protocol['24h']
				},
				size: 128
			},
			{
				id: 'total7d',
				header: 'Revenue 7d',
				accessorFn: (protocol) => protocol.total7d,
				cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
				meta: {
					align: 'center',
					headerHelperText: definitions.revenue.protocol['7d']
				},
				size: 128
			},
			{
				id: 'total30d',
				header: 'Revenue 30d',
				accessorFn: (protocol) => protocol.total30d,
				cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
				meta: {
					align: 'center',
					headerHelperText: definitions.revenue.protocol['30d']
				},
				size: 128
			}
		],
		'Holders Revenue': [
			NameColumn('Holders Revenue'),
			{
				id: 'category',
				header: 'Category',
				accessorFn: (protocol) => protocol.category,
				enableSorting: false,
				cell: ({ getValue }) =>
					getValue() ? (
						<BasicLink
							href={`/protocols/${slug(getValue() as string)}`}
							className="text-sm font-medium text-(--link-text)"
						>
							{getValue() as string}
						</BasicLink>
					) : (
						''
					),
				size: 128
			},
			{
				id: 'definition',
				header: 'Definition',
				accessorFn: (protocol) => protocol.methodology ?? null,
				cell: ({ getValue }) => (
					<Tooltip content={getValue() as string} className="flex-1">
						<span className="line-clamp-2 min-w-0 overflow-hidden text-ellipsis whitespace-normal">
							{getValue() as string}
						</span>
					</Tooltip>
				),
				enableSorting: false,
				size: 400
			},
			{
				id: 'total24h',
				header: 'Holders Revenue 24h',
				accessorFn: (protocol) => protocol.total24h,
				cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
				meta: {
					align: 'center',
					headerHelperText: definitions.holdersRevenue.protocol['24h']
				},
				size: 180
			},
			{
				id: 'total7d',
				header: 'Holders Revenue 7d',
				accessorFn: (protocol) => protocol.total7d,
				cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
				meta: {
					align: 'center',
					headerHelperText: definitions.holdersRevenue.protocol['7d']
				},
				size: 180
			},
			{
				id: 'total30d',
				header: 'Holders Revenue 30d',
				accessorFn: (protocol) => protocol.total30d,
				cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
				meta: {
					align: 'center',
					headerHelperText: definitions.holdersRevenue.protocol['30d']
				},
				size: 180
			}
		],
		'Options Premium Volume': [
			NameColumn('Options Premium Volume'),
			{
				id: 'total24h',
				header: 'Premium Volume 24h',
				accessorFn: (protocol) => protocol.total24h,
				cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
				meta: {
					align: 'center',
					headerHelperText: definitions.optionsPremium.protocol['24h']
				},
				size: 180
			},
			{
				id: 'total7d',
				header: 'Premium Volume 7d',
				accessorFn: (protocol) => protocol.total7d,
				cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
				meta: {
					align: 'center',
					headerHelperText: definitions.optionsPremium.protocol['7d']
				},
				size: 180
			},
			{
				id: 'total30d',
				header: 'Premium Volume 30d',
				accessorFn: (protocol) => protocol.total30d,
				cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
				meta: {
					align: 'center',
					headerHelperText: definitions.optionsPremium.protocol['30d']
				},
				size: 180
			}
		],
		'Options Notional Volume': [
			NameColumn('Options Notional Volume'),
			{
				id: 'total24h',
				header: 'Notional Volume 24h',
				accessorFn: (protocol) => protocol.total24h,
				cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
				meta: {
					align: 'center',
					headerHelperText: definitions.optionsNotional.protocol['24h']
				},
				size: 180
			},
			{
				id: 'total7d',
				header: 'Notional Volume 7d',
				accessorFn: (protocol) => protocol.total7d,
				cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
				meta: {
					align: 'center',
					headerHelperText: definitions.optionsNotional.protocol['7d']
				},
				size: 180
			},
			{
				id: 'total30d',
				header: 'Notional Volume 30d',
				accessorFn: (protocol) => protocol.total30d,
				cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
				meta: {
					align: 'center',
					headerHelperText: definitions.optionsNotional.protocol['30d']
				},
				size: 180
			}
		],
		'DEX Volume': [
			NameColumn('DEX Volume'),
			{
				id: 'total24h',
				header: 'DEX Volume 24h',
				accessorFn: (protocol) => protocol.total24h,
				cell: (info) => {
					if (info.getValue() != null && info.row.original.doublecounted) {
						return (
							<span className="flex items-center justify-end gap-1">
								<QuestionHelper text="This protocol is a wrapper interface over another protocol. Its volume is excluded from totals to avoid double-counting the underlying protocol's volume" />
								<span className="text-(--text-disabled)">{formattedNum(info.getValue(), true)}</span>
							</span>
						)
					}
					return <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>
				},
				meta: {
					align: 'center',
					headerHelperText: definitions.dexs.protocol['24h']
				},
				size: 152
			},
			{
				id: 'total7d',
				header: 'DEX Volume 7d',
				accessorFn: (protocol) => protocol.total7d,
				cell: (info) => {
					if (info.getValue() != null && info.row.original.doublecounted) {
						return (
							<span className="flex items-center justify-end gap-1">
								<QuestionHelper text="This protocol is a wrapper interface over another protocol. Its volume is excluded from totals to avoid double-counting the underlying protocol's volume" />
								<span className="text-(--text-disabled)">{formattedNum(info.getValue(), true)}</span>
							</span>
						)
					}
					return <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>
				},
				meta: {
					align: 'center',
					headerHelperText: definitions.dexs.protocol['7d']
				},
				size: 152
			},
			{
				id: 'total30d',
				header: 'DEX Volume 30d',
				accessorFn: (protocol) => protocol.total30d,
				cell: (info) => {
					if (info.getValue() != null && info.row.original.doublecounted) {
						return (
							<span className="flex items-center justify-end gap-1">
								<QuestionHelper text="This protocol is a wrapper interface over another protocol. Its volume is excluded from totals to avoid double-counting the underlying protocol's volume" />
								<span className="text-(--text-disabled)">{formattedNum(info.getValue(), true)}</span>
							</span>
						)
					}
					return <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>
				},
				meta: {
					align: 'center',
					headerHelperText: definitions.dexs.protocol['30d']
				},
				size: 152
			}
		],
		'Perp Volume': [
			NameColumn('Perp Volume'),
			{
				header: 'Normalized Volume 24h',
				id: 'normalizedVolume24h',
				accessorFn: (protocol) => protocol.normalizedVolume24h,
				cell: (info) => {
					if (info.getValue() != null && info.row.original.doublecounted) {
						return (
							<span className="flex items-center justify-end gap-1">
								<QuestionHelper text="This protocol is a wrapper interface over another protocol. Its volume is excluded from totals to avoid double-counting the underlying protocol's volume" />
								<span className="text-(--text-disabled)">{formattedNum(info.getValue(), true)}</span>
							</span>
						)
					}
					return <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>
				},
				meta: {
					align: 'center',
					headerHelperText: definitions.normalizedVolume.protocol['24h']
				},
				size: 180
			},
			{
				id: 'total24h',
				header: 'Reported Volume 24h',
				accessorFn: (protocol) => protocol.total24h,
				cell: (info) => {
					if (info.getValue() == null) return null
					const helpers = []
					if (info.row.original.zeroFeePerp) {
						helpers.push('This protocol charges no fees for most of its users')
					}
					if (info.getValue() != null && info.row.original.doublecounted) {
						helpers.push(
							"This protocol is a wrapper interface over another protocol. Its volume is excluded from totals to avoid double-counting the underlying protocol's volume"
						)
					}

					if (helpers.length > 0) {
						return (
							<span className="flex items-center justify-end gap-1">
								{helpers.map((helper) => (
									<QuestionHelper key={`${info.row.original.name}-${helper}`} text={helper} />
								))}
								<span className={info.row.original.doublecounted ? 'text-(--text-disabled)' : ''}>
									{formattedNum(info.getValue(), true)}
								</span>
							</span>
						)
					}

					return <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>
				},
				meta: {
					align: 'center',
					headerHelperText: definitions.perps.protocol['24h']
				},
				size: 160
			},
			{
				header: 'Open Interest',
				id: 'openInterest',
				accessorFn: (protocol) => protocol.openInterest,
				cell: (info) => {
					if (info.getValue() != null && info.row.original.doublecounted) {
						return (
							<span className="flex items-center justify-end gap-1">
								<QuestionHelper text="This protocol is a wrapper interface over another protocol. Its open interest is excluded from totals to avoid double-counting the underlying protocol's open interest" />
								<span className="text-(--text-disabled)">{formattedNum(info.getValue(), true)}</span>
							</span>
						)
					}
					return <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>
				},
				meta: {
					align: 'center',
					headerHelperText: definitions.openInterest.protocol
				},
				size: 160
			},
			{
				id: 'total7d',
				header: 'Reported Volume 7d',
				accessorFn: (protocol) => protocol.total7d,
				cell: (info) => {
					if (info.getValue() == null) return null
					const helpers = []
					if (info.row.original.zeroFeePerp) {
						helpers.push('This protocol charges no fees for most of its users')
					}
					if (info.getValue() != null && info.row.original.doublecounted) {
						helpers.push(
							"This protocol is a wrapper interface over another protocol. Its volume is excluded from totals to avoid double-counting the underlying protocol's volume"
						)
					}

					if (helpers.length > 0) {
						return (
							<span className="flex items-center justify-end gap-1">
								{helpers.map((helper) => (
									<QuestionHelper key={`${info.row.original.name}-${helper}`} text={helper} />
								))}
								<span className={info.row.original.doublecounted ? 'text-(--text-disabled)' : ''}>
									{formattedNum(info.getValue(), true)}
								</span>
							</span>
						)
					}

					return <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>
				},
				meta: {
					align: 'center',
					headerHelperText: definitions.perps.protocol['7d']
				},
				size: 160
			},
			{
				id: 'total30d',
				header: 'Reported Volume 30d',
				accessorFn: (protocol) => protocol.total30d,
				cell: (info) => {
					if (info.getValue() == null) return null
					const helpers = []
					if (info.row.original.zeroFeePerp) {
						helpers.push('This protocol charges no fees for most of its users')
					}
					if (info.getValue() != null && info.row.original.doublecounted) {
						helpers.push(
							"This protocol is a wrapper interface over another protocol. Its volume is excluded from totals to avoid double-counting the underlying protocol's volume"
						)
					}

					if (helpers.length > 0) {
						return (
							<span className="flex items-center justify-end gap-1">
								{helpers.map((helper) => (
									<QuestionHelper key={`${info.row.original.name}-${helper}`} text={helper} />
								))}
								<span className={info.row.original.doublecounted ? 'text-(--text-disabled)' : ''}>
									{formattedNum(info.getValue(), true)}
								</span>
							</span>
						)
					}

					return <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>
				},
				meta: {
					align: 'center',
					headerHelperText: definitions.perps.protocol['30d']
				},
				size: 160
			}
		],
		'Open Interest': [
			NameColumn('Open Interest'),
			{
				id: 'total24h',
				header: 'Open Interest',
				accessorFn: (protocol) => protocol.total24h,
				cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
				meta: {
					align: 'end',
					headerHelperText: definitions.openInterest.protocol
				},
				size: 160
			}
		],
		'Normalized Volume': [
			NameColumn('Normalized Volume'),
			{
				id: 'total24h',
				header: 'Normalized Volume 24h',
				accessorFn: (protocol) => protocol.total24h,
				cell: (info) => {
					if (info.getValue() == null) return null
					const helpers = []
					if (info.row.original.zeroFeePerp) {
						helpers.push('This protocol charges no fees for most of its users')
					}
					if (info.getValue() != null && info.row.original.doublecounted) {
						helpers.push(
							"This protocol is a wrapper interface over another protocol. Its volume is excluded from totals to avoid double-counting the underlying protocol's volume"
						)
					}

					if (helpers.length > 0) {
						return (
							<span className="flex items-center justify-end gap-1">
								{helpers.map((helper) => (
									<QuestionHelper key={`${info.row.original.name}-${helper}`} text={helper} />
								))}
								<span className={info.row.original.doublecounted ? 'text-(--text-disabled)' : ''}>
									{formattedNum(info.getValue(), true)}
								</span>
							</span>
						)
					}

					return <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>
				},
				meta: {
					align: 'center',
					headerHelperText: definitions.normalizedVolume.protocol['24h']
				},
				size: 160
			},
			{
				id: 'activeLiquidity',
				header: 'Active Liquidity',
				accessorFn: (protocol) => protocol.activeLiquidity,
				cell: (info) => {
					if (info.getValue() != null && info.row.original.doublecounted) {
						return (
							<span className="flex items-center justify-end gap-1">
								<QuestionHelper text="This protocol is a wrapper interface over another protocol. Its active liquidity is excluded from totals to avoid double-counting the underlying protocol's active liquidity" />
								<span className="text-(--text-disabled)">{formattedNum(info.getValue(), true)}</span>
							</span>
						)
					}
					return <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>
				},
				meta: {
					align: 'center',
					headerHelperText: definitions.activeLiquidity.protocol
				},
				size: 160
			},
			{
				id: 'total7d',
				header: 'Normalized Volume 7d',
				accessorFn: (protocol) => protocol.total7d,
				cell: (info) => {
					if (info.getValue() == null) return null
					const helpers = []
					if (info.row.original.zeroFeePerp) {
						helpers.push('This protocol charges no fees for most of its users')
					}
					if (info.getValue() != null && info.row.original.doublecounted) {
						helpers.push(
							"This protocol is a wrapper interface over another protocol. Its volume is excluded from totals to avoid double-counting the underlying protocol's volume"
						)
					}

					if (helpers.length > 0) {
						return (
							<span className="flex items-center justify-end gap-1">
								{helpers.map((helper) => (
									<QuestionHelper key={`${info.row.original.name}-${helper}`} text={helper} />
								))}
								<span className={info.row.original.doublecounted ? 'text-(--text-disabled)' : ''}>
									{formattedNum(info.getValue(), true)}
								</span>
							</span>
						)
					}

					return <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>
				},
				meta: {
					align: 'center',
					headerHelperText: definitions.normalizedVolume.protocol['7d']
				},
				size: 160
			},
			{
				id: 'total30d',
				header: 'Normalized Volume 30d',
				accessorFn: (protocol) => protocol.total30d,
				cell: (info) => {
					if (info.getValue() == null) return null
					const helpers = []
					if (info.row.original.zeroFeePerp) {
						helpers.push('This protocol charges no fees for most of its users')
					}
					if (info.getValue() != null && info.row.original.doublecounted) {
						helpers.push(
							"This protocol is a wrapper interface over another protocol. Its volume is excluded from totals to avoid double-counting the underlying protocol's volume"
						)
					}

					if (helpers.length > 0) {
						return (
							<span className="flex items-center justify-end gap-1">
								{helpers.map((helper) => (
									<QuestionHelper key={`${info.row.original.name}-${helper}`} text={helper} />
								))}
								<span className={info.row.original.doublecounted ? 'text-(--text-disabled)' : ''}>
									{formattedNum(info.getValue(), true)}
								</span>
							</span>
						)
					}

					return <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>
				},
				meta: {
					align: 'center',
					headerHelperText: definitions.normalizedVolume.protocol['30d']
				},
				size: 160
			}
		],
		'Perp Aggregator Volume': [
			NameColumn('Perp Aggregator Volume'),
			{
				id: 'total24h',
				header: () => (
					<>
						<span className="md:hidden">Perp Agg Vol 24h</span>
						<span className="hidden md:block">Perp Aggregator Volume 24h</span>
					</>
				),
				accessorFn: (protocol) => protocol.total24h,
				cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
				meta: {
					align: 'center',
					headerHelperText: definitions.perpsAggregators.protocol['24h']
				},
				size: 160
			},
			{
				id: 'total7d',
				header: 'Perp Aggregator Volume 7d',
				accessorFn: (protocol) => protocol.total7d,
				cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
				meta: {
					align: 'center',
					headerHelperText: definitions.perpsAggregators.protocol['7d']
				},
				size: 160
			},
			{
				id: 'total30d',
				header: () => (
					<>
						<span className="md:hidden">Perp Agg Vol 30d</span>
						<span className="hidden md:block">Perp Aggregator Volume 30d</span>
					</>
				),
				accessorFn: (protocol) => protocol.total30d,
				cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
				meta: {
					align: 'center',
					headerHelperText: definitions.perpsAggregators.protocol['30d']
				},
				size: 160
			}
		],
		'Bridge Aggregator Volume': [
			NameColumn('Bridge Aggregator Volume'),
			{
				id: 'total24h',
				header: () => (
					<>
						<span className="md:hidden">Bridge Agg Vol 24h</span>
						<span className="hidden md:block">Bridge Aggregator Volume 24h</span>
					</>
				),
				accessorFn: (protocol) => protocol.total24h,
				cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
				meta: {
					align: 'center',
					headerHelperText: definitions.bridgeAggregators.chain['24h']
				},
				size: 160
			},
			{
				id: 'total7d',
				header: 'Bridge Aggregator Volume 7d',
				accessorFn: (protocol) => protocol.total7d,
				cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
				meta: {
					align: 'center',
					headerHelperText: definitions.bridgeAggregators.chain['7d']
				},
				size: 160
			},
			{
				id: 'total30d',
				header: () => (
					<>
						<span className="md:hidden">Bridge Agg Vol 30d</span>
						<span className="hidden md:block">Bridge Aggregator Volume 30d</span>
					</>
				),
				accessorFn: (protocol) => protocol.total30d,
				cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
				meta: {
					align: 'center',
					headerHelperText: definitions.bridgeAggregators.chain['30d']
				},
				size: 160
			}
		],
		'DEX Aggregator Volume': [
			NameColumn('DEX Aggregator Volume'),
			{
				id: 'total24h',
				header: () => (
					<>
						<span className="md:hidden">DEX Agg Vol 24h</span>
						<span className="hidden md:block">DEX Aggregator Volume 24h</span>
					</>
				),
				accessorFn: (protocol) => protocol.total24h,
				cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
				meta: {
					align: 'center',
					headerHelperText: definitions.dexAggregators.protocol['24h']
				},
				size: 160
			},
			{
				id: 'total7d',
				header: 'DEX Aggregator Volume 7d',
				accessorFn: (protocol) => protocol.total7d,
				cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
				meta: {
					align: 'center',
					headerHelperText: definitions.dexAggregators.protocol['7d']
				},
				size: 160
			},
			{
				id: 'total30d',
				header: () => (
					<>
						<span className="md:hidden">DEX Agg Vol 30d</span>
						<span className="hidden md:block">DEX Aggregator Volume 30d</span>
					</>
				),
				accessorFn: (protocol) => protocol.total30d,
				cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
				meta: {
					align: 'center',
					headerHelperText: definitions.dexAggregators.protocol['30d']
				},
				size: 160
			}
		],
		Earnings: [
			NameColumn('Earnings'),
			{
				id: 'category',
				header: 'Category',
				accessorFn: (protocol) => protocol.category,
				enableSorting: false,
				cell: ({ getValue }) =>
					getValue() ? (
						<BasicLink
							href={`/protocols/${slug(getValue() as string)}`}
							className="text-sm font-medium text-(--link-text)"
						>
							{getValue() as string}
						</BasicLink>
					) : (
						''
					),
				size: 128
			},
			{
				id: 'total24h',
				header: 'Earnings 24h',
				accessorFn: (protocol) => protocol.total24h,
				cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
				meta: {
					align: 'center',
					headerHelperText: isChain ? definitions.earnings.chain['24h'] : definitions.earnings.protocol['24h']
				},
				size: 160
			},
			{
				id: 'total7d',
				header: 'Earnings 7d',
				accessorFn: (protocol) => protocol.total7d,
				cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
				meta: {
					align: 'center',
					headerHelperText: isChain ? definitions.earnings.chain['7d'] : definitions.earnings.protocol['7d']
				},
				size: 160
			},
			{
				id: 'total30d',
				header: 'Earnings 30d',
				accessorFn: (protocol) => protocol.total30d,
				cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
				meta: {
					align: 'center',
					headerHelperText: isChain ? definitions.earnings.chain['30d'] : definitions.earnings.protocol['30d']
				},
				size: 160
			}
		],
		'P/F': [
			NameColumn('Fees'),
			{
				id: 'category',
				header: 'Category',
				accessorFn: (protocol) => protocol.category,
				enableSorting: false,
				cell: ({ getValue }) =>
					getValue() ? (
						<BasicLink
							href={`/protocols/${slug(getValue() as string)}`}
							className="text-sm font-medium text-(--link-text)"
						>
							{getValue() as string}
						</BasicLink>
					) : (
						''
					),
				meta: {
					align: 'center'
				},
				size: 128
			},
			{
				id: 'pfOrPs',
				header: 'P/F',
				accessorFn: (protocol) => protocol.pfOrPs,
				cell: (info) => <>{info.getValue() != null ? info.getValue() : null}</>,
				meta: {
					align: 'center',
					headerHelperText: definitions.fees.protocol['pf']
				},
				size: 120
			}
		],
		'P/S': [
			NameColumn('Revenue'),
			{
				id: 'category',
				header: 'Category',
				accessorFn: (protocol) => protocol.category,
				enableSorting: false,
				cell: ({ getValue }) =>
					getValue() ? (
						<BasicLink
							href={`/protocols/${slug(getValue() as string)}`}
							className="text-sm font-medium text-(--link-text)"
						>
							{getValue() as string}
						</BasicLink>
					) : (
						''
					),
				meta: {
					align: 'center'
				},
				size: 128
			},
			{
				id: 'pfOrPs',
				header: 'P/S',
				accessorFn: (protocol) => protocol.pfOrPs,
				cell: (info) => <>{info.getValue() != null ? info.getValue() : null}</>,
				meta: {
					align: 'center',
					headerHelperText: definitions.revenue.protocol['ps']
				},
				size: 120
			}
		]
	}
}

const columnsByType = getColumnsByType()
