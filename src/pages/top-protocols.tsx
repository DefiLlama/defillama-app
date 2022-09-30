import { useMemo } from 'react'
import styled from 'styled-components'
import { TYPE } from '~/Theme'
import Layout from '~/layout'
import { CustomLink } from '~/components/Link'
import TokenLogo from '~/components/TokenLogo'
import { chainIconUrl, slug } from '~/utils'
import { revalidate } from '~/api'
import { getSimpleProtocolsPageData } from '~/api/categories/protocols'
import VirtualTable from '~/components/VirtualTable/Table'
import { ColumnDef, getCoreRowModel, useReactTable } from '@tanstack/react-table'
import { IFormattedProtocol } from '~/api/types'
import { Name } from '~/components/VirtualTable/shared'
import { descriptions } from './categories'

export async function getStaticProps() {
	const { protocols, chains } = await getSimpleProtocolsPageData(['name', 'extraTvl', 'chainTvls', 'category'])
	const topProtocolPerChainAndCategory = Object.fromEntries(chains.map((c) => [c, {}]))

	protocols.forEach((p) => {
		const { chainTvls, category, name } = p
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
		meta: {
			headerHelperText: descriptions[item] ?? null
		}
	}))

	return {
		props: {
			data,
			columns
		},
		revalidate: revalidate()
	}
}

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

	const instance = useReactTable({
		data,
		columns: allColumns,
		getCoreRowModel: getCoreRowModel()
	})

	return (
		<Layout title="TVL Rankings - DefiLlama" defaultSEO>
			<TYPE.largeHeader style={{ marginTop: '8px' }}>Top Protocols</TYPE.largeHeader>
			<Table instance={instance} skipVirtualization />
		</Layout>
	)
}

const Table = styled(VirtualTable)`
	height: 85vh;

	thead {
		z-index: 2;
	}

	thead > tr > th:first-child {
		position: sticky;
		left: 0;
		top: 0;
	}

	td,
	th {
		border-right: 1px solid ${({ theme }) => theme.divider};
	}

	tr:hover {
		background: ${({ theme }) => theme.bg1};
	}
`
