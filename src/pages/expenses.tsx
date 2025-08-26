import type { ColumnDef } from '@tanstack/react-table'
import { maxAgeForNext } from '~/api'
import { Icon } from '~/components/Icon'
import { BasicLink } from '~/components/Link'
import { TableWithSearch } from '~/components/Table/TableWithSearch'
import { TokenLogo } from '~/components/TokenLogo'
import { PROTOCOLS_API } from '~/constants'
import Layout from '~/layout'
import { formattedNum, slug, tokenIconUrl } from '~/utils'
import { fetchJson } from '~/utils/async'
import { withPerformanceLogging } from '~/utils/perf'

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

const pageName = ['Protocols', 'ranked by', 'Expenses']

export default function Protocols(props) {
	return (
		<Layout title={`Protocol Expenses - DefiLlama`} pageName={pageName}>
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
				<span className="relative flex items-center gap-2">
					<span className="shrink-0">{index + 1}</span>
					<TokenLogo logo={tokenIconUrl(getValue())} data-lgonly />
					<BasicLink
						href={`/protocol/${slug(getValue() as string)}`}
						className="overflow-hidden text-sm font-medium text-ellipsis whitespace-nowrap text-(--link-text) hover:underline"
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
			return <>{getValue() ? formattedNum(getValue(), true) : ''}</>
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
					className="flex shrink-0 items-center justify-center rounded-md bg-(--link-bg) px-2.5 py-1 text-xs font-medium whitespace-nowrap text-(--link-text) hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg)"
					href={getValue()[0] as string}
					target="_blank"
					rel="noopener noreferrer"
				>
					<Icon name="arrow-up-right" height={14} width={14} className="shrink-0" />
				</a>
			) : null
	}
]
