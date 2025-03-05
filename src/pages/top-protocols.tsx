import { useMemo } from 'react'
import Layout from '~/layout'
import { CustomLink } from '~/components/Link'
import { TokenLogo } from '~/components/TokenLogo'
import { chainIconUrl, download, slug } from '~/utils'
import { maxAgeForNext } from '~/api'
import { getSimpleProtocolsPageData } from '~/api/categories/protocols'
import { ColumnDef, getCoreRowModel, useReactTable } from '@tanstack/react-table'
import { IFormattedProtocol } from '~/api/types'
import { descriptions } from './categories'
import { withPerformanceLogging } from '~/utils/perf'
import { CSVDownloadButton } from '~/components/ButtonStyled/CsvButton'
import { QuestionHelper } from '~/components/QuestionHelper'

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

	return {
		props: {
			data,
			uniqueCategories: Array.from(uniqueCategories)
		},
		revalidate: maxAgeForNext([22])
	}
})

export default function Chains({ data, columns, uniqueCategories }) {
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

	return (
		<Layout title="TVL Rankings - DefiLlama" defaultSEO>
			<h1 className="text-2xl font-medium -mb-5 flex items-center justify-between flex-wrap gap-4">
				<span>Top Protocols by Chain</span>
				<CSVDownloadButton onClick={downloadCSV} />
			</h1>
			<div className="isolate relative w-full max-w-[calc(100vw-32px)] rounded-md lg:max-w-[calc(100vw-276px)] overflow-x-auto mx-auto text-[var(--text1)] bg-[var(--bg8)] border border-[var(--bg3)] h-[85vh]">
				<div className="grid" style={{ gridTemplateColumns: `repeat(${uniqueCategories.length + 1}, 200px)` }}>
					<div
						className="col-span-full grid sticky top-0 z-[1]"
						style={{ gridTemplateColumns: `repeat(${uniqueCategories.length + 1}, 200px)` }}
					>
						<div className="col-span-1 p-3 whitespace-nowrap overflow-hidden text-ellipsis bg-[var(--bg8)] dark:data-[ligther=true]:bg-[#1c1d22] border-b border-r border-[var(--divider)] sticky left-0 z-[1]">
							Chain
						</div>
						{uniqueCategories.map((cat) => (
							<div
								className="col-span-1 p-3 whitespace-nowrap overflow-hidden text-ellipsis bg-[var(--bg8)] dark:data-[ligther=true]:bg-[#1c1d22] border-b border-r border-[var(--divider)]"
								key={`uniq-cat-${cat}`}
							>
								<span className="flex items-center gap-1">
									{cat}
									<QuestionHelper text={descriptions[cat as string]} />
								</span>
							</div>
						))}
					</div>

					{data.map((item, index) => (
						<div
							className="col-span-full grid"
							style={{ gridTemplateColumns: `repeat(${uniqueCategories.length + 1}, 200px)` }}
							key={`top-protocols-of${item.chain}`}
						>
							<div className="col-span-1 p-3 whitespace-nowrap overflow-hidden text-ellipsis bg-[var(--bg8)] dark:data-[ligther=true]:bg-[#1c1d22] border-b border-r border-[var(--divider)] sticky left-0">
								<span className="flex items-center gap-2">
									<span className="flex-shrink-0">{index + 1}</span>
									<TokenLogo logo={chainIconUrl(item.chain)} />
									<CustomLink
										href={`/chain/${slug(item.chain)}`}
										className="overflow-hidden whitespace-nowrap text-ellipsis hover:underline"
									>
										{item.chain}
									</CustomLink>
								</span>
							</div>
							{uniqueCategories.map((cat) => (
								<div
									className="col-span-1 p-3 whitespace-nowrap overflow-hidden text-ellipsis bg-[var(--bg8)] dark:data-[ligther=true]:bg-[#1c1d22] border-b border-r border-[var(--divider)]"
									key={`uniq-cat-${cat}-${item.chain}`}
								>
									{item[cat] ? <CustomLink href={`/protocol/${slug(item[cat])}`}>{item[cat]}</CustomLink> : null}
								</div>
							))}
						</div>
					))}
				</div>
			</div>
		</Layout>
	)
}
