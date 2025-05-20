import { Suspense, useMemo, useState } from 'react'
import { useRouter } from 'next/router'
import Layout from '~/layout'
import { DesktopSearch } from '~/components/Search/Base/Desktop'
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

	const onItemClick = (item) => {
		router.push(item.route, undefined, { shallow: true })
	}

	const filteredProtocols = useMemo(() => {
		return (
			protocols
				?.filter((protocol) =>
					!protocol.misrepresentedTokens && protocol.category?.toLowerCase() === 'cex'
						? includeCentraliseExchanges
						: true
				)
				?.map((p) => ({ ...p, amountUsd: Object.values(p.amountUsd).reduce((s: number, a: number) => s + a, 0) })) ?? []
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
		<Layout title="Token Usage - DefiLlama" defaultSEO className={isLoading ? 'overflow-hidden' : ''}>
			<Announcement notCancellable>This is not an exhaustive list</Announcement>
			<DesktopSearch data={searchData} placeholder="Search tokens..." data-alwaysdisplay onItemClick={onItemClick} />
			<div className="bg-[var(--cards-bg)] rounded-md">
				{isLoading ? (
					<div className="flex items-center justify-center mx-auto my-32">
						<LocalLoader />
					</div>
				) : !tokenSymbol || !protocols || protocols.length === 0 ? (
					<></>
				) : (
					<>
						<div className="flex items-center gap-2 justify-between p-3">
							<h1 className="text-xl font-medium">{`${tokenSymbol.toUpperCase()} usage in protocols`}</h1>
							<CSVDownloadButton onClick={downloadCSV} />

							{/* <div className="flex items-center gap-4">
								<input
									type="checkbox"
									value="includeCentraliseExchanges"
									checked={includeCentraliseExchanges}
									onChange={() =>
										router.push({
											pathname: router.pathname,
											query: { ...router.query, includecex: !includeCentraliseExchanges }
										})
									}
								/>
								<span>Include CEXs</span>
							</div> */}
						</div>

						<Suspense
							fallback={
								<div
									style={{ minHeight: `${filteredProtocols.length * 50 + 200}px` }}
									className="bg-[var(--cards-bg)] rounded-md"
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
		const data = await fetch(`${PROTOCOLS_BY_TOKEN_API}/${tokenSymbol.toUpperCase()}`).then((res) => res.json())
		return data
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
					<span className="flex-shrink-0">{index + 1}</span>
					<TokenLogo logo={tokenIconUrl(value)} data-lgonly />
					<BasicLink
						href={`/protocol/${slug(value)}`}
						className="text-sm font-medium text-[var(--link-text)] overflow-hidden whitespace-nowrap text-ellipsis hover:underline"
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
