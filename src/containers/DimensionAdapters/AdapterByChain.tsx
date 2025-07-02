import { RowLinksWithDropdown } from '~/components/RowLinksWithDropdown'
import { IAdapterByChainPageData } from './types'
import { VirtualTable } from '~/components/Table/Table'
import { CSVDownloadButton } from '~/components/ButtonStyled/CsvButton'
import { Icon } from '~/components/Icon'
import {
	type ColumnDef,
	ColumnFiltersState,
	ColumnOrderState,
	ColumnSizingState,
	getCoreRowModel,
	getExpandedRowModel,
	getFilteredRowModel,
	getSortedRowModel,
	type SortingState,
	useReactTable
} from '@tanstack/react-table'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { BasicLink } from '~/components/Link'
import { chainIconUrl, download, formattedNum, slug } from '~/utils'
import { Tooltip } from '~/components/Tooltip'
import { TokenLogo } from '~/components/TokenLogo'
import { AdaptorsSearch } from '~/components/Search/Adaptors'
import { Metrics, TMetric } from '~/components/Metrics'
import { SelectWithCombobox } from '~/components/SelectWithCombobox'
import { useRouter } from 'next/router'
import { useLocalStorageSettingsManager } from '~/contexts/LocalStorage'
import useWindowSize from '~/hooks/useWindowSize'
import { AdapterByChainChart } from './ChainChart'
import { protocolCharts } from '../ProtocolOverview/Chart/constants'

