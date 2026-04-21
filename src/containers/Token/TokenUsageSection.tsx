import * as Ariakit from '@ariakit/react'
import { useQuery } from '@tanstack/react-query'
import {
	type PaginationState,
	type SortingState,
	createColumnHelper,
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
import { PaginatedTable } from '~/components/Table/PaginatedTable'
import { prepareTableCsv } from '~/components/Table/utils'
import { TokenLogo } from '~/components/TokenLogo'
import { useAuthContext } from '~/containers/Subscription/auth'
import { SignInModal } from '~/containers/Subscription/SignInModal'
import { fetchProtocolsByTokenClient } from '~/containers/TokenUsage/api'
import type { RawProtocolTokenUsageEntry } from '~/containers/TokenUsage/api.types'
import { formattedNum } from '~/utils'
import { DEFAULT_TABLE_PAGE_SIZE, resolveUpdater, TABLE_PAGE_SIZE_OPTIONS } from './tableUtils'

export type TokenUsageSectionRow = {
	name: string
	amountUsd: number
	category?: string
	logo?: string
	slug?: string
	misrepresentedTokens?: boolean
}

const DEFAULT_SORTING: SortingState = [{ desc: true, id: 'amountUsd' }]
const TOKEN_USAGE_SECTION_ID = 'token-usage'
const columnHelper = createColumnHelper<TokenUsageSectionRow>()
const TOKEN_USAGE_NAME_MAX_WIDTH = 'max-sm:max-w-[clamp(160px,40vw,260px)]'

const columns = [
	columnHelper.accessor('name', {
		header: 'Name',
		enableSorting: false,
		cell: ({ getValue, row }) => {
			const value = getValue()
			const href = row.original.slug ? `/protocol/${row.original.slug}` : null

			return (
				<span className="flex min-w-0 items-center gap-2">
					{row.original.logo ? (
						<TokenLogo src={row.original.logo} alt={`Logo of ${value}`} size={22} />
					) : (
						<TokenLogo name={value} kind="token" alt={`Logo of ${value}`} size={22} />
					)}
					{href ? (
						<BasicLink
							href={href}
							className={`min-w-0 overflow-hidden text-sm font-medium text-ellipsis whitespace-nowrap text-(--link-text) hover:underline ${TOKEN_USAGE_NAME_MAX_WIDTH}`}
						>
							{value}
						</BasicLink>
					) : (
						<span
							className={`min-w-0 overflow-hidden text-sm font-medium text-ellipsis whitespace-nowrap ${TOKEN_USAGE_NAME_MAX_WIDTH}`}
						>
							{value}
						</span>
					)}
				</span>
			)
		}
	}),
	columnHelper.accessor('category', {
		header: 'Category',
		enableSorting: false,
		meta: {
			align: 'center'
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
	initialPageSize?: (typeof TABLE_PAGE_SIZE_OPTIONS)[number]
}

export function TokenUsageSection({
	tokenSymbol,
	initialIncludeCentralizedExchanges = false,
	initialPageSize = DEFAULT_TABLE_PAGE_SIZE
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

	const hasPlaceholderState =
		loaders.userLoading ||
		isLoading ||
		!isAuthenticated ||
		!hasActiveSubscription ||
		error != null ||
		filteredRows.length === 0

	return (
		<>
			<section
				className={`flex flex-col rounded-md border border-(--cards-border) bg-(--cards-bg)${
					hasPlaceholderState ? ' min-h-[80dvh] sm:min-h-[572px]' : ''
				}`}
			>
				<div className="flex flex-wrap items-start justify-between gap-3 border-b border-(--cards-border) p-3">
					<h2
						className="group relative flex min-w-0 scroll-mt-24 items-center gap-1 text-xl font-bold"
						id={TOKEN_USAGE_SECTION_ID}
					>
						Token Usage
						<a
							aria-hidden="true"
							tabIndex={-1}
							href={`#${TOKEN_USAGE_SECTION_ID}`}
							className="absolute top-0 right-0 z-10 flex h-full w-full items-center"
						/>
						<Icon name="link" className="invisible h-3.5 w-3.5 group-hover:visible group-focus-visible:visible" />
					</h2>

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

				<div className="flex flex-1 flex-col p-3">
					{loaders.userLoading || isLoading ? (
						<div className="flex flex-1 items-center justify-center">
							<LocalLoader />
						</div>
					) : !isAuthenticated || !hasActiveSubscription ? (
						<div className="flex flex-1 items-center justify-center px-4 text-center">
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
						<div className="flex flex-1 items-center justify-center px-4 text-center">
							<p className="text-sm text-(--text-label)">{error.message}</p>
						</div>
					) : filteredRows.length === 0 ? (
						<div className="flex flex-1 items-center justify-center px-4 text-center">
							<p className="text-sm text-(--text-label)">No token usage entries found.</p>
						</div>
					) : (
						<PaginatedTable
							table={table}
							pageSizeOptions={TABLE_PAGE_SIZE_OPTIONS}
							tableClassName="mx-auto w-auto min-w-[720px] max-w-full"
						/>
					)}
				</div>
			</section>

			<SignInModal store={signInDialogStore} hideWhenAuthenticated={false} />
		</>
	)
}
