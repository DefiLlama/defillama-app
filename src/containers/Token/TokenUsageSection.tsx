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
import dynamic from 'next/dynamic'
import { startTransition, useMemo, useState } from 'react'
import { CSVDownloadButton } from '~/components/ButtonStyled/CsvButton'
import type { ITreemapChartProps } from '~/components/ECharts/types'
import { Icon } from '~/components/Icon'
import { BasicLink } from '~/components/Link'
import { Switch } from '~/components/Switch'
import { prepareTableCsv } from '~/components/Table/utils'
import { TokenLogo } from '~/components/TokenLogo'
import { fetchProtocolsByTokenClient } from '~/containers/TokenUsage/api'
import { buildTokenUsageTreemapTreeData } from '~/containers/TokenUsage/treemap'
import { formattedNum } from '~/utils'
import { DEFAULT_TABLE_PAGE_SIZE, resolveUpdater, TABLE_PAGE_SIZE_OPTIONS } from './tableUtils'
import { TokenPrivateSectionGate, useTokenPrivateSectionAccess } from './TokenPrivateSectionGate'
import { buildTokenUsageRows, filterTokenUsageRows, type TokenUsageSectionRow } from './TokenUsageSection.utils'

type TokenUsageView = 'list' | 'treemap'

const DEFAULT_SORTING: SortingState = [{ desc: true, id: 'amountUsd' }]
const TOKEN_USAGE_SECTION_ID = 'token-usage'
const columnHelper = createColumnHelper<TokenUsageSectionRow>()
const TOKEN_USAGE_NAME_MAX_WIDTH = 'max-sm:max-w-[clamp(160px,40vw,260px)]'

const DeferredPaginatedTable = dynamic(
	() => import('~/components/Table/PaginatedTable').then((mod) => mod.PaginatedTable),
	{
		loading: () => <div className="min-h-[360px]" />
	}
) as typeof import('~/components/Table/PaginatedTable').PaginatedTable

const TreemapChart = dynamic(() => import('~/components/ECharts/TreemapChart'), {
	loading: () => <div className="min-h-[480px]" />
}) as React.FC<ITreemapChartProps>

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
	const access = useTokenPrivateSectionAccess()
	const { authorizedFetch, hasActiveSubscription, isAuthenticated, loaders } = access
	const [includeCentralizedExchanges, setIncludeCentralizedExchanges] = useState(initialIncludeCentralizedExchanges)
	const [view, setView] = useState<TokenUsageView>('list')
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

	const treemapTreeData = useMemo(
		() =>
			view === 'treemap' ? buildTokenUsageTreemapTreeData(filteredRows, `${tokenSymbol.toUpperCase()} usage`) : [],
		[view, filteredRows, tokenSymbol]
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
		<TokenPrivateSectionGate
			access={access}
			title="Token Usage"
			sectionId={TOKEN_USAGE_SECTION_ID}
			contentLabel="token usage"
			isLoading={isLoading}
			error={error}
			errorMessage="Failed to load token usage."
			emptyMessage={filteredRows.length === 0 ? 'No token usage entries found.' : null}
			headerActions={
				isAuthenticated && hasActiveSubscription && rows ? (
					<div className="flex flex-wrap items-center gap-2 max-sm:w-full">
						<div className="flex w-fit flex-nowrap items-center overflow-x-auto rounded-md border border-(--form-control-border) text-xs font-medium text-(--text-form)">
							<button
								data-active={view === 'list'}
								onClick={() => setView('list')}
								className="flex shrink-0 items-center gap-1 px-3 py-2 whitespace-nowrap hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) data-[active=true]:bg-(--old-blue) data-[active=true]:text-white"
							>
								<Icon name="align-left" height={14} width={14} />
								<span>List</span>
							</button>
							<button
								data-active={view === 'treemap'}
								onClick={() => setView('treemap')}
								className="flex shrink-0 items-center gap-1 px-3 py-2 whitespace-nowrap hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) data-[active=true]:bg-(--old-blue) data-[active=true]:text-white"
							>
								<Icon name="layout-grid" height={14} width={14} />
								<span>Treemap</span>
							</button>
						</div>
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
				) : null
			}
		>
			{view === 'treemap' ? (
				<TreemapChart treeData={treemapTreeData} variant="rwa" height="480px" valueLabel="Amount" valueSymbol="$" />
			) : (
				<DeferredPaginatedTable
					table={table}
					pageSizeOptions={TABLE_PAGE_SIZE_OPTIONS}
					tableClassName="mx-auto w-auto min-w-[720px] max-w-full"
				/>
			)}
		</TokenPrivateSectionGate>
	)
}
