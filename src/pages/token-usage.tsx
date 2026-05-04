import * as Ariakit from '@ariakit/react'
import { useQuery } from '@tanstack/react-query'
import {
	createColumnHelper,
	getCoreRowModel,
	getSortedRowModel,
	type SortingState,
	useReactTable
} from '@tanstack/react-table'
import { useRouter } from 'next/router'
import { startTransition, Suspense, useMemo, useRef, useState } from 'react'
import { Announcement } from '~/components/Announcement'
import { CSVDownloadButton } from '~/components/ButtonStyled/CsvButton'
import { Icon } from '~/components/Icon'
import { BasicLink } from '~/components/Link'
import { LocalLoader } from '~/components/Loaders'
import { Switch } from '~/components/Switch'
import { VirtualTable } from '~/components/Table/Table'
import { prepareTableCsv } from '~/components/Table/utils'
import { TokenLogo } from '~/components/TokenLogo'
import { fetchCoins } from '~/containers/LlamaAI/hooks/useGetEntities'
import { useAuthContext } from '~/containers/Subscription/auth'
import { SignInModal } from '~/containers/Subscription/SignInModal'
import { fetchProtocolsByTokenClient } from '~/containers/TokenUsage/api'
import { useDebouncedValue } from '~/hooks/useDebounce'
import Layout from '~/layout'
import { formattedNum } from '~/utils'
import { pushShallowQuery } from '~/utils/routerQuery'

const pageName = ['Token', 'usage in', 'Protocols']

type TokenUsagePageRow = {
	name: string
	amountUsd: number
	category?: string
	logo?: string
	slug?: string
	misrepresentedTokens?: boolean
}

const columnHelper = createColumnHelper<TokenUsagePageRow>()

export default function Tokens() {
	const router = useRouter()
	const { authorizedFetch, hasActiveSubscription, isAuthenticated } = useAuthContext()
	const signInDialogStore = Ariakit.useDialogStore()

	const { token, includecex } = router.query

	const tokenSymbol = token ? (typeof token === 'string' ? token : token[0]) : null
	const includeCentraliseExchanges = includecex === 'true'

	const {
		data: protocols,
		error,
		isLoading
	} = useQuery({
		queryKey: ['token-usage', 'protocols-by-token', tokenSymbol],
		queryFn: () => fetchProtocols(tokenSymbol, authorizedFetch),
		staleTime: 60 * 60 * 1000,
		refetchOnWindowFocus: false,
		retry: false,
		enabled: !!tokenSymbol && isAuthenticated && !!hasActiveSubscription
	})

	const filteredProtocols = useMemo(() => {
		return (
			protocols?.filter(
				(protocol) =>
					!protocol.misrepresentedTokens &&
					(protocol.category?.toLowerCase() === 'cex' ? includeCentraliseExchanges : true)
			) ?? []
		)
	}, [protocols, includeCentraliseExchanges])
	const [sorting, setSorting] = useState<SortingState>([{ desc: true, id: 'amountUsd' }])
	const tableInstance = useReactTable({
		data: filteredProtocols,
		columns,
		state: {
			sorting
		},
		defaultColumn: {
			sortUndefined: 'last'
		},
		enableSortingRemoval: false,
		onSortingChange: (updater) => startTransition(() => setSorting(updater)),
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel()
	})

	return (
		<Layout
			title="DeFi Token Usage Tracker - DefiLlama"
			description="Track how tokens are used across DeFi protocols and CEXs. View token utility, protocol integrations, and on-chain usage data."
			canonicalUrl={`/token-usage`}
			pageName={pageName}
		>
			<Announcement notCancellable>This is not an exhaustive list</Announcement>

			<Search />

			<div className="flex w-full flex-1 flex-col rounded-md border border-(--cards-border) bg-(--cards-bg)">
				{isLoading || !router.isReady ? (
					<div className="mx-auto flex min-h-[380px] w-full flex-1 items-center justify-center">
						<LocalLoader />
					</div>
				) : error ? (
					<div className="mx-auto flex min-h-[380px] w-full flex-1 items-center justify-center">
						<p className="text-center text-sm">{error.message}</p>
					</div>
				) : !tokenSymbol ? (
					<div className="mx-auto flex min-h-[380px] w-full flex-1 items-center justify-center">
						<p className="text-center text-sm">No token selected</p>
					</div>
				) : !isAuthenticated || !hasActiveSubscription ? (
					<div className="mx-auto flex min-h-[380px] w-full flex-1 items-center justify-center">
						{!isAuthenticated ? (
							<p className="text-center text-sm">
								An{' '}
								<button onClick={signInDialogStore.show} className="underline">
									active subscription
								</button>{' '}
								is required to view token usage.
							</p>
						) : (
							<p className="text-center text-sm">
								An{' '}
								<BasicLink href="/subscription" className="underline">
									active subscription
								</BasicLink>{' '}
								is required to view token usage.
							</p>
						)}
					</div>
				) : !protocols || protocols.length === 0 ? (
					<div className="mx-auto flex min-h-[380px] w-full flex-1 items-center justify-center">
						<p className="text-center text-sm">No protocols found</p>
					</div>
				) : (
					<>
						<div className="flex flex-wrap items-center justify-between gap-2 p-3">
							<div className="flex w-full grow text-lg font-semibold sm:w-auto">{`${tokenSymbol.toUpperCase()} usage in protocols`}</div>

							<div className="flex items-center gap-2 max-sm:w-full">
								<Switch
									label="Include CEXs"
									value="includeCentraliseExchanges"
									checked={includeCentraliseExchanges}
									onChange={() => {
										void pushShallowQuery(router, {
											includecex: !includeCentraliseExchanges ? 'true' : undefined
										})
									}}
								/>
								<CSVDownloadButton
									prepareCsv={() =>
										prepareTableCsv({
											instance: tableInstance,
											filename: `protocols-by-token-${tokenSymbol}`
										})
									}
									smol
								/>
							</div>
						</div>

						<Suspense
							fallback={
								<div
									style={{ minHeight: `${filteredProtocols.length * 50 + 200}px` }}
									className="rounded-md border border-(--cards-border) bg-(--cards-bg)"
								/>
							}
						>
							<VirtualTable instance={tableInstance} />
						</Suspense>
					</>
				)}
			</div>
			<SignInModal store={signInDialogStore} hideWhenAuthenticated={false} />
		</Layout>
	)
}

