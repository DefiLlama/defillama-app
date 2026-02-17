import { maxAgeForNext } from '~/api'
import { Treasuries } from '~/containers/Treasuries'
import { getEntitiesPageData } from '~/containers/Treasuries/queries'
import Layout from '~/layout'
import { withPerformanceLogging } from '~/utils/perf'

const pageName = ['Entities', 'ranked by', 'Treasury']

export const getStaticProps = withPerformanceLogging('entities', async () => {
	const data = await getEntitiesPageData()
	return {
		props: { data, entity: true },
		revalidate: maxAgeForNext([22])
	}
})

export default function Entities(props) {
	return (
		<Layout
			title="Entities - DefiLlama"
			description="Track treasuries on DefiLlama. DefiLlama is committed to providing accurate data without ads or sponsored content, as well as transparency."
			keywords="blockchain project treasuries, blockchain entity treasuries, protocol treasuries, entity treasuries"
			canonicalUrl="/entities"
			pageName={pageName}
		>
			<Treasuries {...props} />
		</Layout>
	)
}
