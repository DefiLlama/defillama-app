import { maxAgeForNext } from '~/api'
import { getProtocolsRaw } from '~/api/categories/protocols'
import { expensesColumns } from '~/components/Table/Defi/columns'
import { TableWithSearch } from '~/components/Table/TableWithSearch'
import Layout from '~/layout'
import { withPerformanceLogging } from '~/utils/perf'

import { fetchWithErrorLogging } from '~/utils/async'

const fetch = fetchWithErrorLogging

export const getStaticProps = withPerformanceLogging('expenses', async () => {
	const { protocols, parentProtocols } = await getProtocolsRaw()
	const expenses = await fetch(
		'https://raw.githubusercontent.com/DefiLlama/defillama-server/master/defi/src/operationalCosts/output/expenses.json'
	).then((r) => r.json())

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
			<TableWithSearch
				data={props.expenses}
				columns={expensesColumns}
				columnToSearch={'name'}
				placeholder={'Search protocol...'}
			/>
		</Layout>
	)
}
