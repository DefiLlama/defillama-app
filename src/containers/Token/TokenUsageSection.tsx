import * as Ariakit from '@ariakit/react'
import { useQuery } from '@tanstack/react-query'
import {
	type PaginationState,
	type SortingState,
	type Updater,
	createColumnHelper,
	flexRender,
	getCoreRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	useReactTable
} from '@tanstack/react-table'
import { useRouter } from 'next/router'
import { startTransition, useMemo, useState } from 'react'
import { CSVDownloadButton } from '~/components/ButtonStyled/CsvButton'
import { Icon } from '~/components/Icon'
import { BasicLink } from '~/components/Link'
import { LocalLoader } from '~/components/Loaders'
import { Switch } from '~/components/Switch'
import { SortIcon } from '~/components/Table/SortIcon'
import { prepareTableCsv } from '~/components/Table/utils'
import { TokenLogo } from '~/components/TokenLogo'
import { useAuthContext } from '~/containers/Subscription/auth'
import { SignInModal } from '~/containers/Subscription/SignInModal'
import { fetchProtocolsByTokenClient } from '~/containers/TokenUsage/api'
import type { RawProtocolTokenUsageEntry } from '~/containers/TokenUsage/api.types'
import { formattedNum } from '~/utils'

export type TokenUsageSectionRow = {
	name: string
	amountUsd: number
	category?: string
	logo?: string
	slug?: string
	misrepresentedTokens?: boolean
}

const DEFAULT_PAGE_SIZE = 20
const PAGE_SIZE_OPTIONS = [20, 30, 50] as const
const DEFAULT_TABLE_PLACEHOLDER_MIN_HEIGHT = 494
const DEFAULT_SORTING: SortingState = [{ desc: true, id: 'amountUsd' }]
const columnHelper = createColumnHelper<TokenUsageSectionRow>()

const isUpdaterFunction = <T,>(updater: Updater<T>): updater is (old: T) => T => {
	return typeof updater === 'function'
}

const resolveUpdater = <T,>(updater: Updater<T>, previousValue: T): T => {
	return isUpdaterFunction(updater) ? updater(previousValue) : updater
}

const columns = [
	columnHelper.accessor('name', {
		header: 'Name',
		enableSorting: false,
		cell: ({ getValue, row }) => {
			const value = getValue()
			const href = row.original.slug ? `/protocol/${row.original.slug}` : null

			return (
				<span className="flex items-center gap-2">
					{row.original.logo ? (
						<TokenLogo src={row.original.logo} alt={`Logo of ${value}`} />
					) : (
						<TokenLogo name={value} kind="token" alt={`Logo of ${value}`} />
					)}
					{href ? (
						<BasicLink
							href={href}
							className="overflow-hidden text-sm font-medium text-ellipsis whitespace-nowrap text-(--link-text) hover:underline"
						>
							{value}
						</BasicLink>
					) : (
						<span className="overflow-hidden text-sm font-medium text-ellipsis whitespace-nowrap">{value}</span>
					)}
				</span>
			)
		}
	}),
	columnHelper.accessor('category', {
		header: 'Category',
		enableSorting: false,
		meta: {
			align: 'end'
		}
	}),
	columnHelper.accessor('amountUsd', {
		header: 'Amount',
		cell: (info) => formattedNum(info.getValue(), true),
		meta: {
			align: 'end'
		}
	})
]

export function buildTokenUsageRows(data: RawProtocolTokenUsageEntry[]): TokenUsageSectionRow[] {
	return data.map((entry) => ({
		name: entry.name,
		category: entry.category,
		logo: typeof entry.logo === 'string' ? entry.logo : undefined,
		slug: typeof entry.slug === 'string' ? entry.slug : undefined,
		misrepresentedTokens: entry.misrepresentedTokens,
		amountUsd: Object.values(entry.amountUsd ?? {}).reduce(
			(sum, amount) => sum + (typeof amount === 'number' ? amount : 0),
			0
		)
	}))
}

export function filterTokenUsageRows(
	rows: TokenUsageSectionRow[],
	includeCentralizedExchanges: boolean
): TokenUsageSectionRow[] {
	return rows.filter((row) => {
		if (row.misrepresentedTokens) return false
		if (row.category?.toLowerCase() === 'cex' && !includeCentralizedExchanges) return false
		return true
	})
}

async function fetchTokenUsageRows(
	tokenSymbol: string,
	authorizedFetch: (url: string) => Promise<Response | null>
): Promise<TokenUsageSectionRow[]> {
	const data = await fetchProtocolsByTokenClient(tokenSymbol, authorizedFetch)
	return buildTokenUsageRows(data)
}

