import { createColumnHelper } from '@tanstack/react-table'
import type { InferGetStaticPropsType } from 'next'
import { Icon } from '~/components/Icon'
import { BasicLink } from '~/components/Link'
import { TableWithSearch } from '~/components/Table/TableWithSearch'
import { TokenLogo } from '~/components/TokenLogo'
import type { IProtocolExpenses } from '~/containers/ProtocolOverview/api.types'
import { fetchProtocols } from '~/containers/Protocols/api'
import type { ParentProtocolLite, ProtocolLite } from '~/containers/Protocols/api.types'
import Layout from '~/layout'
import { formattedNum, slug } from '~/utils'
import { fetchJson } from '~/utils/async'
import { maxAgeForNext } from '~/utils/maxAgeForNext'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging('expenses', async () => {
	const [{ protocols, parentProtocols }, expenses] = await Promise.all([
		fetchProtocols(),
		fetchJson<IProtocolExpenses[]>(
			'https://raw.githubusercontent.com/DefiLlama/defillama-server/master/defi/src/operationalCosts/output/expenses.json'
		)
	])

	const protocolById = new Map<string, ProtocolLite | (ParentProtocolLite & { defillamaId: string })>()
	for (const p of protocols) protocolById.set(p.defillamaId, p)
	for (const p of parentProtocols) protocolById.set(p.id, { ...p, defillamaId: p.id })

	return {
		props: {
			expenses: expenses
				.map((e) => {
					const protocol = protocolById.get(e.protocolId) ?? null
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
const DEFAULT_SORTING_STATE = [{ id: 'sumAnnualUsdExpenses', desc: true }]

type ExpenseRow = InferGetStaticPropsType<typeof getStaticProps>['expenses'][number]

const columnHelper = createColumnHelper<ExpenseRow>()

export default function Protocols(props: InferGetStaticPropsType<typeof getStaticProps>) {
	return (
		<Layout
			title={`Protocol Expense Rankings - DefiLlama`}
			description="Track DeFi protocol expenses and token incentive costs. Compare operational spending across protocols to evaluate sustainability."
			canonicalUrl={`/expenses`}
			pageName={pageName}
		>
			<TableWithSearch
				data={props.expenses}
				columns={columns}
				columnToSearch={'name'}
				placeholder={'Search protocol...'}
				header={'Protocol Expenses'}
				headingAs="h1"
				csvFileName="protocol-expenses"
				sortingState={DEFAULT_SORTING_STATE}
			/>
		</Layout>
	)
}

const columns = [
	columnHelper.accessor('name', {
		header: 'Name',
		enableSorting: false,
		cell: ({ getValue }) => {
			const value = getValue()
			return (
				<span className="relative flex items-center gap-2">
					<span className="vf-row-index shrink-0" aria-hidden="true" />
					<TokenLogo name={value} kind="token" data-lgonly alt={`Logo of ${value}`} />
					<BasicLink
						href={`/protocol/${slug(value)}`}
						className="overflow-hidden text-sm font-medium text-ellipsis whitespace-nowrap text-(--link-text) hover:underline"
					>
						{value}
					</BasicLink>
				</span>
			)
		},
		size: 220
	}),
	columnHelper.accessor('headcount', {
		header: 'Headcount',
		meta: {
			align: 'end'
		}
	}),
	columnHelper.accessor('sumAnnualUsdExpenses', {
		header: 'Annual Expenses',
		cell: (info) => (info.getValue() != null ? formattedNum(info.getValue(), true) : null),
		meta: {
			align: 'end'
		}
	}),
	columnHelper.accessor('sources', {
		header: 'Source',
		enableSorting: false,
		cell: ({ getValue }) =>
			getValue() ? (
				<a
					className="flex shrink-0 items-center justify-center rounded-md bg-(--link-bg) px-2.5 py-1 text-xs font-medium whitespace-nowrap text-(--link-text) hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg)"
					href={getValue()[0]}
					target="_blank"
					rel="noopener noreferrer"
				>
					<Icon name="arrow-up-right" height={14} width={14} className="shrink-0" />
				</a>
			) : null
	})
]
