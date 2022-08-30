import { RecentProtocols } from '~/components/RecentProtocols'
import { revalidate } from '~/api'
import Table, { columnsToShow, Dropdowns, TableFilters, TableHeader } from '~/components/Table'
import Layout from '~/layout'

export async function getStaticProps() {
	const fees = await fetch("https://fees.llama.fi/fees").then(r=>r.json())

	return {
		props: {
			fees
		},
		revalidate: revalidate()
	}
}

const columns = columnsToShow(
	'protocolName',
	'fees',
  'revenue'
)

export default function Fees(props) {
	return (
    <Layout title={"Fees - DefiLlama"} defaultSEO>
			<Table data={props.fees.fees} columns={columns} />
		</Layout>
	)
}
