import { lazy, Suspense, useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react'
import { NextRouter, useRouter } from 'next/router'
import {
	ColumnDef,
	ColumnFiltersState,
	ColumnOrderState,
	ColumnSizingState,
	ExpandedState,
	getCoreRowModel,
	getExpandedRowModel,
	getFilteredRowModel,
	getSortedRowModel,
	SortingState,
	useReactTable
} from '@tanstack/react-table'
import { matchSorter } from 'match-sorter'
import { CSVDownloadButton } from '~/components/ButtonStyled/CsvButton'
import type { IPieChartProps } from '~/components/ECharts/types'
import { Icon } from '~/components/Icon'
import { RowLinksWithDropdown } from '~/components/RowLinksWithDropdown'
import { SelectWithCombobox } from '~/components/SelectWithCombobox'
import { VirtualTable } from '~/components/Table/Table'
import { alphanumericFalsyLast } from '~/components/Table/utils'
import { Tooltip } from '~/components/Tooltip'
import useWindowSize from '~/hooks/useWindowSize'
import { formattedNum } from '~/utils'
import { IRWAAssetsOverview } from './queries'

const PieChart = lazy(() => import('~/components/ECharts/PieChart')) as React.FC<IPieChartProps>

export const RWAOverview = (props: IRWAAssetsOverview) => {
	const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
	const [sorting, setSorting] = useState<SortingState>([{ id: 'onChainMarketcap.total', desc: true }])
	const [expanded, setExpanded] = useState<ExpandedState>({})
	const [columnSizing, setColumnSizing] = useState<ColumnSizingState>({})
	const [columnOrder, setColumnOrder] = useState<ColumnOrderState>([])

	const {
		selectedCategories,
		selectedAssetClasses,
		selectedIssuers,
		includeStablecoins,
		setSelectedCategories,
		setSelectedAssetClasses,
		setSelectedIssuers,
		setIncludeStablecoins,
		selectOnlyOneCategory,
		toggleAllCategories,
		clearAllCategories,
		selectOnlyOneAssetClass,
		toggleAllAssetClasses,
		clearAllAssetClasses,
		selectOnlyOneIssuer,
		toggleAllIssuers,
		clearAllIssuers
	} = useRWATableQueryParams({
		categories: props.categories,
		assetClasses: props.assetClasses,
		issuers: props.issuers
	})

	const [searchValue, setSearchValue] = useState('')
	const deferredSearchValue = useDeferredValue(searchValue)

	// Non-RWA Stablecoins
	// Crypto-collateralized stablecoin (non-RWA)
	const filteredAssets = useMemo(() => {
		return props.assets.filter((asset) => {
			if (!includeStablecoins && asset.stablecoin) {
				return false
			}
			return (
				asset.category?.some((category) => selectedCategories.includes(category)) &&
				asset.assetClass?.some((assetClass) => selectedAssetClasses.includes(assetClass)) &&
				selectedIssuers.includes(asset.issuer)
			)
		})
	}, [props.assets, selectedCategories, selectedAssetClasses, selectedIssuers, includeStablecoins])

	const assetsData = useMemo(() => {
		if (!deferredSearchValue) return filteredAssets

		return matchSorter(filteredAssets, deferredSearchValue, {
			keys: ['name', 'ticker'],
			threshold: matchSorter.rankings.CONTAINS
		})
	}, [filteredAssets, deferredSearchValue])

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
		sortingFns: {
			alphanumericFalsyLast: (rowA, rowB, columnId) => alphanumericFalsyLast(rowA, rowB, columnId, sorting)
		},
		filterFromLeafRows: true,
		onExpandedChange: setExpanded,
		getSubRows: (row: any) => row.subRows,
		onSortingChange: setSorting,
		onColumnFiltersChange: setColumnFilters,
		onColumnSizingChange: setColumnSizing,
		onColumnOrderChange: setColumnOrder,
		getFilteredRowModel: getFilteredRowModel(),
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getExpandedRowModel: getExpandedRowModel()
	})

	const windowSize = useWindowSize()

	useEffect(() => {
		const colSize = windowSize.width ? columnSizes.find((size) => windowSize.width > +size[0]) : columnSizes[0]
		const colOrder = windowSize.width ? columnOrders.find((size) => windowSize.width > +size[0]) : columnOrders[0]
		if (colSize) {
			instance.setColumnSizing(colSize[1])
		}
		if (colOrder) {
			instance.setColumnOrder(colOrder[1])
		}
	}, [instance, windowSize])

	const prepareCsv = useCallback(() => {
		const tableRows = instance.getSortedRowModel().rows
		const headers: Array<string | number | boolean> = [
			'Name',
			'Ticker',
			'Type',
			'Category',
			'Asset Class',
			'On-chain Marketcap',
			'DeFi Active TVL',
			'RWA Classification',
			'Issuer',
			'Primary Chain',
			'Chains',
			'Redeemable',
			'Attestations',
			'CEX Listed',
			'KYC',
			'Transferable',
			'Self Custody'
		]

		const csvData: Array<Array<string | number | boolean>> = tableRows.map((row) => {
			const asset = row.original
			return [
				asset.name ?? '',
				asset.ticker ?? '',
				asset.type ?? '',
				asset.category?.join(', ') ?? '',
				asset.assetClass?.join(', ') ?? '',
				asset.onChainMarketcap.total,
				asset.defiActiveTvl.total,
				asset.rwaClassification ?? '',
				asset.issuer ?? '',
				asset.primaryChain ?? '',
				asset.chain?.join(', ') ?? '',
				asset.redeemable != null ? (asset.redeemable ? 'Yes' : 'No') : '',
				asset.attestations != null ? (asset.attestations ? 'Yes' : 'No') : '',
				asset.cexListed != null ? (asset.cexListed ? 'Yes' : 'No') : '',
				asset.kyc != null ? (typeof asset.kyc === 'boolean' ? (asset.kyc ? 'Yes' : 'No') : asset.kyc.join(', ')) : '',
				asset.transferable != null ? (asset.transferable ? 'Yes' : 'No') : '',
				asset.selfCustody != null ? (asset.selfCustody ? 'Yes' : 'No') : ''
			]
		})

		return {
			filename: `rwa-assets${props.selectedChain !== 'All' ? `-${props.selectedChain.toLowerCase()}` : ''}.csv`,
			rows: [headers, ...csvData]
		}
	}, [instance, props.selectedChain])

	return (
		<>
			<RowLinksWithDropdown links={props.chains} activeLink={props.selectedChain} />
			<div className="flex items-center gap-2">
				<p className="flex flex-1 flex-col gap-1 rounded-md border border-(--cards-border) bg-(--cards-bg) p-4">
					<Tooltip
						content="Sum of value of all real world assets on chain"
						className="text-(--text-label) underline decoration-dotted"
					>
						Total RWA On-chain
					</Tooltip>
					<span className="font-jetbrains text-2xl font-medium">{formattedNum(props.totalOnChainRwaValue, true)}</span>
				</p>
				<p className="flex flex-1 flex-col gap-1 rounded-md border border-(--cards-border) bg-(--cards-bg) p-4">
					<Tooltip
						content="Total number of issuers of real world assets on chain"
						className="text-(--text-label) underline decoration-dotted"
					>
						Total Asset Issuers
					</Tooltip>
					<span className="font-jetbrains text-2xl font-medium">{formattedNum(props.issuers.length, false)}</span>
				</p>
				<p className="flex flex-1 flex-col gap-1 rounded-md border border-(--cards-border) bg-(--cards-bg) p-4">
					<Tooltip
						content="Sum of value of all stablecoins on chain"
						className="text-(--text-label) underline decoration-dotted"
					>
						Total Stablecoins Value
					</Tooltip>
					<span className="font-jetbrains text-2xl font-medium">
						{formattedNum(props.totalOnChainStablecoinValue, true)}
					</span>
				</p>
				<p className="flex flex-1 flex-col gap-1 rounded-md border border-(--cards-border) bg-(--cards-bg) p-4">
					<Tooltip
						content="Sum of value of all real world assets on chain that are deployed into third-party DeFi protocols tracked by DeFiLlama"
						className="text-(--text-label) underline decoration-dotted"
					>
						DeFi Active TVL
					</Tooltip>
					<span className="font-jetbrains text-2xl font-medium">
						{formattedNum(props.totalOnChainDeFiActiveTvl, true)}
					</span>
				</p>
			</div>
			<div className="relative isolate flex min-h-[360px] flex-col rounded-md border border-(--cards-border) bg-(--cards-bg) pt-2">
				<h2 className="px-3 text-lg font-semibold">Total RWA Value - Repartition</h2>
				<Suspense fallback={<div className="h-[360px]" />}>
					<PieChart
						showLegend
						chartData={props.categoryValues}
						radius={pieChartRadius}
						legendPosition={pieChartLegendPosition}
						legendTextStyle={pieChartLegendTextStyle}
					/>
				</Suspense>
			</div>
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
							value={searchValue}
							onChange={(e) => {
								setSearchValue(e.target.value)
							}}
							placeholder="Search assets..."
							className="w-full rounded-md border border-(--form-control-border) bg-white p-1 pl-7 text-black max-sm:py-0.5 dark:bg-black dark:text-white"
						/>
					</label>
					<SelectWithCombobox
						allValues={props.categories}
						selectedValues={selectedCategories}
						setSelectedValues={setSelectedCategories}
						selectOnlyOne={selectOnlyOneCategory}
						toggleAll={toggleAllCategories}
						clearAll={clearAllCategories}
						label={'Categories'}
						labelType="smol"
						triggerProps={{
							className:
								'flex items-center justify-between gap-2 py-1.5 px-2 text-xs rounded-md cursor-pointer flex-nowrap relative border border-(--form-control-border) text-(--text-form) hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) font-medium'
						}}
					/>
					<SelectWithCombobox
						allValues={props.assetClasses}
						selectedValues={selectedAssetClasses}
						setSelectedValues={setSelectedAssetClasses}
						selectOnlyOne={selectOnlyOneAssetClass}
						toggleAll={toggleAllAssetClasses}
						clearAll={clearAllAssetClasses}
						label={'Asset Classes'}
						labelType="smol"
						triggerProps={{
							className:
								'flex items-center justify-between gap-2 py-1.5 px-2 text-xs rounded-md cursor-pointer flex-nowrap relative border border-(--form-control-border) text-(--text-form) hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) font-medium'
						}}
					/>
					<SelectWithCombobox
						allValues={props.issuers}
						selectedValues={selectedIssuers}
						setSelectedValues={setSelectedIssuers}
						selectOnlyOne={selectOnlyOneIssuer}
						toggleAll={toggleAllIssuers}
						clearAll={clearAllIssuers}
						label={'Issuers'}
						labelType="smol"
						triggerProps={{
							className:
								'flex items-center justify-between gap-2 py-1.5 px-2 text-xs rounded-md cursor-pointer flex-nowrap relative border border-(--form-control-border) text-(--text-form) hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) font-medium'
						}}
					/>
					<label className="flex items-center gap-2">
						<input
							type="checkbox"
							checked={includeStablecoins}
							onChange={(e) => setIncludeStablecoins(e.target.checked)}
						/>
						<span>Include Stablecoins</span>
					</label>
					<CSVDownloadButton prepareCsv={prepareCsv} />
				</div>
				<VirtualTable instance={instance} />
			</div>
		</>
	)
}

