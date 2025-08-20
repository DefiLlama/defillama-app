import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/router'
import {
	ColumnFiltersState,
	ColumnOrderState,
	ColumnSizingState,
	getCoreRowModel,
	getExpandedRowModel,
	getFilteredRowModel,
	getSortedRowModel,
	useReactTable,
	type ColumnDef,
	type SortingState
} from '@tanstack/react-table'
import { getAnnualizedRatio } from '~/api/categories/adaptors'
import { CSVDownloadButton } from '~/components/ButtonStyled/CsvButton'
import { FullOldViewButton } from '~/components/ButtonStyled/FullOldViewButton'
import { Icon } from '~/components/Icon'
import { BasicLink } from '~/components/Link'
import { Metrics, TMetric } from '~/components/Metrics'
import { RowLinksWithDropdown } from '~/components/RowLinksWithDropdown'
import { SelectWithCombobox } from '~/components/SelectWithCombobox'
import { VirtualTable } from '~/components/Table/Table'
import { TokenLogo } from '~/components/TokenLogo'
import { Tooltip } from '~/components/Tooltip'
import { useLocalStorageSettingsManager } from '~/contexts/LocalStorage'
import useWindowSize from '~/hooks/useWindowSize'
import { chainIconUrl, download, formattedNum, slug } from '~/utils'
import { chainCharts } from '../ChainOverview/constants'
import { protocolCharts } from '../ProtocolOverview/Chart/constants'
import { AdapterByChainChart } from './ChainChart'
import { IAdapterByChainPageData } from './types'

interface IProps extends IAdapterByChainPageData {
	type: Extract<
		TMetric,
		| 'Fees'
		| 'Revenue'
		| 'Holders Revenue'
		| 'DEX Volume'
		| 'Perp Volume'
		| 'Open Interest'
		| 'Bridge Aggregator Volume'
		| 'Perp Aggregator Volume'
		| 'DEX Aggregator Volume'
		| 'Options Premium Volume'
		| 'Options Notional Volume'
		| 'Earnings'
	>
}

