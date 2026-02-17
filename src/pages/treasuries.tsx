import { maxAgeForNext } from '~/api'
import { Treasuries } from '~/containers/Treasuries'
import { getTreasuryPageData } from '~/containers/Treasuries/queries'
import Layout from '~/layout'
import { withPerformanceLogging } from '~/utils/perf'

const pageName = ['Projects', 'ranked by', 'Treasury']

export const getStaticProps = withPerformanceLogging('treasuries', async () => {
	const data = await getTreasuryPageData()
	return {
		props: { data, entity: false },
		revalidate: maxAgeForNext([22])
	}
})

export default function TreasuriesPage(props) {
	return (
		<Layout
			title="Treasuries - DefiLlama"
			description="Track treasuries on DefiLlama. DefiLlama is committed to providing accurate data without ads or sponsored content, as well as transparency."
			keywords="blockchain project treasuries, blockchain entity treasuries, protocol treasuries, entity treasuries"
			canonicalUrl="/treasuries"
			pageName={pageName}
		>
			<Treasuries {...props} />
		</Layout>
	)
}
