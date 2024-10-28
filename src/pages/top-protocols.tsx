import { useMemo } from 'react'
import styled from 'styled-components'
import Layout from '~/layout'
import { CustomLink } from '~/components/Link'
import { TokenLogo } from '~/components/TokenLogo'
import { chainIconUrl, download, slug } from '~/utils'
import { maxAgeForNext } from '~/api'
import { getSimpleProtocolsPageData } from '~/api/categories/protocols'
import VirtualTable from '~/components/Table/Table'
import { ColumnDef, getCoreRowModel, useReactTable } from '@tanstack/react-table'
import { IFormattedProtocol } from '~/api/types'
import { Name } from '~/components/Table/shared'
import { descriptions } from './categories'
import { withPerformanceLogging } from '~/utils/perf'
import { CSVDownloadButton } from '~/components/ButtonStyled/CsvButton'

export const getStaticProps = withPerformanceLogging('top-protocols', async () => {
	const { protocols, chains } = await getSimpleProtocolsPageData(['name', 'extraTvl', 'chainTvls', 'category'])
	const topProtocolPerChainAndCategory = Object.fromEntries(chains.map((c) => [c, {}]))

	protocols.forEach((p) => {
		const { chainTvls, category, name } = p
		if (['Bridge', 'Cross-Chain'].includes(category)) {
			return
		}
		Object.entries(chainTvls).forEach(([chain, { tvl }]: [string, { tvl: number }]) => {
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

	const columns = Array.from(uniqueCategories).map((item) => ({
		header: item,
		accessorKey: item,
		enableSorting: false,
		size: 200,
		meta: {
			headerHelperText: descriptions[item as string] ?? null
		}
	}))

	return {
		props: {
			data,
			columns
		},
		revalidate: maxAgeForNext([22])
	}
})

export default function Chains({ data, columns }) {
	const allColumns: ColumnDef<IFormattedProtocol>[] = useMemo(
		() => [
			{
				header: 'Chain',
				accessorKey: 'chain',
				enableSorting: false,
				cell: ({ getValue, row }) => {
					return (
						<Name>
							<span>{row.index + 1}</span>
							<TokenLogo logo={chainIconUrl(getValue())} />
							<CustomLink href={`/chain/${getValue()}`}>{getValue()}</CustomLink>
						</Name>
					)
				},
				size: 200
			},
			...columns.map((column) => ({
				...column,
				cell: ({ getValue }) => <CustomLink href={`/protocol/${slug(getValue())}`}>{getValue()}</CustomLink>
			}))
		],
		[columns]
	)
	const downloadCSV = () => {
		const headers = ['Chain', ...columns.map((column) => column.header)]
		const csvData = data.map((row) => {
			return {
				Chain: row.chain,
				...Object.fromEntries(columns.map((column) => [column.header, row[column.header]]))
			}
		})

		const csv = [headers, ...csvData.map((row) => headers.map((header) => row[header]))]
			.map((row) => row.join(','))
			.join('\n')
		download('top-protocols.csv', csv)
	}

	const instance = useReactTable({
		data,
		columns: allColumns,
		getCoreRowModel: getCoreRowModel()
	})

	return (
		<Layout title="TVL Rankings - DefiLlama" defaultSEO>
			<h1 className="text-2xl font-medium -mb-5 flex items-center justify-between flex-wrap gap-4">
				<span>Top Protocols</span>
				<CSVDownloadButton onClick={downloadCSV} />
			</h1>
			<Table instance={instance} skipVirtualization />
		</Layout>
	)
}

const Table = styled(VirtualTable)`
	height: 85vh;
`
