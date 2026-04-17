import {
	type ColumnFiltersState,
	type ColumnOrderState,
	type ColumnSizingState,
	createColumnHelper,
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
import { formatNum, formattedNum } from '~/utils'
import type { IRWAAssetsOverview } from './api.types'
import { normalizeRwaAssetGroup } from './assetGroup'
import { BreakdownTooltipContent } from './BreakdownTooltipContent'
import { definitions } from './definitions'
import { getRwaPlatforms, UNKNOWN_PLATFORM } from './grouping'
import { rwaSlug } from './rwaSlug'

export function RWAAssetsTable({
	assets,
	selectedChain,
	includeRwaPerps
}: {
	assets: IRWAAssetsOverview['assets']
	selectedChain: string
	includeRwaPerps: boolean
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
			keys: ['assetName', 'ticker', 'parentPlatform'],
			threshold: matchSorter.rankings.CONTAINS
		})
	}, [assets, deferredSearchValue])

	const columns = useMemo(() => createColumns(includeRwaPerps), [includeRwaPerps])

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
				return {
					name: headerName,
					key: c.id ?? (c.accessorKey as string),
					help: c.meta?.headerHelperText as string | undefined
				}
			}),
		[columns]
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

type AssetRow = IRWAAssetsOverview['assets'][0]
const columnHelper = createColumnHelper<AssetRow>()
const PLATFORM_COLUMN_HELP = 'Platform associated with issuance, custody, trading, or management of the asset.'

function assertNever(value: never): never {
	throw new Error(`Unexpected value: ${String(value)}`)
}

const formatAssetPlatforms = (asset: AssetRow) => getRwaPlatforms(asset.parentPlatform).join(', ')

const MIXED_ACTIVE_HEADER = 'Active Mcap or OI'
const MIXED_ACTIVE_HELP = `${definitions.activeMcap.description} For perps rows, this column shows open interest.`

export function getMetricColumnHeaders(includeRwaPerps: boolean) {
	return {
		active: includeRwaPerps ? MIXED_ACTIVE_HEADER : definitions.activeMcap.label,
		onChain: definitions.onChainMcap.label,
		defi: definitions.defiActiveTvl.label
	}
}

export function getActiveMetricValue(asset: AssetRow): number | null {
	switch (asset.kind) {
		case 'spot':
			return asset.activeMcap?.total ?? null
		case 'perps':
			return asset.openInterest
		default:
			return assertNever(asset)
	}
}

export function getOnChainMetricValue(asset: AssetRow): number | null {
	switch (asset.kind) {
		case 'spot':
			return asset.onChainMcap?.total ?? null
		case 'perps':
			return null
		default:
			return assertNever(asset)
	}
}

export function getDefiMetricValue(asset: AssetRow): number | null {
	switch (asset.kind) {
		case 'spot':
			return asset.defiActiveTvl?.total ?? null
		case 'perps':
			return null
		default:
			return assertNever(asset)
	}
}

function MixedMetricCell({
	asset,
	value,
	breakdown,
	description
}: {
	asset: AssetRow
	value: number | null | undefined
	breakdown: Array<[string, number]> | null | undefined
	description: string
}) {
	if (asset.kind === 'spot') {
		return <TVLBreakdownCell value={value} breakdown={breakdown} description={description} />
	}

	return value != null ? <span>{formattedNum(value, true)}</span> : null
}

