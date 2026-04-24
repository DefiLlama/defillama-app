import * as Ariakit from '@ariakit/react'
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
import { formattedNum } from '~/utils'
import { DEFAULT_TABLE_PAGE_SIZE, resolveUpdater, TABLE_PAGE_SIZE_OPTIONS } from './tableUtils'
import type { TokenRiskCoverageStatus, TokenRiskExposureRow, TokenRiskResponse } from './tokenRisk.types'

const TOKEN_RISKS_SECTION_ID = 'token-risks'
const exposureColumnHelper = createColumnHelper<TokenRiskExposureRow>()
const DEFAULT_EXPOSURES_SORTING: SortingState = [{ id: 'currentMaxBorrowUsd', desc: true }]

type ExposureProtocolSummary = {
	protocol: string
	protocolDisplayName: string
	totalCurrentMaxBorrowUsd: number
	totalMinBadDebtAtPriceZeroUsd: number | null
	minBadDebtAtPriceZeroCoverage: TokenRiskCoverageStatus
	chainBreakdowns: ChainExposureSummary[]
}

type ChainExposureSummary = {
	chain: string
	chainDisplayName: string
	totalCurrentMaxBorrowUsd: number
	totalMinBadDebtAtPriceZeroUsd: number | null
	minBadDebtAtPriceZeroCoverage: TokenRiskCoverageStatus
}

