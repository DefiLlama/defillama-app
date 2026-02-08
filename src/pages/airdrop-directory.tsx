import { maxAgeForNext } from '~/api'
import { getAirdropDirectoryData } from '~/api/categories/protocols'
import { AirdropColumn } from '~/components/Table/Defi/columns'
import { TableWithSearch } from '~/components/Table/TableWithSearch'
import Layout from '~/layout'
import { withPerformanceLogging } from '~/utils/perf'

const DEFAULT_SORTING_STATE = [{ id: 'name', desc: true }]

export const getStaticProps = withPerformanceLogging('airdrop-directory', async () => {
	const airdrops = await getAirdropDirectoryData()

	return {
		props: { airdrops },
		revalidate: maxAgeForNext([22])
	}
})

export default function Airdrops({ airdrops }) {
	return (
		<Layout
			title={`Airdrop Directory - DefiLlama`}
			description={`Airdrop directory on DefiLlama. DefiLlama is committed to providing accurate data without ads or sponsored content, as well as transparency.`}
			keywords={`airdrop directory, airdrops`}
			canonicalUrl={`/airdrop-directory`}
		>
			<TableWithSearch
				data={airdrops}
				columns={AirdropColumn}
				columnToSearch={'name'}
				placeholder={'Search Airdrop...'}
				sortingState={DEFAULT_SORTING_STATE}
			/>
		</Layout>
	)
}