const columns: ColumnDef<IRWAAssetsOverview['assets'][0]>[] = [
	{
		id: 'name',
		header: 'Name',
		accessorFn: (asset) => asset.name,
		enableSorting: false,
		cell: (info) => {
			const index =
				info.row.depth === 0
					? info.table.getSortedRowModel().rows.findIndex((x) => x.id === info.row.id)
					: info.row.index

			return (
				<span className="flex items-center gap-2">
					<span className="shrink-0">{index + 1}</span>
					<span className="-my-1.5 flex flex-col overflow-hidden">
						{info.row.original.name && (
							<span className="overflow-hidden text-sm font-medium text-ellipsis whitespace-nowrap text-(--link-text) hover:underline">
								{info.row.original.name}
							</span>
						)}
						{info.row.original.ticker && (
							<span className="text-[0.7rem] text-(--text-disabled)">{info.row.original.ticker}</span>
						)}
					</span>
				</span>
			)
		},
		size: 240
	},
	{
		id: 'type',
		header: 'Type',
		accessorFn: (asset) => asset.type,
		cell: (info) => {
			const value = info.getValue() as string
			return <span>{value}</span>
		},
		size: 120,
		meta: {
			align: 'end'
		}
	},
	{
		id: 'category',
		header: 'Category',
		accessorFn: (asset) => asset.category?.join(', ') ?? '',
		cell: (info) => {
			const value = info.getValue() as string
			return (
				<span title={value} className="overflow-hidden text-ellipsis whitespace-nowrap">
					{value}
				</span>
			)
		},
		size: 168,
		meta: {
			align: 'end'
		}
	},
	{
		id: 'assetClass',
		header: 'Asset Class',
		accessorFn: (asset) => asset.assetClass?.join(', ') ?? '',
		cell: (info) => {
			const value = info.getValue() as string
			return (
				<span title={value} className="overflow-hidden text-ellipsis whitespace-nowrap">
					{value}
				</span>
			)
		},
		size: 168,
		meta: {
			align: 'end'
		}
	},
	{
		id: 'onChainMarketcap.total',
		header: 'On-chain Marketcap',
		accessorFn: (asset) => asset.onChainMarketcap.total,
		cell: (info) => (
			<TVLBreakdownCell value={info.getValue() as number} breakdown={info.row.original.onChainMarketcap.breakdown} />
		),
		size: 168,
		meta: {
			headerHelperText: `The value that is visibly on public blockchains at the issuer’s official contracts and addresses, and can be reconstructed directly from on-chain data.`,
			align: 'end'
		}
	},
	{
		id: 'activeMarketcap.total',
		header: 'Active Marketcap',
		cell: (info) => null,
		meta: {
			headerHelperText: `The subset of On-chain Marketcap that is actually in circulation and taking real market risk in the hands of end users and protocols.\n\nThis is the “live” part of TVL, not just administrative balances. This is the biggest differentiator for distinguishing programmable finance from “real RWAs” even if they are KYC/whitelisted/allowlisted/permissioned tokens; just because they have to adhere to regulatory compliance law does not mean they have to simply sit idly on-chain.\n\nThere is no fixed time window; it’s about how the asset is used, not just when it moved as that would invalidate holding investments.`,
			align: 'end'
		}
	},
	{
		id: 'defiActiveTvl.total',
		header: 'DeFi Active TVL',
		accessorFn: (asset) => asset.defiActiveTvl.total,
		cell: (info) => (
			<TVLBreakdownCell value={info.getValue() as number} breakdown={info.row.original.defiActiveTvl.breakdown} />
		),
		meta: {
			headerHelperText: `The subset of Active Marketcap that is deployed into third-party DeFi protocols tracked by DeFiLlama.\n\nThis captures how much of an RWA token is actually being used in the wider on-chain economy—such as lending, liquidity provision, structured products, or other protocol integrations—outside its own issuer ecosystem.`,
			align: 'end'
		}
	},
	{
		id: 'rwaClassification',
		header: 'RWA Classification',
		accessorFn: (asset) => asset.rwaClassification,
		cell: (info) => {
			const value = info.getValue() as string
			return (
				<span title={value} className="overflow-hidden text-ellipsis whitespace-nowrap">
					{value}
				</span>
			)
		},
		size: 180,
		meta: {
			align: 'end'
		}
	},
	{
		id: 'issuer',
		header: 'Issuer',
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
		meta: {
			align: 'end'
		}
	},
	{
		id: 'redeemable',
		header: 'Redeemable',
		accessorFn: (asset) => asset.redeemable,
		cell: (info) => (
			<span className={info.getValue() ? 'text-(--success)' : 'text-(--error)'}>
				{info.getValue() != null ? (info.getValue() ? 'Yes' : 'No') : null}
			</span>
		),
		sortUndefined: 'last',
		meta: {
			align: 'end',
			headerHelperText: 'Whether the asset can be redeemed for the underlying'
		},
		size: 120
	},
	{
		id: 'attestations',
		header: 'Attestations',
		accessorFn: (asset) => asset.attestations,
		cell: (info) => (
			<span className={info.getValue() ? 'text-(--success)' : 'text-(--error)'}>
				{info.getValue() != null ? (info.getValue() ? 'Yes' : 'No') : null}
			</span>
		),
		sortUndefined: 'last',
		meta: {
			align: 'end',
			headerHelperText: 'Whether the platform publishes holdings reports'
		},
		size: 120
	},
	{
		id: 'cex_listed',
		header: 'CEX Listed',
		accessorFn: (asset) => asset.cexListed,
		cell: (info) => (
			<span className={info.getValue() ? 'text-(--success)' : 'text-(--error)'}>
				{info.getValue() != null ? (info.getValue() ? 'Yes' : 'No') : null}
			</span>
		),
		sortUndefined: 'last',
		meta: {
			align: 'end',
			headerHelperText: 'Whether the asset is listed on a CEX'
		},
		size: 120
	},
	{
		id: 'kyc',
		header: 'KYC',
		accessorFn: (asset) => asset.kyc,
		cell: (info) => (
			<span className={info.getValue() ? 'text-(--error)' : 'text-(--success)'}>
				{info.getValue() != null ? (info.getValue() ? 'Yes' : 'No') : null}
			</span>
		),
		sortUndefined: 'last',
		meta: {
			align: 'end',
			headerHelperText: 'Whether the asset requires KYC to mint and redeem'
		},
		size: 80
	},
	{
		id: 'transferable',
		header: 'Transferable',
		accessorFn: (asset) => asset.transferable,
		cell: (info) => (
			<span className={info.getValue() ? 'text-(--success)' : 'text-(--error)'}>
				{info.getValue() != null ? (info.getValue() ? 'Yes' : 'No') : null}
			</span>
		),
		sortUndefined: 'last',
		meta: {
			align: 'end',
			headerHelperText: 'Whether the asset can be transferred freely to third parties'
		},
		size: 120
	},
	{
		id: 'self_custody',
		header: 'Self Custody',
		accessorFn: (asset) => asset.selfCustody,
		cell: (info) => (
			<span className={info.getValue() ? 'text-(--success)' : 'text-(--error)'}>
				{info.getValue() != null ? (info.getValue() ? 'Yes' : 'No') : null}
			</span>
		),
		sortUndefined: 'last',
		meta: {
			align: 'end',
			headerHelperText: 'Whether the asset can be self-custodied'
		},
		size: 120
	}
]

