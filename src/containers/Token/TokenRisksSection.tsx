import type { PaginationState, SortingState } from '@tanstack/react-table'
import {
	createColumnHelper,
	getCoreRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	useReactTable
} from '@tanstack/react-table'
import { startTransition, useMemo, useState } from 'react'
import { Icon } from '~/components/Icon'
import { PaginatedTable } from '~/components/Table/PaginatedTable'
import { TokenLogo } from '~/components/TokenLogo'
import { Tooltip } from '~/components/Tooltip'
import { formattedNum } from '~/utils'
import { DEFAULT_TABLE_PAGE_SIZE, resolveUpdater, TABLE_PAGE_SIZE_OPTIONS } from './tableUtils'
import type { TokenRiskBorrowCapsRow, TokenRiskCollateralRiskRow, TokenRiskResponse } from './tokenRisk.types'

const TOKEN_RISKS_SECTION_ID = 'token-risks'
const borrowCapsColumnHelper = createColumnHelper<TokenRiskBorrowCapsRow>()
const collateralRiskColumnHelper = createColumnHelper<TokenRiskCollateralRiskRow>()

type RiskTone = 'neutral' | 'good' | 'warning' | 'danger'
type BorrowCapsProtocolSummary = {
	protocol: string
	protocolDisplayName: string
	totalAvailableToBorrowUsd: number
	totalDebtBorrowedUsd: number
	totalBorrowCapUsd: number | null
	chainDisplayNames: string[]
}

type CollateralProtocolSummary = {
	protocol: string
	protocolDisplayName: string
	totalAvailableToBorrowUsd: number
	chainDisplayNames: string[]
}

const DEFAULT_BORROW_CAPS_SORTING: SortingState = [{ id: 'displayBorrowCapUsd', desc: true }]
const DEFAULT_COLLATERAL_RISK_SORTING: SortingState = [{ id: 'availableToBorrowUsd', desc: true }]

function formatUsd(value: number | null | undefined) {
	if (value == null) return 'Uncapped'
	return formattedNum(value, true)
}

function formatPercent(value: number | null | undefined, fractionDigits = 1) {
	if (value == null || Number.isNaN(value)) return '-'
	return `${(value * 100).toFixed(fractionDigits)}%`
}

function UncappedIndicator({ content, className }: { content: string; className?: string }) {
	return (
		<Tooltip content={content} className={`underline decoration-dotted${className ? ` ${className}` : ''}`}>
			Uncapped
		</Tooltip>
	)
}

function getToneClassName(tone: RiskTone) {
	switch (tone) {
		case 'good':
			return 'border-green-500/25 bg-green-500/5 text-green-600 dark:text-green-400'
		case 'warning':
			return 'border-yellow-500/25 bg-yellow-500/5 text-yellow-600 dark:text-yellow-400'
		case 'danger':
			return 'border-red-500/25 bg-red-500/5 text-red-600 dark:text-red-400'
		default:
			return 'border-(--cards-border) bg-(--app-bg) text-(--text-primary)'
	}
}

function getUtilizationTone(value: number | null | undefined): RiskTone {
	if (value == null || Number.isNaN(value)) return 'neutral'
	if (value < 0.5) return 'good'
	if (value <= 0.8) return 'warning'
	return 'danger'
}

function getHeadroomTone(remaining: number | null | undefined, total: number | null | undefined): RiskTone {
	if (remaining == null || total == null || total <= 0) return 'neutral'
	const headroomRatio = remaining / total
	if (headroomRatio > 0.3) return 'good'
	if (headroomRatio > 0.1) return 'warning'
	return 'danger'
}

function getLiquidationBufferTone(value: number | null | undefined): RiskTone {
	if (value == null || Number.isNaN(value)) return 'neutral'
	if (value >= 0.05) return 'good'
	if (value >= 0.02) return 'warning'
	return 'danger'
}

function MetricPill({ value, tone, title }: { value: string; tone: RiskTone; title?: string }) {
	return (
		<span
			className={`inline-flex rounded-full border px-2 py-1 text-xs font-medium ${getToneClassName(tone)}`}
			title={title}
		>
			{value}
		</span>
	)
}

