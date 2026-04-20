import type { PaginationState, SortingState } from '@tanstack/react-table'
import {
	createColumnHelper,
	getCoreRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	useReactTable
} from '@tanstack/react-table'
import { startTransition, useEffect, useMemo, useState } from 'react'
import { Icon } from '~/components/Icon'
import { LocalLoader } from '~/components/Loaders'
import { PaginatedTable } from '~/components/Table/PaginatedTable'
import { TokenLogo } from '~/components/TokenLogo'
import { formattedNum } from '~/utils'
import { DEFAULT_TABLE_PAGE_SIZE, resolveUpdater, TABLE_PAGE_SIZE_OPTIONS } from './tableUtils'
import type { TokenRiskBorrowCapsRow, TokenRiskCollateralRiskRow } from './tokenRisk.types'
import { useTokenRisk } from './useTokenRisk'

const TOKEN_RISKS_SECTION_ID = 'token-risks'
const borrowCapsColumnHelper = createColumnHelper<TokenRiskBorrowCapsRow>()
const collateralRiskColumnHelper = createColumnHelper<TokenRiskCollateralRiskRow>()

type TokenRisksTabKey = 'borrowCaps' | 'collateralRisk'
type RiskTone = 'neutral' | 'good' | 'warning' | 'danger'

const DEFAULT_BORROW_CAPS_SORTING: SortingState = [{ id: 'borrowCapUsd', desc: true }]
const DEFAULT_COLLATERAL_RISK_SORTING: SortingState = [{ id: 'availableToBorrowUsd', desc: true }]

function formatUsd(value: number | null | undefined) {
	if (value == null) return 'Uncapped'
	return formattedNum(value, true)
}

