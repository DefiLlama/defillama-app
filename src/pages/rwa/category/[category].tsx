import type { GetStaticPropsContext } from 'next'
import { maxAgeForNext } from '~/api'
import { RWA_STATS_API } from '~/constants'
import { RWAOverview } from '~/containers/RWA'
import { getRWAAssetsOverview, getRWACategoriesList } from '~/containers/RWA/queries'
import { rwaSlug } from '~/containers/RWA/rwaSlug'
import Layout from '~/layout'
import { fetchJson } from '~/utils/async'
import { withPerformanceLogging } from '~/utils/perf'

export async function getStaticPaths() {
	const categories = await getRWACategoriesList()

	return {
		paths: categories.slice(0, 10).map((category) => ({ params: { category } })),
		fallback: 'blocking'
	}
}

export const getStaticProps = withPerformanceLogging(
	`rwa/category/[category]`,
	async ({ params }: GetStaticPropsContext<{ category: string }>) => {
		if (!params?.category) {
			return { notFound: true, props: null }
		}

		const categorySlug = rwaSlug(params.category)

		const stats = await fetchJson<{ byCategory?: Record<string, unknown> }>(RWA_STATS_API)
		if (!stats?.byCategory) {
			throw new Error('Failed to get RWA stats')
		}

		let categoryExists = false
		for (const category in stats.byCategory) {
			if (rwaSlug(category) === categorySlug) {
				categoryExists = true
				break
			}
		}
		if (!categoryExists) {
			return { notFound: true, props: null }
		}

		const props = await getRWAAssetsOverview({ category: categorySlug })

		if (!props) return { notFound: true }

		return {
			props,
			revalidate: maxAgeForNext([22])
		}
	}
)

const pageName = ['RWA']

export default function RWAPage(props) {
	return (
		<Layout
			title="Real World Assets - DefiLlama"
			description={`Real World Assets on DefiLlama. DefiLlama is committed to providing accurate data without ads or sponsored content, as well as transparency.`}
			keywords={`real world assets, defi rwa rankings, rwa on chain`}
			pageName={pageName}
			canonicalUrl={`/rwa/categories`}
		>
			<RWAOverview {...props} />
		</Layout>
	)
}
