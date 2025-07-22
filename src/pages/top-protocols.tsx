import Layout from '~/layout'
import { BasicLink } from '~/components/Link'
import { TokenLogo } from '~/components/TokenLogo'
import { chainIconUrl, download, slug } from '~/utils'
import { maxAgeForNext } from '~/api'
import { getSimpleProtocolsPageData } from '~/api/categories/protocols'
import { descriptions } from './categories'
import { withPerformanceLogging } from '~/utils/perf'
import { CSVDownloadButton } from '~/components/ButtonStyled/CsvButton'
import { ProtocolsChainsSearch } from '~/components/Search/ProtocolsChains'
import { VirtualTable } from '~/components/Table/Table'
import {
	useReactTable,
	getCoreRowModel,
	getSortedRowModel,
	SortingState,
	createColumnHelper
} from '@tanstack/react-table'
import * as React from 'react'

export const getStaticProps = withPerformanceLogging('top-protocols', async () => {
	const { protocols, chains } = await getSimpleProtocolsPageData(['name', 'extraTvl', 'chainTvls', 'category'])
	const topProtocolPerChainAndCategory = Object.fromEntries(chains.map((c) => [c, {}]))

	protocols.forEach((p) => {
		const { chainTvls, category, name } = p
		if (['Bridge', 'Cross-Chain'].includes(category)) {
			return
		}
		Object.entries(chainTvls ?? {}).forEach(([chain, { tvl }]: [string, { tvl: number }]) => {
			if (topProtocolPerChainAndCategory[chain] === undefined) {
				return
			}

			const currentTopProtocol = topProtocolPerChainAndCategory[chain][category]

			if (currentTopProtocol === undefined || tvl > currentTopProtocol[1]) {
				topProtocolPerChainAndCategory[chain][category] = [name, tvl]
			}
		})
	})

	const data = []
	const uniqueCategories = new Set()

	chains.forEach((chain) => {
		const categories = topProtocolPerChainAndCategory[chain]
		const values = {}

		for (const cat in categories) {
			uniqueCategories.add(cat)
			values[cat] = categories[cat][0]
		}
		data.push({ chain, ...values })
	})

	return {
		props: {
			data,
			uniqueCategories: Array.from(uniqueCategories)
		},
		revalidate: maxAgeForNext([22])
	}
})

export default function Chains({ data, uniqueCategories }) {
	const [sorting, setSorting] = React.useState<SortingState>([])

	const columnHelper = createColumnHelper<any>()

	const columns = React.useMemo(() => {
		const baseColumns = [
			columnHelper.accessor('chain', {
				header: 'Chain',
				cell: (info) => {
					const chain = info.getValue()
					const rowIndex = info.row.index
					return (
						<span className="flex items-center gap-2">
							<span className="shrink-0">{rowIndex + 1}</span>
							<TokenLogo logo={chainIconUrl(chain)} />
							<BasicLink
								href={`/chain/${slug(chain)}`}
								className="text-sm font-medium text-(--link-text) overflow-hidden whitespace-nowrap text-ellipsis hover:underline"
							>
								{chain}
							</BasicLink>
						</span>
					)
				},
				size: 200
			})
		]

		const categoryColumns = uniqueCategories.map((cat) =>
			columnHelper.accessor(cat, {
				header: cat,
				cell: (info) => {
					const protocolName = info.getValue()
					return protocolName ? (
						<BasicLink href={`/protocol/${slug(protocolName)}`} className="text-sm font-medium text-(--link-text)">
							{protocolName}
						</BasicLink>
					) : null
				},
				size: 200,
				meta: {
					headerHelperText: descriptions[cat as string]
				}
			})
		)

		return [...baseColumns, ...categoryColumns]
	}, [uniqueCategories])

	const table = useReactTable({
		data,
		columns,
		state: {
			sorting
		},
		onSortingChange: setSorting,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel()
	})

	const downloadCSV = React.useCallback(() => {
		const headers = ['Chain', ...uniqueCategories]
		const csvData = data.map((row) => {
			return {
				Chain: row.chain,
				...Object.fromEntries(uniqueCategories.map((cat) => [cat, row[cat] || '']))
			}
		})

		const csv = [headers, ...csvData.map((row) => headers.map((header) => row[header]))]
			.map((row) => row.join(','))
			.join('\n')
		download('top-protocols.csv', csv)
	}, [data, uniqueCategories])

	return (
		<Layout title="Top Protocols - DefiLlama" defaultSEO>
			<ProtocolsChainsSearch />
			<div className="bg-(--cards-bg) border border-(--cards-bg) rounded-md p-3 flex items-center gap-2 justify-between">
				<h1 className="text-xl font-semibold mr-auto">Top Protocols by Chain</h1>
				<CSVDownloadButton onClick={downloadCSV} />
			</div>
			<VirtualTable instance={table} />
		</Layout>
	)
}