function formatUsd(value: number | null | undefined) {
	if (value == null) return 'Unavailable'
	return formattedNum(value, true)
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

function formatProtocolChains(chainBreakdowns: ChainExposureSummary[]) {
	if (chainBreakdowns.length === 0) return ''
	if (chainBreakdowns.length === 1) return chainBreakdowns[0].chainDisplayName
	return `${chainBreakdowns.length} chains`
}

function formatMinBadDebtValue(value: number | null | undefined, coverage: TokenRiskCoverageStatus) {
	if (coverage === 'unavailable' || value == null) return '—'
	if (coverage === 'partial') return `${formattedNum(value, true)} (partial)`
	return formattedNum(value, true)
}

function formatProtocolSummaryBadDebt(value: number | null | undefined) {
	if (value == null) return '--'
	return formattedNum(value, true)
}

function ProtocolExposureSummaryText({
	summary,
	tokenSymbol
}: {
	summary: ExposureProtocolSummary
	tokenSymbol: string
}) {
	const totalAtRiskUsd = summary.totalCurrentMaxBorrowUsd + (summary.totalMinBadDebtAtPriceZeroUsd ?? 0)

	return (
		<>
			{formatUsd(totalAtRiskUsd)} at-risk exposure ={' '}
			{formatProtocolSummaryBadDebt(summary.totalMinBadDebtAtPriceZeroUsd)} bad debt if hacked +{' '}
			{formatUsd(summary.totalCurrentMaxBorrowUsd)} additional borrowable against {tokenSymbol}
		</>
	)
}

function ChainBreakdownTooltipContent({ chainBreakdowns }: { chainBreakdowns: ChainExposureSummary[] }) {
	return (
		<div className="w-80 max-w-[calc(100vw-2rem)] space-y-2 text-xs">
			<p className="font-medium text-(--text-primary)">Breakdown by chain</p>
			<div className="space-y-1">
				{chainBreakdowns.map((chain) => (
					<div
						key={`${chain.chain}-${chain.chainDisplayName}`}
						className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-0.5 border-b border-(--cards-border) pb-1.5 last:border-b-0 last:pb-0"
					>
						<span className="flex min-w-0 items-center gap-1.5 font-medium text-(--text-primary)">
							<TokenLogo
								name={chain.chainDisplayName}
								kind="chain"
								size={14}
								alt={`Logo of ${chain.chainDisplayName}`}
								title={chain.chain}
							/>
							<span className="truncate">{chain.chainDisplayName}</span>
						</span>
						<span className="text-right text-(--text-primary)">
							{formatUsd(chain.totalCurrentMaxBorrowUsd + (chain.totalMinBadDebtAtPriceZeroUsd ?? 0))}
						</span>
						<span className="text-(--text-secondary)">Bad debt if hacked</span>
						<span className="text-right text-(--text-secondary)">
							{formatMinBadDebtValue(chain.totalMinBadDebtAtPriceZeroUsd, chain.minBadDebtAtPriceZeroCoverage)}
						</span>
						<span className="text-(--text-secondary)">Additional borrowable</span>
						<span className="text-right text-(--text-secondary)">{formatUsd(chain.totalCurrentMaxBorrowUsd)}</span>
					</div>
				))}
			</div>
		</div>
	)
}

function ProtocolChainsLabel({ chainBreakdowns }: { chainBreakdowns: ChainExposureSummary[] }) {
	const label = formatProtocolChains(chainBreakdowns)
	if (!label) return null

	return (
		<Ariakit.HovercardProvider placement="bottom-start" timeout={150}>
			<Ariakit.HovercardAnchor
				render={
					<button
						type="button"
						className="cursor-help text-left text-xs text-(--text-secondary) underline decoration-dotted underline-offset-2 hover:text-(--text-primary) focus-visible:text-(--text-primary)"
						aria-label={`Show ${label} exposure breakdown by chain`}
					/>
				}
			>
				{label}
			</Ariakit.HovercardAnchor>
			<Ariakit.Hovercard
				className="z-50 max-h-[calc(100dvh-80px)] overflow-auto overscroll-contain rounded-md border border-[hsl(204,20%,88%)] bg-(--bg-main) p-2 text-sm shadow-sm lg:max-h-(--popover-available-height) dark:border-[hsl(204,3%,32%)]"
				gutter={6}
				portal
				unmountOnHide
			>
				<ChainBreakdownTooltipContent chainBreakdowns={chainBreakdowns} />
			</Ariakit.Hovercard>
		</Ariakit.HovercardProvider>
	)
}

function createExposureColumns(methodologies: TokenRiskResponse['exposures']['methodologies']) {
	return [
		exposureColumnHelper.accessor('protocolDisplayName', {
			header: 'Protocol',
			enableSorting: false,
			cell: ({ row, getValue }) => (
				<TableEntityCell label={getValue()} logoName={getValue()} logoKind="token" title={row.original.protocol} />
			)
		}),
		exposureColumnHelper.accessor('chainDisplayName', {
			header: 'Chain',
			enableSorting: false,
			cell: ({ row, getValue }) => (
				<TableEntityCell label={getValue()} logoName={getValue()} logoKind="chain" title={row.original.chain} />
			)
		}),
		exposureColumnHelper.accessor('assetSymbol', {
			header: 'Asset',
			cell: ({ row, getValue }) => (
				<div className="flex flex-col">
					<span>{getValue()}</span>
					<span className="font-mono text-xs text-(--text-secondary)">{row.original.assetAddress}</span>
				</div>
			),
			meta: {
				headerHelperText: methodologies.asset
			}
		}),
		exposureColumnHelper.accessor('currentMaxBorrowUsd', {
			header: 'Max Borrowable',
			cell: ({ getValue }) => formatUsd(getValue()),
			meta: {
				align: 'end',
				headerHelperText: methodologies.currentMaxBorrowUsd
			}
		}),
		exposureColumnHelper.accessor('minBadDebtAtPriceZeroUsd', {
			id: 'minBadDebtAtPriceZeroUsd',
			header: 'Bad Debt at $0',
			cell: ({ row, getValue }) => formatMinBadDebtValue(getValue(), row.original.minBadDebtAtPriceZeroCoverage),
			meta: {
				align: 'end',
				headerHelperText: methodologies.minBadDebtAtPriceZeroUsd
			}
		})
	]
}

export function TokenRisksSection({ tokenSymbol, riskData }: { tokenSymbol: string; riskData: TokenRiskResponse }) {
	const { exposures, scopeCandidates } = riskData
	const [sorting, setSorting] = useState<SortingState>(DEFAULT_EXPOSURES_SORTING)
	const [pagination, setPagination] = useState<PaginationState>({
		pageIndex: 0,
		pageSize: DEFAULT_TABLE_PAGE_SIZE
	})

	const exposureColumns = useMemo(() => createExposureColumns(exposures.methodologies), [exposures.methodologies])

	const exposureTable = useReactTable({
		data: exposures.rows,
		columns: exposureColumns,
		state: {
			sorting,
			pagination
		},
		enableSortingRemoval: false,
		onSortingChange: (updater) => startTransition(() => setSorting(resolveUpdater(updater, sorting))),
		onPaginationChange: (updater) => startTransition(() => setPagination(resolveUpdater(updater, pagination))),
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getPaginationRowModel: getPaginationRowModel()
	})

	const protocolSummaries = useMemo<ExposureProtocolSummary[]>(() => {
		const grouped = new Map<
			string,
			{
				protocol: string
				protocolDisplayName: string
				totalCurrentMaxBorrowUsd: number
				totalMinBadDebtAtPriceZeroUsd: number | null
				hasKnownMinBadDebt: boolean
				hasUnknownMinBadDebt: boolean
				chainBreakdowns: Map<
					string,
					{
						chain: string
						chainDisplayName: string
						totalCurrentMaxBorrowUsd: number
						totalMinBadDebtAtPriceZeroUsd: number | null
						hasKnownMinBadDebt: boolean
						hasUnknownMinBadDebt: boolean
					}
				>
			}
		>()

		const addChainBreakdown = (
			summary: {
				chainBreakdowns: Map<
					string,
					{
						chain: string
						chainDisplayName: string
						totalCurrentMaxBorrowUsd: number
						totalMinBadDebtAtPriceZeroUsd: number | null
						hasKnownMinBadDebt: boolean
						hasUnknownMinBadDebt: boolean
					}
				>
			},
			row: TokenRiskExposureRow
		) => {
			const chainKey = `${row.chain}|${row.chainDisplayName}`
			const existing = summary.chainBreakdowns.get(chainKey)

			if (existing) {
				existing.totalCurrentMaxBorrowUsd += row.currentMaxBorrowUsd
				if (row.minBadDebtAtPriceZeroUsd != null) {
					existing.totalMinBadDebtAtPriceZeroUsd =
						(existing.totalMinBadDebtAtPriceZeroUsd ?? 0) + row.minBadDebtAtPriceZeroUsd
					existing.hasKnownMinBadDebt = true
				}
				if (row.minBadDebtAtPriceZeroCoverage !== 'known') {
					existing.hasUnknownMinBadDebt = true
				}
				return
			}

			summary.chainBreakdowns.set(chainKey, {
				chain: row.chain,
				chainDisplayName: row.chainDisplayName,
				totalCurrentMaxBorrowUsd: row.currentMaxBorrowUsd,
				totalMinBadDebtAtPriceZeroUsd: row.minBadDebtAtPriceZeroUsd,
				hasKnownMinBadDebt: row.minBadDebtAtPriceZeroUsd != null,
				hasUnknownMinBadDebt: row.minBadDebtAtPriceZeroCoverage !== 'known'
			})
		}

		for (const row of exposures.rows) {
			const existing = grouped.get(row.protocol)

			if (existing) {
				existing.totalCurrentMaxBorrowUsd += row.currentMaxBorrowUsd
				if (row.minBadDebtAtPriceZeroUsd != null) {
					existing.totalMinBadDebtAtPriceZeroUsd =
						(existing.totalMinBadDebtAtPriceZeroUsd ?? 0) + row.minBadDebtAtPriceZeroUsd
					existing.hasKnownMinBadDebt = true
				}
				if (row.minBadDebtAtPriceZeroCoverage !== 'known') {
					existing.hasUnknownMinBadDebt = true
				}
				addChainBreakdown(existing, row)
				continue
			}

			const protocolSummary = {
				protocol: row.protocol,
				protocolDisplayName: row.protocolDisplayName,
				totalCurrentMaxBorrowUsd: row.currentMaxBorrowUsd,
				totalMinBadDebtAtPriceZeroUsd: row.minBadDebtAtPriceZeroUsd,
				hasKnownMinBadDebt: row.minBadDebtAtPriceZeroUsd != null,
				hasUnknownMinBadDebt: row.minBadDebtAtPriceZeroCoverage !== 'known',
				chainBreakdowns: new Map()
			}
			addChainBreakdown(protocolSummary, row)
			grouped.set(row.protocol, protocolSummary)
		}

		return [...grouped.values()]
			.map((summary) => {
				const minBadDebtAtPriceZeroCoverage: TokenRiskCoverageStatus = summary.hasKnownMinBadDebt
					? summary.hasUnknownMinBadDebt
						? 'partial'
						: 'known'
					: 'unavailable'
				const chainBreakdowns = [...summary.chainBreakdowns.values()]
					.map<ChainExposureSummary>((chain) => {
						const chainMinBadDebtAtPriceZeroCoverage: TokenRiskCoverageStatus = chain.hasKnownMinBadDebt
							? chain.hasUnknownMinBadDebt
								? 'partial'
								: 'known'
							: 'unavailable'

						return {
							chain: chain.chain,
							chainDisplayName: chain.chainDisplayName,
							totalCurrentMaxBorrowUsd: chain.totalCurrentMaxBorrowUsd,
							totalMinBadDebtAtPriceZeroUsd: chain.totalMinBadDebtAtPriceZeroUsd,
							minBadDebtAtPriceZeroCoverage: chainMinBadDebtAtPriceZeroCoverage
						}
					})
					.sort((a, b) => {
						const aTotal = a.totalCurrentMaxBorrowUsd + (a.totalMinBadDebtAtPriceZeroUsd ?? 0)
						const bTotal = b.totalCurrentMaxBorrowUsd + (b.totalMinBadDebtAtPriceZeroUsd ?? 0)
						if (aTotal !== bTotal) return bTotal - aTotal
						return a.chainDisplayName.localeCompare(b.chainDisplayName)
					})

				return {
					protocol: summary.protocol,
					protocolDisplayName: summary.protocolDisplayName,
					totalCurrentMaxBorrowUsd: summary.totalCurrentMaxBorrowUsd,
					totalMinBadDebtAtPriceZeroUsd: summary.totalMinBadDebtAtPriceZeroUsd,
					minBadDebtAtPriceZeroCoverage,
					chainBreakdowns
				}
			})
			.sort((a, b) => {
				if (a.totalCurrentMaxBorrowUsd !== b.totalCurrentMaxBorrowUsd) {
					return b.totalCurrentMaxBorrowUsd - a.totalCurrentMaxBorrowUsd
				}

				return a.protocolDisplayName.localeCompare(b.protocolDisplayName)
			})
	}, [exposures.rows])

	const selectedCandidateDisplayName = useMemo(() => {
		if (scopeCandidates.length === 1) return scopeCandidates[0].displayName
		return 'onchain'
	}, [scopeCandidates])

	const totalMaxExposureUsd =
		exposures.summary.totalCurrentMaxBorrowUsd + (exposures.summary.totalMinBadDebtAtPriceZeroUsd ?? 0)

	if (exposures.rows.length === 0) {
		return null
	}

	return (
		<section className="flex flex-col rounded-md border border-(--cards-border) bg-(--cards-bg)">
			<div className="flex flex-wrap items-start justify-between gap-3 border-b border-(--cards-border) p-3">
				<div className="min-w-0">
					<h2
						className="group relative flex min-w-0 scroll-mt-24 items-center gap-1 text-xl font-bold"
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
						How much debt can be issued against {tokenSymbol} as collateral across lending protocols.
					</p>
				</div>
			</div>

			<div className="flex flex-1 flex-col gap-3 p-3">
				<div className="rounded-md border border-(--cards-border) p-4">
					<p className="text-sm text-(--text-secondary)">Maximum possible exposure to {tokenSymbol}</p>
					<p className="mt-1 text-2xl font-semibold text-(--text-primary)">{formatUsd(totalMaxExposureUsd)}</p>
					<p className="mt-1 text-sm text-(--text-secondary)">
						{formatUsd(exposures.summary.totalCurrentMaxBorrowUsd)} (max additional borrows against {tokenSymbol})
						{exposures.summary.totalMinBadDebtAtPriceZeroUsd == null ? null : (
							<>
								{' '}
								+ {formatUsd(exposures.summary.totalMinBadDebtAtPriceZeroUsd)} (bad debt if {tokenSymbol} was hacked
								now)
							</>
						)}
					</p>
				</div>

				<div className="rounded-md border border-(--cards-border) p-3">
					<div className="space-y-3">
						{protocolSummaries.map((summary) => (
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
										<ProtocolExposureSummaryText summary={summary} tokenSymbol={tokenSymbol} />
									</p>
									<div className="mt-1">
										<ProtocolChainsLabel chainBreakdowns={summary.chainBreakdowns} />
									</div>
								</div>
							</div>
						))}
					</div>
				</div>

				<details className="group rounded-md border border-(--cards-border) bg-(--app-bg) p-3">
					<summary className="-m-3 flex cursor-pointer list-none items-center justify-between gap-3 p-3 text-sm font-medium">
						<span>Methodology and limitations</span>
						<Icon
							name="chevron-down"
							height={16}
							width={16}
							className="shrink-0 transition-transform duration-200 group-open:rotate-180"
						/>
					</summary>
					<p className="mt-2 text-sm text-(--text-secondary)">
						Showing collateral exposure for {tokenSymbol} on{' '}
						<span className="font-medium text-(--text-primary)">{selectedCandidateDisplayName}</span>.{' '}
						<span className="font-medium text-(--text-primary)">Max Borrowable</span> uses the backend&apos;s{' '}
						liquidity-bounded borrow-capacity metric (`collateralMaxBorrowUsdLiquidity`) for the maximum additional USD
						debt that can be issued against the asset right now.{' '}
						<span className="font-medium text-(--text-primary)">Bad Debt at $0</span> is the minimum known bad debt if
						the collateral asset price goes to zero; null rows are excluded from this total rather than treated as zero,
						so totals may remain lower bounds.
					</p>
					<ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-(--text-secondary)">
						{riskData.limitations.map((limitation) => (
							<li key={limitation}>{limitation}</li>
						))}
					</ul>
				</details>

				<details className="group rounded-md border border-(--cards-border) bg-(--app-bg) p-3">
					<summary className="-m-3 flex cursor-pointer list-none items-center justify-between gap-3 p-3 text-sm font-medium">
						<span>Show exposure details</span>
						<Icon
							name="chevron-down"
							height={16}
							width={16}
							className="shrink-0 transition-transform duration-200 group-open:rotate-180"
						/>
					</summary>
					<p className="mt-2 text-sm text-(--text-secondary)">
						Each row is one protocol-chain exposure for {tokenSymbol} as collateral. Bad debt at $0 totals remain lower
						bounds when a row is marked partial.
					</p>
					<PaginatedTable table={exposureTable} pageSizeOptions={TABLE_PAGE_SIZE_OPTIONS} className="mt-3" />
				</details>
			</div>
		</section>
	)
}
