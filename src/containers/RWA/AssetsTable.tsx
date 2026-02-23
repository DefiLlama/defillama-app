import {
	type ColumnDef,
	type ColumnFiltersState,
	type ColumnOrderState,
	type ColumnSizingState,
	type ExpandedState,
	getCoreRowModel,
	getExpandedRowModel,
	getFilteredRowModel,
	getSortedRowModel,
	type SortingState,
	useReactTable
} from '@tanstack/react-table'
import clsx from 'clsx'
import { matchSorter } from 'match-sorter'
import { startTransition, useDeferredValue, useMemo, useState } from 'react'
import { CSVDownloadButton } from '~/components/ButtonStyled/CsvButton'
import { Icon } from '~/components/Icon'
import { BasicLink } from '~/components/Link'
import { SelectWithCombobox } from '~/components/Select/SelectWithCombobox'
import { VirtualTable } from '~/components/Table/Table'
import { prepareTableCsv, useSortColumnSizesAndOrders } from '~/components/Table/utils'
import type { ColumnSizesByBreakpoint } from '~/components/Table/utils'
import { Tooltip } from '~/components/Tooltip'
import { formattedNum, slug } from '~/utils'
import type { IRWAAssetsOverview } from './api.types'
import { BreakdownTooltipContent } from './BreakdownTooltipContent'
import { definitions } from './definitions'

type AssetRow = IRWAAssetsOverview['assets'][0]

export function RWAAssetsTable({
	assets,
	selectedChain
}: {
	assets: IRWAAssetsOverview['assets']
	selectedChain: string
}) {
	const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
	const [sorting, setSorting] = useState<SortingState>([{ id: 'activeMcap.total', desc: true }])
	const [expanded, setExpanded] = useState<ExpandedState>({})
	const [columnSizing, setColumnSizing] = useState<ColumnSizingState>({})
	const [columnOrder, setColumnOrder] = useState<ColumnOrderState>([])

	const [searchValue, setSearchValue] = useState('')
	const deferredSearchValue = useDeferredValue(searchValue)

	const assetsData = useMemo(() => {
		if (!deferredSearchValue) return assets

		return matchSorter(assets, deferredSearchValue, {
			keys: ['assetName', 'ticker'],
			threshold: matchSorter.rankings.CONTAINS
		})
	}, [assets, deferredSearchValue])

	const instance = useReactTable({
		data: assetsData,
		columns,
		state: {
			sorting,
			columnFilters,
			expanded,
			columnSizing,
			columnOrder
		},
		defaultColumn: {
			sortUndefined: 'last'
		},
		enableSortingRemoval: false,
		filterFromLeafRows: true,
		onExpandedChange: (updater) => startTransition(() => setExpanded(updater)),
		getSubRows: (row: any) => row.subRows,
		onSortingChange: (updater) => startTransition(() => setSorting(updater)),
		onColumnFiltersChange: (updater) => startTransition(() => setColumnFilters(updater)),
		onColumnSizingChange: (updater) => startTransition(() => setColumnSizing(updater)),
		onColumnOrderChange: (updater) => startTransition(() => setColumnOrder(updater)),
		getFilteredRowModel: getFilteredRowModel(),
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getExpandedRowModel: getExpandedRowModel()
	})

	useSortColumnSizesAndOrders({ instance, columnSizes })

	const columnsOptions = useMemo(
		() =>
			columns.map((c: any) => {
				const headerName = typeof c.header === 'function' ? (c.id ?? (c.accessorKey as string)) : (c.header as string)
				return { name: headerName, key: c.id ?? (c.accessorKey as string) }
			}),
		[]
	)

	const selectedColumns = instance
		.getAllLeafColumns()
		.filter((col) => col.getIsVisible())
		.map((col) => col.id)

	const setColumnOptions = (newOptions: string[] | ((prev: string[]) => string[])) => {
		const resolvedOptions = Array.isArray(newOptions) ? newOptions : newOptions(selectedColumns)
		const ops = Object.fromEntries(
			instance.getAllLeafColumns().map((col) => [col.id, resolvedOptions.includes(col.id)])
		)
		instance.setColumnVisibility(ops)
	}

	return (
		<div className="rounded-md border border-(--cards-border) bg-(--cards-bg)">
			<h1 className="mr-auto p-3 text-lg font-semibold">Assets Rankings</h1>
			<div className="flex flex-wrap items-center justify-end gap-2 p-3">
				<label className="relative mr-auto w-full sm:max-w-[280px]">
					<span className="sr-only">Search assets</span>
					<Icon
						name="search"
						height={16}
						width={16}
						className="absolute top-0 bottom-0 left-2 my-auto text-(--text-tertiary)"
					/>
					<input
						onInput={(e) => setSearchValue(e.currentTarget.value)}
						placeholder="Search assets..."
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
				<CSVDownloadButton
					prepareCsv={() =>
						prepareTableCsv({
							instance,
							filename: `rwa-assets${selectedChain !== 'All' ? `-${selectedChain.toLowerCase()}` : ''}`
						})
					}
					smol
				/>
			</div>
			<VirtualTable instance={instance} />
		</div>
	)
}