function TableEntityCell({
	label,
	logoName,
	logoKind,
	title
}: {
	label: string
	logoName: string
	logoKind: 'token' | 'chain'
	title?: string
}) {
	return (
		<div className="flex items-center gap-2">
			<TokenLogo name={logoName} kind={logoKind} size={18} alt={`Logo of ${label}`} title={title} />
			<span>{label}</span>
		</div>
	)
}

function formatProtocolChains(chainDisplayNames: string[]) {
	if (chainDisplayNames.length === 0) return ''
	if (chainDisplayNames.length === 1) return chainDisplayNames[0]
	return `${chainDisplayNames.length} chains`
}

function createBorrowCapsColumns(methodologies: TokenRiskResponse['borrowCaps']['methodologies']) {
	return [
		borrowCapsColumnHelper.accessor('protocolDisplayName', {
			header: 'Protocol',
			enableSorting: false,
			cell: ({ row, getValue }) => (
				<TableEntityCell label={getValue()} logoName={getValue()} logoKind="token" title={row.original.protocol} />
			)
		}),
		borrowCapsColumnHelper.accessor('chainDisplayName', {
			header: 'Chain',
			enableSorting: false,
			cell: ({ row, getValue }) => (
				<TableEntityCell label={getValue()} logoName={getValue()} logoKind="chain" title={row.original.chain} />
			)
		}),
		borrowCapsColumnHelper.accessor('debtSymbol', {
			header: 'Asset',
			enableSorting: false
		}),
		borrowCapsColumnHelper.accessor('displayBorrowCapUsd', {
			header: 'Borrow Cap',
			cell: ({ row, getValue }) =>
				getValue() == null ? (
					<UncappedIndicator
						content={`No governance borrow cap is configured for ${row.original.debtSymbol} in this market.`}
						className="w-full justify-end"
					/>
				) : (
					formatUsd(getValue())
				),
			meta: {
				align: 'end',
				headerHelperText: methodologies.borrowCapUsd
			}
		}),
		borrowCapsColumnHelper.accessor('debtTotalBorrowedUsd', {
			header: 'Borrowed',
			cell: ({ getValue }) => formatUsd(getValue()),
			meta: {
				align: 'end',
				headerHelperText: methodologies.debtTotalBorrowedUsd
			}
		}),
		borrowCapsColumnHelper.accessor('remainingCapUsd', {
			header: 'Cap Headroom',
			cell: ({ row, getValue }) => (
				<MetricPill
					value={formatUsd(getValue())}
					tone={getHeadroomTone(getValue(), row.original.borrowCapUsd ?? row.original.debtTotalSupplyUsd)}
					title={
						row.original.borrowCapUsd == null
							? `No governance borrow cap is configured for ${row.original.debtSymbol} in this market. Showing debt total supply minus borrowed amount instead.`
							: `Remaining borrow-cap headroom for ${row.original.debtSymbol} in this market.`
					}
				/>
			),
			meta: {
				align: 'end',
				headerHelperText:
					'Borrow cap minus current borrowed amount for the debt asset in this market. When no governance cap exists, this shows debt total supply minus borrowed amount.'
			}
		}),
		borrowCapsColumnHelper.accessor('availableToBorrowUsd', {
			header: 'Available',
			cell: ({ getValue }) => formatUsd(getValue()),
			meta: {
				align: 'end',
				headerHelperText: methodologies.availableToBorrowUsd
			}
		}),
		borrowCapsColumnHelper.accessor('debtUtilization', {
			header: 'Utilization',
			cell: ({ row, getValue }) => (
				<MetricPill
					value={formatPercent(getValue())}
					tone={getUtilizationTone(getValue())}
					title={`${formatUsd(row.original.debtTotalBorrowedUsd)} borrowed of ${formatUsd(row.original.displayBorrowCapUsd)} cap.`}
				/>
			),
			meta: {
				align: 'end',
				headerHelperText: methodologies.debtUtilization
			}
		}),
		borrowCapsColumnHelper.accessor('eligibleCollateralCount', {
			header: 'Eligible Collateral',
			cell: ({ row, getValue }) => {
				const count = getValue()
				const preview = row.original.eligibleCollateralSymbols.slice(0, 3).join(', ')
				return preview ? `${count} (${preview}${count > 3 ? '…' : ''})` : String(count)
			}
		}),
		borrowCapsColumnHelper.accessor('market', {
			header: 'Market',
			enableSorting: false,
			cell: ({ getValue }) => <span className="font-mono text-xs">{getValue()}</span>
		})
	]
}