interface TokenUsageSectionProps {
	tokenSymbol: string
	initialIncludeCentralizedExchanges?: boolean
	initialPageSize?: (typeof PAGE_SIZE_OPTIONS)[number]
}

export function TokenUsageSection({
	tokenSymbol,
	initialIncludeCentralizedExchanges = false,
	initialPageSize = DEFAULT_PAGE_SIZE
}: TokenUsageSectionProps) {
	const router = useRouter()
	const signInDialogStore = Ariakit.useDialogStore()
	const { authorizedFetch, hasActiveSubscription, isAuthenticated, loaders } = useAuthContext()
	const [includeCentralizedExchanges, setIncludeCentralizedExchanges] = useState(initialIncludeCentralizedExchanges)
	const [sorting, setSorting] = useState<SortingState>(DEFAULT_SORTING)
	const [pagination, setPagination] = useState<PaginationState>({
		pageIndex: 0,
		pageSize: initialPageSize
	})

	const {
		data: rows,
		error,
		isLoading
	} = useQuery({
		queryKey: ['token-usage', 'token-page', tokenSymbol],
		queryFn: () => fetchTokenUsageRows(tokenSymbol, authorizedFetch),
		staleTime: 60 * 60 * 1000,
		refetchOnWindowFocus: false,
		retry: false,
		enabled: Boolean(tokenSymbol) && isAuthenticated && hasActiveSubscription && !loaders.userLoading
	})

	const filteredRows = useMemo(
		() => filterTokenUsageRows(rows ?? [], includeCentralizedExchanges),
		[rows, includeCentralizedExchanges]
	)

	const table = useReactTable({
		data: filteredRows,
		columns,
		state: {
			sorting,
			pagination
		},
		defaultColumn: {
			sortUndefined: 'last'
		},
		enableSortingRemoval: false,
		onSortingChange: (updater) => startTransition(() => setSorting(resolveUpdater(updater, sorting))),
		onPaginationChange: (updater) => startTransition(() => setPagination(resolveUpdater(updater, pagination))),
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		autoResetPageIndex: false
	})

	return (
		<>
			<section className="rounded-md border border-(--cards-border) bg-(--cards-bg)">
				<div className="flex flex-wrap items-start justify-between gap-3 border-b border-(--cards-border) p-3">
					<h2 className="min-w-0 text-xl font-bold">Token Usage</h2>

					{isAuthenticated && hasActiveSubscription && rows ? (
						<div className="flex flex-wrap items-center gap-2 max-sm:w-full">
							<Switch
								label="Include CEXs"
								value="includeCentralizedExchanges"
								checked={includeCentralizedExchanges}
								onChange={() =>
									startTransition(() => {
										setIncludeCentralizedExchanges((prev) => !prev)
										setPagination((prev) => ({ ...prev, pageIndex: 0 }))
									})
								}
							/>
							<CSVDownloadButton
								prepareCsv={() =>
									prepareTableCsv({
										instance: table,
										filename: `token-usage-${tokenSymbol}`
									})
								}
								smol
							/>
						</div>
					) : null}
				</div>

				<div className="p-3">
					{loaders.userLoading || isLoading ? (
						<div
							className="flex items-center justify-center"
							style={{ minHeight: `${DEFAULT_TABLE_PLACEHOLDER_MIN_HEIGHT}px` }}
						>
							<LocalLoader />
						</div>
					) : !isAuthenticated || !hasActiveSubscription ? (
						<div
							className="flex items-center justify-center px-4 text-center"
							style={{ minHeight: `${DEFAULT_TABLE_PLACEHOLDER_MIN_HEIGHT}px` }}
						>
							{!isAuthenticated ? (
								<p className="text-sm text-(--text-label)">
									An{' '}
									<button type="button" onClick={signInDialogStore.show} className="underline">
										active subscription
									</button>{' '}
									is required to view token usage.
								</p>
							) : (
								<p className="text-sm text-(--text-label)">
									An{' '}
									<BasicLink
										href={`/subscription?returnUrl=${encodeURIComponent(router.asPath)}`}
										className="underline"
									>
										active subscription
									</BasicLink>{' '}
									is required to view token usage.
								</p>
							)}
						</div>
					) : error ? (
						<div
							className="flex items-center justify-center px-4 text-center"
							style={{ minHeight: `${DEFAULT_TABLE_PLACEHOLDER_MIN_HEIGHT}px` }}
						>
							<p className="text-sm text-(--text-label)">{error.message}</p>
						</div>
					) : filteredRows.length === 0 ? (
						<div
							className="flex items-center justify-center px-4 text-center"
							style={{ minHeight: `${DEFAULT_TABLE_PLACEHOLDER_MIN_HEIGHT}px` }}
						>
							<p className="text-sm text-(--text-label)">No token usage entries found.</p>
						</div>
					) : (
						<div className="flex flex-col gap-3">
							<div className="overflow-x-auto rounded-md border border-(--cards-border)">
								<table className="min-w-full border-collapse text-sm">
									<thead>
										{table.getHeaderGroups().map((headerGroup) => (
											<tr key={headerGroup.id} className="border-b border-(--cards-border) bg-(--app-bg)">
												{headerGroup.headers.map((header) => {
													const align = header.column.columnDef.meta?.align ?? 'start'
													return (
														<th
															key={header.id}
															className="px-3 py-2 text-xs font-medium tracking-wider text-(--text-secondary) uppercase"
															style={{ textAlign: align }}
														>
															{header.isPlaceholder ? null : header.column.getCanSort() ? (
																<button
																	type="button"
																	onClick={header.column.getToggleSortingHandler()}
																	className="inline-flex items-center gap-1"
																	style={{ marginLeft: align === 'end' ? 'auto' : undefined }}
																>
																	{flexRender(header.column.columnDef.header, header.getContext())}
																	<SortIcon dir={header.column.getIsSorted()} />
																</button>
															) : (
																flexRender(header.column.columnDef.header, header.getContext())
															)}
														</th>
													)
												})}
											</tr>
										))}
									</thead>
									<tbody>
										{table.getRowModel().rows.map((row) => (
											<tr key={row.id} className="border-b border-(--cards-border) last:border-b-0">
												{row.getVisibleCells().map((cell) => {
													const align = cell.column.columnDef.meta?.align ?? 'start'
													return (
														<td key={cell.id} className="px-3 py-2 align-middle" style={{ textAlign: align }}>
															{flexRender(cell.column.columnDef.cell, cell.getContext())}
														</td>
													)
												})}
											</tr>
										))}
									</tbody>
								</table>
							</div>

							<div className="flex flex-wrap items-center justify-between gap-2">
								<div className="flex items-center gap-2">
									<button
										type="button"
										aria-label="Go to first page"
										onClick={() => startTransition(() => table.setPageIndex(0))}
										disabled={!table.getCanPreviousPage()}
										className="rounded-md border border-(--cards-border) p-2 text-sm transition-colors hover:bg-(--cards-bg) disabled:cursor-not-allowed disabled:opacity-50"
									>
										<Icon name="chevrons-left" height={16} width={16} />
									</button>
									<button
										type="button"
										aria-label="Go to previous page"
										onClick={() => startTransition(() => table.previousPage())}
										disabled={!table.getCanPreviousPage()}
										className="rounded-md border border-(--cards-border) p-2 text-sm transition-colors hover:bg-(--cards-bg) disabled:cursor-not-allowed disabled:opacity-50"
									>
										<Icon name="chevron-left" height={16} width={16} />
									</button>
									<span className="text-xs text-(--text-secondary)">
										{`Page ${table.getState().pagination.pageIndex + 1} of ${table.getPageCount()}`}
									</span>
									<button
										type="button"
										aria-label="Go to next page"
										onClick={() => startTransition(() => table.nextPage())}
										disabled={!table.getCanNextPage()}
										className="rounded-md border border-(--cards-border) p-2 text-sm transition-colors hover:bg-(--cards-bg) disabled:cursor-not-allowed disabled:opacity-50"
									>
										<Icon name="chevron-right" height={16} width={16} />
									</button>
									<button
										type="button"
										aria-label="Go to last page"
										onClick={() => startTransition(() => table.setPageIndex(Math.max(0, table.getPageCount() - 1)))}
										disabled={!table.getCanNextPage()}
										className="rounded-md border border-(--cards-border) p-2 text-sm transition-colors hover:bg-(--cards-bg) disabled:cursor-not-allowed disabled:opacity-50"
									>
										<Icon name="chevrons-right" height={16} width={16} />
									</button>
								</div>

								<label className="flex items-center gap-2 text-sm">
									<span className="text-(--text-secondary)">Rows per page</span>
									<select
										value={table.getState().pagination.pageSize}
										onChange={(event) =>
											startTransition(() => {
												table.setPageSize(Number(event.target.value))
												table.setPageIndex(0)
											})
										}
										className="rounded-md border border-(--cards-border) bg-(--cards-bg) px-2 py-1"
									>
										{PAGE_SIZE_OPTIONS.map((pageSize) => (
											<option key={pageSize} value={pageSize}>
												{pageSize}
											</option>
										))}
									</select>
								</label>
							</div>
						</div>
					)}
				</div>
			</section>

			<SignInModal store={signInDialogStore} hideWhenAuthenticated={false} />
		</>
	)
}