const columns: ColumnDef<AssetRow>[] = [
	{
		id: 'name',
		header: 'Name',
		accessorFn: (asset) => asset.assetName ?? asset.ticker,
		enableSorting: false,
		cell: (info) => {
			return (
				<span className="flex items-center gap-2">
					<span className="vf-row-index shrink-0" aria-hidden="true" />
					<span className="-my-1.5 flex flex-col overflow-hidden">
						{info.row.original.ticker ? (
							<>
								<BasicLink
									href={`/rwa/asset/${slug(info.row.original.ticker)}`}
									className="overflow-hidden text-sm font-medium text-ellipsis whitespace-nowrap text-(--link-text) hover:underline"
								>
									{info.row.original.assetName ?? info.row.original.ticker}
								</BasicLink>
								{info.row.original.assetName ? (
									<span className="text-[0.7rem] text-(--text-disabled)">{info.row.original.ticker}</span>
								) : null}
							</>
						) : (
							<>
								{info.row.original.assetName && (
									<span className="overflow-hidden text-sm font-medium text-ellipsis whitespace-nowrap">
										{info.row.original.assetName}
									</span>
								)}
							</>
						)}
					</span>
				</span>
			)
		},
		size: 240
	},
	{
		id: 'category',
		header: definitions.category.label,
		accessorFn: (asset) => asset.category,
		cell: (info) => {
			const value = info.getValue() as string[]
			const tooltipContent = value
				.map((category) => {
					const description = definitions.category.values?.[category]
					return `${category}:\n${description || '-'}`
				})
				.join('\n\n')
			if (tooltipContent) {
				return (
					<Tooltip
						content={tooltipContent}
						className="inline-block max-w-full justify-end overflow-hidden text-ellipsis whitespace-nowrap"
					>
						{value.join(', ')}
					</Tooltip>
				)
			}
			return (
				<span title={value.join(', ')} className="overflow-hidden text-ellipsis whitespace-nowrap">
					{value.join(', ')}
				</span>
			)
		},
		size: 168,
		enableSorting: false,
		meta: {
			align: 'end',
			headerHelperText: definitions.category.description
		}
	},
	{
		id: 'activeMcap.total',
		header: definitions.activeMcap.label,
		accessorFn: (asset) => asset.activeMcap?.total,
		cell: (info) => (
			<TVLBreakdownCell
				value={info.getValue() as number | null | undefined}
				breakdown={info.row.original.activeMcap?.breakdown}
				description={definitions.activeMcap.description}
			/>
		),
		meta: {
			headerHelperText: definitions.activeMcap.description,
			align: 'end'
		}
	},
	{
		id: 'onChainMcap.total',
		header: definitions.onChainMcap.label,
		accessorFn: (asset) => asset.onChainMcap?.total,
		cell: (info) => (
			<TVLBreakdownCell
				value={info.getValue() as number | null | undefined}
				breakdown={info.row.original.onChainMcap?.breakdown}
				description={definitions.onChainMcap.description}
			/>
		),
		size: 168,
		meta: {
			headerHelperText: definitions.onChainMcap.description,
			align: 'end'
		}
	},
	{
		id: 'defiActiveTvl.total',
		header: definitions.defiActiveTvl.label,
		accessorFn: (asset) => asset.defiActiveTvl?.total,
		cell: (info) => (
			<TVLBreakdownCell
				value={info.getValue() as number | null | undefined}
				breakdown={info.row.original.defiActiveTvl?.breakdown}
				description={definitions.defiActiveTvl.description}
			/>
		),
		meta: {
			headerHelperText: definitions.defiActiveTvl.description,
			align: 'end'
		}
	},
	{
		id: 'assetClass',
		header: definitions.assetClass.label,
		accessorFn: (asset) => asset.assetClass?.join(', ') ?? '',
		cell: (info) => {
			const assetClasses = info.row.original.assetClass
			if (!assetClasses || assetClasses.length === 0) return null
			// For single asset class with definition, show tooltip
			if (assetClasses.length === 1) {
				const ac = assetClasses[0]
				const description = definitions.assetClass.values?.[ac]
				if (description) {
					return (
						<Tooltip
							content={description}
							className="inline-block max-w-full justify-end overflow-hidden text-ellipsis whitespace-nowrap"
						>
							{ac}
						</Tooltip>
					)
				}
				return <span className="inline-block max-w-full overflow-hidden text-ellipsis whitespace-nowrap">{ac}</span>
			}
			// For multiple asset classes, show combined tooltip
			const tooltipContent = (
				<span className="flex flex-col gap-1">
					{assetClasses.map((ac) => {
						const description = definitions.assetClass.values?.[ac]
						return (
							<span key={ac}>
								<strong>{ac}</strong>: {description || 'No description'}
							</span>
						)
					})}
				</span>
			)
			return (
				<Tooltip
					content={tooltipContent}
					className="inline-block max-w-full justify-end overflow-hidden text-ellipsis whitespace-nowrap"
				>
					{assetClasses.join(', ')}
				</Tooltip>
			)
		},
		size: 168,
		enableSorting: false,
		meta: {
			align: 'end',
			headerHelperText: definitions.assetClass.description
		}
	},
	{
		id: 'accessModel',
		header: definitions.accessModel.label,
		accessorFn: (asset) => asset.accessModel,
		cell: (info) => {
			const value = info.getValue() as
				| 'Permissioned'
				| 'Permissionless'
				| 'Non-transferable'
				| 'Custodial Only'
				| 'Unknown'
			const valueDescription = definitions.accessModel.values?.[value]
			if (valueDescription) {
				return (
					<Tooltip
						content={valueDescription}
						className={clsx(
							'justify-end',
							value === 'Permissioned' && 'text-(--warning)',
							value === 'Permissionless' && 'text-(--success)',
							value === 'Non-transferable' && 'text-(--error)',
							value === 'Custodial Only' && 'text-(--error)'
						)}
					>
						{value}
					</Tooltip>
				)
			}
			return (
				<span
					className={clsx(
						'inline-block max-w-full overflow-hidden text-ellipsis whitespace-nowrap',
						value === 'Permissioned' && 'text-(--warning)',
						value === 'Permissionless' && 'text-(--success)',
						value === 'Non-transferable' && 'text-(--error)',
						value === 'Custodial Only' && 'text-(--error)'
					)}
				>
					{value}
				</span>
			)
		},
		size: 180,
		enableSorting: false,
		meta: {
			align: 'end',
			headerHelperText: definitions.accessModel.description
		}
	},
	{
		id: 'type',
		header: definitions.type.label,
		accessorFn: (asset) => asset.type,
		cell: (info) => {
			const value = info.getValue() as string
			const tooltipContent = definitions.type.values?.[value]
			if (tooltipContent) {
				return (
					<Tooltip
						content={tooltipContent}
						className="inline-block max-w-full justify-end overflow-hidden text-ellipsis whitespace-nowrap"
					>
						{value}
					</Tooltip>
				)
			}
			return <span className="inline-block max-w-full overflow-hidden text-ellipsis whitespace-nowrap">{value}</span>
		},
		size: 120,
		enableSorting: false,
		meta: {
			align: 'end',
			headerHelperText: definitions.type.description
		}
	},
	{
		id: 'rwaClassification',
		header: definitions.rwaClassification.label,
		accessorFn: (asset) => asset.rwaClassification,
		cell: (info) => {
			const value = info.getValue() as string
			const isTrueRWA = info.row.original.trueRWA
			// If trueRWA flag, show green color with True RWA definition but display "RWA"
			const tooltipContent = isTrueRWA
				? definitions.rwaClassification.values?.['True RWA']
				: definitions.rwaClassification.values?.[value]
			if (tooltipContent) {
				return (
					<Tooltip
						content={tooltipContent}
						className={`inline-block max-w-full justify-end overflow-hidden text-ellipsis whitespace-nowrap ${isTrueRWA ? 'text-(--success)' : ''}`}
					>
						{value}
					</Tooltip>
				)
			}
			return <span className="inline-block max-w-full overflow-hidden text-ellipsis whitespace-nowrap">{value}</span>
		},
		size: 180,
		enableSorting: false,
		meta: {
			align: 'end',
			headerHelperText: definitions.rwaClassification.description
		}
	},
	{
		id: 'tokenPrice',
		header: 'Token Price',
		accessorFn: (asset) => asset.price,
		cell: (info) => (info.getValue() != null ? <span>{formattedNum(info.getValue() as number, true)}</span> : null),
		size: 168,
		meta: {
			align: 'end'
		}
	},
	{
		id: 'issuer',
		header: definitions.issuer.label,
		accessorFn: (asset) => asset.issuer,
		cell: (info) => {
			const value = info.getValue() as string
			return (
				<span title={value} className="overflow-hidden text-ellipsis whitespace-nowrap">
					{value}
				</span>
			)
		},
		size: 120,
		enableSorting: false,
		meta: {
			align: 'end',
			headerHelperText: definitions.issuer.description
		}
	},
	{
		id: 'redeemable',
		header: definitions.redeemable.label,
		accessorFn: (asset) => asset.redeemable,
		cell: (info) => (
			<span className={info.getValue() ? 'text-(--success)' : 'text-(--error)'}>
				{info.getValue() != null ? (info.getValue() ? 'Yes' : 'No') : null}
			</span>
		),
		meta: {
			align: 'end',
			headerHelperText: definitions.redeemable.description
		},
		size: 120
	},
	{
		id: 'attestations',
		header: definitions.attestations.label,
		accessorFn: (asset) => asset.attestations,
		cell: (info) => (
			<span className={info.getValue() ? 'text-(--success)' : 'text-(--error)'}>
				{info.getValue() != null ? (info.getValue() ? 'Yes' : 'No') : null}
			</span>
		),
		meta: {
			align: 'end',
			headerHelperText: definitions.attestations.description
		},
		size: 120
	},
	{
		id: 'cex_listed',
		header: definitions.cexListed.label,
		accessorFn: (asset) => asset.cexListed,
		cell: (info) => (
			<span className={info.getValue() ? 'text-(--success)' : 'text-(--error)'}>
				{info.getValue() != null ? (info.getValue() ? 'Yes' : 'No') : null}
			</span>
		),
		meta: {
			align: 'end',
			headerHelperText: definitions.cexListed.description
		},
		size: 120
	},
	{
		id: 'kycForMintRedeem',
		header: definitions.kycForMintRedeem.label,
		accessorFn: (asset) => asset.kycForMintRedeem,
		cell: (info) => (
			<span className={info.getValue() ? 'text-(--warning)' : 'text-(--success)'}>
				{info.getValue() != null ? (info.getValue() ? 'Yes' : 'No') : null}
			</span>
		),
		meta: {
			align: 'end',
			headerHelperText: definitions.kycForMintRedeem.description
		},
		size: 188
	},
	{
		id: 'kycAllowlistedWhitelistedToTransferHold',
		header: definitions.kycAllowlistedWhitelistedToTransferHold.label,
		accessorFn: (asset) => asset.kycAllowlistedWhitelistedToTransferHold,
		cell: (info) => (
			<span className={info.getValue() ? 'text-(--warning)' : 'text-(--success)'}>
				{info.getValue() != null ? (info.getValue() ? 'Yes' : 'No') : null}
			</span>
		),
		meta: {
			align: 'end',
			headerHelperText: definitions.kycAllowlistedWhitelistedToTransferHold.description
		},
		size: 332
	},
	{
		id: 'transferable',
		header: definitions.transferable.label,
		accessorFn: (asset) => asset.transferable,
		cell: (info) => (
			<span className={info.getValue() ? 'text-(--success)' : 'text-(--error)'}>
				{info.getValue() != null ? (info.getValue() ? 'Yes' : 'No') : null}
			</span>
		),
		meta: {
			align: 'end',
			headerHelperText: definitions.transferable.description
		},
		size: 120
	},
	{
		id: 'self_custody',
		header: definitions.selfCustody.label,
		accessorFn: (asset) => asset.selfCustody,
		cell: (info) => (
			<span className={info.getValue() ? 'text-(--success)' : 'text-(--error)'}>
				{info.getValue() != null ? (info.getValue() ? 'Yes' : 'No') : null}
			</span>
		),
		meta: {
			align: 'end',
			headerHelperText: definitions.selfCustody.description
		},
		size: 120
	}
]

const TVLBreakdownCell = ({
	value,
	breakdown,
	description
}: {
	value: number | null | undefined
	breakdown: Array<[string, number]> | null | undefined
	description: string
}) => {
	if (value == null) {
		return null
	}

	if (!breakdown || breakdown.length === 0) {
		return formattedNum(value, true)
	}

	return (
		<Tooltip
			content={<BreakdownTooltipContent breakdown={breakdown} description={description} />}
			className="justify-end underline decoration-dotted"
		>
			{formattedNum(value, true)}
		</Tooltip>
	)
}

const columnSizes: ColumnSizesByBreakpoint = {
	0: { name: 180 },
	640: { name: 240 }
}