function createCollateralRiskColumns(methodologies: TokenRiskResponse['collateralRisk']['methodologies']) {
	return [
		collateralRiskColumnHelper.accessor('protocolDisplayName', {
			header: 'Protocol',
			enableSorting: false,
			cell: ({ row, getValue }) => (
				<TableEntityCell label={getValue()} logoName={getValue()} logoKind="token" title={row.original.protocol} />
			)
		}),
		collateralRiskColumnHelper.accessor('chainDisplayName', {
			header: 'Chain',
			enableSorting: false,
			cell: ({ row, getValue }) => (
				<TableEntityCell label={getValue()} logoName={getValue()} logoKind="chain" title={row.original.chain} />
			)
		}),
		collateralRiskColumnHelper.accessor('debtSymbol', {
			header: 'Debt Asset',
			enableSorting: false
		}),
		collateralRiskColumnHelper.accessor('availableToBorrowUsd', {
			header: 'Available',
			cell: ({ getValue }) => formatUsd(getValue()),
			meta: {
				align: 'end',
				headerHelperText: methodologies.availableToBorrowUsd
			}
		}),
		collateralRiskColumnHelper.accessor('displayBorrowCapUsd', {
			header: 'Debt Borrow Cap',
			cell: ({ row, getValue }) =>
				getValue() == null ? (
					<UncappedIndicator
						content={`No governance borrow cap is configured for ${row.original.debtSymbol} in this market.`}
						className="w-full justify-end"
					/>
				) : (
					formatUsd(getValue())
				),
			meta: {
				align: 'end',
				headerHelperText: methodologies.borrowCapUsd
			}
		}),
		collateralRiskColumnHelper.accessor('maxLtv', {
			header: 'Max LTV',
			cell: ({ getValue }) => formatPercent(getValue()),
			meta: {
				align: 'end',
				headerHelperText: methodologies.maxLtv
			}
		}),
		collateralRiskColumnHelper.accessor('liquidationThreshold', {
			header: 'Liq Threshold',
			cell: ({ getValue }) => formatPercent(getValue()),
			meta: {
				align: 'end',
				headerHelperText: methodologies.liquidationThreshold
			}
		}),
		collateralRiskColumnHelper.accessor('liquidationBuffer', {
			header: 'Buffer',
			cell: ({ getValue }) => (
				<MetricPill
					value={formatPercent(getValue())}
					tone={getLiquidationBufferTone(getValue())}
					title="Gap between max LTV and liquidation threshold."
				/>
			),
			meta: {
				align: 'end',
				headerHelperText: 'Gap between max LTV and liquidation threshold.'
			}
		}),
		collateralRiskColumnHelper.accessor('liquidationPenalty', {
			header: 'Penalty',
			cell: ({ getValue }) => formatPercent(getValue()),
			meta: {
				align: 'end',
				headerHelperText: methodologies.liquidationPenalty
			}
		}),
		collateralRiskColumnHelper.accessor('borrowApy', {
			header: 'Borrow APY',
			cell: ({ getValue }) => formatPercent(getValue(), 2),
			meta: {
				align: 'end'
			}
		}),
		collateralRiskColumnHelper.accessor('isolationMode', {
			header: 'Isolation',
			enableSorting: false,
			cell: ({ getValue }) =>
				getValue() ? (
					<MetricPill value="Isolated" tone="warning" title="Collateral is restricted to isolated borrowing." />
				) : (
					<MetricPill value="Open" tone="good" title="Collateral is not restricted to isolation mode." />
				),
			meta: {
				headerHelperText: methodologies.isolationMode
			}
		}),
		collateralRiskColumnHelper.accessor('debtCeilingUsd', {
			header: 'Debt Ceiling',
			cell: ({ getValue }) => (getValue() == null ? '-' : formatUsd(getValue())),
			meta: {
				align: 'end',
				headerHelperText: methodologies.debtCeilingUsd
			}
		}),
		collateralRiskColumnHelper.accessor('market', {
			header: 'Market',
			enableSorting: false,
			cell: ({ getValue }) => <span className="font-mono text-xs">{getValue()}</span>
		})
	]
}