interface IProps extends IAdapterByChainPageData {
	type: Extract<
		TMetric,
		| 'Fees'
		| 'Revenue'
		| 'Holders Revenue'
		| 'DEX Volume'
		| 'Perp Volume'
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
									return {
										...cp,
										total24h:
											cp.total24h +
											(enabledSettings.bribes ? cp.bribes?.total24h ?? 0 : 0) +
											(enabledSettings.tokentax ? cp.tokenTax?.total24h ?? 0 : 0),
										total7d:
											cp.total7d +
											(enabledSettings.bribes ? cp.bribes?.total7d ?? 0 : 0) +
											(enabledSettings.tokentax ? cp.tokenTax?.total7d ?? 0 : 0),
										total30d:
											cp.total30d +
											(enabledSettings.bribes ? cp.bribes?.total30d ?? 0 : 0) +
											(enabledSettings.tokentax ? cp.tokenTax?.total30d ?? 0 : 0),
										total1y:
											cp.total1y +
											(enabledSettings.bribes ? cp.bribes?.total1y ?? 0 : 0) +
											(enabledSettings.tokentax ? cp.tokenTax?.total1y ?? 0 : 0),
										totalAllTime:
											cp.totalAllTime +
											(enabledSettings.bribes ? cp.bribes?.totalAllTime ?? 0 : 0) +
											(enabledSettings.tokentax ? cp.tokenTax?.totalAllTime ?? 0 : 0)
									}
							  })
							: null

						return {
							...p,
							total24h:
								p.total24h +
								(enabledSettings.bribes ? p.bribes?.total24h ?? 0 : 0) +
								(enabledSettings.tokentax ? p.tokenTax?.total24h ?? 0 : 0),
							total7d:
								p.total7d +
								(enabledSettings.bribes ? p.bribes?.total7d ?? 0 : 0) +
								(enabledSettings.tokentax ? p.tokenTax?.total7d ?? 0 : 0),
							total30d:
								p.total30d +
								(enabledSettings.bribes ? p.bribes?.total30d ?? 0 : 0) +
								(enabledSettings.tokentax ? p.tokenTax?.total30d ?? 0 : 0),
							total1y:
								p.total1y +
								(enabledSettings.bribes ? p.bribes?.total1y ?? 0 : 0) +
								(enabledSettings.tokentax ? p.tokenTax?.total1y ?? 0 : 0),
							totalAllTime:
								p.totalAllTime +
								(enabledSettings.bribes ? p.bribes?.totalAllTime ?? 0 : 0) +
								(enabledSettings.tokentax ? p.tokenTax?.totalAllTime ?? 0 : 0),
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

	const [sorting, setSorting] = useState<SortingState>([{ desc: true, id: 'total24h' }])
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
			'Market Cap'
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
				protocol.mcap
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

	const metricName = ['Fees', 'Revenue', 'Holders Revenue'].includes(props.type) ? props.type : `${props.type} Volume`
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
			<AdaptorsSearch type={props.adapterType} dataType={props.dataType} />
			<Metrics currentMetric={props.type} />
			<RowLinksWithDropdown links={props.chains} activeLink={props.chain} />
			{props.adapterType !== 'fees' ? (
				<div className="grid grid-cols-2 relative isolate xl:grid-cols-3 gap-1 text-base">
					<div className="bg-(--cards-bg) rounded-md flex flex-col gap-6 p-5 col-span-2 w-full xl:col-span-1 overflow-x-auto">
						{props.chain !== 'All' && (
							<h1 className="flex items-center flex-nowrap gap-2">
								<TokenLogo logo={chainIconUrl(props.chain)} size={24} />
								<span className="text-xl font-semibold">{props.chain}</span>
							</h1>
						)}

						{props.total24h != null ? (
							<p className="flex flex-col">
								<span className="flex flex-col">
									<span>{metricName} (24h)</span>
									<span className="font-semibold text-2xl font-jetbrains min-h-8 overflow-hidden whitespace-nowrap text-ellipsis">
										{formattedNum(props.total24h, true)}
									</span>
								</span>
							</p>
						) : null}

						<div className="flex flex-col gap-1">
							{props.total30d != null ? (
								<p className="flex items-center gap-4 justify-between flex-wrap">
									<span className="font-normal text-[#545757] dark:text-[#cccccc]">{metricName} (30d)</span>
									<span className="text-right font-jetbrains">{formattedNum(props.total30d, true)}</span>
								</p>
							) : null}
							{props.change_7dover7d != null ? (
								<p className="flex items-center gap-4 justify-between flex-wrap">
									<Tooltip
										content="Change of last 7d volume over the previous 7d volume"
										className="underline decoration-dotted font-normal text-[#545757] dark:text-[#cccccc]"
										render={<span />}
									>
										Weekly Change
									</Tooltip>
									<span
										className={`text-right font-jetbrains pl-2 pb-1 text-ellipsis" ${
											props.change_7dover7d >= 0 ? 'text-(--pct-green)' : 'text-(--pct-red)'
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
			<div className="bg-(--cards-bg) rounded-md">
				<div className="flex items-center justify-end flex-wrap gap-4 p-3">
					<div className="relative w-full sm:max-w-[280px] mr-auto">
						<Icon
							name="search"
							height={16}
							width={16}
							className="absolute text-(--text3) top-0 bottom-0 my-auto left-2"
						/>
						<input
							value={projectName}
							onChange={(e) => {
								setProjectName(e.target.value)
							}}
							placeholder="Search..."
							className="border border-(--form-control-border) w-full pl-7 pr-2 py-[6px] bg-white dark:bg-black text-black dark:text-white rounded-md text-sm"
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
								'flex items-center justify-between gap-2 p-2 text-xs rounded-md cursor-pointer flex-nowrap relative border border-(--form-control-border) text-[#666] dark:text-[#919296] hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) font-medium'
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
									'flex items-center justify-between gap-2 p-2 text-xs rounded-md cursor-pointer flex-nowrap relative border border-(--form-control-border) text-[#666] dark:text-[#919296] hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) font-medium'
							}}
						/>
					)}
					<CSVDownloadButton onClick={downloadCsv} className="min-h-8" />
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
	0: ['name', 'total24h', 'total30d', 'category', 'definition'],
	640: ['name', 'category', 'definition', 'total24h', 'total30d']
}).sort((a, b) => Number(b[0]) - Number(a[0]))

const chartKeys: Record<IProps['type'], typeof protocolCharts[keyof typeof protocolCharts]> = {
	Fees: 'fees',
	Revenue: 'revenue',
	'Holders Revenue': 'holdersRevenue',
	'Options Premium Volume': 'optionsPremiumVolume',
	'Options Notional Volume': 'optionsNotionalVolume',
	'DEX Volume': 'dexVolume',
	'Perp Volume': 'perpVolume',
	'Bridge Aggregator Volume': 'bridgeAggregatorVolume',
	'Perp Aggregator Volume': 'perpAggregatorVolume',
	'DEX Aggregator Volume': 'dexAggregatorVolume',
	Earnings: 'incentives'
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

			const basePath = row.original.category === 'Chain' ? 'chain' : 'protocol'
			const chartKey =
				row.original.category === 'Chain'
					? type === 'Fees'
						? 'chainFees'
						: type.includes('Revenue')
						? 'chainRevenue'
						: chartKeys[type]
					: chartKeys[type]

			return (
				<span className={`flex items-center gap-2 relative ${row.depth > 0 ? 'pl-6' : 'pl-0'}`}>
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

					<span className="flex flex-col -my-2">
						<BasicLink
							href={`/${basePath}/${row.original.slug}?tvl=false&events=false&${chartKey}=true`}
							className="text-sm font-medium text-(--link-text) overflow-hidden whitespace-nowrap text-ellipsis hover:underline"
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
						<span className="overflow-hidden text-ellipsis whitespace-normal line-clamp-2 min-w-0">
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
				meta: {
					align: 'center',
					headerHelperText:
						'Total fees paid by users when using the protocol in the last 24 hours, updated daily at 00:00 UTC'
				},
				size: 128
			},
			{
				id: 'total30d',
				header: 'Fees 30d',
				accessorFn: (protocol) => protocol.total30d,
				cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
				sortUndefined: 'last',
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
						<span className="overflow-hidden text-ellipsis whitespace-normal line-clamp-2 min-w-0">
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
				meta: {
					align: 'center',
					headerHelperText: 'Revenue earned by the protocol in the last 24 hours, updated daily at 00:00 UTC'
				},
				size: 128
			},
			{
				id: 'total30d',
				header: 'Revenue 30d',
				accessorFn: (protocol) => protocol.total30d,
				cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
				sortUndefined: 'last',
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
						<span className="overflow-hidden text-ellipsis whitespace-normal line-clamp-2 min-w-0">
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
				meta: {
					align: 'center',
					headerHelperText:
						'Revenue earned by token holders of the protocol in the last 24 hours, updated daily at 00:00 UTC'
				},
				size: 180
			},
			{
				id: 'total30d',
				header: 'Holders Revenue 30d',
				accessorFn: (protocol) => protocol.total30d,
				cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
				sortUndefined: 'last',
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
				meta: {
					align: 'center',
					headerHelperText:
						'Sum of value paid buying and selling options on the options exchange in the last 24 hours, updated daily at 00:00 UTC'
				},
				size: 180
			},
			{
				id: 'total30d',
				header: 'Premium Volume 30d',
				accessorFn: (protocol) => protocol.total30d,
				cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
				sortUndefined: 'last',
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
				meta: {
					align: 'center',
					headerHelperText:
						'Sum of the notional value of all options that have been traded on the options exchange in the last 24 hours, updated daily at 00:00 UTC'
				},
				size: 180
			},
			{
				id: 'total30d',
				header: 'Notional Volume 30d',
				accessorFn: (protocol) => protocol.total30d,
				cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
				sortUndefined: 'last',
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
				meta: {
					align: 'center',
					headerHelperText: 'Volume of all spot swaps on the dex in the last 24 hours, updated daily at 00:00 UTC'
				},
				size: 152
			},
			{
				id: 'total30d',
				header: 'DEX Volume 30d',
				accessorFn: (protocol) => protocol.total30d,
				cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
				sortUndefined: 'last',
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
				meta: {
					align: 'center',
					headerHelperText:
						'Notional volume of all trades on the perp exchange, including leverage in the last 24 hours, updated daily at 00:00 UTC'
				},
				size: 160
			},
			{
				id: 'total30d',
				header: 'Perp Volume 30d',
				accessorFn: (protocol) => protocol.total30d,
				cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
				sortUndefined: 'last',
				meta: {
					align: 'center',
					headerHelperText: 'Notional volume of all trades on the perp exchange, including leverage in the last 30 days'
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
				meta: {
					align: 'center',
					headerHelperText:
						'Notional volume of all trades on the perp aggregator, including leverage in the last 24 hours, updated daily at 00:00 UTC'
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
				meta: {
					align: 'center',
					headerHelperText:
						'Sum of value of all assets that were bridged through the bridge Aggregator in the last 24 hours, updated daily at 00:00 UTC'
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
				meta: {
					align: 'center',
					headerHelperText:
						'Volume of spot token swaps on the DEX aggregator in the last 24 hours, updated daily at 00:00 UTC'
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
				meta: {
					align: 'center',
					headerHelperText:
						'Earnings (Revenue - Incentives) earned by the protocol in the last 24 hours' +
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
				meta: {
					align: 'center',
					headerHelperText:
						'Earnings (Revenue - Incentives) earned by the protocol in the last 30 days' +
						(isChain ? ' Incentives are split propotionally to revenue on this chain.' : '')
				},
				size: 160
			}
		]
	}
}

const columnsByType = getColumnsByType()
