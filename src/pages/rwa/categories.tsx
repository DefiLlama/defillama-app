import { maxAgeForNext } from '~/api'
import { RWACategoriesTable } from '~/containers/RWA/Categories'
import { getRWACategoriesOverview } from '~/containers/RWA/queries'
import Layout from '~/layout'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging(`rwa/categories`, async () => {
	const categories = await getRWACategoriesOverview()

	if (!categories) return { notFound: true }

	return {
		props: { categories },
		revalidate: maxAgeForNext([22])
	}
})

const pageName = ['RWA Categories']

export default function RWACategoriesPage({ categories }) {
	return (
		<Layout
			title="RWA Categories - DefiLlama"
			description={`Real World Assets by category on DefiLlama. DefiLlama is committed to providing accurate data without ads or sponsored content, as well as transparency.`}
			keywords={`real world assets, rwa categories, rwa onchain by category`}
			pageName={pageName}
			canonicalUrl={`/rwa/category`}
		>
			<RWACategoriesTable categories={categories} />
		</Layout>
	)
}
