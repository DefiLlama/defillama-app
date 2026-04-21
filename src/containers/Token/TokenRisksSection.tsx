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
import type { TokenRiskExposureRow, TokenRiskResponse } from './tokenRisk.types'

const TOKEN_RISKS_SECTION_ID = 'token-risks'
const exposureColumnHelper = createColumnHelper<TokenRiskExposureRow>()
const DEFAULT_EXPOSURES_SORTING: SortingState = [{ id: 'collateralMaxBorrowUsd', desc: true }]

type ExposureProtocolSummary = {
	protocol: string
	protocolDisplayName: string
	totalCollateralMaxBorrowUsd: number
	totalCollateralBorrowedDebtUsd: number | null
	chainDisplayNames: string[]
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

function formatProtocolChains(chainDisplayNames: string[]) {
	if (chainDisplayNames.length === 0) return ''
	if (chainDisplayNames.length === 1) return chainDisplayNames[0]
	return `${chainDisplayNames.length} chains`
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
		exposureColumnHelper.accessor('collateralMaxBorrowUsd', {
			header: 'Max Borrow',
			cell: ({ getValue }) => formatUsd(getValue()),
			meta: {
				align: 'end',
				headerHelperText: methodologies.collateralMaxBorrowUsd
			}
		}),
		exposureColumnHelper.accessor('collateralBorrowedDebtUsd', {
			header: 'Borrowed Debt',
			cell: ({ getValue }) => formatUsd(getValue()),
			meta: {
				align: 'end',
				headerHelperText: methodologies.collateralBorrowedDebtUsd
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
				totalCollateralMaxBorrowUsd: number
				totalCollateralBorrowedDebtUsd: number | null
				chainDisplayNames: Set<string>
			}
		>()

		for (const row of exposures.rows) {
			const existing = grouped.get(row.protocol)

			if (existing) {
				existing.totalCollateralMaxBorrowUsd += row.collateralMaxBorrowUsd
				existing.totalCollateralBorrowedDebtUsd =
					existing.totalCollateralBorrowedDebtUsd == null || row.collateralBorrowedDebtUsd == null
						? null
						: existing.totalCollateralBorrowedDebtUsd + row.collateralBorrowedDebtUsd
				existing.chainDisplayNames.add(row.chainDisplayName)
				continue
			}

			grouped.set(row.protocol, {
				protocol: row.protocol,
				protocolDisplayName: row.protocolDisplayName,
				totalCollateralMaxBorrowUsd: row.collateralMaxBorrowUsd,
				totalCollateralBorrowedDebtUsd: row.collateralBorrowedDebtUsd,
				chainDisplayNames: new Set([row.chainDisplayName])
			})
		}

		return [...grouped.values()]
			.map((summary) => ({
				protocol: summary.protocol,
				protocolDisplayName: summary.protocolDisplayName,
				totalCollateralMaxBorrowUsd: summary.totalCollateralMaxBorrowUsd,
				totalCollateralBorrowedDebtUsd: summary.totalCollateralBorrowedDebtUsd,
				chainDisplayNames: [...summary.chainDisplayNames].sort((a, b) => a.localeCompare(b))
			}))
			.sort((a, b) => {
				if (a.totalCollateralMaxBorrowUsd !== b.totalCollateralMaxBorrowUsd) {
					return b.totalCollateralMaxBorrowUsd - a.totalCollateralMaxBorrowUsd
				}

				const aBorrowed = a.totalCollateralBorrowedDebtUsd ?? Number.NEGATIVE_INFINITY
				const bBorrowed = b.totalCollateralBorrowedDebtUsd ?? Number.NEGATIVE_INFINITY
				if (aBorrowed !== bBorrowed) return bBorrowed - aBorrowed

				return a.protocolDisplayName.localeCompare(b.protocolDisplayName)
			})
	}, [exposures.rows])

	const selectedCandidateDisplayName = useMemo(() => {
		if (scopeCandidates.length === 1) return scopeCandidates[0].displayName
		return 'onchain'
	}, [scopeCandidates])

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
				<div className="grid gap-3 md:grid-cols-2">
					<div className="rounded-md border border-(--cards-border) p-4">
						<p className="text-sm text-(--text-secondary)">Total max borrow against {tokenSymbol}</p>
						<p className="mt-1 text-2xl font-semibold text-(--text-primary)">
							{formatUsd(exposures.summary.totalCollateralMaxBorrowUsd)}
						</p>
						<p className="mt-1 text-sm text-(--text-secondary)">
							Across {exposures.summary.exposureCount} exposure
							{exposures.summary.exposureCount === 1 ? '' : 's'} on {exposures.summary.protocolCount} protocol
							{exposures.summary.protocolCount === 1 ? '' : 's'}.
						</p>
					</div>

					<div className="rounded-md border border-(--cards-border) p-4">
						<p className="text-sm text-(--text-secondary)">Debt already borrowed against {tokenSymbol}</p>
						<p className="mt-1 text-2xl font-semibold text-(--text-primary)">
							{formatUsd(exposures.summary.totalCollateralBorrowedDebtUsd)}
						</p>
						<p className="mt-1 text-sm text-(--text-secondary)">
							{exposures.summary.borrowedDebtUnknownCount > 0
								? `${exposures.summary.borrowedDebtUnknownCount} exposure${
										exposures.summary.borrowedDebtUnknownCount === 1 ? '' : 's'
									} do not report collateral-attributed borrowed debt.`
								: 'Borrowed-debt totals are available for every exposure in this scope.'}
						</p>
					</div>
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
										{formatUsd(summary.totalCollateralMaxBorrowUsd)} max borrow
										{' · '}
										{formatUsd(summary.totalCollateralBorrowedDebtUsd)} borrowed debt
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
						Showing collateral exposure for {tokenSymbol} on{' '}
						<span className="font-medium text-(--text-primary)">{selectedCandidateDisplayName}</span>.{' '}
						<span className="font-medium text-(--text-primary)">Max Borrow</span> is the maximum additional USD debt
						that can currently be issued against the asset.{' '}
						<span className="font-medium text-(--text-primary)">Borrowed Debt</span> is the total USD debt already
						issued using the asset as collateral, when the backend can attribute it exactly.
					</p>
					<ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-(--text-secondary)">
						{riskData.limitations.map((limitation) => (
							<li key={limitation}>{limitation}</li>
						))}
					</ul>
				</details>

				<details className="group rounded-md border border-(--cards-border) bg-(--app-bg) p-3">
					<summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium">
						<span>Show exposure details</span>
						<Icon
							name="chevron-down"
							height={16}
							width={16}
							className="shrink-0 transition-transform duration-200 group-open:rotate-180"
						/>
					</summary>
					<p className="mt-2 text-sm text-(--text-secondary)">
						Each row is one protocol-chain exposure for {tokenSymbol} as collateral. Rows with unavailable borrowed-debt
						values are left blank at the API level rather than being filled with zero.
					</p>
					<PaginatedTable table={exposureTable} pageSizeOptions={TABLE_PAGE_SIZE_OPTIONS} className="mt-3" />
				</details>
			</div>
		</section>
	)
}