const TVLBreakdownCell = ({
	value,
	breakdown
}: {
	value: number | null
	breakdown: Array<[string, number]> | null
}) => {
	if (value == null) {
		return null
	}

	if (!breakdown || breakdown.length === 0) {
		return formattedNum(value, true)
	}

	const Breakdown = () => (
		<span className="flex flex-col gap-1">
			{breakdown.map(([chain, tvl]) => (
				<span key={`${chain}-${tvl}`}>
					{chain}: {formattedNum(tvl, true)}
				</span>
			))}
		</span>
	)

	return (
		<Tooltip content={<Breakdown />} className="justify-end underline decoration-dotted">
			{formattedNum(value, true)}
		</Tooltip>
	)
}

const columnSizes = Object.entries({
	0: { name: 180 },
	640: { name: 240 }
}).sort((a, b) => Number(b[0]) - Number(a[0]))

const columnOrders = Object.entries({
	0: [
		'name',
		'onChainMarketcap.total',
		'category',
		'assetClass',
		'activeMarketcap.total',
		'defiActiveTvl.total',
		'type',
		'rwaClassification',
		'issuer',
		'redeemable',
		'attestations',
		'cex_listed',
		'kyc',
		'transferable',
		'self_custody'
	],
	640: [
		'name',
		'type',
		'category',
		'assetClass',
		'onChainMarketcap.total',
		'activeMarketcap.total',
		'defiActiveTvl.total',
		'rwaClassification',
		'issuer',
		'redeemable',
		'attestations',
		'cex_listed',
		'kyc',
		'transferable',
		'self_custody'
	]
}).sort((a, b) => Number(b[0]) - Number(a[0]))

