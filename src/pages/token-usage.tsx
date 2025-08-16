import { startTransition, Suspense, useDeferredValue, useMemo, useState } from 'react'
import { useRouter } from 'next/router'
import Layout from '~/layout'
import * as Ariakit from '@ariakit/react'
import { LocalLoader } from '~/components/LocalLoader'
import { PROTOCOLS_BY_TOKEN_API } from '~/constants'
import { getAllCGTokensList, maxAgeForNext } from '~/api'
import { Announcement } from '~/components/Announcement'
import { withPerformanceLogging } from '~/utils/perf'
import { CSVDownloadButton } from '~/components/ButtonStyled/CsvButton'
import { download, formattedNum, slug, tokenIconUrl } from '~/utils'
import { useQuery } from '@tanstack/react-query'
import { VirtualTable } from '~/components/Table/Table'
import { ColumnDef, getCoreRowModel, getSortedRowModel, SortingState, useReactTable } from '@tanstack/react-table'
import { TokenLogo } from '~/components/TokenLogo'
import { BasicLink } from '~/components/Link'
import { fetchJson } from '~/utils/async'
import { Switch } from '~/components/Switch'
import { matchSorter } from 'match-sorter'
import { Icon } from '~/components/Icon'
import { ProtocolsChainsSearch } from '~/components/Search/ProtocolsChains'

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

export default function Tokens({ searchData }) {
	const router = useRouter()
	const { token, includecex } = router.query

	const tokenSymbol = token ? (typeof token === 'string' ? token : token[0]) : null
	const includeCentraliseExchanges = includecex
		? typeof includecex === 'string' && includecex === 'true'
			? true
			: false
		: false

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

	const downloadCSV = () => {
		const data = filteredProtocols.map((p) => {
			return {
				Protocol: p.name,
				'Amount (USD)': p.amountUsd,
				Category: p.category
			}
		})
		const headers = ['Protocol', 'Category', 'Amount (USD)']
		const csv = [headers.join(',')].concat(data.map((row) => headers.map((header) => row[header]).join(','))).join('\n')
		download(`protocols-by-token-${tokenSymbol}.csv`, csv)
	}

	return (
		<Layout title="Token Usage - DefiLlama" defaultSEO>
			<ProtocolsChainsSearch />
			<Announcement notCancellable>This is not an exhaustive list</Announcement>

			<Search searchData={searchData} />

			<div className="bg-(--cards-bg) border border-(--cards-border) rounded-md w-full">
				{isLoading ? (
					<div className="flex items-center justify-center mx-auto w-full my-32">
						<LocalLoader />
					</div>
				) : !tokenSymbol || !protocols || protocols.length === 0 ? (
					<></>
				) : (
					<>
						<div className="flex items-center justify-between flex-wrap gap-2 p-3">
							<div className="text-lg font-semibold flex grow w-full sm:w-auto">{`${tokenSymbol.toUpperCase()} usage in protocols`}</div>

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
								<CSVDownloadButton onClick={downloadCSV} />
							</div>
						</div>

						<Suspense
							fallback={
								<div
									style={{ minHeight: `${filteredProtocols.length * 50 + 200}px` }}
									className="bg-(--cards-bg) border border-(--cards-border) rounded-md"
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
						className="text-sm font-medium text-(--link-text) overflow-hidden whitespace-nowrap text-ellipsis hover:underline"
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
		return matchSorter(searchData || [], deferredSearchValue, {
			baseSort: (a, b) => (a.index < b.index ? -1 : 1),
			threshold: matchSorter.rankings.CONTAINS,
			keys: ['name', 'symbol']
		})
	}, [searchData, deferredSearchValue])

	const [viewableMatches, setViewableMatches] = useState(20)

	const [open, setOpen] = useState(false)

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
				<button onClick={(prev) => setOpen(!prev)} className="absolute top-[8px] left-[9px] opacity-50">
					{open ? (
						<>
							<span className="sr-only">Close Search</span>
							<Icon name="x" height={16} width={16} />
						</>
					) : (
						<>
							<span className="sr-only">Open Search</span>
							<Icon name="search" height={14} width={14} />
						</>
					)}
				</button>

				<Ariakit.Combobox
					placeholder="Search tokens..."
					autoSelect
					className="w-full text-sm rounded-md border border-(--cards-border) text-black dark:text-white bg-(--app-bg) py-[5px] px-[10px] pl-8"
				/>
			</span>

			<Ariakit.ComboboxPopover
				unmountOnHide
				hideOnInteractOutside
				gutter={6}
				sameWidth
				className="flex flex-col bg-(--bg-main) rounded-b-md z-10 overflow-auto overscroll-contain border border-t-0 border-[hsl(204,20%,88%)] dark:border-[hsl(204,3%,32%)] h-full max-h-[70vh] sm:max-h-[60vh]"
			>
				{matches.length ? (
					<>
						{matches.slice(0, viewableMatches + 1).map((data) => (
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
								className="p-3 flex items-center gap-4 text-(--text-primary) cursor-pointer hover:bg-(--primary-hover) focus-visible:bg-(--primary-hover) data-active-item:bg-(--primary-hover) aria-disabled:opacity-50 outline-hidden"
							>
								{data?.logo || data?.fallbackLogo ? (
									<TokenLogo logo={data?.logo} fallbackLogo={data?.fallbackLogo} />
								) : null}
								<span>{data.name}</span>
							</Ariakit.ComboboxItem>
						))}

						{matches.length > viewableMatches ? (
							<button
								className="text-left w-full pt-4 px-4 pb-7 text-(--link) hover:bg-(--bg-secondary) focus-visible:bg-(--bg-secondary)"
								onClick={() => setViewableMatches((prev) => prev + 20)}
							>
								See more...
							</button>
						) : null}
					</>
				) : (
					<p className="text-(--text-primary) py-6 px-3 text-center">No results found</p>
				)}
			</Ariakit.ComboboxPopover>
		</Ariakit.ComboboxProvider>
	)
}