function formatPercent(value: number | null | undefined, fractionDigits = 1) {
	if (value == null || Number.isNaN(value)) return '-'
	return `${(value * 100).toFixed(fractionDigits)}%`
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

function SummaryCard({
	label,
	value,
	helperText,
	tone = 'neutral'
}: {
	label: string
	value: string
	helperText?: string
	tone?: RiskTone
}) {
	const toneClassName = getToneClassName(tone)

	return (
		<div className={`rounded-md border p-3 ${tone === 'neutral' ? toneClassName : `border-l-4 ${toneClassName}`}`}>
			<p className="text-xs font-medium tracking-wide text-(--text-secondary) uppercase">{label}</p>
			<p className="mt-2 text-lg font-semibold text-(--text-primary)">{value}</p>
			{helperText ? <p className="mt-1 text-xs text-(--text-secondary)">{helperText}</p> : null}
		</div>
	)
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

const borrowCapsColumns = [
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
	borrowCapsColumnHelper.accessor('borrowCapUsd', {
		header: 'Borrow Cap',
		cell: ({ getValue }) => formatUsd(getValue()),
		meta: {
			align: 'end'
		}
	}),
	borrowCapsColumnHelper.accessor('debtTotalBorrowedUsd', {
		header: 'Borrowed',
		cell: ({ getValue }) => formatUsd(getValue()),
		meta: {
			align: 'end'
		}
	}),
	borrowCapsColumnHelper.accessor('remainingCapUsd', {
		header: 'Cap Headroom',
		cell: ({ row, getValue }) => (
			<MetricPill
				value={formatUsd(getValue())}
				tone={getHeadroomTone(getValue(), row.original.borrowCapUsd)}
				title={`Remaining borrow-cap headroom for ${row.original.debtSymbol} in this market.`}
			/>
		),
		meta: {
			align: 'end'
		}
	}),
	borrowCapsColumnHelper.accessor('availableToBorrowUsd', {
		header: 'Available',
		cell: ({ getValue }) => formatUsd(getValue()),
		meta: {
			align: 'end'
		}
	}),
	borrowCapsColumnHelper.accessor('debtUtilization', {
		header: 'Utilization',
		cell: ({ row, getValue }) => (
			<MetricPill
				value={formatPercent(getValue())}
				tone={getUtilizationTone(getValue())}
				title={`${formatUsd(row.original.debtTotalBorrowedUsd)} borrowed of ${formatUsd(
					row.original.borrowCapUsd
				)} cap.`}
			/>
		),
		meta: {
			align: 'end'
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

const collateralRiskColumns = [
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
			align: 'end'
		}
	}),
	collateralRiskColumnHelper.accessor('maxLtv', {
		header: 'Max LTV',
		cell: ({ getValue }) => formatPercent(getValue()),
		meta: {
			align: 'end'
		}
	}),
	collateralRiskColumnHelper.accessor('liquidationThreshold', {
		header: 'Liq Threshold',
		cell: ({ getValue }) => formatPercent(getValue()),
		meta: {
			align: 'end'
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
			align: 'end'
		}
	}),
	collateralRiskColumnHelper.accessor('liquidationPenalty', {
		header: 'Penalty',
		cell: ({ getValue }) => formatPercent(getValue()),
		meta: {
			align: 'end'
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
			)
	}),
	collateralRiskColumnHelper.accessor('debtCeilingUsd', {
		header: 'Debt Ceiling',
		cell: ({ getValue }) => (getValue() == null ? '-' : formatUsd(getValue())),
		meta: {
			align: 'end'
		}
	}),
	collateralRiskColumnHelper.accessor('market', {
		header: 'Market',
		enableSorting: false,
		cell: ({ getValue }) => <span className="font-mono text-xs">{getValue()}</span>
	})
]

export function TokenRisksSection({ tokenSymbol, geckoId }: { tokenSymbol: string; geckoId: string | null }) {
	const [activeTab, setActiveTab] = useState<TokenRisksTabKey>('borrowCaps')
	const [selectedCandidateKey, setSelectedCandidateKey] = useState<string | null>(null)
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

	const { data, error, isLoading } = useTokenRisk(geckoId, selectedCandidateKey)

	const borrowCapsTable = useReactTable({
		data: data?.borrowCaps?.rows ?? [],
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
		data: data?.collateralRisk?.rows ?? [],
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

	const scopeCandidates = useMemo(() => {
		if (!data) return []
		if (data.scopeCandidates) return data.scopeCandidates

		const chainsWithVisibleRows = new Set<string>()
		for (const row of data.borrowCaps?.rows ?? []) chainsWithVisibleRows.add(row.chain)
		for (const row of data.collateralRisk?.rows ?? []) chainsWithVisibleRows.add(row.chain)

		return (data.candidates ?? []).filter((candidate) => chainsWithVisibleRows.has(candidate.chain))
	}, [data])
	const selectedCandidateDisplayName = useMemo(() => {
		if (selectedCandidateKey) {
			return (
				data?.candidates.find((candidate) => candidate.key === selectedCandidateKey)?.displayName ?? 'Selected chain'
			)
		}
		if (scopeCandidates.length === 1) return scopeCandidates[0].displayName
		return 'All chains'
	}, [data?.candidates, scopeCandidates, selectedCandidateKey])
	const showScopeSelector = scopeCandidates.length > 1

	useEffect(() => {
		if (!selectedCandidateKey || scopeCandidates.length === 0) return
		if (scopeCandidates.some((candidate) => candidate.key === selectedCandidateKey)) return

		startTransition(() => {
			setSelectedCandidateKey(null)
			setBorrowCapsPagination((prev) => ({ ...prev, pageIndex: 0 }))
			setCollateralRiskPagination((prev) => ({ ...prev, pageIndex: 0 }))
		})
	}, [scopeCandidates, selectedCandidateKey])

	const activeMethodologyItems = useMemo(() => {
		if (!data) return []

		return activeTab === 'borrowCaps'
			? [
					{ label: 'Borrow Cap', text: data.borrowCaps.methodologies.borrowCapUsd },
					{ label: 'Borrowed', text: data.borrowCaps.methodologies.debtTotalBorrowedUsd },
					{ label: 'Utilization', text: data.borrowCaps.methodologies.debtUtilization },
					{ label: 'Available', text: data.borrowCaps.methodologies.availableToBorrowUsd }
				]
			: [
					{ label: 'Available', text: data.collateralRisk.methodologies.availableToBorrowUsd },
					{ label: 'Max LTV', text: data.collateralRisk.methodologies.maxLtv },
					{ label: 'Liq Threshold', text: data.collateralRisk.methodologies.liquidationThreshold },
					{ label: 'Penalty', text: data.collateralRisk.methodologies.liquidationPenalty }
				]
	}, [activeTab, data])

	const hasPlaceholderState = isLoading || error != null || !geckoId

	return (
		<section
			className={`flex flex-col rounded-md border border-(--cards-border) bg-(--cards-bg)${
				hasPlaceholderState ? ' min-h-[60dvh] sm:min-h-[520px]' : ''
			}`}
		>
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
						See how much lending protocols are willing to let users borrow using {tokenSymbol}, and the liquidation
						parameters that protect those positions.
					</p>
				</div>

				{showScopeSelector ? (
					<label className="flex items-center gap-2 text-sm">
						<span className="text-(--text-secondary)">Scope</span>
						<select
							value={selectedCandidateKey ?? 'all'}
							onChange={(event) =>
								startTransition(() => {
									const nextValue = event.target.value === 'all' ? null : event.target.value
									setSelectedCandidateKey(nextValue)
									setBorrowCapsPagination((prev) => ({ ...prev, pageIndex: 0 }))
									setCollateralRiskPagination((prev) => ({ ...prev, pageIndex: 0 }))
								})
							}
							className="rounded-md border border-(--cards-border) bg-(--cards-bg) px-2 py-1"
						>
							<option value="all">All chains</option>
							{scopeCandidates.map((candidate) => (
								<option key={candidate.key} value={candidate.key}>
									{candidate.displayName}
								</option>
							))}
						</select>
					</label>
				) : null}
			</div>

			<div className="flex flex-1 flex-col gap-3 p-3">
				{!geckoId ? (
					<div className="flex flex-1 items-center justify-center px-4 text-center">
						<p className="text-sm text-(--text-label)">
							Risk data is unavailable for this token because it has no CoinGecko id.
						</p>
					</div>
				) : isLoading ? (
					<div className="flex flex-1 items-center justify-center">
						<LocalLoader />
					</div>
				) : error ? (
					<div className="flex flex-1 items-center justify-center px-4 text-center">
						<p className="text-sm text-(--text-label)">{error.message}</p>
					</div>
				) : !data || data.candidates.length === 0 ? (
					<div className="flex flex-1 items-center justify-center px-4 text-center">
						<p className="text-sm text-(--text-label)">
							Risk data is not yet available for this token because it does not resolve to a supported lending-market
							asset.
						</p>
					</div>
				) : (
					<>
						<div className="flex flex-wrap items-center gap-2 border-b border-(--cards-border) pb-3">
							<button
								type="button"
								onClick={() => setActiveTab('borrowCaps')}
								data-selected={activeTab === 'borrowCaps'}
								className="rounded-md border border-(--cards-border) px-3 py-2 text-sm font-medium transition-colors data-[selected=true]:border-(--primary) data-[selected=true]:bg-(--primary)/10 data-[selected=true]:text-(--primary)"
							>
								Borrow Caps
							</button>
							<button
								type="button"
								onClick={() => setActiveTab('collateralRisk')}
								data-selected={activeTab === 'collateralRisk'}
								className="rounded-md border border-(--cards-border) px-3 py-2 text-sm font-medium transition-colors data-[selected=true]:border-(--primary) data-[selected=true]:bg-(--primary)/10 data-[selected=true]:text-(--primary)"
							>
								Collateral Risk
							</button>
						</div>

						{activeTab === 'borrowCaps' ? (
							<>
								<div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
									<SummaryCard
										label="Total Borrow Cap"
										value={formatUsd(data.borrowCaps.summary.totalBorrowCapUsd)}
										helperText="Across markets with explicit caps"
									/>
									<SummaryCard
										label="Borrowed Against Cap"
										value={formatUsd(data.borrowCaps.summary.totalBorrowedUsd)}
									/>
									<SummaryCard
										label="Remaining Headroom"
										value={formatUsd(data.borrowCaps.summary.remainingCapUsd)}
										tone={getHeadroomTone(
											data.borrowCaps.summary.remainingCapUsd,
											data.borrowCaps.summary.totalBorrowCapUsd
										)}
									/>
									<SummaryCard
										label="Cap Utilization"
										value={formatPercent(data.borrowCaps.summary.capUtilization)}
										tone={getUtilizationTone(data.borrowCaps.summary.capUtilization)}
									/>
									<SummaryCard
										label="Markets / Chains / Protocols"
										value={`${data.borrowCaps.summary.marketCount} / ${data.borrowCaps.summary.chainCount} / ${data.borrowCaps.summary.protocolCount}`}
									/>
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
										Showing <span className="font-medium text-(--text-primary)">{selectedCandidateDisplayName}</span>{' '}
										route-derived lending risk for {tokenSymbol}. Borrow cap is the protocol-defined risk limit.
										Available to borrow reflects executable liquidity after liquidity, caps, and debt ceilings.
									</p>
									<ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-(--text-secondary)">
										{data.limitations.map((limitation) => (
											<li key={limitation}>{limitation}</li>
										))}
									</ul>
									<div className="mt-3 grid gap-2 sm:grid-cols-2">
										{activeMethodologyItems.map((item) => (
											<div key={item.label} className="rounded-md border border-(--cards-border) p-2">
												<p className="text-xs font-medium tracking-wide text-(--text-secondary) uppercase">
													{item.label}
												</p>
												<p className="mt-1 text-xs text-(--text-secondary)">{item.text}</p>
											</div>
										))}
									</div>
								</details>

								{data.borrowCaps.rows.length === 0 ? (
									<div className="flex flex-1 items-center justify-center rounded-md border border-(--cards-border) px-4 py-12 text-center">
										<p className="text-sm text-(--text-label)">
											No capped borrow markets currently support this token as debt.
										</p>
									</div>
								) : (
									<PaginatedTable table={borrowCapsTable} pageSizeOptions={TABLE_PAGE_SIZE_OPTIONS} />
								)}
							</>
						) : (
							<>
								<div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
									<SummaryCard
										label="Total Borrowable"
										value={formatUsd(data.collateralRisk.summary.totalBorrowableUsd)}
									/>
									<SummaryCard label="Routes" value={String(data.collateralRisk.summary.routeCount)} />
									<SummaryCard label="Isolated Routes" value={String(data.collateralRisk.summary.isolatedRouteCount)} />
									<SummaryCard
										label="Liquidation Buffer"
										value={
											data.collateralRisk.summary.minLiquidationBuffer == null ||
											data.collateralRisk.summary.maxLiquidationBuffer == null
												? '-'
												: `${formatPercent(data.collateralRisk.summary.minLiquidationBuffer)} to ${formatPercent(
														data.collateralRisk.summary.maxLiquidationBuffer
													)}`
										}
										tone={getLiquidationBufferTone(data.collateralRisk.summary.minLiquidationBuffer)}
									/>
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
										Showing <span className="font-medium text-(--text-primary)">{selectedCandidateDisplayName}</span>{' '}
										route-derived lending risk for {tokenSymbol}. Borrow cap is the protocol-defined risk limit.
										Available to borrow reflects executable liquidity after liquidity, caps, and debt ceilings.
									</p>
									<ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-(--text-secondary)">
										{data.limitations.map((limitation) => (
											<li key={limitation}>{limitation}</li>
										))}
									</ul>
									<div className="mt-3 grid gap-2 sm:grid-cols-2">
										{activeMethodologyItems.map((item) => (
											<div key={item.label} className="rounded-md border border-(--cards-border) p-2">
												<p className="text-xs font-medium tracking-wide text-(--text-secondary) uppercase">
													{item.label}
												</p>
												<p className="mt-1 text-xs text-(--text-secondary)">{item.text}</p>
											</div>
										))}
									</div>
								</details>

								{data.collateralRisk.rows.length === 0 ? (
									<div className="flex flex-1 items-center justify-center rounded-md border border-(--cards-border) px-4 py-12 text-center">
										<p className="text-sm text-(--text-label)">No collateral risk routes found for this token.</p>
									</div>
								) : (
									<PaginatedTable table={collateralRiskTable} pageSizeOptions={TABLE_PAGE_SIZE_OPTIONS} />
								)}
							</>
						)}
					</>
				)}
			</div>
		</section>
	)
}
