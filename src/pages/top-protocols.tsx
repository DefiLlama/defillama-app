import * as React from 'react'
import { createColumnHelper, getCoreRowModel, useReactTable } from '@tanstack/react-table'
import { maxAgeForNext } from '~/api'
import { getSimpleProtocolsPageData } from '~/api/categories/protocols'
import { CSVDownloadButton } from '~/components/ButtonStyled/CsvButton'
import { BasicLink } from '~/components/Link'
import { VirtualTable } from '~/components/Table/Table'
import { TokenLogo } from '~/components/TokenLogo'
import Layout from '~/layout'
import { chainIconUrl, slug } from '~/utils'
import { withPerformanceLogging } from '~/utils/perf'
import { descriptions } from './categories'

export const getStaticProps = withPerformanceLogging('top-protocols', async () => {
	const { protocols, chains } = await getSimpleProtocolsPageData(['name', 'extraTvl', 'chainTvls', 'category'])
	const topProtocolPerChainAndCategory = Object.fromEntries(chains.map((c) => [c, {}]))

	protocols.forEach((p) => {
		const { chainTvls, category, name } = p
		if (['Bridge', 'Canonical Bridge'].includes(category)) {
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

const pageName = ['Top Protocols']

export default function TopProtocols({ data, uniqueCategories }) {
	const columns = React.useMemo(() => {
		const columnHelper = createColumnHelper<any>()

		const baseColumns = [
			columnHelper.accessor('chain', {
				header: 'Chain',
				enableSorting: false,
				cell: (info) => {
					const chain = info.getValue()
					const rowIndex = info.row.index
					return (
						<span className="flex items-center gap-2">
							<span className="shrink-0">{rowIndex + 1}</span>
							<TokenLogo logo={chainIconUrl(chain)} />
							<BasicLink
								href={`/chain/${slug(chain)}`}
								className="overflow-hidden text-sm font-medium text-ellipsis whitespace-nowrap text-(--link-text) hover:underline"
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
				enableSorting: false,
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

		getCoreRowModel: getCoreRowModel()
	})

	const prepareCsv = React.useCallback(() => {
		const headers = ['Chain', ...uniqueCategories]
		const csvData = data.map((row) => {
			return {
				Chain: row.chain,
				...Object.fromEntries(uniqueCategories.map((cat) => [cat, row[cat] || '']))
			}
		})

		const rows = [headers, ...csvData.map((row) => headers.map((header) => row[header]))]

		return { filename: 'top-protocols.csv', rows: rows as (string | number | boolean)[][] }
	}, [data, uniqueCategories])

	return (
		<Layout
			title="Top Protocols by chain on each category - DefiLlama"
			description={`Top Protocols by chain on each category. DefiLlama is committed to providing accurate data without ads or sponsored content, as well as transparency.`}
			keywords={`top protocols, defi top protocols, top protocols by chain, top protocols by category`}
			canonicalUrl={`/top-protocols`}
			pageName={pageName}
		>
			<div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-(--cards-bg) bg-(--cards-bg) p-3">
				<h1 className="mr-auto text-xl font-semibold">Protocols with highest TVL by chain on each category</h1>
				<CSVDownloadButton prepareCsv={prepareCsv} smol />
			</div>
			<VirtualTable instance={table} />
		</Layout>
	)
}