const fetchProtocols = async (
	tokenSymbol: string | null,
	authorizedFetch: (url: string) => Promise<Response | null>
): Promise<TokenUsagePageRow[] | null> => {
	if (!tokenSymbol) return null
	try {
		const data = await fetchProtocolsByTokenClient(tokenSymbol, authorizedFetch)
		return (
			data?.map((p) => ({ ...p, amountUsd: Object.values(p.amountUsd).reduce((s: number, a: number) => s + a, 0) })) ??
			[]
		)
	} catch (error) {
		throw new Error(error instanceof Error ? error.message : 'Failed to fetch')
	}
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
					<span className="vf-row-index shrink-0" aria-hidden="true" />
					<TokenLogo name={value} kind="token" data-lgonly alt={`Logo of ${value}`} />
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
		},
		size: 240
	}),
	columnHelper.accessor('category', {
		header: 'Category',
		enableSorting: false,
		size: 140,
		meta: {
			align: 'end'
		}
	}),
	columnHelper.accessor('amountUsd', {
		header: 'Amount',
		cell: (info) => formattedNum(info.getValue(), true),
		size: 120,
		meta: {
			align: 'end'
		}
	})
]

const Search = () => {
	const router = useRouter()

	const [searchValue, setSearchValue] = useState('')
	const debouncedSearchValue = useDebouncedValue(searchValue, 200)
	const { data, isLoading, error } = useQuery({
		queryKey: ['token-usage', 'search-tokens', debouncedSearchValue],
		queryFn: () => fetchCoins(debouncedSearchValue, 20),
		staleTime: 5 * 60 * 1000,
		refetchOnWindowFocus: false
	})

	const [open, setOpen] = useState(false)

	const comboboxRef = useRef<HTMLDivElement>(null)

	return (
		<Ariakit.ComboboxProvider
			resetValueOnHide
			setValue={(nextValue) => {
				startTransition(() => {
					setSearchValue(nextValue)
				})
			}}
			open={open}
			setOpen={setOpen}
		>
			<span className="relative isolate w-full lg:max-w-[50vw]">
				<button onClick={() => setOpen((prev) => !prev)} className="absolute top-1 bottom-1 left-2 my-auto opacity-50">
					{open ? (
						<>
							<span className="sr-only">Close Search</span>
							<Icon name="x" height={18} width={18} />
						</>
					) : (
						<>
							<span className="sr-only">Open Search</span>
							<Icon name="search" height={16} width={16} />
						</>
					)}
				</button>

				<Ariakit.Combobox
					placeholder="Search tokens..."
					autoSelect
					className="min-h-8 w-full rounded-md border border-(--cards-border) bg-(--app-bg) px-2 py-1 pl-7 text-black dark:text-white"
				/>
			</span>

			<Ariakit.ComboboxPopover
				unmountOnHide
				hideOnInteractOutside
				gutter={6}
				sameWidth
				className="z-10 flex thin-scrollbar max-h-(--popover-available-height) flex-col overflow-auto overscroll-contain rounded-b-md border border-t-0 border-(--cards-border) bg-(--cards-bg) max-sm:h-[calc(100dvh-80px)]"
			>
				{isLoading ? (
					<p className="px-3 py-6 text-center text-(--text-primary)">Loading...</p>
				) : error ? (
					<p className="px-3 py-6 text-center text-(--text-primary)">{`Error: ${error.message}`}</p>
				) : !data?.length ? (
					<p className="px-3 py-6 text-center text-(--text-primary)">No results found</p>
				) : (
					<Ariakit.ComboboxList ref={comboboxRef}>
						{data.map((tokenResult) => (
							<Ariakit.ComboboxItem
								key={`token-usage-${tokenResult.name}`}
								value={tokenResult.name}
								onClick={() => {
									void pushShallowQuery(router, { token: tokenResult.name }).then(() => {
										setOpen(false)
									})
								}}
								focusOnHover
								hideOnClick={false}
								setValueOnClick={true}
								className="flex cursor-pointer items-center gap-4 px-3 py-2 text-base text-(--text-primary) outline-hidden hover:bg-(--primary-hover) focus-visible:bg-(--primary-hover) aria-disabled:opacity-50 data-active-item:bg-(--primary-hover)"
							>
								{tokenResult?.logo ? (
									<TokenLogo src={tokenResult?.logo} alt={`Logo of ${tokenResult?.name ?? ''}`} />
								) : null}
								<span>{tokenResult.name}</span>
							</Ariakit.ComboboxItem>
						))}
					</Ariakit.ComboboxList>
				)}
			</Ariakit.ComboboxPopover>
		</Ariakit.ComboboxProvider>
	)
}
