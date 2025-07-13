import { maxAgeForNext } from '~/api'
import { TableWithSearch } from '~/components/Table/TableWithSearch'
import Layout from '~/layout'
import { withPerformanceLogging } from '~/utils/perf'
import type { ColumnDef } from '@tanstack/react-table'
import { fetchJson } from '~/utils/async'
import { formattedNum, slug, tokenIconUrl } from '~/utils'
import { Icon } from '~/components/Icon'
import { TokenLogo } from '~/components/TokenLogo'
import { BasicLink } from '~/components/Link'
import { ProtocolsChainsSearch } from '~/components/Search/ProtocolsChains'
import { PROTOCOLS_API } from '~/constants'

export const getStaticProps = withPerformanceLogging('expenses', async () => {
	const { protocols, parentProtocols } = await fetchJson(PROTOCOLS_API)
	const expenses = await fetchJson(
		'https://raw.githubusercontent.com/DefiLlama/defillama-server/master/defi/src/operationalCosts/output/expenses.json'
	)

	return {
		props: {
			expenses: expenses
				.map((e) => {
					const protocol =
						protocols
							.concat(parentProtocols.map((p) => ({ ...p, defillamaId: p.id })))
							.find((p) => p.defillamaId === e.protocolId) ?? null
					const sumAnnualUsdExpenses = Object.values(e.annualUsdCost).reduce(
						(sum: number, x: number) => sum + x
					) as number
					return {
						...e,
						name: protocol?.name ?? '',
						protocol,
						avgCostPerFTE: sumAnnualUsdExpenses / e.headcount,
						sumAnnualUsdExpenses
					}
				})
				.sort((a, b) => b.sumAnnualUsdExpenses - a.sumAnnualUsdExpenses)
		},
		revalidate: maxAgeForNext([22])
	}
})

export default function Protocols(props) {
	return (
		<Layout title={`Protocol Expenses - DefiLlama`} defaultSEO>
			<ProtocolsChainsSearch />
			<TableWithSearch
				data={props.expenses}
				columns={columns}
				columnToSearch={'name'}
				placeholder={'Search protocol...'}
				header={'Protocol Expenses'}
			/>
		</Layout>
	)
}

const columns: ColumnDef<any>[] = [
	{
		header: 'Name',
		accessorKey: 'name',
		enableSorting: false,
		cell: ({ getValue, row, table }) => {
			const index = row.depth === 0 ? table.getSortedRowModel().rows.findIndex((x) => x.id === row.id) : row.index

			return (
				<span className="flex items-center gap-2 relative">
					<span className="shrink-0">{index + 1}</span>
					<TokenLogo logo={tokenIconUrl(getValue())} data-lgonly />
					<BasicLink
						href={`/protocol/${slug(getValue() as string)}`}
						className="text-sm font-medium text-(--link-text) overflow-hidden whitespace-nowrap text-ellipsis hover:underline"
					>
						{getValue() as string}
					</BasicLink>
				</span>
			)
		},
		size: 220
	},
	{
		header: 'Headcount',
		accessorKey: 'headcount',
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Annual Expenses',
		accessorKey: 'sumAnnualUsdExpenses',
		cell: ({ getValue }) => {
			return <>{getValue() ? '$' + formattedNum(getValue()) : ''}</>
		},
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Source',
		accessorKey: 'sources',
		enableSorting: false,
		cell: ({ getValue }) =>
			getValue() ? (
				<a
					className="flex items-center justify-center shrink-0 rounded-md py-1 px-[10px] whitespace-nowrap font-medium text-xs text-(--link-text) bg-(--link-bg) hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg)"
					href={getValue()[0] as string}
					target="_blank"
					rel="noopener noreferrer"
				>
					<Icon name="arrow-up-right" height={14} width={14} className="shrink-0" />
				</a>
			) : null
	}
]