const getProtocolsByCategory = (protocols: IAdapterByChainPageData['protocols'], categoriesToFilter: Array<string>) => {
	const final = []

	for (const protocol of protocols) {
		if (protocol.childProtocols) {
			const childProtocols = protocol.childProtocols.filter((childProtocol) =>
				categoriesToFilter.includes(childProtocol.category)
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

		if (categoriesToFilter.includes(protocol.category)) {
			final.push(protocol)
			continue
		}
	}

	return final
}

export function AdapterByChain(props: IProps) {
	const router = useRouter()
	const [enabledSettings] = useLocalStorageSettingsManager('fees')

	const { selectedCategories, protocols, columnsOptions } = useMemo(() => {
		const selectedCategories =
			props.categories.length > 0 && router.query.hasOwnProperty('category') && router.query.category === ''
				? []
				: router.query.category
					? typeof router.query.category === 'string'
						? [router.query.category]
						: router.query.category
					: props.categories

		const categoriesToFilter = selectedCategories.filter((c) => c.toLowerCase() !== 'all' && c.toLowerCase() !== 'none')

		const protocols =
			props.categories.length === 0
				? props.protocols
				: selectedCategories.length === 0
					? []
					: categoriesToFilter.length > 0
						? getProtocolsByCategory(props.protocols, categoriesToFilter)
						: props.protocols

		const finalProtocols =
			props.adapterType === 'fees' && (enabledSettings.bribes || enabledSettings.tokentax)
				? protocols.map((p) => {
						const childProtocols = p.childProtocols
							? p.childProtocols.map((cp) => {
									const total30d =
										cp.total30d +
										(enabledSettings.bribes ? (cp.bribes?.total30d ?? 0) : 0) +
										(enabledSettings.tokentax ? (cp.tokenTax?.total30d ?? 0) : 0)

									let pf = cp.mcap && cp.total30d ? getAnnualizedRatio(cp.mcap, total30d) : null
									let ps = cp.mcap && cp.revenue?.total30d ? getAnnualizedRatio(cp.mcap, total30d) : null

									return {
										...cp,
										total24h:
											cp.total24h +
											(enabledSettings.bribes ? (cp.bribes?.total24h ?? 0) : 0) +
											(enabledSettings.tokentax ? (cp.tokenTax?.total24h ?? 0) : 0),
										total7d:
											cp.total7d +
											(enabledSettings.bribes ? (cp.bribes?.total7d ?? 0) : 0) +
											(enabledSettings.tokentax ? (cp.tokenTax?.total7d ?? 0) : 0),
										total30d,
										total1y:
											cp.total1y +
											(enabledSettings.bribes ? (cp.bribes?.total1y ?? 0) : 0) +
											(enabledSettings.tokentax ? (cp.tokenTax?.total1y ?? 0) : 0),
										totalAllTime:
											cp.totalAllTime +
											(enabledSettings.bribes ? (cp.bribes?.totalAllTime ?? 0) : 0) +
											(enabledSettings.tokentax ? (cp.tokenTax?.totalAllTime ?? 0) : 0),
										...(pf ? { pf } : {}),
										...(ps ? { ps } : {})
									}
								})
							: null

						const total30d =
							p.total30d +
							(enabledSettings.bribes ? (p.bribes?.total30d ?? 0) : 0) +
							(enabledSettings.tokentax ? (p.tokenTax?.total30d ?? 0) : 0)

						const pf = p.mcap && total30d ? getAnnualizedRatio(p.mcap, total30d) : null
						const ps = p.mcap && p.revenue?.total30d ? getAnnualizedRatio(p.mcap, total30d) : null

						return {
							...p,
							total24h:
								p.total24h +
								(enabledSettings.bribes ? (p.bribes?.total24h ?? 0) : 0) +
								(enabledSettings.tokentax ? (p.tokenTax?.total24h ?? 0) : 0),
							total7d:
								p.total7d +
								(enabledSettings.bribes ? (p.bribes?.total7d ?? 0) : 0) +
								(enabledSettings.tokentax ? (p.tokenTax?.total7d ?? 0) : 0),
							total30d,
							total1y:
								p.total1y +
								(enabledSettings.bribes ? (p.bribes?.total1y ?? 0) : 0) +
								(enabledSettings.tokentax ? (p.tokenTax?.total1y ?? 0) : 0),
							totalAllTime:
								p.totalAllTime +
								(enabledSettings.bribes ? (p.bribes?.totalAllTime ?? 0) : 0) +
								(enabledSettings.tokentax ? (p.tokenTax?.totalAllTime ?? 0) : 0),
							...(pf ? { pf } : {}),
							...(ps ? { ps } : {}),
							...(childProtocols ? { childProtocols } : {})
						}
					})
				: protocols

		return {
			selectedCategories,
			protocols: finalProtocols,
			columnsOptions: getColumnsOptions(props.type)
		}
	}, [router.query, props, enabledSettings])

	const [sorting, setSorting] = useState<SortingState>([
		{ desc: true, id: ['pf', 'ps'].includes(props.type) ? props.type : 'total24h' }
	])
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
		sortingFns: {
			alphanumericFalsyLast: (rowA, rowB, columnId) => {
				const desc = sorting.length ? sorting[0].desc : true

				let a = (rowA.getValue(columnId) ?? null) as any
				let b = (rowB.getValue(columnId) ?? null) as any

				if (typeof a === 'number' && a <= 0) a = null
				if (typeof b === 'number' && b <= 0) b = null

				if (a === null && b !== null) {
					return desc ? -1 : 1
				}

				if (a !== null && b === null) {
					return desc ? 1 : -1
				}

				if (a === null && b === null) {
					return 0
				}

				return a - b
			}
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

	const [projectName, setProjectName] = useState('')

	useEffect(() => {
		const columns = instance.getColumn('name')

		const id = setTimeout(() => {
			if (columns) {
				columns.setFilterValue(projectName)
			}
		}, 200)

		return () => clearTimeout(id)
	}, [projectName, instance])

	const windowSize = useWindowSize()

	useEffect(() => {
		const colSize = windowSize.width ? columnSizes.find((size) => windowSize.width > +size[0]) : columnSizes[0]
		const colOrder = windowSize.width ? columnOrders.find((size) => windowSize.width > +size[0]) : columnOrders[0]
		instance.setColumnOrder(colOrder[1])
		instance.setColumnSizing(colSize[1])
	}, [instance, windowSize])

	const downloadCsv = useCallback(() => {
		const header = [
			'Protocol',
			'Category',
			'Chains',
			'Total 1d',
			'Total 7d',
			'Total 1m',
			'Total 1y',
			'Total All Time',
			'Market Cap',
			'P/F',
			'P/S'
		]

		const csvdata = protocols.map((protocol) => {
			return [
				protocol.name,
				protocol.category,
				protocol.chains.join(', '),
				protocol.total24h,
				protocol.total30d,
				protocol.total1y,
				protocol.totalAllTime,
				protocol.mcap,
				protocol.pf,
				protocol.ps
			]
		})

		const csv = [header, ...csvdata].map((row) => row.join(',')).join('\n')

		download(`${props.type}-${props.chain}-protocols.csv`, csv)
	}, [props, protocols])

	const { category, chain, ...queries } = router.query

	const addCategory = (newCategory) => {
		router.push(
			{
				pathname: router.basePath,
				query: {
					...queries,
					...(!router.basePath.includes('/chain/') && chain ? { chain } : {}),
					category: newCategory
				}
			},
			undefined,
			{ shallow: true }
		)
	}

	const toggleAllCategories = () => {
		router.push(
			{
				pathname: router.basePath,
				query: {
					...queries,
					...(!router.basePath.includes('/chain/') && chain ? { chain } : {}),
					category: props.categories
				}
			},
			undefined,
			{ shallow: true }
		)
	}

	const clearAllCategories = () => {
		const newQuery: any = {
			...queries,
			...(!router.basePath.includes('/chain/') && chain ? { chain } : {})
		}

		if (props.categories.length > 0) {
			newQuery.category = ''
		}

		router.push(
			{
				pathname: router.basePath,
				query: newQuery
			},
			undefined,
			{ shallow: true }
		)
	}

	const metricName = ['Fees', 'Revenue', 'Holders Revenue'].includes(props.type)
		? props.type
		: props.type.includes('Volume')
			? props.type
			: `${props.type} Volume`
	const columnsKey = `columns-${props.type}`

	const clearAllColumns = () => {
		window.localStorage.setItem(columnsKey, '{}')
		instance.getToggleAllColumnsVisibilityHandler()({ checked: false } as any)
	}
	const toggleAllColumns = () => {
		const ops = JSON.stringify(Object.fromEntries(columnsOptions.map((option) => [option.key, true])))
		window.localStorage.setItem(columnsKey, ops)
		instance.getToggleAllColumnsVisibilityHandler()({ checked: true } as any)
	}

	const addColumn = (newOptions) => {
		const ops = Object.fromEntries(
			instance.getAllLeafColumns().map((col) => [col.id, newOptions.includes(col.id) ? true : false])
		)
		window.localStorage.setItem(columnsKey, JSON.stringify(ops))
		instance.setColumnVisibility(ops)
	}

	const addOnlyOneColumn = (newOption) => {
		const ops = Object.fromEntries(
			instance.getAllLeafColumns().map((col) => [col.id, col.id === newOption ? true : false])
		)
		window.localStorage.setItem(columnsKey, JSON.stringify(ops))
		instance.setColumnVisibility(ops)
	}

	const selectedColumns = instance
		.getAllLeafColumns()
		.filter((col) => col.getIsVisible())
		.map((col) => col.id)

	return (
		<>
			<Metrics currentMetric={props.type} />
			<RowLinksWithDropdown links={props.chains} activeLink={props.chain} />
			{props.adapterType !== 'fees' && props.type !== 'Open Interest' ? (
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
									<span>{metricName} (24h)</span>
									<span className="font-jetbrains min-h-8 overflow-hidden text-2xl font-semibold text-ellipsis whitespace-nowrap">
										{formattedNum(props.total24h, true)}
									</span>
								</span>
							</p>
						) : null}

						<div className="flex flex-col">
							{props.total30d != null ? (
								<p className="group flex flex-wrap justify-start gap-4 border-b border-(--cards-border) py-1 last:border-none">
									<span className="text-(--text-label)">{metricName} (30d)</span>
									<span className="font-jetbrains ml-auto">{formattedNum(props.total30d, true)}</span>
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
										className={`font-jetbrains ml-auto ${
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
						dataType={props.dataType}
						chain={props.chain}
						chartName={metricName}
					/>
				</div>
			) : null}
			<div className="rounded-md border border-(--cards-border) bg-(--cards-bg)">
				<div className="flex flex-wrap items-center justify-end gap-4 p-2">
					<div className="relative mr-auto w-full sm:max-w-[280px]">
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
							className="w-full rounded-md border border-(--form-control-border) bg-white p-1 pl-7 text-sm text-black dark:bg-black dark:text-white"
						/>
					</div>
					<SelectWithCombobox
						allValues={columnsOptions}
						selectedValues={selectedColumns}
						setSelectedValues={addColumn}
						selectOnlyOne={addOnlyOneColumn}
						toggleAll={toggleAllColumns}
						clearAll={clearAllColumns}
						nestedMenu={false}
						label={'Columns'}
						labelType="smol"
						triggerProps={{
							className:
								'flex items-center justify-between gap-2 px-2 py-[6px] text-xs rounded-md cursor-pointer flex-nowrap relative border border-(--form-control-border) text-(--text-form) hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) font-medium w-full sm:w-auto'
						}}
					/>
					{props.categories.length > 0 && (
						<SelectWithCombobox
							allValues={props.categories}
							selectedValues={selectedCategories}
							setSelectedValues={addCategory}
							selectOnlyOne={addCategory}
							toggleAll={toggleAllCategories}
							clearAll={clearAllCategories}
							nestedMenu={false}
							label={'Category'}
							labelType="smol"
							triggerProps={{
								className:
									'flex items-center justify-between gap-2 px-2 py-[6px] text-xs rounded-md cursor-pointer flex-nowrap relative border border-(--form-control-border) text-(--text-form) hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) font-medium w-full sm:w-auto'
							}}
						/>
					)}
					<FullOldViewButton type={props.type} />
					<CSVDownloadButton
						onClick={downloadCsv}
						className="h-[30px] border border-(--form-control-border) bg-transparent! text-(--text-form)! hover:bg-(--link-hover-bg)! focus-visible:bg-(--link-hover-bg)!"
					/>
				</div>

				<VirtualTable instance={instance} rowSize={64} compact />
			</div>
		</>
	)
}

const columnSizes = Object.entries({
	0: { name: 180, definition: 400 },
	640: { name: 240, definition: 400 },
	768: { name: 280, definition: 400 },
	1536: { name: 280, definition: 400 }
}).sort((a, b) => Number(b[0]) - Number(a[0]))

const columnOrders = Object.entries({
	0: ['name', 'total24h', 'total7d', 'total30d', 'category', 'definition'],
	640: ['name', 'category', 'definition', 'total24h', 'total7d', 'total30d']
}).sort((a, b) => Number(b[0]) - Number(a[0]))

const protocolChartsKeys: Record<IProps['type'], (typeof protocolCharts)[keyof typeof protocolCharts]> = {
	Fees: 'fees',
	Revenue: 'revenue',
	'Holders Revenue': 'holdersRevenue',
	'Options Premium Volume': 'optionsPremiumVolume',
	'Options Notional Volume': 'optionsNotionalVolume',
	'DEX Volume': 'dexVolume',
	'Perp Volume': 'perpVolume',
	'Open Interest': 'perpVolume',
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

const getColumnsOptions = (type) =>
	columnsByType[type].map((c: any) => {
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
					headerName = c.id
			}
		} else {
			headerName = c.header as string
		}

		return { name: headerName, key: c.id ?? (c.accessorKey as string) }
	})

const NameColumn = (type: IProps['type']): ColumnDef<IAdapterByChainPageData['protocols'][0]> => {
	return {
		id: 'name',
		header: 'Name',
		accessorFn: (protocol) => protocol.name,
		enableSorting: false,
		cell: ({ getValue, row, table }) => {
			const value = getValue() as string
			const index = row.depth === 0 ? table.getSortedRowModel().rows.findIndex((x) => x.id === row.id) : row.index
			const Chains = () => (
				<span className="flex flex-col gap-1">
					{row.original.chains.map((chain) => (
						<span key={`/chain/${chain}/${row.original.slug}`} className="flex items-center gap-1">
							<TokenLogo logo={chainIconUrl(chain)} size={14} />
							<span>{chain}</span>
						</span>
					))}
				</span>
			)

			const basePath = ['Chain', 'Rollup'].includes(row.original.category) ? 'chain' : 'protocol'
			const chartKey = ['Chain', 'Rollup'].includes(row.original.category)
				? (chainChartsKeys[type] ?? protocolChartsKeys[type])
				: protocolChartsKeys[type]

			return (
				<span className={`relative flex items-center gap-2 ${row.depth > 0 ? 'pl-6' : 'pl-0'}`}>
					{row.subRows?.length > 0 ? (
						<button
							className="absolute -left-[18px]"
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

					<span className="shrink-0" onClick={row.getToggleExpandedHandler()}>
						{index + 1}
					</span>

					<TokenLogo logo={row.original.logo} data-lgonly />

					<span className="-my-2 flex flex-col">
						<BasicLink
							href={`/${basePath}/${row.original.slug}?tvl=false&events=false&${chartKey}=true`}
							className="overflow-hidden text-sm font-medium text-ellipsis whitespace-nowrap text-(--link-text) hover:underline"
						>
							{value}
						</BasicLink>

						<Tooltip content={<Chains />} className="text-[0.7rem] text-(--text-disabled)">
							{`${row.original.chains.length} chain${row.original.chains.length > 1 ? 's' : ''}`}
						</Tooltip>
					</span>
				</span>
			)
		},
		size: 280
	}
}

const getColumnsByType = (
	isChain: boolean = false
): Record<IProps['type'] & 'P/F', ColumnDef<IAdapterByChainPageData['protocols'][0]>[]> => {
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
				sortUndefined: 'last',
				sortingFn: 'alphanumericFalsyLast' as any,
				meta: {
					align: 'center',
					headerHelperText:
						'Total fees paid by users when using the protocol in the last 24 hours, updated daily at 00:00 UTC'
				},
				size: 128
			},
			{
				id: 'total7d',
				header: 'Fees 7d',
				accessorFn: (protocol) => protocol.total7d,
				cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
				sortUndefined: 'last',
				sortingFn: 'alphanumericFalsyLast' as any,
				meta: {
					align: 'center',
					headerHelperText: 'Total fees paid by users when using the protocol in the last 7 days'
				},
				size: 128
			},
			{
				id: 'total30d',
				header: 'Fees 30d',
				accessorFn: (protocol) => protocol.total30d,
				cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
				sortUndefined: 'last',
				sortingFn: 'alphanumericFalsyLast' as any,
				meta: {
					align: 'center',
					headerHelperText: 'Total fees paid by users when using the protocol in the last 30 days'
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
				sortUndefined: 'last',
				sortingFn: 'alphanumericFalsyLast' as any,
				meta: {
					align: 'center',
					headerHelperText: 'Revenue earned by the protocol in the last 24 hours, updated daily at 00:00 UTC'
				},
				size: 128
			},
			{
				id: 'total7d',
				header: 'Revenue 7d',
				accessorFn: (protocol) => protocol.total7d,
				cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
				sortUndefined: 'last',
				sortingFn: 'alphanumericFalsyLast' as any,
				meta: {
					align: 'center',
					headerHelperText: 'Revenue earned by the protocol in the last 7 days'
				},
				size: 128
			},
			{
				id: 'total30d',
				header: 'Revenue 30d',
				accessorFn: (protocol) => protocol.total30d,
				cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
				sortUndefined: 'last',
				sortingFn: 'alphanumericFalsyLast' as any,
				meta: {
					align: 'center',
					headerHelperText: 'Revenue earned by the protocol in the last 30 days'
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
				sortUndefined: 'last',
				sortingFn: 'alphanumericFalsyLast' as any,
				meta: {
					align: 'center',
					headerHelperText:
						'Revenue earned by token holders of the protocol in the last 24 hours, updated daily at 00:00 UTC'
				},
				size: 180
			},
			{
				id: 'total7d',
				header: 'Holders Revenue 7d',
				accessorFn: (protocol) => protocol.total7d,
				cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
				sortUndefined: 'last',
				sortingFn: 'alphanumericFalsyLast' as any,
				meta: {
					align: 'center',
					headerHelperText: 'Revenue earned by token holders of the protocol in the last 7 days'
				},
				size: 180
			},
			{
				id: 'total30d',
				header: 'Holders Revenue 30d',
				accessorFn: (protocol) => protocol.total30d,
				cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
				sortUndefined: 'last',
				sortingFn: 'alphanumericFalsyLast' as any,
				meta: {
					align: 'center',
					headerHelperText: 'Revenue earned by token holders of the protocol in the last 30 days'
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
				sortUndefined: 'last',
				sortingFn: 'alphanumericFalsyLast' as any,
				meta: {
					align: 'center',
					headerHelperText:
						'Sum of value paid buying and selling options on the options exchange in the last 24 hours, updated daily at 00:00 UTC'
				},
				size: 180
			},
			{
				id: 'total7d',
				header: 'Premium Volume 7d',
				accessorFn: (protocol) => protocol.total7d,
				cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
				sortUndefined: 'last',
				sortingFn: 'alphanumericFalsyLast' as any,
				meta: {
					align: 'center',
					headerHelperText: 'Sum of value paid buying and selling options on the options exchange in the last 7 days'
				},
				size: 180
			},
			{
				id: 'total30d',
				header: 'Premium Volume 30d',
				accessorFn: (protocol) => protocol.total30d,
				cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
				sortUndefined: 'last',
				sortingFn: 'alphanumericFalsyLast' as any,
				meta: {
					align: 'center',
					headerHelperText: 'Sum of value paid buying and selling options on the options exchange in the last 30 days'
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
				sortUndefined: 'last',
				sortingFn: 'alphanumericFalsyLast' as any,
				meta: {
					align: 'center',
					headerHelperText:
						'Sum of the notional value of all options that have been traded on the options exchange in the last 24 hours, updated daily at 00:00 UTC'
				},
				size: 180
			},
			{
				id: 'total7d',
				header: 'Notional Volume 7d',
				accessorFn: (protocol) => protocol.total7d,
				cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
				sortUndefined: 'last',
				sortingFn: 'alphanumericFalsyLast' as any,
				meta: {
					align: 'center',
					headerHelperText:
						'Sum of the notional value of all options that have been traded on the options exchange in the last 7 days'
				},
				size: 180
			},
			{
				id: 'total30d',
				header: 'Notional Volume 30d',
				accessorFn: (protocol) => protocol.total30d,
				cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
				sortUndefined: 'last',
				sortingFn: 'alphanumericFalsyLast' as any,
				meta: {
					align: 'center',
					headerHelperText:
						'Sum of the notional value of all options that have been traded on the options exchange in the last 30 days'
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
				cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
				sortUndefined: 'last',
				sortingFn: 'alphanumericFalsyLast' as any,
				meta: {
					align: 'center',
					headerHelperText: 'Volume of all spot swaps on the dex in the last 24 hours, updated daily at 00:00 UTC'
				},
				size: 152
			},
			{
				id: 'total7d',
				header: 'DEX Volume 7d',
				accessorFn: (protocol) => protocol.total7d,
				cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
				sortUndefined: 'last',
				sortingFn: 'alphanumericFalsyLast' as any,
				meta: {
					align: 'center',
					headerHelperText: 'Volume of all spot swaps on the dex in the last 7 days'
				},
				size: 152
			},
			{
				id: 'total30d',
				header: 'DEX Volume 30d',
				accessorFn: (protocol) => protocol.total30d,
				cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
				sortUndefined: 'last',
				sortingFn: 'alphanumericFalsyLast' as any,
				meta: {
					align: 'center',
					headerHelperText: 'Volume of all spot swaps on the dex in the last 30 days'
				},
				size: 152
			}
		],
		'Perp Volume': [
			NameColumn('Perp Volume'),
			{
				id: 'total24h',
				header: 'Perp Volume 24h',
				accessorFn: (protocol) => protocol.total24h,
				cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
				sortUndefined: 'last',
				sortingFn: 'alphanumericFalsyLast' as any,
				meta: {
					align: 'center',
					headerHelperText:
						'Notional volume of all trades on the perp exchange, including leverage in the last 24 hours, updated daily at 00:00 UTC'
				},
				size: 160
			},
			{
				id: 'total7d',
				header: 'Perp Volume 7d',
				accessorFn: (protocol) => protocol.total7d,
				cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
				sortUndefined: 'last',
				sortingFn: 'alphanumericFalsyLast' as any,
				meta: {
					align: 'center',
					headerHelperText: 'Notional volume of all trades on the perp exchange, including leverage in the last 7 days'
				},
				size: 160
			},
			{
				id: 'total30d',
				header: 'Perp Volume 30d',
				accessorFn: (protocol) => protocol.total30d,
				cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
				sortUndefined: 'last',
				sortingFn: 'alphanumericFalsyLast' as any,
				meta: {
					align: 'center',
					headerHelperText: 'Notional volume of all trades on the perp exchange, including leverage in the last 30 days'
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
				sortUndefined: 'last',
				sortingFn: 'alphanumericFalsyLast' as any,
				meta: {
					align: 'center',
					headerHelperText:
						'Total notional value of all outstanding perpetual futures positions, updated daily at 00:00 UTC'
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
				sortUndefined: 'last',
				sortingFn: 'alphanumericFalsyLast' as any,
				meta: {
					align: 'center',
					headerHelperText:
						'Notional volume of all trades on the perp aggregator, including leverage in the last 24 hours, updated daily at 00:00 UTC'
				},
				size: 160
			},
			{
				id: 'total7d',
				header: 'Perp Aggregator Volume 7d',
				accessorFn: (protocol) => protocol.total7d,
				cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
				sortUndefined: 'last',
				sortingFn: 'alphanumericFalsyLast' as any,
				meta: {
					align: 'center',
					headerHelperText:
						'Notional volume of all trades on the perp aggregator, including leverage in the last 7 days'
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
				sortUndefined: 'last',
				sortingFn: 'alphanumericFalsyLast' as any,
				meta: {
					align: 'center',
					headerHelperText:
						'Notional volume of all trades on the perp aggregator, including leverage in the last 30 days'
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
				sortUndefined: 'last',
				sortingFn: 'alphanumericFalsyLast' as any,
				meta: {
					align: 'center',
					headerHelperText:
						'Sum of value of all assets that were bridged through the bridge Aggregator in the last 24 hours, updated daily at 00:00 UTC'
				},
				size: 160
			},
			{
				id: 'total7d',
				header: 'Bridge Aggregator Volume 7d',
				accessorFn: (protocol) => protocol.total7d,
				cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
				sortUndefined: 'last',
				sortingFn: 'alphanumericFalsyLast' as any,
				meta: {
					align: 'center',
					headerHelperText:
						'Sum of value of all assets that were bridged through the bridge Aggregator in the last 7 days'
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
				sortUndefined: 'last',
				sortingFn: 'alphanumericFalsyLast' as any,
				meta: {
					align: 'center',
					headerHelperText:
						'Sum of value of all assets that were bridged through the bridge Aggregator in the last 30 days'
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
				sortUndefined: 'last',
				sortingFn: 'alphanumericFalsyLast' as any,
				meta: {
					align: 'center',
					headerHelperText:
						'Volume of spot token swaps on the DEX aggregator in the last 24 hours, updated daily at 00:00 UTC'
				},
				size: 160
			},
			{
				id: 'total7d',
				header: 'DEX Aggregator Volume 7d',
				accessorFn: (protocol) => protocol.total7d,
				cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
				sortUndefined: 'last',
				sortingFn: 'alphanumericFalsyLast' as any,
				meta: {
					align: 'center',
					headerHelperText: 'Volume of spot token swaps on the DEX aggregator in the last 7 days'
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
				sortUndefined: 'last',
				sortingFn: 'alphanumericFalsyLast' as any,
				meta: {
					align: 'center',
					headerHelperText: 'Volume of spot token swaps on the DEX aggregator in the last 30 days'
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
				sortUndefined: 'last',
				sortingFn: 'alphanumericFalsyLast' as any,
				meta: {
					align: 'center',
					headerHelperText:
						'Earnings (Revenue - Incentives) earned by the protocol in the last 24 hours' +
						(isChain ? ' Incentives are split propotionally to revenue on this chain.' : '')
				},
				size: 160
			},
			{
				id: 'total7d',
				header: 'Earnings 7d',
				accessorFn: (protocol) => protocol.total7d,
				cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
				sortUndefined: 'last',
				sortingFn: 'alphanumericFalsyLast' as any,
				meta: {
					align: 'center',
					headerHelperText:
						'Earnings (Revenue - Incentives) earned by the protocol in the last 7 days' +
						(isChain ? ' Incentives are split propotionally to revenue on this chain.' : '')
				},
				size: 160
			},
			{
				id: 'total30d',
				header: 'Earnings 30d',
				accessorFn: (protocol) => protocol.total30d,
				cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
				sortUndefined: 'last',
				sortingFn: 'alphanumericFalsyLast' as any,
				meta: {
					align: 'center',
					headerHelperText:
						'Earnings (Revenue - Incentives) earned by the protocol in the last 30 days' +
						(isChain ? ' Incentives are split propotionally to revenue on this chain.' : '')
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
				id: 'pf',
				header: 'P/F',
				accessorFn: (protocol) => protocol.pf,
				cell: (info) => <>{info.getValue() != null ? info.getValue() : null}</>,
				sortUndefined: 'last',
				sortingFn: 'alphanumericFalsyLast' as any,
				meta: {
					align: 'center',
					headerHelperText: 'Market cap / annualized fees'
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
				id: 'ps',
				header: 'P/S',
				accessorFn: (protocol) => protocol.ps,
				cell: (info) => <>{info.getValue() != null ? info.getValue() : null}</>,
				sortUndefined: 'last',
				sortingFn: 'alphanumericFalsyLast' as any,
				meta: {
					align: 'center',
					headerHelperText: 'Market cap / annualized revenue'
				},
				size: 120
			}
		]
	}
}

const columnsByType = getColumnsByType()