function createColumns(includeRwaPerps: boolean) {
	const metricHeaders = getMetricColumnHeaders(includeRwaPerps)

	return [
		columnHelper.accessor((asset) => asset.assetName ?? asset.ticker, {
			id: 'name',
			header: 'Name',
			enableSorting: false,
			cell: (info) => {
				return (
					<span className="flex items-center gap-2">
						<span className="vf-row-index shrink-0" aria-hidden="true" />
						<span className="-my-1.5 flex flex-col overflow-hidden">
							{info.row.original.detailHref ? (
								<>
									<BasicLink
										href={info.row.original.detailHref}
										className="overflow-hidden text-sm font-medium text-ellipsis whitespace-nowrap text-(--link-text) hover:underline"
									>
										{info.row.original.assetName}
									</BasicLink>
									<span className="text-[0.7rem] text-(--text-disabled)">
										{getAssetSecondaryLabel(info.row.original)}
									</span>
								</>
							) : (
								<>
									<span className="overflow-hidden text-sm font-medium text-ellipsis whitespace-nowrap">
										{info.row.original.assetName}
									</span>
								</>
							)}
						</span>
					</span>
				)
			},
			size: 240
		}),
		columnHelper.accessor((asset) => asset.price ?? undefined, {
			id: 'price',
			header: 'Token Price',
			cell: (info) => (info.getValue() != null ? <span>{formattedNum(info.getValue(), true)}</span> : null),
			size: 120,
			meta: {
				align: 'end'
			}
		}),
		columnHelper.accessor((asset) => normalizeRwaAssetGroup(asset.assetGroup), {
			id: 'assetGroup',
			header: 'Asset Group',
			cell: (info) => {
				const value = info.getValue()
				return <span className="overflow-hidden text-ellipsis whitespace-nowrap">{value}</span>
			},
			size: 168,
			enableSorting: false,
			meta: {
				align: 'end'
			}
		}),
		columnHelper.accessor((asset) => getActiveMetricValue(asset) ?? undefined, {
			id: 'activeMcap.total',
			header: metricHeaders.active,
			cell: (info) => (
				<MixedMetricCell
					asset={info.row.original}
					value={info.getValue()}
					breakdown={info.row.original.activeMcap?.breakdown}
					description={definitions.activeMcap.description}
				/>
			),
			meta: {
				headerHelperText: includeRwaPerps ? MIXED_ACTIVE_HELP : definitions.activeMcap.description,
				align: 'end'
			},
			size: 168
		}),
		columnHelper.accessor((asset) => getOnChainMetricValue(asset) ?? undefined, {
			id: 'onChainMcap.total',
			header: metricHeaders.onChain,
			cell: (info) => (
				<MixedMetricCell
					asset={info.row.original}
					value={info.getValue()}
					breakdown={info.row.original.onChainMcap?.breakdown}
					description={definitions.onChainMcap.description}
				/>
			),
			size: 168,
			meta: {
				headerHelperText: definitions.onChainMcap.description,
				align: 'end'
			}
		}),
		columnHelper.accessor((asset) => getDefiMetricValue(asset) ?? undefined, {
			id: 'defiActiveTvl.total',
			header: metricHeaders.defi,
			cell: (info) => (
				<MixedMetricCell
					asset={info.row.original}
					value={info.getValue()}
					breakdown={info.row.original.defiActiveTvl?.breakdown}
					description={definitions.defiActiveTvl.description}
				/>
			),
			meta: {
				headerHelperText: definitions.defiActiveTvl.description,
				align: 'end'
			},
			size: 168
		}),
		columnHelper.accessor(
			(asset) =>
				Number.isNaN(Number(asset.defiActiveTvl?.total)) ||
				Number.isNaN(Number(asset.activeMcap?.total)) ||
				Number(asset.activeMcap?.total) === 0
					? undefined
					: (Number(asset.defiActiveTvl.total) / Number(asset.activeMcap.total)) * 100,
			{
				header: 'DeFi Utilization',
				cell: (info) => (info.getValue() != null ? `${formatNum(info.getValue(), 2)}%` : null),
				id: 'utilization',
				size: 120,
				meta: { align: 'end', headerHelperText: 'DeFi Active TVL / Active Mcap' }
			}
		),
		columnHelper.accessor((asset) => formatAssetPlatforms(asset), {
			id: 'platform',
			header: 'Platform',
			cell: (info) => {
				const platforms = getRwaPlatforms(info.row.original.parentPlatform)
				const value = platforms.join(', ')

				if (platforms.length === 1 && platforms[0] !== UNKNOWN_PLATFORM) {
					return (
						<BasicLink
							href={`/rwa/platform/${rwaSlug(platforms[0])}`}
							className="overflow-hidden text-ellipsis whitespace-nowrap text-(--link-text) hover:underline"
						>
							{value}
						</BasicLink>
					)
				}

				return (
					<Tooltip
						content={value}
						className="inline-block max-w-full justify-end overflow-hidden text-ellipsis whitespace-nowrap"
					>
						{value}
					</Tooltip>
				)
			},
			size: 168,
			enableSorting: false,
			meta: {
				align: 'end',
				headerHelperText: PLATFORM_COLUMN_HELP
			}
		}),
		columnHelper.accessor((asset) => getAssetCategoryLabels(asset).join(', ') || undefined, {
			id: 'category',
			header: definitions.category.label,
			cell: (info) => {
				const value = getAssetCategoryLabels(info.row.original)
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
		}),
		columnHelper.accessor((asset) => asset.assetClass?.join(', ') ?? '', {
			id: 'assetClass',
			header: definitions.assetClass.label,
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
		}),
		columnHelper.accessor((asset) => asset.accessModel ?? undefined, {
			id: 'accessModel',
			header: definitions.accessModel.label,
			cell: (info) => {
				const value = info.getValue()
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
		}),
		columnHelper.accessor((asset) => asset.type ?? undefined, {
			id: 'type',
			header: definitions.type.label,
			cell: (info) => {
				const value = info.getValue()
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
		}),
		columnHelper.accessor((asset) => asset.rwaClassification ?? undefined, {
			id: 'rwaClassification',
			header: definitions.rwaClassification.label,
			cell: (info) => {
				const value = info.getValue()
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
		}),
		columnHelper.accessor((asset) => asset.issuer ?? undefined, {
			id: 'issuer',
			header: definitions.issuer.label,
			cell: (info) => {
				const value = info.getValue()
				return (
					<span title={value} className="overflow-hidden text-ellipsis whitespace-nowrap">
						{value}
					</span>
				)
			},
			size: 168,
			enableSorting: false,
			meta: {
				align: 'end',
				headerHelperText: definitions.issuer.description
			}
		}),
		columnHelper.accessor((asset) => asset.redeemable ?? undefined, {
			id: 'redeemable',
			header: definitions.redeemable.label,
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
		}),
		columnHelper.accessor((asset) => asset.attestations ?? undefined, {
			id: 'attestations',
			header: definitions.attestations.label,
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
		}),
		columnHelper.accessor((asset) => asset.cexListed ?? undefined, {
			id: 'cexListed',
			header: definitions.cexListed.label,
			cell: (info) => (
				<span className={info.getValue() ? 'text-(--success)' : 'text-(--error)'}>
					{info.getValue() ? (info.getValue() ? 'Yes' : 'No') : null}
				</span>
			),
			meta: {
				align: 'end',
				headerHelperText: definitions.cexListed.description
			},
			size: 120
		}),
		columnHelper.accessor((asset) => asset.kycForMintRedeem ?? undefined, {
			id: 'kycForMintRedeem',
			header: definitions.kycForMintRedeem.label,
			cell: (info) => (
				<span className={info.getValue() ? 'text-(--warning)' : 'text-(--success)'}>
					{info.getValue() ? (info.getValue() ? 'Yes' : 'No') : null}
				</span>
			),
			meta: {
				align: 'end',
				headerHelperText: definitions.kycForMintRedeem.description
			},
			size: 188
		}),
		columnHelper.accessor((asset) => asset.kycAllowlistedWhitelistedToTransferHold ?? undefined, {
			id: 'kycAllowlistedWhitelistedToTransferHold',
			header: definitions.kycAllowlistedWhitelistedToTransferHold.label,
			cell: (info) => (
				<span className={info.getValue() ? 'text-(--warning)' : 'text-(--success)'}>
					{info.getValue() ? (info.getValue() ? 'Yes' : 'No') : null}
				</span>
			),
			meta: {
				align: 'end',
				headerHelperText: definitions.kycAllowlistedWhitelistedToTransferHold.description
			},
			size: 332
		}),
		columnHelper.accessor((asset) => asset.transferable ?? undefined, {
			id: 'transferable',
			header: definitions.transferable.label,
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
		}),
		columnHelper.accessor((asset) => asset.selfCustody ?? undefined, {
			id: 'selfCustody',
			header: definitions.selfCustody.label,
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
		})
	]
}

function getAssetSecondaryLabel(asset: AssetRow): string {
	switch (asset.kind) {
		case 'spot':
			return asset.ticker
		case 'perps':
			return asset.contract
		default:
			return assertNever(asset)
	}
}

function getAssetCategoryLabels(asset: AssetRow): string[] {
	if (asset.category && asset.category.length > 0) {
		return asset.category
	}

	if (asset.kind === 'perps') {
		return ['RWA Perp']
	}

	return []
}

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
