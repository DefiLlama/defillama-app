import { maxAgeForNext } from '~/api'
import { RowLinksWithDropdown } from '~/components/RowLinksWithDropdown'
import { RWACategoriesTable } from '~/containers/RWA/Categories'
import { getRWACategoriesOverview } from '~/containers/RWA/queries'
import { rwaSlug } from '~/containers/RWA/rwaSlug'
import Layout from '~/layout'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging(`rwa/categories`, async () => {
	const metadataCache = await import('~/utils/metadata').then((m) => m.default)
	const rwaList = metadataCache.rwaList
	const { rows: categories, chartDatasets } = await getRWACategoriesOverview()

	if (!categories) {
		throw new Error('categories not found in RWA list')
	}

	const categoryLinks = rwaList.categories.map((category) => ({
		label: category,
		to: `/rwa/category/${rwaSlug(category)}`
	}))

	if (categoryLinks.length === 0) {
		throw new Error('categories not found in RWA list')
	}
	return {
		props: {
			categories,
			chartDatasets,
			categoryLinks: [{ label: 'All', to: '/rwa/categories' }, ...categoryLinks]
		},
		revalidate: maxAgeForNext([22])
	}
})

const pageName = ['RWA Categories']

export default function RWACategoriesPage({ categories, categoryLinks, chartDatasets }) {
	return (
		<Layout
			title="RWA Categories - DefiLlama"
			description={`Real World Assets by category on DefiLlama. DefiLlama is committed to providing accurate data without ads or sponsored content, as well as transparency.`}
			keywords={`real world assets, rwa categories, rwa onchain by category`}
			pageName={pageName}
			canonicalUrl={`/rwa/categories`}
		>
			<RowLinksWithDropdown links={categoryLinks} activeLink={'All'} />
			<RWACategoriesTable categories={categories} chartDatasets={chartDatasets} />
		</Layout>
	)
}
