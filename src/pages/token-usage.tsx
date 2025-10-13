import { startTransition, Suspense, useDeferredValue, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/router'
import * as Ariakit from '@ariakit/react'
import { useQuery } from '@tanstack/react-query'
import { ColumnDef, getCoreRowModel, getSortedRowModel, SortingState, useReactTable } from '@tanstack/react-table'
import { matchSorter } from 'match-sorter'
import { getAllCGTokensList, maxAgeForNext } from '~/api'
import { Announcement } from '~/components/Announcement'
import { CSVDownloadButton } from '~/components/ButtonStyled/CsvButton'
import { Icon } from '~/components/Icon'
import { BasicLink } from '~/components/Link'
import { LocalLoader } from '~/components/Loaders'
import { Switch } from '~/components/Switch'
import { VirtualTable } from '~/components/Table/Table'
import { TokenLogo } from '~/components/TokenLogo'
import { PROTOCOLS_BY_TOKEN_API } from '~/constants'
import Layout from '~/layout'
import { formattedNum, slug, tokenIconUrl } from '~/utils'
import { fetchJson } from '~/utils/async'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging('tokenUsage', async () => {
	const searchData = await getAllCGTokensList()

	return {
		props: {
			searchData: searchData
				.filter((token) => token.name && token.symbol && token.image)
				.map((token) => ({
					name: `${token.name}`,
					route: `/token-usage?token=${token.symbol}`,
					symbol: token.symbol,
					logo: token.image2 || null,
					fallbackLogo: token.image || null
				}))
		},
		revalidate: maxAgeForNext([23])
	}
})

const pageName = ['Token', 'usage in', 'Protocols']

export default function Tokens({ searchData }) {
	const router = useRouter()
	const { token, includecex } = router.query

	const tokenSymbol = token ? (typeof token === 'string' ? token : token[0]) : null
	const includeCentraliseExchanges = includecex === 'true' ? true : false

	const { data: protocols, isLoading } = useQuery({
		queryKey: ['protocols-by-token', tokenSymbol],
		queryFn: () => fetchProtocols(tokenSymbol),
		staleTime: 60 * 60 * 1000
	})

	const filteredProtocols = useMemo(() => {
		return (
			protocols?.filter((protocol) =>
				!protocol.misrepresentedTokens && protocol.category?.toLowerCase() === 'cex' ? includeCentraliseExchanges : true
			) ?? []
		)
	}, [protocols, includeCentraliseExchanges])

	const prepareCsv = () => {
		const data = filteredProtocols.map((p) => {
			return {
				Protocol: p.name,
				'Amount (USD)': p.amountUsd,
				Category: p.category
			}
		})
		const headers = ['Protocol', 'Category', 'Amount (USD)']
		const rows = [headers, ...data.map((row) => headers.map((header) => row[header]))]

		return { filename: `protocols-by-token-${tokenSymbol}.csv`, rows: rows as (string | number | boolean)[][] }
	}

	return (
		<Layout
			title="Token Usage - DefiLlama"
			description={`Token usage in protocols. Checkout how a token is used in protocols on chain as well as CEXs. DefiLlama is committed to providing accurate data without ads or sponsored content, as well as transparency.`}
			keywords={`token usage, defi token usage, token usage in protocols, token usage in protocols on chain, token usage on cexes`}
			canonicalUrl={`/token-usage`}
			pageName={pageName}
		>
			<Announcement notCancellable>This is not an exhaustive list</Announcement>

			<Search searchData={searchData} />

			<div className="w-full rounded-md border border-(--cards-border) bg-(--cards-bg)">
				{isLoading ? (
					<div className="mx-auto flex min-h-[380px] w-full items-center justify-center">
						<LocalLoader />
					</div>
				) : !tokenSymbol || !protocols || protocols.length === 0 ? (
					<div className="mx-auto flex min-h-[380px] w-full items-center justify-center">
						<p className="text-center text-sm">{!tokenSymbol ? 'No token selected' : 'No protocols found'}</p>
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
									onChange={() =>
										router.push(
											{
												pathname: router.pathname,
												query: { ...router.query, includecex: !includeCentraliseExchanges }
											},
											undefined,
											{ shallow: true }
										)
									}
								/>
								<CSVDownloadButton prepareCsv={prepareCsv} />
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
							<Table data={filteredProtocols} />
						</Suspense>
					</>
				)}
			</div>
		</Layout>
	)
}

const fetchProtocols = async (tokenSymbol) => {
	if (!tokenSymbol) return null
	try {
		const data = await fetchJson(`${PROTOCOLS_BY_TOKEN_API}/${tokenSymbol.toUpperCase()}`)
		return (
			data?.map((p) => ({ ...p, amountUsd: Object.values(p.amountUsd).reduce((s: number, a: number) => s + a, 0) })) ??
			[]
		)
	} catch (error) {
		throw new Error(error instanceof Error ? error.message : 'Failed to fetch')
	}
}

function Table({ data }: { data: Array<{ name: string; amountUsd: number }> }) {
	const [sorting, setSorting] = useState<SortingState>([{ desc: true, id: 'amountUsd' }])

	const instance = useReactTable({
		data,
		columns: columns,
		state: {
			sorting
		},
		onSortingChange: setSorting,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel()
	})

	return <VirtualTable instance={instance} />
}

const columns: ColumnDef<{ name: string; amountUsd: number }>[] = [
	{
		header: 'Name',
		accessorKey: 'name',
		enableSorting: false,
		cell: ({ getValue, row, table }) => {
			const value = getValue() as string
			const index = row.depth === 0 ? table.getSortedRowModel().rows.findIndex((x) => x.id === row.id) : row.index

			return (
				<span className="flex items-center gap-2">
					<span className="shrink-0">{index + 1}</span>
					<TokenLogo logo={tokenIconUrl(value)} data-lgonly />
					<BasicLink
						href={`/protocol/${slug(value)}`}
						className="overflow-hidden text-sm font-medium text-ellipsis whitespace-nowrap text-(--link-text) hover:underline"
					>{`${value}`}</BasicLink>
				</span>
			)
		}
	},
	{
		header: () => 'Category',
		accessorKey: 'category',
		enableSorting: false,
		meta: {
			align: 'end'
		}
	},
	{
		header: () => 'Amount',
		accessorKey: 'amountUsd',
		cell: ({ getValue }) => <>{formattedNum(getValue(), true)}</>,
		meta: {
			align: 'end'
		}
	}
]

interface ISearchData {
	name: string
	route: string
	symbol: string
	logo: string
	fallbackLogo: string
}
const Search = ({ searchData }: { searchData: ISearchData[] }) => {
	const router = useRouter()

	const [searchValue, setSearchValue] = useState('')
	const deferredSearchValue = useDeferredValue(searchValue)
	const matches = useMemo(() => {
		if (!deferredSearchValue) return searchData || []
		return matchSorter(searchData || [], deferredSearchValue, {
			threshold: matchSorter.rankings.CONTAINS,
			keys: ['name', 'symbol']
		})
	}, [searchData, deferredSearchValue])

	const [viewableMatches, setViewableMatches] = useState(20)

	const [open, setOpen] = useState(false)

	const comboboxRef = useRef<HTMLDivElement>(null)

	const handleSeeMore = () => {
		const previousCount = viewableMatches
		setViewableMatches((prev) => prev + 20)

		// Focus on the first newly loaded item after a brief delay
		setTimeout(() => {
			const items = comboboxRef.current?.querySelectorAll('[role="option"]')
			if (items && items.length > previousCount) {
				const firstNewItem = items[previousCount] as HTMLElement
				firstNewItem?.focus()
			}
		}, 0)
	}

	return (
		<Ariakit.ComboboxProvider
			resetValueOnHide
			setValue={(value) => {
				startTransition(() => {
					setSearchValue(value)
				})
			}}
			open={open}
			setOpen={setOpen}
		>
			<span className="relative isolate w-full lg:max-w-[50vw]">
				<button onClick={(prev) => setOpen(!prev)} className="absolute top-1 bottom-1 left-2 my-auto opacity-50">
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
				className="z-10 flex max-h-(--popover-available-height) flex-col overflow-auto overscroll-contain rounded-b-md border border-t-0 border-(--cards-border) bg-(--cards-bg) max-sm:h-[calc(100dvh-80px)]"
			>
				{matches.length ? (
					<Ariakit.ComboboxList ref={comboboxRef}>
						{matches.slice(0, viewableMatches).map((data) => (
							<Ariakit.ComboboxItem
								key={`token-usage-${data.name}`}
								value={data.name}
								onClick={() => {
									router.push(data.route, undefined, { shallow: true }).then(() => {
										setOpen(false)
									})
								}}
								focusOnHover
								hideOnClick={false}
								setValueOnClick={true}
								className="flex cursor-pointer items-center gap-4 p-3 text-base text-(--text-primary) outline-hidden hover:bg-(--primary-hover) focus-visible:bg-(--primary-hover) aria-disabled:opacity-50 data-active-item:bg-(--primary-hover)"
							>
								{data?.logo || data?.fallbackLogo ? (
									<TokenLogo logo={data?.logo} fallbackLogo={data?.fallbackLogo} />
								) : null}
								<span>{data.name}</span>
							</Ariakit.ComboboxItem>
						))}
						{matches.length > viewableMatches ? (
							<Ariakit.ComboboxItem
								value="__see_more__"
								setValueOnClick={false}
								hideOnClick={false}
								className="w-full cursor-pointer px-3 py-4 text-(--link) hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) data-active-item:bg-(--link-hover-bg)"
								onClick={handleSeeMore}
							>
								See more...
							</Ariakit.ComboboxItem>
						) : null}
					</Ariakit.ComboboxList>
				) : (
					<p className="px-3 py-6 text-center text-(--text-primary)">No results found</p>
				)}
			</Ariakit.ComboboxPopover>
		</Ariakit.ComboboxProvider>
	)
}