export function TokenRisksSection({ tokenSymbol, riskData }: { tokenSymbol: string; riskData: TokenRiskResponse }) {
	const { borrowCaps, collateralRisk, scopeCandidates } = riskData
	const [borrowCapsSorting, setBorrowCapsSorting] = useState<SortingState>(DEFAULT_BORROW_CAPS_SORTING)
	const [collateralRiskSorting, setCollateralRiskSorting] = useState<SortingState>(DEFAULT_COLLATERAL_RISK_SORTING)
	const [borrowCapsPagination, setBorrowCapsPagination] = useState<PaginationState>({
		pageIndex: 0,
		pageSize: DEFAULT_TABLE_PAGE_SIZE
	})
	const [collateralRiskPagination, setCollateralRiskPagination] = useState<PaginationState>({
		pageIndex: 0,
		pageSize: DEFAULT_TABLE_PAGE_SIZE
	})
	const borrowCapsColumns = useMemo(() => createBorrowCapsColumns(borrowCaps.methodologies), [borrowCaps.methodologies])
	const collateralRiskColumns = useMemo(
		() => createCollateralRiskColumns(collateralRisk.methodologies),
		[collateralRisk.methodologies]
	)

	const borrowCapsTable = useReactTable({
		data: borrowCaps.rows,
		columns: borrowCapsColumns,
		state: {
			sorting: borrowCapsSorting,
			pagination: borrowCapsPagination
		},
		enableSortingRemoval: false,
		onSortingChange: (updater) =>
			startTransition(() => setBorrowCapsSorting(resolveUpdater(updater, borrowCapsSorting))),
		onPaginationChange: (updater) =>
			startTransition(() => setBorrowCapsPagination(resolveUpdater(updater, borrowCapsPagination))),
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getPaginationRowModel: getPaginationRowModel()
	})

	const collateralRiskTable = useReactTable({
		data: collateralRisk.rows,
		columns: collateralRiskColumns,
		state: {
			sorting: collateralRiskSorting,
			pagination: collateralRiskPagination
		},
		enableSortingRemoval: false,
		onSortingChange: (updater) =>
			startTransition(() => setCollateralRiskSorting(resolveUpdater(updater, collateralRiskSorting))),
		onPaginationChange: (updater) =>
			startTransition(() => setCollateralRiskPagination(resolveUpdater(updater, collateralRiskPagination))),
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getPaginationRowModel: getPaginationRowModel()
	})
	const borrowCapsProtocolSummaries = useMemo<BorrowCapsProtocolSummary[]>(() => {
		const grouped = new Map<
			string,
			{
				protocol: string
				protocolDisplayName: string
				totalAvailableToBorrowUsd: number
				totalDebtBorrowedUsd: number
				totalBorrowCapUsd: number
				hasCap: boolean
				chainDisplayNames: Set<string>
			}
		>()

		for (const row of borrowCaps.rows) {
			const existing = grouped.get(row.protocol)

			if (existing) {
				existing.totalAvailableToBorrowUsd += row.availableToBorrowUsd
				existing.totalDebtBorrowedUsd += row.debtTotalBorrowedUsd
				if (row.displayBorrowCapUsd != null && row.displayBorrowCapUsd > 0) {
					existing.totalBorrowCapUsd += row.displayBorrowCapUsd
					existing.hasCap = true
				}
				existing.chainDisplayNames.add(row.chainDisplayName)
				continue
			}

			grouped.set(row.protocol, {
				protocol: row.protocol,
				protocolDisplayName: row.protocolDisplayName,
				totalAvailableToBorrowUsd: row.availableToBorrowUsd,
				totalDebtBorrowedUsd: row.debtTotalBorrowedUsd,
				totalBorrowCapUsd: row.displayBorrowCapUsd != null && row.displayBorrowCapUsd > 0 ? row.displayBorrowCapUsd : 0,
				hasCap: row.displayBorrowCapUsd != null && row.displayBorrowCapUsd > 0,
				chainDisplayNames: new Set([row.chainDisplayName])
			})
		}

		return [...grouped.values()]
			.map((summary) => ({
				protocol: summary.protocol,
				protocolDisplayName: summary.protocolDisplayName,
				totalAvailableToBorrowUsd: summary.totalAvailableToBorrowUsd,
				totalDebtBorrowedUsd: summary.totalDebtBorrowedUsd,
				totalBorrowCapUsd: summary.hasCap ? summary.totalBorrowCapUsd : null,
				chainDisplayNames: [...summary.chainDisplayNames].sort((a, b) => a.localeCompare(b))
			}))
			.sort((a, b) => {
				if (a.totalAvailableToBorrowUsd !== b.totalAvailableToBorrowUsd) {
					return b.totalAvailableToBorrowUsd - a.totalAvailableToBorrowUsd
				}
				return a.protocolDisplayName.localeCompare(b.protocolDisplayName)
			})
	}, [borrowCaps.rows])
	const collateralProtocolSummaries = useMemo<CollateralProtocolSummary[]>(() => {
		const grouped = new Map<
			string,
			{
				protocol: string
				protocolDisplayName: string
				totalAvailableToBorrowUsd: number
				chainDisplayNames: Set<string>
			}
		>()

		for (const row of collateralRisk.rows) {
			const existing = grouped.get(row.protocol)

			if (existing) {
				existing.totalAvailableToBorrowUsd += row.availableToBorrowUsd
				existing.chainDisplayNames.add(row.chainDisplayName)
				continue
			}

			grouped.set(row.protocol, {
				protocol: row.protocol,
				protocolDisplayName: row.protocolDisplayName,
				totalAvailableToBorrowUsd: row.availableToBorrowUsd,
				chainDisplayNames: new Set([row.chainDisplayName])
			})
		}

		return [...grouped.values()]
			.map((summary) => ({
				protocol: summary.protocol,
				protocolDisplayName: summary.protocolDisplayName,
				totalAvailableToBorrowUsd: summary.totalAvailableToBorrowUsd,
				chainDisplayNames: [...summary.chainDisplayNames].sort((a, b) => a.localeCompare(b))
			}))
			.sort((a, b) => {
				if (a.totalAvailableToBorrowUsd !== b.totalAvailableToBorrowUsd) {
					return b.totalAvailableToBorrowUsd - a.totalAvailableToBorrowUsd
				}
				return a.protocolDisplayName.localeCompare(b.protocolDisplayName)
			})
	}, [collateralRisk.rows])
	const hasCollateralPrimary = collateralProtocolSummaries.length > 0
	const totalAvailableToBorrowUsd = useMemo(
		() => borrowCapsProtocolSummaries.reduce((sum, summary) => sum + summary.totalAvailableToBorrowUsd, 0),
		[borrowCapsProtocolSummaries]
	)
	const totalBorrowedUsd = useMemo(
		() => borrowCapsProtocolSummaries.reduce((sum, summary) => sum + summary.totalDebtBorrowedUsd, 0),
		[borrowCapsProtocolSummaries]
	)
	const totalCollateralAvailableToBorrowUsd = collateralRisk.summary.totalAvailableToBorrowUsd
	const selectedCandidateDisplayName = useMemo(() => {
		if (scopeCandidates.length === 1) return scopeCandidates[0].displayName
		return 'onchain'
	}, [scopeCandidates])

	if (!hasCollateralPrimary && borrowCapsProtocolSummaries.length === 0) {
		return null
	}

	return (
		<section className="flex flex-col rounded-md border border-(--cards-border) bg-(--cards-bg)">
			<div className="flex flex-wrap items-start justify-between gap-3 border-b border-(--cards-border) p-3">
				<div className="min-w-0">
					<h2
						className="group relative flex min-w-0 scroll-mt-4 items-center gap-1 text-xl font-bold"
						id={TOKEN_RISKS_SECTION_ID}
					>
						Risks
						<a
							aria-hidden="true"
							tabIndex={-1}
							href={`#${TOKEN_RISKS_SECTION_ID}`}
							className="absolute top-0 right-0 z-10 flex h-full w-full items-center"
						/>
						<Icon name="link" className="invisible h-3.5 w-3.5 group-hover:visible group-focus-visible:visible" />
					</h2>
					<p className="mt-1 max-w-4xl text-sm text-(--text-secondary)">
						{hasCollateralPrimary
							? `How much can still be borrowed right now using ${tokenSymbol} as collateral across lending protocols.`
							: `How much ${tokenSymbol} is currently available to borrow across lending protocols.`}
					</p>
				</div>
			</div>

			<div className="flex flex-1 flex-col gap-3 p-3">
				<div className="rounded-md border border-(--cards-border) p-4">
					<p className="text-sm text-(--text-secondary)">
						{hasCollateralPrimary
							? `Total available to borrow using ${tokenSymbol} as collateral`
							: `Total ${tokenSymbol} available to borrow`}
					</p>
					<p className="mt-1 text-2xl font-semibold text-(--text-primary)">
						{hasCollateralPrimary
							? formatUsd(totalCollateralAvailableToBorrowUsd)
							: formatUsd(totalAvailableToBorrowUsd)}
					</p>
					<p className="mt-1 text-sm text-(--text-secondary)">
						{hasCollateralPrimary
							? `Across ${collateralRisk.summary.routeCount} collateral route${
									collateralRisk.summary.routeCount === 1 ? '' : 's'
								}. Borrowed totals are omitted for pooled markets because they are not collateral-specific.`
							: `${formatUsd(totalBorrowedUsd)} borrowed across these lending markets`}
					</p>
				</div>

				<div className="rounded-md border border-(--cards-border) p-3">
					<div className="space-y-3">
						{hasCollateralPrimary
							? collateralProtocolSummaries.map((summary) => (
									<div
										key={summary.protocol}
										className="flex flex-col gap-2 border-b border-(--cards-border) pb-3 last:border-b-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
									>
										<div className="min-w-0">
											<div className="flex items-center gap-2">
												<TokenLogo
													name={summary.protocolDisplayName}
													kind="token"
													size={18}
													alt={`Logo of ${summary.protocolDisplayName}`}
													title={summary.protocol}
												/>
												<p className="font-medium text-(--text-primary)">{summary.protocolDisplayName}</p>
											</div>
											<p className="mt-1 text-sm text-(--text-secondary)">
												{formatUsd(summary.totalAvailableToBorrowUsd)} available now
											</p>
											<p className="mt-1 text-xs text-(--text-secondary)">
												{formatProtocolChains(summary.chainDisplayNames)}
											</p>
										</div>
									</div>
								))
							: borrowCapsProtocolSummaries.map((summary) => (
									<div
										key={summary.protocol}
										className="flex flex-col gap-2 border-b border-(--cards-border) pb-3 last:border-b-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
									>
										<div className="min-w-0">
											<div className="flex items-center gap-2">
												<TokenLogo
													name={summary.protocolDisplayName}
													kind="token"
													size={18}
													alt={`Logo of ${summary.protocolDisplayName}`}
													title={summary.protocol}
												/>
												<p className="font-medium text-(--text-primary)">{summary.protocolDisplayName}</p>
											</div>
											<p className="mt-1 text-sm text-(--text-secondary)">
												{formatUsd(summary.totalAvailableToBorrowUsd)} available (
												{formatUsd(summary.totalDebtBorrowedUsd)} borrowed
												{summary.totalBorrowCapUsd != null ? ` / ${formatUsd(summary.totalBorrowCapUsd)} cap` : ''})
											</p>
											<p className="mt-1 text-xs text-(--text-secondary)">
												{formatProtocolChains(summary.chainDisplayNames)}
											</p>
										</div>
									</div>
								))}
					</div>
				</div>

				<details className="group rounded-md border border-(--cards-border) bg-(--app-bg) p-3">
					<summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium">
						<span>Methodology and limitations</span>
						<Icon
							name="chevron-down"
							height={16}
							width={16}
							className="shrink-0 transition-transform duration-200 group-open:rotate-180"
						/>
					</summary>
					<p className="mt-2 text-sm text-(--text-secondary)">
						Showing {hasCollateralPrimary ? 'collateral-side' : 'debt-side'} borrowing capacity for {tokenSymbol} on{' '}
						<span className="font-medium text-(--text-primary)">{selectedCandidateDisplayName}</span>. The headline
						total and protocol lines use{' '}
						{hasCollateralPrimary
							? `${tokenSymbol} collateral routes where available is what can still be borrowed now. Borrowed-against totals are intentionally omitted because pooled markets do not expose them per collateral asset without position-level indexing.`
							: `${tokenSymbol} debt routes where the asset itself is borrowed as debt.`}
					</p>
					<ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-(--text-secondary)">
						{riskData.limitations.map((limitation) => (
							<li key={limitation}>{limitation}</li>
						))}
					</ul>
				</details>

				{riskData.collateralRisk.rows.length > 0 ? (
					<details className="group rounded-md border border-(--cards-border) bg-(--app-bg) p-3">
						<summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium">
							<span>
								{hasCollateralPrimary ? `Show ${tokenSymbol} collateral details` : 'Show collateral-side details'}
							</span>
							<Icon
								name="chevron-down"
								height={16}
								width={16}
								className="shrink-0 transition-transform duration-200 group-open:rotate-180"
							/>
						</summary>
						<p className="mt-2 text-sm text-(--text-secondary)">
							{hasCollateralPrimary
								? `Each row is a lending route where ${tokenSymbol} is accepted as collateral. Available is what can still be borrowed now on that route. Borrowed and derived-capacity totals are omitted because pooled markets do not expose them per collateral asset without position-level indexing.`
								: `These rows show what users can borrow by posting ${tokenSymbol} as collateral, which is different from how much ${tokenSymbol} itself is available to borrow as debt.`}
						</p>
						<PaginatedTable table={collateralRiskTable} pageSizeOptions={TABLE_PAGE_SIZE_OPTIONS} className="mt-3" />
					</details>
				) : null}

				{riskData.borrowCaps.rows.length > 0 ? (
					<details className="group rounded-md border border-(--cards-border) bg-(--app-bg) p-3">
						<summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium">
							<span>Show borrow-cap details</span>
							<Icon
								name="chevron-down"
								height={16}
								width={16}
								className="shrink-0 transition-transform duration-200 group-open:rotate-180"
							/>
						</summary>
						<p className="mt-2 text-sm text-(--text-secondary)">
							These rows show markets where {tokenSymbol} itself is borrowed as debt. Current capped markets total{' '}
							<span className="font-medium text-(--text-primary)">
								{formatUsd(riskData.borrowCaps.summary.totalBorrowCapUsd)}
							</span>{' '}
							of borrow capacity, with{' '}
							<span className="font-medium text-(--text-primary)">
								{formatUsd(riskData.borrowCaps.summary.totalBorrowedUsd)}
							</span>{' '}
							borrowed and{' '}
							<span className="font-medium text-(--text-primary)">
								{formatUsd(riskData.borrowCaps.summary.remainingCapUsd)}
							</span>{' '}
							of remaining cap headroom.
						</p>
						<p className="mt-2 text-sm text-(--text-secondary)">
							<span className="font-medium text-(--text-primary)">Borrow Cap</span> uses the governance borrow cap when
							present and otherwise falls back to the protocol debt ceiling. When neither is configured, it shows{' '}
							<span className="font-medium text-(--text-primary)">Uncapped</span>.{' '}
							<span className="font-medium text-(--text-primary)">Cap Headroom</span> uses governance borrow cap when
							available, otherwise debt total supply minus borrowed.{' '}
							<span className="font-medium text-(--text-primary)">Available</span> can still be lower when pool
							liquidity is the tighter constraint.
						</p>
						<PaginatedTable table={borrowCapsTable} pageSizeOptions={TABLE_PAGE_SIZE_OPTIONS} className="mt-3" />
					</details>
				) : null}
			</div>
		</section>
	)
}