const toArrayParam = (p: string | string[] | undefined): string[] => {
	if (!p) return []
	return Array.isArray(p) ? p.filter(Boolean) : [p].filter(Boolean)
}

const updateArrayQuery = (key: string, values: string[] | 'None', router: NextRouter) => {
	const nextQuery: Record<string, any> = { ...router.query }
	if (values === 'None') {
		nextQuery[key] = 'None'
	} else if (values.length > 0) {
		nextQuery[key] = values
	} else {
		delete nextQuery[key]
	}
	router.push({ pathname: router.pathname, query: nextQuery }, undefined, { shallow: true })
}

const useRWATableQueryParams = ({
	categories,
	assetClasses,
	issuers
}: {
	categories: string[]
	assetClasses: string[]
	issuers: string[]
}) => {
	const router = useRouter()

	const { selectedCategories, selectedAssetClasses, selectedIssuers, includeStablecoins } = useMemo(() => {
		const {
			categories: categoriesQ,
			assetClasses: assetClassesQ,
			issuers: issuersQ,
			includeStablecoins: stablecoinsQ
		} = router.query

		// If query param is 'None', return empty array. If no param, return all (default). Otherwise parse the array.
		const parseArrayParam = (param: string | string[] | undefined, allValues: string[]): string[] => {
			if (param === 'None') return []
			if (!param) return allValues
			const arr = toArrayParam(param)
			const validSet = new Set(allValues)
			return arr.filter((v) => validSet.has(v))
		}

		const selectedCategories = parseArrayParam(categoriesQ, categories)
		const selectedAssetClasses = parseArrayParam(assetClassesQ, assetClasses)
		const selectedIssuers = parseArrayParam(issuersQ, issuers)

		// includeStablecoins is true by default, unless explicitly set to 'false'
		const includeStablecoins = stablecoinsQ !== 'false'

		return { selectedCategories, selectedAssetClasses, selectedIssuers, includeStablecoins }
	}, [router.query, categories, assetClasses, issuers])

	const setSelectedCategories = useCallback(
		(values: string[]) => updateArrayQuery('categories', values, router),
		[router]
	)
	const selectOnlyOneCategory = useCallback(
		(category: string) => updateArrayQuery('categories', [category], router),
		[router]
	)
	const toggleAllCategories = useCallback(() => {
		const nextQuery: Record<string, any> = { ...router.query }
		delete nextQuery.categories
		router.push({ pathname: router.pathname, query: nextQuery }, undefined, { shallow: true })
	}, [router])
	const clearAllCategories = useCallback(() => updateArrayQuery('categories', 'None', router), [router])

	const setSelectedAssetClasses = useCallback(
		(values: string[]) => updateArrayQuery('assetClasses', values, router),
		[router]
	)
	const selectOnlyOneAssetClass = useCallback(
		(assetClass: string) => updateArrayQuery('assetClasses', [assetClass], router),
		[router]
	)
	const toggleAllAssetClasses = useCallback(() => {
		const nextQuery: Record<string, any> = { ...router.query }
		delete nextQuery.assetClasses
		router.push({ pathname: router.pathname, query: nextQuery }, undefined, { shallow: true })
	}, [router])
	const clearAllAssetClasses = useCallback(() => updateArrayQuery('assetClasses', 'None', router), [router])

	const setSelectedIssuers = useCallback((values: string[]) => updateArrayQuery('issuers', values, router), [router])
	const selectOnlyOneIssuer = useCallback((issuer: string) => updateArrayQuery('issuers', [issuer], router), [router])
	const toggleAllIssuers = useCallback(() => {
		const nextQuery: Record<string, any> = { ...router.query }
		delete nextQuery.issuers
		router.push({ pathname: router.pathname, query: nextQuery }, undefined, { shallow: true })
	}, [router])
	const clearAllIssuers = useCallback(() => updateArrayQuery('issuers', 'None', router), [router])

	const setIncludeStablecoins = useCallback(
		(value: boolean) => {
			const nextQuery: Record<string, any> = { ...router.query }
			if (value) {
				delete nextQuery.includeStablecoins
			} else {
				nextQuery.includeStablecoins = 'false'
			}
			router.push({ pathname: router.pathname, query: nextQuery }, undefined, { shallow: true })
		},
		[router]
	)

	return {
		selectedCategories,
		selectedAssetClasses,
		selectedIssuers,
		includeStablecoins,
		setSelectedCategories,
		setSelectedAssetClasses,
		setSelectedIssuers,
		setIncludeStablecoins,
		selectOnlyOneCategory,
		toggleAllCategories,
		clearAllCategories,
		selectOnlyOneAssetClass,
		toggleAllAssetClasses,
		clearAllAssetClasses,
		selectOnlyOneIssuer,
		toggleAllIssuers,
		clearAllIssuers
	}
}

const pieChartRadius = ['50%', '70%'] as [string, string]
const pieChartLegendPosition = {
	left: 'center',
	top: 'bottom',
	orient: 'horizontal',
	formatter: function (name) {
		return name
	}
} as any
const pieChartLegendTextStyle = { fontSize: 14 }
