import { revalidate } from '~/api'
import Table, { columnsToShow } from '~/components/Table'
import Layout from '~/layout'

export async function getStaticProps() {
	const feeResults = await fetch("https://fees.llama.fi/fees").then(r=>r.json())

	const feeArray = feeResults.fees
	const fees = feeArray.map(fee => {
		const latestFee = fee.feesHistory.pop()['dailyFees']
		const latestRevenue = fee.revenueHistory.pop()['dailyRevenue']

		const isBreakdown = Object.values(latestFee).find(item => Object.keys(item).find(key => key.toString() == 'v1'))

		if (isBreakdown) {
			const chains: string[] = Object.keys(latestFee)

			let feeBreakdown = { }
			let revenueBreakdown = { }
			chains.forEach(chain => {
				for (const [version, value] of Object.entries(latestFee[chain])) {
					if (!feeBreakdown[version]) {
						feeBreakdown[version] = value as number
					} else {
						feeBreakdown[version] += value as number
					}
				}
				for (const [version, value] of Object.entries(latestRevenue[chain])) {
					if (!revenueBreakdown[version]) {
						revenueBreakdown[version] = value as number
					} else {
						revenueBreakdown[version] += value as number
					}
				}
			})
			const subRows = Object.keys(feeBreakdown).map(version => {
				return {
					...fee,
					version: version.toUpperCase(),
					total1dFees: feeBreakdown[version],
					total1dRevenue: revenueBreakdown[version],
				}
			})
			
			return {
				...fee,
				subRows: subRows
			}
		}
		return fee
	})
	
	return {
		props: {
			fees
		},
		revalidate: revalidate()
	}
}

const columns = columnsToShow(
	'feesProtocol',
	'category',
	'fees',
  	'revenue'
)

export default function Fees(props) {
	return (
    	<Layout title={"Fees - DefiLlama"} defaultSEO>
			<Table data={props.fees} columns={columns} />
		</Layout>
	)
}
